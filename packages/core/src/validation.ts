import { z } from "zod";
import { PRAYER_METHOD_IDS, type PrayerMethodId } from "./methods.js";
import { PRAYER_KEYS, type City, type IqamahSettingsByCity, type PrayerDay } from "./types.js";

const prayerMethodIdSchema = z
  .number()
  .int()
  .refine((value): value is PrayerMethodId =>
    (PRAYER_METHOD_IDS as readonly number[]).includes(value)
  );

export const citySchema = z.object({
  id: z.string().trim().min(1),
  nameAr: z.string(),
  nameEn: z.string(),
  latitude: z.number().finite().gte(-90).lte(90),
  longitude: z.number().finite().gte(-180).lte(180),
  timeZone: z.string().trim().min(1),
  countryCode: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .optional(),
  methodId: prayerMethodIdSchema.optional(),
  source: z.enum(["preset", "searched", "detected"]).optional(),
});

const prayerTimingsSchema = z.object(
  Object.fromEntries(PRAYER_KEYS.map((key) => [key, z.string().min(1)])) as Record<
    (typeof PRAYER_KEYS)[number],
    z.ZodString
  >
);

const prayerMethodSchema = z.object({
  id: prayerMethodIdSchema,
  name: z.string().min(1),
  nameAr: z.string().min(1),
  experimental: z.boolean().optional(),
  combinesPrayers: z.boolean().optional(),
});

export const iqamahTimeSettingSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("offset"), minutes: z.number().int().gte(0).lte(180) }),
  z.object({ mode: z.literal("exact"), time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/) }),
]);

export const prayerIqamahSettingsSchema = z.object({
  Fajr: iqamahTimeSettingSchema.optional(),
  Dhuhr: iqamahTimeSettingSchema.optional(),
  Asr: iqamahTimeSettingSchema.optional(),
  Maghrib: iqamahTimeSettingSchema.optional(),
  Isha: iqamahTimeSettingSchema.optional(),
});

export const iqamahSettingsByCitySchema = z.record(z.string().min(1), prayerIqamahSettingsSchema);

export function parseIqamahSettingsByCity(value: unknown): IqamahSettingsByCity {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: IqamahSettingsByCity = {};
  for (const [cityId, rawSettings] of Object.entries(value)) {
    if (!cityId || !rawSettings || typeof rawSettings !== "object" || Array.isArray(rawSettings)) {
      continue;
    }
    const settings: IqamahSettingsByCity[string] = {};
    for (const key of PRAYER_KEYS) {
      const parsed = iqamahTimeSettingSchema.safeParse(
        (rawSettings as Record<string, unknown>)[key]
      );
      if (parsed.success) settings[key] = parsed.data;
    }
    if (Object.keys(settings).length > 0) result[cityId] = settings;
  }
  return result;
}

export const prayerDaySchema = z.object({
  requestedDate: z.string().regex(/^\d{2}-\d{2}-\d{4}$/),
  city: citySchema,
  method: prayerMethodSchema,
  timings: prayerTimingsSchema,
  sunrise: z.string().min(1).optional(),
  sunset: z.string().min(1).optional(),
  imsak: z.string().min(1).optional(),
  hijri: z.object({
    day: z.string().min(1),
    month: z.number().int().gte(1).lte(12).optional(),
    monthAr: z.string().min(1),
    monthEn: z.string().min(1),
    year: z.string().min(1),
  }),
  fetchedAt: z.string().min(1),
});

/** Parses persisted or cross-boundary data without trusting its TypeScript cast. */
export function parsePrayerDay(value: unknown): PrayerDay | undefined {
  const result = prayerDaySchema.safeParse(value);
  return result.success ? (result.data as PrayerDay) : undefined;
}

/** Parses a persisted place structurally; callers still apply runtime timezone checks. */
export function parseCity(value: unknown): City | undefined {
  const result = citySchema.safeParse(value);
  return result.success ? (result.data as City) : undefined;
}
