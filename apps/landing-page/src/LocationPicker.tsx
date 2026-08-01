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
    <div className="today-location">
      <label className="today-city-picker">
        <span>{copy.city}</span>
        <select
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

      <div className="today-city-search">
        <label htmlFor={`${listId}-input`}>{copy.searchLabel}</label>
        <input
          id={`${listId}-input`}
          type="search"
          value={query}
          placeholder={copy.searchPlaceholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          onChange={(event) => setQuery(event.target.value)}
        />
        {state === "searching" ? <p role="status">{copy.searching}</p> : null}
        {state === "failed" ? <p role="status">{copy.failed}</p> : null}
        {state === "idle" && query.trim().length >= 2 && results.length === 0 ? (
          <p role="status">{copy.noResults}</p>
        ) : null}
        {results.length > 0 ? (
          <ul id={listId} role="listbox" aria-label={copy.searchLabel}>
            {results.map((suggestion) => (
              <li key={suggestion.city.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => choose(suggestion)}
                >
                  <strong>{cityName(suggestion.city, locale)}</strong>
                  <span>{locale === "ar" ? suggestion.contextAr : suggestion.contextEn}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="today-city-hint">{copy.hint}</p>
      </div>

      <div className="today-city-detect">
        <button type="button" onClick={detect} disabled={detectState === "detecting"}>
          {detectState === "detecting" ? copy.detecting : copy.detect}
        </button>
        {detectState === "denied" ? <p role="status">{copy.detectDenied}</p> : null}
        {detectState === "failed" ? <p role="status">{copy.detectFailed}</p> : null}
        {detectState === "unsupported" ? <p role="status">{copy.detectUnsupported}</p> : null}
        <p className="today-city-hint">{copy.detectNote}</p>
        <p className="today-city-hint">{copy.attribution}</p>
      </div>
    </div>
  );
}
