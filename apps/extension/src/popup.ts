import {
  CITIES,
  PRAYER_KEYS,
  allPrayerMethods,
  cachePrayerDay,
  cityFromCoordinates,
  cityName,
  cityWithMethod,
  dayTimeline,
  fastingStatusFor,
  fetchAyah,
  fetchPrayerDay,
  formatHijriDate,
  formatPrayerTime,
  formatRemainingTime,
  formatUpdatedAt,
  isPrayerMethodId,
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
  resolveCity,
  searchPlaces,
  sunriseName,
  VerificationError,
  type Ayah,
  type City,
  type PlaceSuggestion,
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

type Status = {
  key?: "verifying" | "stale" | "unavailable" | "zoneMismatch";
  state?: "info" | "error";
};
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
const citySearch = requiredElement<HTMLInputElement>("city-search");
const searchResults = requiredElement<HTMLUListElement>("city-search-results");
const searchStatus = requiredElement<HTMLElement>("city-search-status");
const detectButton = requiredElement<HTMLButtonElement>("detect-button");
const prayerPanel = requiredElement<HTMLElement>("prayer-panel");
const ayahContent = requiredElement<HTMLElement>("ayah-content");
const dateLine = requiredElement<HTMLElement>("date-line");
const statusLine = requiredElement<HTMLElement>("status-line");
const sourceLine = requiredElement<HTMLElement>("source-line");
const refreshButton = requiredElement<HTMLButtonElement>("refresh-button");
const languageButton = requiredElement<HTMLButtonElement>("language-button");
const settingsDialog = requiredElement<HTMLDialogElement>("settings-dialog");
const methodSelect = requiredElement<HTMLSelectElement>("method-select");
const methodHint = requiredElement<HTMLElement>("method-hint");
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

/**
 * A place with the reader's chosen authority applied. Everything that fetches
 * or displays goes through here, so an override reaches the request itself and
 * not just the settings dialog.
 */
function cityFor(id: string | null | undefined): City | undefined {
  const base = resolveCity(id, extensionSettings.savedCities);
  return base ? cityWithMethod(base, extensionSettings.methodOverrides[base.id]) : undefined;
}

function currentCity(): City | undefined {
  return cityFor(extensionSettings.cityId);
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
  const addGroup = (label: string, cities: readonly City[]) => {
    if (cities.length === 0) return;
    const group = document.createElement("optgroup");
    group.label = label;
    cities.forEach((city) => {
      const option = element("option", "bg-layl-soft");
      option.value = city.id;
      option.textContent = cityName(city, locale);
      group.append(option);
    });
    fragment.append(group);
  };
  addGroup(text("presetCities"), CITIES);
  addGroup(text("savedCities"), extensionSettings.savedCities);
  citySelect.replaceChildren(placeholder, fragment);
  citySelect.value = resolveCity(selected, extensionSettings.savedCities) ? selected : "";
}

let searchVersion = 0;

function renderSearchResults(suggestions: readonly PlaceSuggestion[]): void {
  if (suggestions.length === 0) {
    searchResults.replaceChildren();
    searchResults.hidden = true;
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const suggestion of suggestions) {
    const item = document.createElement("li");
    const button = element(
      "button",
      "grid w-full cursor-pointer gap-px rounded-lg border-0 bg-transparent px-[9px] py-[7px] text-start text-inherit hover:bg-sama/[0.18] hover:outline-none focus-visible:bg-sama/[0.18] focus-visible:outline-none"
    );
    button.type = "button";
    button.append(element("strong", "text-xs", cityName(suggestion.city, locale)));
    button.append(
      element(
        "span",
        "text-10 text-muted",
        locale === "ar" ? suggestion.contextAr : suggestion.contextEn
      )
    );
    button.addEventListener("click", () => void selectPlace(suggestion.city));
    item.append(button);
    fragment.append(item);
  }
  searchResults.replaceChildren(fragment);
  searchResults.hidden = false;
}

function setSearchStatus(key?: ExtensionCopyKey): void {
  searchStatus.textContent = key ? text(key) : "";
}

/** Saves a place, replacing an entry that already holds the same id. */
async function selectPlace(place: City): Promise<void> {
  const index = extensionSettings.savedCities.findIndex((entry) => entry.id === place.id);
  const saved = [...extensionSettings.savedCities];
  // A detected place keeps one id as the reader moves, so it is replaced.
  if (index === -1) saved.push(place);
  else saved[index] = place;
  await persistSettings({ ...extensionSettings, cityId: place.id, savedCities: saved });
  citySearch.value = "";
  renderSearchResults([]);
  setSearchStatus();
  populateCities();
  citySelect.value = place.id;
  renderMethodSettings();
  await renderNotificationSettings();
  await loadSelectedCity();
}

function detectLocation(): void {
  if (!("geolocation" in navigator)) {
    setSearchStatus("detectUnsupported");
    return;
  }
  detectButton.disabled = true;
  setSearchStatus("detecting");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      detectButton.disabled = false;
      try {
        void selectPlace(
          cityFromCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            // The device zone is the anchor; the provider must agree with it or
            // the response is rejected like any other.
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            nameAr: EXTENSION_COPY.ar.detectedName,
            nameEn: EXTENSION_COPY.en.detectedName,
          })
        );
      } catch {
        setSearchStatus("detectFailed");
      }
    },
    (error) => {
      detectButton.disabled = false;
      setSearchStatus(error.code === error.PERMISSION_DENIED ? "detectDenied" : "detectFailed");
    },
    { timeout: 10_000, maximumAge: 5 * 60_000 }
  );
}

function runSearch(): void {
  const query = citySearch.value.trim();
  const version = ++searchVersion;
  if (query.length < 2) {
    renderSearchResults([]);
    setSearchStatus();
    return;
  }
  setSearchStatus("searching");
  void searchPlaces(query, { limit: 5 })
    .then((found) => {
      // Only the newest query may draw, so a slow reply cannot overwrite it.
      if (version !== searchVersion) return;
      renderSearchResults(found);
      setSearchStatus(found.length === 0 ? "searchEmpty" : undefined);
    })
    .catch(() => {
      if (version !== searchVersion) return;
      renderSearchResults([]);
      setSearchStatus("searchFailed");
    });
}

function renderDate(day: PrayerDay): void {
  dateLine.textContent = `${cityName(day.city, locale)} · ${formatHijriDate(day.hijri, locale)}`;
  sourceLine.textContent = `${prayerMethodName(day.method, locale)} · ${text("updated")} ${formatUpdatedAt(day.fetchedAt, day.city.timeZone, locale)}`;
}

/** The suhoor or iftar countdown, shown only during Ramadan. */
function ramadanPanel(day: PrayerDay): HTMLElement | undefined {
  const status = fastingStatusFor(day);
  if (!status) return undefined;
  const panel = element(
    "div",
    "mb-3.5 rounded-15 border border-raml/[0.32] px-[15px] py-[13px] bg-[linear-gradient(135deg,rgba(242,214,162,0.14),rgba(233,128,110,0.08))]"
  );
  panel.append(
    element(
      "p",
      "mb-[5px] mt-0 text-10 font-extrabold tracking-[0.08em] text-raml",
      text("ramadanKicker")
    )
  );
  const main = element("div", "flex items-baseline gap-[9px]");
  if (status.phase === "completed") {
    main.append(element("strong", "font-display text-[17px]", text("fastCompleted")));
    main.append(
      element(
        "span",
        "text-11 text-muted",
        `${text("fastCompletedDetail")} ${formatPrayerTime(day.timings.Maghrib, locale)}`
      )
    );
  } else {
    const label = status.phase === "suhoor" ? text("suhoorLabel") : text("iftarLabel");
    main.append(element("span", "text-11 text-muted", label));
    main.append(
      element(
        "strong",
        "font-display text-[17px]",
        formatRemainingTime(status.minutesUntil ?? 0, locale)
      )
    );
    main.append(
      element("time", "ms-auto text-xs text-raml", formatPrayerTime(status.time ?? "", locale))
    );
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
  const summary = element(
    "div",
    "mt-1 rounded-21 border border-sama/[0.35] p-[19px] shadow-[inset_0_1px_rgba(245,248,255,0.08)] bg-[linear-gradient(135deg,rgba(77,168,218,0.15),rgba(20,36,73,0.66))]"
  );
  summary.append(
    element(
      "p",
      "mb-2 text-xs font-bold text-raml",
      next.isTomorrow ? text("nextPrayerTomorrow") : text("nextPrayer")
    )
  );
  const main = element("div", "flex items-end justify-between gap-3");
  main.append(
    element(
      "strong",
      "font-display text-27 leading-[1.1]",
      prayerNameForCity(next.key, day.city, locale)
    )
  );
  main.append(
    element(
      "time",
      "font-display text-29 font-bold tracking-[-0.04em] tabular-nums",
      formatPrayerTime(next.time, locale)
    )
  );
  summary.append(main);
  summary.append(
    element(
      "p",
      "mb-0 mt-[13px] text-xs text-muted",
      `${text("remaining")} ${formatRemainingTime(next.minutesUntil, locale)}`
    )
  );
  fragment.append(summary);

  const path = element(
    "div",
    "light-path relative mx-0.5 mb-0 mt-[17px] grid auto-cols-fr grid-flow-col gap-[3px]"
  );
  for (const entry of dayTimeline(day)) {
    const isNext = entry.kind === "prayer" && entry.key === next.key;
    const isMarker = entry.kind === "sunrise";
    const classes = [
      "prayer-node",
      "relative z-[1] grid justify-items-center gap-[5px] text-center text-10 text-muted",
    ];
    if (isNext) classes.push("is-next font-bold text-nur");
    // Sunrise divides the day without being a prayer, so it reads as a marker.
    if (isMarker) classes.push("is-marker opacity-[0.72]");
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
    node.append(element("time", "tabular-nums text-inherit", formatPrayerTime(entry.time, locale)));
    path.append(node);
  }
  fragment.append(path);
  prayerPanel.replaceChildren(fragment);
}

function renderNoCity(): void {
  dateLine.textContent = text("noCityDate");
  sourceLine.textContent = text("noCitySource");
  const empty = element(
    "div",
    "grid min-h-[190px] place-content-center justify-items-center text-center text-muted"
  );
  empty.append(
    element("span", "size-10 rounded-[50%_50%_50%_6px] border-8 border-sama opacity-75 rotate-45")
  );
  empty.append(element("p", "mb-0.5 mt-3 font-display text-base text-nur", text("noCityTitle")));
  empty.append(element("span", "max-w-[220px] text-xs", text("noCityBody")));
  prayerPanel.replaceChildren(empty);
}

function renderLoading(city: City): void {
  dateLine.textContent = `${cityName(city, locale)} · ${text("loadingDate")}`;
  sourceLine.textContent = text("pendingSource");
  const empty = element(
    "div",
    "grid min-h-[190px] place-content-center justify-items-center text-center text-muted"
  );
  empty.append(
    element("span", "size-10 rounded-[50%_50%_50%_6px] border-8 border-sama opacity-75 rotate-45")
  );
  empty.append(element("p", "mb-0.5 mt-3 font-display text-base text-nur", text("loadingTitle")));
  empty.append(element("span", "max-w-[220px] text-xs", text("loadingBody")));
  prayerPanel.replaceChildren(empty);
}

function renderError(city: City): void {
  dateLine.textContent = `${cityName(city, locale)} · ${text("unavailableDate")}`;
  sourceLine.textContent = text("pendingSource");
  const empty = element(
    "div",
    "grid min-h-[190px] place-content-center justify-items-center text-center text-muted"
  );
  empty.append(
    element("span", "size-10 rounded-[50%_50%_50%_6px] border-8 border-sama opacity-75 rotate-45")
  );
  empty.append(element("p", "mb-0.5 mt-3 font-display text-base text-nur", text("errorTitle")));
  empty.append(element("span", "max-w-[220px] text-xs", text("errorBody")));
  prayerPanel.replaceChildren(empty);
}

function renderAyah(): void {
  if (currentAyah) {
    const fragment = document.createDocumentFragment();
    const verse = element(
      "p",
      "m-0 font-quran text-xl leading-[1.8] text-raml-pale",
      `﴿${currentAyah.text}﴾`
    );
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
        "mb-0 mt-[5px] text-11 text-muted",
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
  ayahContent.replaceChildren(element("span", "text-xs text-muted", message));
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

/**
 * The authority selector, defaulting to whatever the place's country follows.
 * Choosing one pins it for that place only.
 */
function renderMethodSettings(): void {
  const base = resolveCity(extensionSettings.cityId, extensionSettings.savedCities);
  methodSelect.disabled = !base;
  if (!base) {
    methodSelect.replaceChildren();
    methodHint.textContent = "";
    return;
  }
  const override = extensionSettings.methodOverrides[base.id];
  const auto = prayerMethodForCity(base);
  const fragment = document.createDocumentFragment();
  const automatic = element(
    "option",
    undefined,
    `${text("methodAuto")} — ${prayerMethodName(auto, locale)}`
  );
  automatic.value = "";
  fragment.append(automatic);
  for (const method of allPrayerMethods()) {
    const option = element("option", undefined, prayerMethodName(method, locale));
    option.value = String(method.id);
    fragment.append(option);
  }
  methodSelect.replaceChildren(fragment);
  methodSelect.value = override === undefined ? "" : String(override);
  methodHint.textContent = override === undefined ? "" : text("methodOverridden");
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
  testNotificationButton.disabled = !notificationToggle.checked || !currentCity();
  const city = currentCity();
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
  const city = cityFor(citySelect.value);
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
  const cached = !force ? readCachedPrayerDay(localStorage, city, date) : undefined;
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
    // A zone that disagrees with the coordinates is not a network problem, and
    // saying so would send the reader chasing the wrong fix.
    const reason: unknown = prayerResult.reason;
    setStatus(
      reason instanceof VerificationError && reason.field === "timeZone"
        ? "zoneMismatch"
        : "unavailable",
      "error"
    );
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
  document.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]").forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    if (key && key in EXTENSION_COPY[locale]) node.placeholder = text(key as ExtensionCopyKey);
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
  const selectedCity = cityFor(citySelect.value || extensionSettings.cityId);
  const methodDetail = document.querySelector<HTMLElement>("[data-i18n='methodDetail']");
  if (methodDetail && selectedCity) {
    methodDetail.textContent = prayerMethodName(prayerMethodForCity(selectedCity), locale);
  }
  document.querySelectorAll<HTMLElement>("[data-prayer-label]").forEach((node) => {
    const key = node.dataset.prayerLabel;
    if (key && PRAYER_KEYS.includes(key as PrayerKey)) {
      const city = currentCity();
      node.textContent = city
        ? prayerNameForCity(key as PrayerKey, city, locale)
        : prayerName(key as PrayerKey, locale);
    }
  });
  renderView();
  renderMethodSettings();
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
  detectButton.addEventListener("click", detectLocation);
  let searchTimer: number | undefined;
  citySearch.addEventListener("input", () => {
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(runSearch, 300);
  });
  refreshButton.addEventListener("click", () => void loadSelectedCity(true));
  languageButton.addEventListener("click", () => {
    locale = locale === "ar" ? "en" : "ar";
    void persistSettings({ ...extensionSettings, locale });
    applyLocale();
  });
  methodSelect.addEventListener("change", () => {
    void (async () => {
      const base = resolveCity(extensionSettings.cityId, extensionSettings.savedCities);
      if (!base) return;
      const overrides = { ...extensionSettings.methodOverrides };
      const chosen = Number(methodSelect.value);
      // An empty choice returns the place to its country default.
      if (methodSelect.value === "" || !isPrayerMethodId(chosen)) delete overrides[base.id];
      else overrides[base.id] = chosen;
      await persistSettings({ ...extensionSettings, methodOverrides: overrides });
      renderMethodSettings();
      // The stored day was calculated by the old authority, so it is refetched.
      await loadSelectedCity(true);
    })();
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
  populateCities();
  citySelect.value = resolveCity(extensionSettings.cityId, extensionSettings.savedCities)
    ? extensionSettings.cityId
    : "";
  installEvents();
  renderMethodSettings();
  renderBadgeSettings();
  await renderNotificationSettings();
  await loadSelectedCity();
}

void initialize();
