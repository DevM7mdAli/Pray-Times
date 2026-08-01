import type { City } from "./types.js";

/**
 * The Kaaba, Al-Masjid Al-Haram. The qibla is computed from these fixed
 * coordinates and the city's own fixed coordinates, so it needs no provider and
 * no device location.
 */
export const KAABA = { latitude: 21.4224779, longitude: 39.8251832 } as const;

const EARTH_RADIUS_KM = 6371.0088;

/** Inside this distance a compass bearing stops being meaningful. */
const AT_HARAM_KM = 1;

export type Qibla = {
  /** Initial great-circle bearing in degrees clockwise from true north. */
  bearing: number;
  distanceKm: number;
  /**
   * True when the city is effectively at the Haram, where any bearing would be
   * noise rather than direction.
   */
  atHaram: boolean;
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

/**
 * The initial bearing of the great-circle path to the Kaaba.
 *
 * This is the standard qibla: the shortest path over the sphere, which is not
 * the same as a constant-heading line on a flat map.
 */
export function qiblaFor(point: { latitude: number; longitude: number }): Qibla {
  const fromLat = toRadians(point.latitude);
  const toLat = toRadians(KAABA.latitude);
  const deltaLong = toRadians(KAABA.longitude - point.longitude);

  const y = Math.sin(deltaLong) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLong);
  const bearing = (toDegrees(Math.atan2(y, x)) + 360) % 360;

  const haversine =
    Math.sin((toLat - fromLat) / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLong / 2) ** 2;
  const distanceKm = 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(haversine)));

  return { bearing, distanceKm, atHaram: distanceKm <= AT_HARAM_KM };
}

export function qiblaForCity(city: City): Qibla {
  return qiblaFor(city);
}

/** The nearest compass point, for describing a bearing in words. */
export type CompassPoint = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

const COMPASS_POINTS: readonly CompassPoint[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function compassPointFor(bearing: number): CompassPoint {
  const index = Math.round((((bearing % 360) + 360) % 360) / 45) % 8;
  return COMPASS_POINTS[index] as CompassPoint;
}
