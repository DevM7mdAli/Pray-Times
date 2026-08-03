import { useMemo } from "react";
import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import {
  CITIES,
  PRAYER_KEYS,
  cityWithMethod,
  parseIqamahSettingsByCity,
  parseMethodOverrides,
  parseSavedCities,
  resolveCity,
  type City,
  type IqamahSettingsByCity,
  type IqamahTimeSetting,
  type PrayerKey,
  type PrayerMethodId,
} from "@pray-times/core";

/** Unchanged from before the store existed, so a returning reader keeps their setup. */
const KEYS = {
  cityId: "pray-times:today-city",
  enabledPrayers: "pray-times:web-alert-prayers",
  savedCities: "pray-times:saved-places:v1",
  methodOverrides: "pray-times:method-overrides:v1",
  iqamahByCity: "pray-times:iqamah-by-city:v1",
} as const;

const DEFAULT_CITY_ID = "riyadh";

const ALL_PRAYERS_ENABLED: Record<PrayerKey, boolean> = {
  Fajr: true,
  Dhuhr: true,
  Asr: true,
  Maghrib: true,
  Isha: true,
};

export type Preferences = {
  cityId: string;
  savedCities: City[];
  methodOverrides: Record<string, PrayerMethodId>;
  iqamahByCity: IqamahSettingsByCity;
  enabledPrayers: Record<PrayerKey, boolean>;
};

export type PreferencesStore = Preferences & {
  selectCity: (id: string) => void;
  savePlace: (place: City) => void;
  setMethodOverride: (cityId: string, method: PrayerMethodId | undefined) => void;
  setIqamahSetting: (cityId: string, key: PrayerKey, setting?: IqamahTimeSetting) => void;
  setPrayerEnabled: (key: PrayerKey, enabled: boolean) => void;
};

function read(key: string): unknown {
  const raw = localStorage.getItem(key);
  return raw === null ? null : (JSON.parse(raw) as unknown);
}

function parseEnabledPrayers(value: unknown): Record<PrayerKey, boolean> {
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if (PRAYER_KEYS.every((key) => typeof candidate[key] === "boolean")) {
      return Object.fromEntries(PRAYER_KEYS.map((key) => [key, candidate[key]])) as Record<
        PrayerKey,
        boolean
      >;
    }
  }
  return { ...ALL_PRAYERS_ENABLED };
}

/**
 * Reads and writes the existing preference keys rather than one opaque blob
 * under a new name, so upgrading does not silently reset anyone's city, saved
 * places, calculation methods or alert choices. Validation is core's — the same
 * parsers that guarded these values before.
 */
const storage: PersistStorage<Preferences> = {
  getItem: (): StorageValue<Preferences> => {
    try {
      return {
        state: {
          // Any id is accepted here; it is resolved against the saved list later
          // and falls back to the default when it no longer matches a place.
          cityId: localStorage.getItem(KEYS.cityId) ?? DEFAULT_CITY_ID,
          savedCities: parseSavedCities(read(KEYS.savedCities)),
          methodOverrides: parseMethodOverrides(read(KEYS.methodOverrides)),
          iqamahByCity: parseIqamahSettingsByCity(read(KEYS.iqamahByCity)),
          enabledPrayers: parseEnabledPrayers(read(KEYS.enabledPrayers)),
        },
      };
    } catch {
      // Unreadable storage leaves the defaults in place for this visit.
      return {
        state: {
          cityId: DEFAULT_CITY_ID,
          savedCities: [],
          methodOverrides: {},
          iqamahByCity: {},
          enabledPrayers: { ...ALL_PRAYERS_ENABLED },
        },
      };
    }
  },
  setItem: (_name, value) => {
    try {
      localStorage.setItem(KEYS.cityId, value.state.cityId);
      localStorage.setItem(KEYS.savedCities, JSON.stringify(value.state.savedCities));
      localStorage.setItem(KEYS.methodOverrides, JSON.stringify(value.state.methodOverrides));
      localStorage.setItem(KEYS.iqamahByCity, JSON.stringify(value.state.iqamahByCity));
      localStorage.setItem(KEYS.enabledPrayers, JSON.stringify(value.state.enabledPrayers));
    } catch {
      // Preferences remain available for this visit.
    }
  },
  removeItem: () => {
    try {
      for (const key of Object.values(KEYS)) localStorage.removeItem(key);
    } catch {
      // Nothing to clean up when storage is unavailable.
    }
  },
};

export const usePreferences = create<PreferencesStore>()(
  persist(
    (set) => ({
      cityId: DEFAULT_CITY_ID,
      savedCities: [],
      methodOverrides: {},
      iqamahByCity: {},
      enabledPrayers: { ...ALL_PRAYERS_ENABLED },

      selectCity: (id) => set({ cityId: id }),

      savePlace: (place) =>
        set((state) => {
          const index = state.savedCities.findIndex((entry) => entry.id === place.id);
          if (index === -1) return { savedCities: [...state.savedCities, place] };
          // A detected place keeps one id as the reader moves, so a fresh
          // reading replaces the stored one rather than being ignored.
          const savedCities = [...state.savedCities];
          savedCities[index] = place;
          return { savedCities };
        }),

      setMethodOverride: (cityId, method) =>
        set((state) => {
          const methodOverrides = { ...state.methodOverrides };
          // Clearing the choice returns the place to its country default.
          if (method === undefined) delete methodOverrides[cityId];
          else methodOverrides[cityId] = method;
          return { methodOverrides };
        }),

      setIqamahSetting: (cityId, key, setting) =>
        set((state) => {
          const iqamahByCity = { ...state.iqamahByCity };
          const citySettings = { ...(iqamahByCity[cityId] ?? {}) };
          if (setting) citySettings[key] = setting;
          else delete citySettings[key];
          if (Object.keys(citySettings).length === 0) delete iqamahByCity[cityId];
          else iqamahByCity[cityId] = citySettings;
          return { iqamahByCity };
        }),

      setPrayerEnabled: (key, enabled) =>
        set((state) => ({ enabledPrayers: { ...state.enabledPrayers, [key]: enabled } })),
    }),
    { name: "pray-times:preferences", storage }
  )
);

/**
 * The place the dashboard is showing, with any per-place method layered on so
 * the override reaches the request and the cache check, not only the selector.
 */
export function useSelectedCity(): City {
  const cityId = usePreferences((state) => state.cityId);
  const savedCities = usePreferences((state) => state.savedCities);
  const methodOverrides = usePreferences((state) => state.methodOverrides);

  return useMemo(() => {
    const base = resolveCity(cityId, savedCities) ?? CITIES[0]!;
    return cityWithMethod(base, methodOverrides[base.id]);
  }, [cityId, methodOverrides, savedCities]);
}

/** The same place without a method override, for showing what the default would be. */
export function useDefaultCity(): City {
  const cityId = usePreferences((state) => state.cityId);
  const savedCities = usePreferences((state) => state.savedCities);
  return useMemo(() => resolveCity(cityId, savedCities) ?? CITIES[0]!, [cityId, savedCities]);
}
