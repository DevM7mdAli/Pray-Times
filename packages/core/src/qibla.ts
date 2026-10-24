import type { City } from "./types.js";

/**
 * The Kaaba, Al-Masjid Al-Haram. The qibla is computed from these fixed
 * coordinates and the city's own fixed coordinates, so it needs no provider and
 * no device location.
 */
export const KAABA = { latitude: 21.4225, longitude: 39.8262 } as const;

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
  const bearing = normalizeDegrees(toDegrees(Math.atan2(y, x)));

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
  const index = Math.round(normalizeDegrees(bearing) / 45) % 8;
  return COMPASS_POINTS[index] as CompassPoint;
}

/** Any angle folded into [0, 360). */
export function normalizeDegrees(degrees: number): number {
  const folded = degrees % 360;
  // `+ 0` turns -0 into 0.
  return (folded < 0 ? folded + 360 : folded) + 0;
}

/** The signed shortest turn from one bearing to another, in (-180, 180]. */
export function angleDelta(from: number, to: number): number {
  const delta = normalizeDegrees(to - from);
  return delta > 180 ? delta - 360 : delta;
}

/** A raw device compass reading, as `expo-location` reports it. */
export type HeadingReading = {
  /** Degrees from true north; `-1` when the platform cannot tell. */
  trueHeading: number;
  /** Degrees from magnetic north. */
  magHeading: number;
};

export type DeviceHeading = {
  /** Degrees clockwise from north, in [0, 360). */
  degrees: number;
  /**
   * False when only magnetic north was available. The qibla bearing is from
   * true north, so a magnetic heading is off by the local declination.
   */
  isTrueNorth: boolean;
};

/**
 * Picks the true-north heading when the platform has one.
 *
 * `-1` is the "unknown" sentinel on both platforms. Android also adds the
 * declination without folding the sum, so a heading just east of magnetic
 * north with a westerly declination arrives as a small negative number; that
 * is still a true heading and must not fall back to magnetic north.
 */
export function deviceHeadingFrom(reading: HeadingReading): DeviceHeading | undefined {
  const { trueHeading, magHeading } = reading;
  if (Number.isFinite(trueHeading) && trueHeading !== -1 && trueHeading > -360) {
    return { degrees: normalizeDegrees(trueHeading), isTrueNorth: true };
  }
  if (Number.isFinite(magHeading) && magHeading >= 0) {
    return { degrees: normalizeDegrees(magHeading), isTrueNorth: false };
  }
  return undefined;
}

/**
 * Low-pass filters a compass heading along the shortest arc, so a reading that
 * crosses north eases from 359° to 1° instead of sweeping back through 180°.
 * `factor` is how far each reading moves the result, from 0 (frozen) to 1 (raw).
 */
export function smoothHeading(previous: number | undefined, next: number, factor = 0.25): number {
  if (previous === undefined) return normalizeDegrees(next);
  return normalizeDegrees(previous + angleDelta(previous, next) * factor);
}

/**
 * Compass calibration on the `expo-location` scale, where iOS maps 3 to under
 * 20° of uncertainty, 2 to under 35°, 1 to under 50° and 0 to worse or unknown.
 * Android reports its sensor status on the same 0–3 scale.
 */
export function isHeadingAccuracyLow(accuracy: number): boolean {
  return !(accuracy >= 2);
}

/** A browser `deviceorientation` event, reduced to what a compass needs. */
export type OrientationReading = {
  /** Degrees counter-clockwise around the screen normal. */
  alpha: number | null;
  /** True when `alpha` is measured from north rather than an arbitrary start. */
  absolute: boolean;
  /** Safari only: degrees clockwise from magnetic north. */
  webkitCompassHeading?: number;
  /** Safari only: ± degrees of uncertainty, negative when uncalibrated. */
  webkitCompassAccuracy?: number;
};

export type OrientationHeading = DeviceHeading & {
  /** Calibration on the 0–3 scale of `isHeadingAccuracyLow`, when the browser reports it. */
  accuracy: number | undefined;
};

/**
 * The heading of the top of the screen from a browser orientation event.
 *
 * Browsers measure both readings against the top of the device, so the screen
 * rotation (`screen.orientation.angle`, counter-clockwise) is added back for a
 * device held in landscape. A non-absolute `alpha` is relative to wherever the
 * page started listening and is rejected. Every browser reading is magnetic:
 * Safari says so, and Chrome's absolute frame comes from Android's rotation
 * vector, which points at magnetic north. Passing the local `declination`
 * (from `magneticDeclination`) turns it into a true-north heading.
 */
export function orientationHeadingFrom(
  reading: OrientationReading,
  screenAngle: number,
  declination?: number
): OrientationHeading | undefined {
  const { alpha, absolute, webkitCompassHeading, webkitCompassAccuracy } = reading;
  let deviceDegrees: number;
  if (
    typeof webkitCompassHeading === "number" &&
    Number.isFinite(webkitCompassHeading) &&
    webkitCompassHeading >= 0
  ) {
    deviceDegrees = webkitCompassHeading;
  } else if (absolute && typeof alpha === "number" && Number.isFinite(alpha)) {
    // `alpha` turns counter-clockwise; compass headings turn clockwise.
    deviceDegrees = 360 - alpha;
  } else {
    return undefined;
  }
  const angle = Number.isFinite(screenAngle) ? screenAngle : 0;
  const isTrueNorth = declination !== undefined && Number.isFinite(declination);
  return {
    degrees: normalizeDegrees(deviceDegrees + angle + (isTrueNorth ? declination : 0)),
    isTrueNorth,
    accuracy:
      webkitCompassAccuracy === undefined ? undefined : compassAccuracyLevel(webkitCompassAccuracy),
  };
}

/**
 * Maps Safari's ± degrees of compass uncertainty onto the 0–3 calibration scale
 * that `isHeadingAccuracyLow` reads, using the same bands as iOS itself.
 */
export function compassAccuracyLevel(uncertaintyDegrees: number): number {
  if (!Number.isFinite(uncertaintyDegrees) || uncertaintyDegrees < 0) return 0;
  if (uncertaintyDegrees < 20) return 3;
  if (uncertaintyDegrees < 35) return 2;
  if (uncertaintyDegrees < 50) return 1;
  return 0;
}
