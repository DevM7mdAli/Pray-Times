import { useEffect, useId, useRef, useState } from "react";
import {
  CITIES,
  cityFromCoordinates,
  cityName,
  searchPlaces,
  type City,
  type PlaceSuggestion,
  type SupportedLocale,
} from "@pray-times/core";

const COPY = {
  ar: {
    city: "المدينة",
    selectCity: "اختر المدينة",
    presets: "مدن جاهزة",
    saved: "أماكن أضفتها",
    searchLabel: "ابحث عن مدينة في أي مكان",
    searchPlaceholder: "ابحث عن مدينة…",
    searching: "نبحث…",
    noResults: "لا توجد نتيجة مطابقة.",
    failed: "تعذّر البحث الآن. تحقق من الاتصال.",
    hint: "المدن الجاهزة تعمل دون اتصال. البحث يضيف أي مدينة في العالم.",
    detect: "استخدم موقعي الحالي",
    detecting: "نحدد موقعك…",
    detectedName: "موقعي الحالي",
    detectDenied: "لم يُسمح بالوصول إلى الموقع. اختر مدينة أو ابحث عنها.",
    detectFailed: "تعذّر تحديد الموقع. اختر مدينة أو ابحث عنها.",
    detectUnsupported: "هذا المتصفح لا يوفر تحديد الموقع.",
    detectNote: "نقرّب الإحداثيات إلى نحو كيلومتر، ولا ترسل إلا لجلب المواقيت.",
    attribution: "بحث الأماكن عبر Open-Meteo",
  },
  en: {
    city: "City",
    selectCity: "Choose a city",
    presets: "Built-in cities",
    saved: "Places you added",
    searchLabel: "Search for a city anywhere",
    searchPlaceholder: "Search for a city…",
    searching: "Searching…",
    noResults: "No matching place.",
    failed: "Search is unavailable. Check your connection.",
    hint: "Built-in cities work offline. Search adds any city in the world.",
    detect: "Use my current location",
    detecting: "Finding you…",
    detectedName: "Current location",
    detectDenied: "Location access was refused. Choose or search for a city instead.",
    detectFailed: "Your location could not be determined. Choose or search for a city instead.",
    detectUnsupported: "This browser cannot report a location.",
    detectNote: "Coordinates are rounded to about a kilometre and only sent to fetch prayer times.",
    attribution: "Place search by Open-Meteo",
  },
} as const;

type SearchState = "idle" | "searching" | "failed";
type DetectState = "idle" | "detecting" | "denied" | "failed" | "unsupported";

export function LocationPicker({
  cityId,
  savedCities,
  locale,
  onSelect,
  onSave,
}: {
  cityId: string;
  savedCities: readonly City[];
  locale: SupportedLocale;
  onSelect: (id: string) => void;
  onSave: (city: City) => void;
}) {
  const copy = COPY[locale];
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [detectState, setDetectState] = useState<DetectState>("idle");
  // Only the newest query may write results, so a slow response cannot
  // overwrite a newer one.
  const requestVersion = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    const version = ++requestVersion.current;
    if (trimmed.length < 2) {
      setResults([]);
      setState("idle");
      return;
    }
    setState("searching");
    const timer = window.setTimeout(() => {
      void searchPlaces(trimmed, { limit: 6 })
        .then((found) => {
          if (version !== requestVersion.current) return;
          setResults(found);
          setState("idle");
        })
        .catch(() => {
          if (version !== requestVersion.current) return;
          setResults([]);
          setState("failed");
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const detect = () => {
    if (!("geolocation" in navigator)) {
      setDetectState("unsupported");
      return;
    }
    setDetectState("detecting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          const place = cityFromCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            // The device's own zone is the anchor; the provider must agree with
            // it or the response is rejected like any other.
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            nameAr: COPY.ar.detectedName,
            nameEn: COPY.en.detectedName,
          });
          onSave(place);
          onSelect(place.id);
          setDetectState("idle");
        } catch {
          setDetectState("failed");
        }
      },
      (error) => {
        setDetectState(error.code === error.PERMISSION_DENIED ? "denied" : "failed");
      },
      { timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  };

  const choose = (suggestion: PlaceSuggestion) => {
    onSave(suggestion.city);
    onSelect(suggestion.city.id);
    setQuery("");
    setResults([]);
    setState("idle");
  };

  return (
    <div className="col-start-2 row-span-3 row-start-1 grid min-w-[265px] max-w-md gap-4 max-tablet:col-start-1 max-tablet:row-auto max-tablet:mt-5 max-tablet:max-w-none">
      <label className="grid gap-2 text-xs text-muted">
        <span>{copy.city}</span>
        <select
          className="min-h-[54px] w-full rounded-15 border border-nur/[0.18] bg-layl-soft px-[17px] font-body text-15 font-bold text-nur"
          value={cityId}
          onChange={(event) => onSelect(event.target.value)}
          aria-label={copy.selectCity}
        >
          <optgroup label={copy.presets}>
            {CITIES.map((option) => (
              <option key={option.id} value={option.id}>
                {cityName(option, locale)}
              </option>
            ))}
          </optgroup>
          {savedCities.length > 0 ? (
            <optgroup label={copy.saved}>
              {savedCities.map((option) => (
                <option key={option.id} value={option.id}>
                  {cityName(option, locale)}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>

      <div className="relative grid gap-[7px]">
        <label className="text-xs text-muted" htmlFor={`${listId}-input`}>
          {copy.searchLabel}
        </label>
        <input
          id={`${listId}-input`}
          className="min-h-[46px] rounded-13 border border-nur/[0.16] bg-layl/60 px-[15px] text-nur focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sama"
          type="search"
          value={query}
          placeholder={copy.searchPlaceholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          onChange={(event) => setQuery(event.target.value)}
        />
        {state === "searching" ? (
          <p className="m-0 text-xs text-muted" role="status">
            {copy.searching}
          </p>
        ) : null}
        {state === "failed" ? (
          <p className="m-0 text-xs text-muted" role="status">
            {copy.failed}
          </p>
        ) : null}
        {state === "idle" && query.trim().length >= 2 && results.length === 0 ? (
          <p className="m-0 text-xs text-muted" role="status">
            {copy.noResults}
          </p>
        ) : null}
        {results.length > 0 ? (
          <ul
            className="absolute inset-x-0 top-full z-[5] mt-1.5 max-h-[17rem] list-none overflow-y-auto rounded-15 border border-sama/[0.34] bg-layl-soft p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.42)]"
            id={listId}
            role="listbox"
            aria-label={copy.searchLabel}
          >
            {results.map((suggestion) => (
              <li key={suggestion.city.id}>
                <button
                  className="grid w-full cursor-pointer gap-0.5 rounded-10 border-0 bg-transparent px-3 py-2.5 text-start text-inherit hover:bg-sama/15 hover:outline-none focus-visible:bg-sama/15 focus-visible:outline-none"
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => choose(suggestion)}
                >
                  <strong>{cityName(suggestion.city, locale)}</strong>
                  <span className="text-xs text-muted">
                    {locale === "ar" ? suggestion.contextAr : suggestion.contextEn}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-11">{copy.hint}</p>
      </div>

      <div className="grid justify-items-start gap-[7px]">
        <button
          className="min-h-10 cursor-pointer rounded-xl border border-nur/[0.18] bg-transparent px-[15px] text-13 font-bold text-nur disabled:cursor-progress disabled:opacity-60 [&:hover:not(:disabled)]:bg-nur/[0.08]"
          type="button"
          onClick={detect}
          disabled={detectState === "detecting"}
        >
          {detectState === "detecting" ? copy.detecting : copy.detect}
        </button>
        {detectState === "denied" ? (
          <p className="m-0 text-xs text-muted" role="status">
            {copy.detectDenied}
          </p>
        ) : null}
        {detectState === "failed" ? (
          <p className="m-0 text-xs text-muted" role="status">
            {copy.detectFailed}
          </p>
        ) : null}
        {detectState === "unsupported" ? (
          <p className="m-0 text-xs text-muted" role="status">
            {copy.detectUnsupported}
          </p>
        ) : null}
        <p className="text-11">{copy.detectNote}</p>
        <p className="text-11">{copy.attribution}</p>
      </div>
    </div>
  );
}
