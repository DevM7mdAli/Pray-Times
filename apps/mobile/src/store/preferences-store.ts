import { getLocales } from "expo-localization";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { z } from "zod";
import {
  CITIES,
  PRAYER_KEYS,
  SUPPORTED_LOCALES,
  citySchema,
  cityWithMethod,
  iqamahSettingsByCitySchema,
  isPrayerMethodId,
  resolveCity,
  type City,
  type IqamahTimeSetting,
  type PrayerKey,
  type PrayerMethodId,
  type SupportedLocale,
} from "@pray-times/core";
import { appStorage } from "@/lib/storage";

const enabledPrayersSchema = z.object({
  Fajr: z.boolean(),
  Dhuhr: z.boolean(),
  Asr: z.boolean(),
  Maghrib: z.boolean(),
  Isha: z.boolean(),
});

const preferencesDataSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES),
  cityId: z.string().min(1),
  savedCities: z.array(citySchema),
  methodOverrides: z.record(
    z.string().min(1),
    z
      .number()
      .int()
      .refine((value): value is PrayerMethodId => isPrayerMethodId(value))
  ),
  iqamahByCity: iqamahSettingsByCitySchema.default({}),
  enabledPrayers: enabledPrayersSchema,
  notificationsEnabled: z.boolean(),
});

type PreferencesData = z.infer<typeof preferencesDataSchema>;

type PreferencesStore = PreferencesData & {
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setLocale: (locale: SupportedLocale) => void;
  selectCity: (cityId: string) => void;
  saveCity: (city: City) => void;
  setMethodOverride: (cityId: string, methodId?: PrayerMethodId) => void;
  setIqamahSetting: (cityId: string, key: PrayerKey, setting?: IqamahTimeSetting) => void;
  setPrayerEnabled: (key: PrayerKey, enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
};

const ALL_PRAYERS_ENABLED: Record<PrayerKey, boolean> = {
  Fajr: true,
  Dhuhr: true,
  Asr: true,
  Maghrib: true,
  Isha: true,
};

function deviceLocale(): SupportedLocale {
  return getLocales().some((locale) => locale.languageCode === "ar") ? "ar" : "en";
}

const initialPreferences: PreferencesData = {
  locale: deviceLocale(),
  cityId: "riyadh",
  savedCities: [],
  methodOverrides: {},
  iqamahByCity: {},
  enabledPrayers: ALL_PRAYERS_ENABLED,
  notificationsEnabled: false,
};

const envelopeSchema = z.object({ state: preferencesDataSchema, version: z.number().int() });

/** Zustand does not validate JSON persistence itself; reject corrupt or stale state at the boundary. */
const validatedStorage: StateStorage = {
  async getItem(name) {
    try {
      const raw = await appStorage.getItem(name);
      if (!raw) return null;
      const parsed = envelopeSchema.safeParse(JSON.parse(raw));
      return parsed.success ? JSON.stringify(parsed.data) : null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => appStorage.setItem(name, value),
  removeItem: (name) => appStorage.removeItem(name),
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      ...initialPreferences,
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setLocale: (locale) => set({ locale }),
      selectCity: (cityId) => set({ cityId }),
      saveCity: (city) =>
        set((state) => {
          const index = state.savedCities.findIndex((item) => item.id === city.id);
          const savedCities = index === -1 ? [...state.savedCities, city] : [...state.savedCities];
          if (index !== -1) savedCities[index] = city;
          return { savedCities };
        }),
      setMethodOverride: (cityId, methodId) =>
        set((state) => {
          const methodOverrides = { ...state.methodOverrides };
          if (methodId === undefined) delete methodOverrides[cityId];
          else methodOverrides[cityId] = methodId;
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
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
    }),
    {
      name: "pray-times:mobile-preferences:v1",
      version: 1,
      storage: createJSONStorage(() => validatedStorage),
      partialize: (state) => ({
        locale: state.locale,
        cityId: state.cityId,
        savedCities: state.savedCities,
        methodOverrides: state.methodOverrides,
        iqamahByCity: state.iqamahByCity,
        enabledPrayers: state.enabledPrayers,
        notificationsEnabled: state.notificationsEnabled,
      }),
      migrate: (persisted) => {
        const parsed = preferencesDataSchema.safeParse(persisted);
        return parsed.success ? parsed.data : initialPreferences;
      },
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
);

export function selectedCityForPreferences(
  state: Pick<PreferencesData, "cityId" | "savedCities" | "methodOverrides">
): City {
  const base = resolveCity(state.cityId, state.savedCities) ?? CITIES[0]!;
  return cityWithMethod(base, state.methodOverrides[base.id]);
}

export { PRAYER_KEYS };
