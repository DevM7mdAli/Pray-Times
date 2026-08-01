import {
  CITIES,
  PRAYER_KEYS,
  cachePrayerDay,
  cityById,
  cityName,
  dayTimeline,
  fastingStatusFor,
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
  prayerKeysForCity,
  prayerMethodForCity,
  prayerMethodName,
  prayerName,
  prayerNameForCity,
  readCachedPrayerDay,
  sunriseName,
  type Ayah,
  type City,
  type PrayerDay,
  type PrayerKey,
  type SupportedLocale,
} from "@pray-times/core";
import {
  browserApi,
  hasNotificationPermission,
  requestNotificationPermission,
  supportsBadge,
  supportsNotifications,
} from "./browser-api.js";
import { EXTENSION_COPY, type ExtensionCopyKey } from "./copy.js";
import {
  defaultExtensionSettings,
  migrateLegacySettings,
  writeExtensionSettings,
  writeStoredPrayerDay,
  type ExtensionSettings,
} from "./extension-state.js";

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
let extensionSettings: ExtensionSettings = defaultExtensionSettings(locale);
let permissionWasDenied = false;
let settingsWriteQueue: Promise<void> = Promise.resolve();

const citySelect = requiredElement<HTMLSelectElement>("city-select");
const prayerPanel = requiredElement<HTMLElement>("prayer-panel");
const ayahContent = requiredElement<HTMLElement>("ayah-content");
const dateLine = requiredElement<HTMLElement>("date-line");
const statusLine = requiredElement<HTMLElement>("status-line");
const sourceLine = requiredElement<HTMLElement>("source-line");
const refreshButton = requiredElement<HTMLButtonElement>("refresh-button");
const languageButton = requiredElement<HTMLButtonElement>("language-button");
const settingsDialog = requiredElement<HTMLDialogElement>("settings-dialog");
const badgeToggle = requiredElement<HTMLInputElement>("badge-toggle");
const notificationToggle = requiredElement<HTMLInputElement>("notification-toggle");
const notificationPermission = requiredElement<HTMLElement>("notification-permission");
const prayerNotificationOptions = requiredElement<HTMLFieldSetElement>(
  "prayer-notification-options"
);
const testNotificationButton = requiredElement<HTMLButtonElement>("test-notification");

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

/** The suhoor or iftar countdown, shown only during Ramadan. */
function ramadanPanel(day: PrayerDay): HTMLElement | undefined {
  const status = fastingStatusFor(day);
  if (!status) return undefined;
  const panel = element("div", "ramadan-panel");
  panel.append(element("p", "ramadan-kicker", text("ramadanKicker")));
  const main = element("div", "ramadan-main");
  if (status.phase === "completed") {
    main.append(element("strong", undefined, text("fastCompleted")));
    main.append(
      element(
        "span",
        "ramadan-detail",
        `${text("fastCompletedDetail")} ${formatPrayerTime(day.timings.Maghrib, locale)}`
      )
    );
  } else {
    const label = status.phase === "suhoor" ? text("suhoorLabel") : text("iftarLabel");
    main.append(element("span", "ramadan-detail", label));
    main.append(
      element("strong", undefined, formatRemainingTime(status.minutesUntil ?? 0, locale))
    );
    main.append(element("time", "ramadan-time", formatPrayerTime(status.time ?? "", locale)));
  }
  panel.append(main);
  return panel;
}

function renderPrayerDay(day: PrayerDay): void {
  renderDate(day);
  const next = nextPrayerFor(day);
  const fragment = document.createDocumentFragment();
  const ramadan = ramadanPanel(day);
  if (ramadan) fragment.append(ramadan);
  const summary = element("div", "next-prayer");
  summary.append(
    element(
      "p",
      "next-prayer-label",
      next.isTomorrow ? text("nextPrayerTomorrow") : text("nextPrayer")
    )
  );
  const main = element("div", "next-prayer-main");
  main.append(element("strong", undefined, prayerNameForCity(next.key, day.city, locale)));
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
  for (const entry of dayTimeline(day)) {
    const isNext = entry.kind === "prayer" && entry.key === next.key;
    const classes = ["prayer-node"];
    if (isNext) classes.push("is-next");
    // Sunrise divides the day without being a prayer, so it reads as a marker.
    if (entry.kind === "sunrise") classes.push("is-marker");
    const node = element("div", classes.join(" "));
    if (isNext) node.setAttribute("aria-current", "time");
    node.append(
      element(
        "span",
        undefined,
        entry.kind === "sunrise"
          ? sunriseName(locale)
          : prayerNameForCity(entry.key, day.city, locale)
      )
    );
    node.append(element("time", undefined, formatPrayerTime(entry.time, locale)));
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

function prayerToggle(key: PrayerKey): HTMLInputElement {
  return requiredElement<HTMLInputElement>(`prayer-toggle-${key}`);
}

async function persistSettings(settings: ExtensionSettings): Promise<void> {
  extensionSettings = settings;
  settingsWriteQueue = settingsWriteQueue.then(() => writeExtensionSettings(settings));
  await settingsWriteQueue;
}

function renderBadgeSettings(): void {
  badgeToggle.checked = extensionSettings.badgeEnabled && supportsBadge;
  badgeToggle.disabled = !supportsBadge;
}

async function renderNotificationSettings(messageKey?: ExtensionCopyKey): Promise<void> {
  const permitted = await hasNotificationPermission();
  notificationToggle.checked = extensionSettings.notificationsEnabled && permitted;
  notificationToggle.disabled = !supportsNotifications;
  prayerNotificationOptions.disabled = !notificationToggle.checked;
  testNotificationButton.disabled =
    !notificationToggle.checked || !cityById(extensionSettings.cityId);
  const city = cityById(extensionSettings.cityId);
  const activeKeys = city ? prayerKeysForCity(city) : PRAYER_KEYS;
  const methodDetail = document.querySelector<HTMLElement>("[data-i18n='methodDetail']");
  if (methodDetail) {
    methodDetail.textContent = city
      ? prayerMethodName(prayerMethodForCity(city), locale)
      : text("methodDetail");
  }
  for (const key of PRAYER_KEYS) {
    const toggle = prayerToggle(key);
    toggle.checked = extensionSettings.enabledPrayers[key];
    const label = toggle.closest("label");
    if (label) label.hidden = !activeKeys.includes(key);
    const name = label?.querySelector<HTMLElement>("[data-prayer-label]");
    if (name)
      name.textContent = city ? prayerNameForCity(key, city, locale) : prayerName(key, locale);
  }
  const key =
    messageKey ??
    (!supportsNotifications
      ? "notificationsUnsupported"
      : permissionWasDenied
        ? "permissionDenied"
        : permitted
          ? "permissionReady"
          : "permissionNeeded");
  notificationPermission.textContent = text(key);
  notificationPermission.dataset.state =
    key === "permissionDenied" || key === "testNotificationFailed" ? "error" : "info";
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
    await writeStoredPrayerDay(prayerResult.value);
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
  const selectedCity = cityById(citySelect.value || extensionSettings.cityId);
  const methodDetail = document.querySelector<HTMLElement>("[data-i18n='methodDetail']");
  if (methodDetail && selectedCity) {
    methodDetail.textContent = prayerMethodName(prayerMethodForCity(selectedCity), locale);
  }
  document.querySelectorAll<HTMLElement>("[data-prayer-label]").forEach((node) => {
    const key = node.dataset.prayerLabel;
    if (key && PRAYER_KEYS.includes(key as PrayerKey)) {
      const city = cityById(extensionSettings.cityId);
      node.textContent = city
        ? prayerNameForCity(key as PrayerKey, city, locale)
        : prayerName(key as PrayerKey, locale);
    }
  });
  renderView();
  renderBadgeSettings();
  void renderNotificationSettings();
}

function installEvents(): void {
  citySelect.addEventListener("change", () => {
    void (async () => {
      await persistSettings({ ...extensionSettings, cityId: citySelect.value });
      await renderNotificationSettings();
      await loadSelectedCity();
    })();
  });
  refreshButton.addEventListener("click", () => void loadSelectedCity(true));
  languageButton.addEventListener("click", () => {
    locale = locale === "ar" ? "en" : "ar";
    void persistSettings({ ...extensionSettings, locale });
    applyLocale();
  });
  badgeToggle.addEventListener("change", () => {
    // The service worker redraws the icon when the stored settings change.
    void persistSettings({ ...extensionSettings, badgeEnabled: badgeToggle.checked });
  });
  notificationToggle.addEventListener("change", () => {
    void (async () => {
      let enabled = notificationToggle.checked;
      if (enabled) {
        enabled = await requestNotificationPermission();
        permissionWasDenied = !enabled;
      }
      await persistSettings({ ...extensionSettings, notificationsEnabled: enabled });
      await renderNotificationSettings();
    })();
  });
  for (const key of PRAYER_KEYS) {
    prayerToggle(key).addEventListener("change", () => {
      void (async () => {
        await persistSettings({
          ...extensionSettings,
          enabledPrayers: {
            ...extensionSettings.enabledPrayers,
            [key]: prayerToggle(key).checked,
          },
        });
        await renderNotificationSettings();
      })();
    });
  }
  testNotificationButton.addEventListener("click", () => {
    // Firefox rejects when the event page is not listening yet, so a failure
    // has to reach the user instead of becoming an unhandled rejection.
    void browserApi.runtime
      .sendMessage({ type: "test-notification" })
      .then(() => renderNotificationSettings("testNotificationSent"))
      .catch(() => renderNotificationSettings("testNotificationFailed"));
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

async function initialize(): Promise<void> {
  let legacyCity = "";
  try {
    legacyCity = localStorage.getItem(CITY_STORAGE_KEY) ?? "";
  } catch {
    /* Start without a city when legacy storage is unavailable. */
  }
  extensionSettings = await migrateLegacySettings(legacyCity, locale);
  locale = extensionSettings.locale;
  applyLocale();
  citySelect.value = cityById(extensionSettings.cityId) ? extensionSettings.cityId : "";
  installEvents();
  renderBadgeSettings();
  await renderNotificationSettings();
  await loadSelectedCity();
}

void initialize();
