import type { City } from "./types.js";

export const CITIES: readonly City[] = [
  {
    id: "riyadh",
    nameAr: "الرياض",
    nameEn: "Riyadh",
    latitude: 24.7136,
    longitude: 46.6753,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "jeddah",
    nameAr: "جدة",
    nameEn: "Jeddah",
    latitude: 21.4858,
    longitude: 39.1925,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "makkah",
    nameAr: "مكة المكرمة",
    nameEn: "Makkah",
    latitude: 21.3891,
    longitude: 39.8579,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "madinah",
    nameAr: "المدينة المنورة",
    nameEn: "Madinah",
    latitude: 24.5247,
    longitude: 39.5692,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "dammam",
    nameAr: "الدمام",
    nameEn: "Dammam",
    latitude: 26.4207,
    longitude: 50.0888,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "khobar",
    nameAr: "الخبر",
    nameEn: "Khobar",
    latitude: 26.2172,
    longitude: 50.1971,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "dhahran",
    nameAr: "الظهران",
    nameEn: "Dhahran",
    latitude: 26.2886,
    longitude: 50.1139,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "al-hofuf",
    nameAr: "الهفوف",
    nameEn: "Al Hofuf",
    latitude: 25.383,
    longitude: 49.5868,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "qatif",
    nameAr: "القطيف",
    nameEn: "Qatif",
    latitude: 26.5654,
    longitude: 50.0089,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "jubail",
    nameAr: "الجبيل",
    nameEn: "Jubail",
    latitude: 27.0174,
    longitude: 49.6225,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "buraydah",
    nameAr: "بريدة",
    nameEn: "Buraydah",
    latitude: 26.3592,
    longitude: 43.9818,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "unaizah",
    nameAr: "عنيزة",
    nameEn: "Unaizah",
    latitude: 26.09,
    longitude: 43.993,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "hail",
    nameAr: "حائل",
    nameEn: "Hail",
    latitude: 27.5114,
    longitude: 41.7208,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "tabuk",
    nameAr: "تبوك",
    nameEn: "Tabuk",
    latitude: 28.3838,
    longitude: 36.555,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "taif",
    nameAr: "الطائف",
    nameEn: "Taif",
    latitude: 21.2703,
    longitude: 40.4158,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "abha",
    nameAr: "أبها",
    nameEn: "Abha",
    latitude: 18.2164,
    longitude: 42.5053,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "khamis-mushait",
    nameAr: "خميس مشيط",
    nameEn: "Khamis Mushait",
    latitude: 18.3008,
    longitude: 42.7293,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "najran",
    nameAr: "نجران",
    nameEn: "Najran",
    latitude: 17.5656,
    longitude: 44.2289,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "jazan",
    nameAr: "جازان",
    nameEn: "Jazan",
    latitude: 16.8892,
    longitude: 42.5511,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "al-bahah",
    nameAr: "الباحة",
    nameEn: "Al Bahah",
    latitude: 20.0129,
    longitude: 41.4677,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "yanbu",
    nameAr: "ينبع",
    nameEn: "Yanbu",
    latitude: 24.0231,
    longitude: 38.189,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "sakaka",
    nameAr: "سكاكا",
    nameEn: "Sakaka",
    latitude: 29.9697,
    longitude: 40.2064,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "arar",
    nameAr: "عرعر",
    nameEn: "Arar",
    latitude: 30.9753,
    longitude: 41.0381,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "hafr-al-batin",
    nameAr: "حفر الباطن",
    nameEn: "Hafr Al Batin",
    latitude: 28.4328,
    longitude: 45.9708,
    timeZone: "Asia/Riyadh",
  },
  {
    id: "al-kharj",
    nameAr: "الخرج",
    nameEn: "Al Kharj",
    latitude: 24.1556,
    longitude: 47.312,
    timeZone: "Asia/Riyadh",
  },
];

export function cityById(id: string | null | undefined): City | undefined {
  return CITIES.find((city) => city.id === id);
}

export function assertCityCatalog(cities: readonly City[] = CITIES): void {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const seenCoordinates = new Set<string>();

  for (const city of cities) {
    if (seenIds.has(city.id) || seenNames.has(city.nameAr)) {
      throw new Error(`City catalog has a duplicate entry: ${city.id}`);
    }
    if (city.latitude < 16 || city.latitude > 33 || city.longitude < 34 || city.longitude > 56) {
      throw new Error(`City coordinates are outside Saudi Arabia: ${city.id}`);
    }
    const coordinateKey = `${city.latitude},${city.longitude}`;
    if (seenCoordinates.has(coordinateKey)) {
      throw new Error(`City catalog has duplicate coordinates: ${city.id}`);
    }
    seenIds.add(city.id);
    seenNames.add(city.nameAr);
    seenCoordinates.add(coordinateKey);
  }
}
