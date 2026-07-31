import {
  CITIES,
  cachePrayerDay,
  cityById,
  fetchAyah,
  fetchPrayerDay,
  formatArabicTime,
  formatRemainingArabic,
  localDateFor,
  nextPrayerFor,
  prayerNameAr,
  readCachedPrayerDay,
  type Ayah,
  type PrayerDay
} from "@pray-times/core";

const CITY_STORAGE_KEY = "pray-times:city-id";

const citySelect = requiredElement<HTMLSelectElement>("city-select");
const prayerPanel = requiredElement<HTMLElement>("prayer-panel");
const ayahContent = requiredElement<HTMLElement>("ayah-content");
const dateLine = requiredElement<HTMLElement>("date-line");
const statusLine = requiredElement<HTMLElement>("status-line");
const sourceLine = requiredElement<HTMLElement>("source-line");
const refreshButton = requiredElement<HTMLButtonElement>("refresh-button");
const settingsDialog = requiredElement<HTMLDialogElement>("settings-dialog");

let currentDay: PrayerDay | undefined;
let countdownTimer: number | undefined;

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing #${id}`);
  return element as T;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setStatus(message = "", state: "info" | "error" = "info"): void {
  statusLine.textContent = message;
  statusLine.dataset.state = message ? state : "";
}

function populateCities(): void {
  const selected = localStorage.getItem(CITY_STORAGE_KEY) ?? "";
  const fragment = document.createDocumentFragment();
  CITIES.forEach((city) => {
    const option = document.createElement("option");
    option.value = city.id;
    option.textContent = city.nameAr;
    fragment.append(option);
  });
  citySelect.append(fragment);
  citySelect.value = cityById(selected) ? selected : "";
}

function renderDate(day: PrayerDay): void {
  dateLine.textContent = `${day.city.nameAr} · ${day.hijri.day} ${day.hijri.monthAr} ${day.hijri.year} هـ`;
  sourceLine.textContent = `${day.method.nameAr} · حُدّث ${new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: day.city.timeZone
  }).format(new Date(day.fetchedAt))}`;
}

function renderPrayerDay(day: PrayerDay): void {
  currentDay = day;
  renderDate(day);
  const next = nextPrayerFor(day);
  const fragment = document.createDocumentFragment();
  const summary = element("div", "next-prayer");
  summary.append(element("p", "next-prayer-label", next.isTomorrow ? "الصلاة القادمة غدًا" : "الصلاة القادمة"));
  const main = element("div", "next-prayer-main");
  main.append(element("strong", undefined, prayerNameAr(next.key)));
  main.append(element("time", "next-prayer-time", formatArabicTime(next.time)));
  summary.append(main);
  summary.append(element("p", "remaining-time", `متبقٍ ${formatRemainingArabic(next.minutesUntil)}`));
  fragment.append(summary);

  const path = element("div", "light-path");
  for (const key of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const) {
    const node = element("div", `prayer-node${key === next.key ? " is-next" : ""}`);
    if (key === next.key) node.setAttribute("aria-current", "time");
    node.append(element("span", undefined, prayerNameAr(key)));
    node.append(element("time", undefined, formatArabicTime(day.timings[key])));
    path.append(node);
  }
  fragment.append(path);
  prayerPanel.replaceChildren(fragment);
}

function renderAyah(ayah: Ayah): void {
  const fragment = document.createDocumentFragment();
  fragment.append(element("p", "ayah-text", `﴿${ayah.text}﴾`));
  fragment.append(element("p", "ayah-reference", `${ayah.surah.name} · ${ayah.numberInSurah}`));
  ayahContent.replaceChildren(fragment);
}

function renderAyahError(): void {
  ayahContent.replaceChildren(element("span", "ayah-error", "تعذّر جلب الآية الآن."));
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
  const city = cityById(citySelect.value);
  clearCountdown();
  currentDay = undefined;

  if (!city) {
    dateLine.textContent = "اختر مدينة لعرض مواقيت اليوم";
    sourceLine.textContent = "اختر مدينة لعرض طريقة الحساب";
    setStatus("");
    prayerPanel.replaceChildren(
      element("div", "empty-state", "")
    );
    const empty = prayerPanel.firstElementChild;
    empty?.append(element("span", "empty-orb"));
    empty?.append(element("p", undefined, "اختر مدينتك أولًا"));
    empty?.append(element("span", undefined, "سنستخدم إحداثياتها للتحقق من المواقيت."));
    ayahContent.replaceChildren(element("span", "ayah-loading", "تظهر الآية بعد اختيار المدينة."));
    return;
  }

  localStorage.setItem(CITY_STORAGE_KEY, city.id);
  const date = localDateFor(city.timeZone);
  const cached = !force ? readCachedPrayerDay(localStorage, city.id, date) : undefined;
  if (cached) {
    renderPrayerDay(cached);
    setStatus("يتم التحقق من أحدث البيانات…");
  } else {
    dateLine.textContent = `${city.nameAr} · جارٍ التحقق من المواقيت`;
    prayerPanel.replaceChildren(element("div", "empty-state", ""));
    prayerPanel.firstElementChild?.append(element("span", "empty-orb"));
    prayerPanel.firstElementChild?.append(element("p", undefined, "نُحضّر مسار اليوم"));
    setStatus("نستخدم إحداثيات المدينة وطريقة أم القرى.");
  }
  refreshButton.setAttribute("aria-busy", "true");

  const prayerPromise = fetchPrayerDay(city, { date });
  const ayahPromise = fetchAyah();
  const [prayerResult, ayahResult] = await Promise.allSettled([prayerPromise, ayahPromise]);
  refreshButton.removeAttribute("aria-busy");

  if (prayerResult.status === "fulfilled") {
    cachePrayerDay(localStorage, prayerResult.value);
    renderPrayerDay(prayerResult.value);
    setStatus("");
    startCountdown();
  } else if (cached) {
    renderPrayerDay(cached);
    setStatus("تعذّر التحقق الآن. نعرض آخر نتيجة محفوظة بتاريخ اليوم.", "error");
    startCountdown();
  } else {
    setStatus("تعذّر جلب المواقيت. تحقق من الاتصال ثم حدّث الصفحة.", "error");
    prayerPanel.replaceChildren(element("div", "empty-state", ""));
    prayerPanel.firstElementChild?.append(element("span", "empty-orb"));
    prayerPanel.firstElementChild?.append(element("p", undefined, "لم نعرض وقتًا غير متحقق"));
    prayerPanel.firstElementChild?.append(element("span", undefined, "حاول التحديث عند توفر الاتصال."));
  }

  if (ayahResult.status === "fulfilled") renderAyah(ayahResult.value);
  else renderAyahError();
}

function closeSettings(): void {
  if (settingsDialog.open) settingsDialog.close();
}

function installEvents(): void {
  citySelect.addEventListener("change", () => void loadSelectedCity());
  refreshButton.addEventListener("click", () => void loadSelectedCity(true));
  requiredElement<HTMLButtonElement>("settings-button").addEventListener("click", () => settingsDialog.showModal());
  requiredElement<HTMLButtonElement>("close-settings").addEventListener("click", closeSettings);
  requiredElement<HTMLButtonElement>("close-settings-primary").addEventListener("click", closeSettings);
  settingsDialog.addEventListener("click", (event) => {
    if (event.target === settingsDialog) closeSettings();
  });
}

populateCities();
installEvents();
void loadSelectedCity();
