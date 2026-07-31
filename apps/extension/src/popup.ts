import {
  CITIES,
  cachePrayerDay,
  cityById,
  cityName,
  fetchAyah,
  fetchPrayerDay,
  formatHijriDate,
  formatPrayerTime,
  formatRemainingTime,
  formatUpdatedAt,
  isSupportedLocale,
  localeDirection,
  localDateFor,
  nextPrayerFor,
  prayerMethodName,
  prayerName,
  readCachedPrayerDay,
  type Ayah,
  type City,
  type PrayerDay,
  type SupportedLocale,
} from "@pray-times/core";
import { EXTENSION_COPY, type ExtensionCopyKey } from "./copy.js";

const CITY_STORAGE_KEY = "pray-times:city-id";
const LOCALE_STORAGE_KEY = "pray-times:extension-locale";

type Status = { key?: "verifying" | "stale" | "unavailable"; state?: "info" | "error" };
type ViewState =
  { kind: "no-city" } | { kind: "loading"; city: City } | { kind: "error"; city: City };
type AyahState = "waiting" | "loading" | "error";

function initialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    // Storage is optional; browser preference remains a useful default.
  }
  return navigator.languages.some((language) => language.toLowerCase().startsWith("ar"))
    ? "ar"
    : "en";
}

let locale = initialLocale();
let currentDay: PrayerDay | undefined;
let currentAyah: Ayah | undefined;
let countdownTimer: number | undefined;
let requestVersion = 0;
let viewState: ViewState = { kind: "no-city" };
let ayahState: AyahState = "waiting";
let status: Status = {};

const citySelect = requiredElement<HTMLSelectElement>("city-select");
const prayerPanel = requiredElement<HTMLElement>("prayer-panel");
const ayahContent = requiredElement<HTMLElement>("ayah-content");
const dateLine = requiredElement<HTMLElement>("date-line");
const statusLine = requiredElement<HTMLElement>("status-line");
const sourceLine = requiredElement<HTMLElement>("source-line");
const refreshButton = requiredElement<HTMLButtonElement>("refresh-button");
const languageButton = requiredElement<HTMLButtonElement>("language-button");
const settingsDialog = requiredElement<HTMLDialogElement>("settings-dialog");

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing #${id}`);
  return element as T;
}

function text(key: ExtensionCopyKey): string {
  return EXTENSION_COPY[locale][key];
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  content?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function setStatus(key?: Status["key"], state: Status["state"] = "info"): void {
  status = { key, state };
  statusLine.textContent = key ? text(key) : "";
  statusLine.dataset.state = key ? state : "";
}

function populateCities(): void {
  const selected =
    citySelect.value ||
    (() => {
      try {
        return localStorage.getItem(CITY_STORAGE_KEY) ?? "";
      } catch {
        return "";
      }
    })();
  const placeholder = element("option", undefined, text("chooseCity"));
  placeholder.value = "";
  const fragment = document.createDocumentFragment();
  CITIES.forEach((city) => {
    const option = document.createElement("option");
    option.value = city.id;
    option.textContent = cityName(city, locale);
    fragment.append(option);
  });
  citySelect.replaceChildren(placeholder, fragment);
  citySelect.value = cityById(selected) ? selected : "";
}

function renderDate(day: PrayerDay): void {
  dateLine.textContent = `${cityName(day.city, locale)} · ${formatHijriDate(day.hijri, locale)}`;
  sourceLine.textContent = `${prayerMethodName(day.method, locale)} · ${text("updated")} ${formatUpdatedAt(day.fetchedAt, day.city.timeZone, locale)}`;
}

function renderPrayerDay(day: PrayerDay): void {
  renderDate(day);
  const next = nextPrayerFor(day);
  const fragment = document.createDocumentFragment();
  const summary = element("div", "next-prayer");
  summary.append(
    element(
      "p",
      "next-prayer-label",
      next.isTomorrow ? text("nextPrayerTomorrow") : text("nextPrayer")
    )
  );
  const main = element("div", "next-prayer-main");
  main.append(element("strong", undefined, prayerName(next.key, locale)));
  main.append(element("time", "next-prayer-time", formatPrayerTime(next.time, locale)));
  summary.append(main);
  summary.append(
    element(
      "p",
      "remaining-time",
      `${text("remaining")} ${formatRemainingTime(next.minutesUntil, locale)}`
    )
  );
  fragment.append(summary);

  const path = element("div", "light-path");
  for (const key of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const) {
    const node = element("div", `prayer-node${key === next.key ? " is-next" : ""}`);
    if (key === next.key) node.setAttribute("aria-current", "time");
    node.append(element("span", undefined, prayerName(key, locale)));
    node.append(element("time", undefined, formatPrayerTime(day.timings[key], locale)));
    path.append(node);
  }
  fragment.append(path);
  prayerPanel.replaceChildren(fragment);
}

function renderNoCity(): void {
  dateLine.textContent = text("noCityDate");
  sourceLine.textContent = text("noCitySource");
  const empty = element("div", "empty-state");
  empty.append(element("span", "empty-orb"));
  empty.append(element("p", undefined, text("noCityTitle")));
  empty.append(element("span", undefined, text("noCityBody")));
  prayerPanel.replaceChildren(empty);
}

function renderLoading(city: City): void {
  dateLine.textContent = `${cityName(city, locale)} · ${text("loadingDate")}`;
  sourceLine.textContent = text("pendingSource");
  const empty = element("div", "empty-state");
  empty.append(element("span", "empty-orb"));
  empty.append(element("p", undefined, text("loadingTitle")));
  empty.append(element("span", undefined, text("loadingBody")));
  prayerPanel.replaceChildren(empty);
}

function renderError(city: City): void {
  dateLine.textContent = `${cityName(city, locale)} · ${text("unavailableDate")}`;
  sourceLine.textContent = text("pendingSource");
  const empty = element("div", "empty-state");
  empty.append(element("span", "empty-orb"));
  empty.append(element("p", undefined, text("errorTitle")));
  empty.append(element("span", undefined, text("errorBody")));
  prayerPanel.replaceChildren(empty);
}

function renderAyah(): void {
  if (currentAyah) {
    const fragment = document.createDocumentFragment();
    const verse = element("p", "ayah-text", `﴿${currentAyah.text}﴾`);
    verse.lang = "ar";
    verse.dir = "rtl";
    const reference =
      locale === "en" && currentAyah.surah.englishName
        ? currentAyah.surah.englishName
        : currentAyah.surah.name;
    fragment.append(verse);
    fragment.append(
      element(
        "p",
        "ayah-reference",
        `${reference} · ${text("verseNumber")} ${currentAyah.numberInSurah}`
      )
    );
    ayahContent.replaceChildren(fragment);
    return;
  }
  const message =
    ayahState === "waiting"
      ? text("verseWaiting")
      : ayahState === "loading"
        ? text("verseLoading")
        : text("verseError");
  ayahContent.replaceChildren(
    element("span", ayahState === "error" ? "ayah-error" : "ayah-loading", message)
  );
}

function renderView(): void {
  if (currentDay) renderPrayerDay(currentDay);
  else if (viewState.kind === "loading") renderLoading(viewState.city);
  else if (viewState.kind === "error") renderError(viewState.city);
  else renderNoCity();
  renderAyah();
  statusLine.textContent = status.key ? text(status.key) : "";
  statusLine.dataset.state = status.key ? (status.state ?? "info") : "";
}

function clearCountdown(): void {
  if (countdownTimer !== undefined) window.clearInterval(countdownTimer);
  countdownTimer = undefined;
}

function startCountdown(): void {
  clearCountdown();
  countdownTimer = window.setInterval(() => {
    if (currentDay) renderPrayerDay(currentDay);
  }, 60_000);
}

async function loadSelectedCity(force = false): Promise<void> {
  const requestId = ++requestVersion;
  const city = cityById(citySelect.value);
  clearCountdown();
  currentDay = undefined;
  currentAyah = undefined;
  status = {};

  if (!city) {
    viewState = { kind: "no-city" };
    ayahState = "waiting";
    renderView();
    return;
  }

  try {
    localStorage.setItem(CITY_STORAGE_KEY, city.id);
  } catch {
    /* Selection remains active for this session. */
  }
  const date = localDateFor(city.timeZone);
  const cached = !force ? readCachedPrayerDay(localStorage, city.id, date) : undefined;
  ayahState = "loading";
  if (cached) {
    currentDay = cached;
    setStatus("verifying");
  } else {
    viewState = { kind: "loading", city };
  }
  renderView();
  refreshButton.setAttribute("aria-busy", "true");

  const [prayerResult, ayahResult] = await Promise.allSettled([
    fetchPrayerDay(city, { date }),
    fetchAyah(),
  ]);
  if (requestId !== requestVersion) return;
  refreshButton.removeAttribute("aria-busy");

  if (prayerResult.status === "fulfilled") {
    cachePrayerDay(localStorage, prayerResult.value);
    currentDay = prayerResult.value;
    status = {};
    startCountdown();
  } else if (cached) {
    currentDay = cached;
    setStatus("stale", "error");
    startCountdown();
  } else {
    currentDay = undefined;
    viewState = { kind: "error", city };
    setStatus("unavailable", "error");
  }

  if (ayahResult.status === "fulfilled") {
    currentAyah = ayahResult.value;
  } else {
    ayahState = "error";
  }
  renderView();
}

function closeSettings(): void {
  if (settingsDialog.open) settingsDialog.close();
}

function applyLocale(): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = localeDirection(locale);
  document.title = text("documentTitle");
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (key && key in EXTENSION_COPY[locale]) node.textContent = text(key as ExtensionCopyKey);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria-label]").forEach((node) => {
    const key = node.dataset.i18nAriaLabel;
    if (key && key in EXTENSION_COPY[locale])
      node.setAttribute("aria-label", text(key as ExtensionCopyKey));
  });
  languageButton.textContent = text("languageShort");
  languageButton.setAttribute("aria-label", text("switchLanguage"));
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* Language remains active for this popup session. */
  }
  populateCities();
  renderView();
}

function installEvents(): void {
  citySelect.addEventListener("change", () => void loadSelectedCity());
  refreshButton.addEventListener("click", () => void loadSelectedCity(true));
  languageButton.addEventListener("click", () => {
    locale = locale === "ar" ? "en" : "ar";
    applyLocale();
  });
  requiredElement<HTMLButtonElement>("settings-button").addEventListener("click", () =>
    settingsDialog.showModal()
  );
  requiredElement<HTMLButtonElement>("close-settings").addEventListener("click", closeSettings);
  requiredElement<HTMLButtonElement>("close-settings-primary").addEventListener(
    "click",
    closeSettings
  );
  settingsDialog.addEventListener("click", (event) => {
    if (event.target === settingsDialog) closeSettings();
  });
}

applyLocale();
installEvents();
void loadSelectedCity();
