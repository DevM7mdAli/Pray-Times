/**
 * Prayer calculation methods, keyed by the provider's own method ids.
 *
 * A method is the authority whose parameters produce the times. Which one is
 * correct is a local question, so the catalog defaults per country and every
 * surface lets the reader override it.
 *
 * The ids are the provider's and must not be renumbered: they are sent on every
 * request and checked again on every response.
 */

export const PRAYER_METHOD_IDS = [
  0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
] as const;

export type PrayerMethodId = (typeof PRAYER_METHOD_IDS)[number];

export type PrayerMethod = {
  readonly id: PrayerMethodId;
  readonly name: string;
  readonly nameAr: string;
  /** Marked experimental by the provider. */
  readonly experimental?: boolean;
  /**
   * Whether the authority's practice combines Dhuhr with Asr and Maghrib with
   * Isha, so the day reads as three windows rather than five separate prayers.
   * This follows the method, never the place: anyone who selects such a method
   * sees the combined windows, wherever they are.
   */
  readonly combinesPrayers?: boolean;
};

export const PRAYER_METHODS: Readonly<Record<PrayerMethodId, PrayerMethod>> = {
  0: {
    id: 0,
    name: "Shia Ithna-Ashari",
    nameAr: "الشيعة الاثنا عشرية",
    combinesPrayers: true,
  },
  1: {
    id: 1,
    name: "University of Islamic Sciences, Karachi",
    nameAr: "جامعة العلوم الإسلامية، كراتشي",
  },
  2: {
    id: 2,
    name: "Islamic Society of North America (ISNA)",
    nameAr: "الجمعية الإسلامية لأمريكا الشمالية",
  },
  3: { id: 3, name: "Muslim World League", nameAr: "رابطة العالم الإسلامي" },
  4: { id: 4, name: "Umm Al-Qura University, Makkah", nameAr: "أم القرى، مكة المكرمة" },
  5: {
    id: 5,
    name: "Egyptian General Authority of Survey",
    nameAr: "الهيئة المصرية العامة للمساحة",
  },
  7: {
    id: 7,
    name: "Institute of Geophysics, University of Tehran",
    nameAr: "معهد الجيوفيزياء، جامعة طهران",
  },
  8: { id: 8, name: "Gulf Region", nameAr: "منطقة الخليج" },
  9: { id: 9, name: "Kuwait", nameAr: "الكويت" },
  10: { id: 10, name: "Qatar", nameAr: "قطر" },
  11: {
    id: 11,
    name: "Majlis Ugama Islam Singapura, Singapore",
    nameAr: "المجلس الإسلامي، سنغافورة",
  },
  12: {
    id: 12,
    name: "Union Organization Islamic de France",
    nameAr: "اتحاد المنظمات الإسلامية في فرنسا",
  },
  13: {
    id: 13,
    name: "Diyanet İşleri Başkanlığı, Turkey",
    nameAr: "رئاسة الشؤون الدينية، تركيا",
    experimental: true,
  },
  14: {
    id: 14,
    name: "Spiritual Administration of Muslims of Russia",
    nameAr: "الإدارة الروحية لمسلمي روسيا",
  },
  15: {
    id: 15,
    name: "Moonsighting Committee Worldwide",
    nameAr: "لجنة رؤية الهلال العالمية",
  },
  16: { id: 16, name: "Dubai", nameAr: "دبي", experimental: true },
  17: {
    id: 17,
    name: "Jabatan Kemajuan Islam Malaysia (JAKIM)",
    nameAr: "دائرة التنمية الإسلامية، ماليزيا",
  },
  18: { id: 18, name: "Tunisia", nameAr: "تونس" },
  19: { id: 19, name: "Algeria", nameAr: "الجزائر" },
  20: {
    id: 20,
    name: "Kementerian Agama Republik Indonesia",
    nameAr: "وزارة الشؤون الدينية، إندونيسيا",
  },
  21: { id: 21, name: "Morocco", nameAr: "المغرب" },
  22: { id: 22, name: "Comunidade Islamica de Lisboa", nameAr: "الجالية الإسلامية بلشبونة" },
  23: {
    id: 23,
    name: "Ministry of Awqaf, Islamic Affairs and Holy Places, Jordan",
    nameAr: "وزارة الأوقاف والشؤون والمقدسات الإسلامية، الأردن",
  },
};

/** Used wherever no local authority is a better answer. */
export const DEFAULT_PRAYER_METHOD_ID: PrayerMethodId = 3;

export const UMM_AL_QURA: PrayerMethod = PRAYER_METHODS[4];

/**
 * The authority normally followed in each country.
 *
 * Only a default: local practice varies inside borders, so anything absent here
 * falls back to the Muslim World League and every reader can override it.
 */
const METHOD_BY_COUNTRY: Readonly<Record<string, PrayerMethodId>> = {
  // Arabian peninsula
  SA: 4,
  KW: 9,
  QA: 10,
  AE: 8,
  BH: 8,
  OM: 8,
  YE: 4,
  // Levant and north Africa
  JO: 23,
  EG: 5,
  SD: 5,
  LY: 5,
  TN: 18,
  DZ: 19,
  MA: 21,
  // South and central Asia
  PK: 1,
  IN: 1,
  BD: 1,
  AF: 1,
  LK: 1,
  IR: 7,
  // South-east Asia
  MY: 17,
  BN: 17,
  ID: 20,
  SG: 11,
  // Europe
  FR: 12,
  PT: 22,
  RU: 14,
  KZ: 14,
  UZ: 14,
  KG: 14,
  TJ: 14,
  AZ: 14,
  TR: 13,
  // North America
  US: 2,
  CA: 2,
};

export function isPrayerMethodId(value: unknown): value is PrayerMethodId {
  return (PRAYER_METHOD_IDS as readonly unknown[]).includes(value);
}

export function prayerMethodById(id: unknown): PrayerMethod | undefined {
  return isPrayerMethodId(id) ? PRAYER_METHODS[id] : undefined;
}

/** Every method, in id order, for a settings list. */
export function allPrayerMethods(): readonly PrayerMethod[] {
  return PRAYER_METHOD_IDS.map((id) => PRAYER_METHODS[id]);
}

/**
 * The default authority for an ISO 3166-1 alpha-2 country code. An unknown or
 * missing country falls back to the Muslim World League.
 */
export function defaultMethodForCountry(countryCode?: string | null): PrayerMethod {
  const code = typeof countryCode === "string" ? countryCode.trim().toUpperCase() : "";
  return PRAYER_METHODS[METHOD_BY_COUNTRY[code] ?? DEFAULT_PRAYER_METHOD_ID];
}
