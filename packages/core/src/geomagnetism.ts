/**
 * Magnetic declination from the World Magnetic Model 2025 (NOAA NCEI and the
 * British Geological Survey), so a magnetic compass heading can be turned into
 * a true-north one. The model is public domain and valid from 2025.0 to 2030.0;
 * WMM2030 replaces these coefficients when it is published.
 */

const MODEL_EPOCH = 2025.0;
const MODEL_VALID_UNTIL = 2030.0;
const MAX_DEGREE = 12;

/** The geomagnetic reference radius, in km. */
const REFERENCE_RADIUS_KM = 6371.2;
/** WGS 84, which the model's latitudes and heights are measured against. */
const WGS84_SEMI_MAJOR_KM = 6378.137;
const WGS84_FLATTENING = 1 / 298.257223563;
const WGS84_ECCENTRICITY_SQUARED = WGS84_FLATTENING * (2 - WGS84_FLATTENING);

/**
 * The rows of NOAA's `WMM.COF`: degree n, order m, the Gauss coefficients g and
 * h in nT, and their yearly change in nT/yr.
 */
const WMM2025: readonly (readonly [number, number, number, number, number, number])[] = [
  [1, 0, -29351.8, 0.0, 12.0, 0.0],
  [1, 1, -1410.8, 4545.4, 9.7, -21.5],
  [2, 0, -2556.6, 0.0, -11.6, 0.0],
  [2, 1, 2951.1, -3133.6, -5.2, -27.7],
  [2, 2, 1649.3, -815.1, -8.0, -12.1],
  [3, 0, 1361.0, 0.0, -1.3, 0.0],
  [3, 1, -2404.1, -56.6, -4.2, 4.0],
  [3, 2, 1243.8, 237.5, 0.4, -0.3],
  [3, 3, 453.6, -549.5, -15.6, -4.1],
  [4, 0, 895.0, 0.0, -1.6, 0.0],
  [4, 1, 799.5, 278.6, -2.4, -1.1],
  [4, 2, 55.7, -133.9, -6.0, 4.1],
  [4, 3, -281.1, 212.0, 5.6, 1.6],
  [4, 4, 12.1, -375.6, -7.0, -4.4],
  [5, 0, -233.2, 0.0, 0.6, 0.0],
  [5, 1, 368.9, 45.4, 1.4, -0.5],
  [5, 2, 187.2, 220.2, 0.0, 2.2],
  [5, 3, -138.7, -122.9, 0.6, 0.4],
  [5, 4, -142.0, 43.0, 2.2, 1.7],
  [5, 5, 20.9, 106.1, 0.9, 1.9],
  [6, 0, 64.4, 0.0, -0.2, 0.0],
  [6, 1, 63.8, -18.4, -0.4, 0.3],
  [6, 2, 76.9, 16.8, 0.9, -1.6],
  [6, 3, -115.7, 48.8, 1.2, -0.4],
  [6, 4, -40.9, -59.8, -0.9, 0.9],
  [6, 5, 14.9, 10.9, 0.3, 0.7],
  [6, 6, -60.7, 72.7, 0.9, 0.9],
  [7, 0, 79.5, 0.0, 0.0, 0.0],
  [7, 1, -77.0, -48.9, -0.1, 0.6],
  [7, 2, -8.8, -14.4, -0.1, 0.5],
  [7, 3, 59.3, -1.0, 0.5, -0.8],
  [7, 4, 15.8, 23.4, -0.1, 0.0],
  [7, 5, 2.5, -7.4, -0.8, -1.0],
  [7, 6, -11.1, -25.1, -0.8, 0.6],
  [7, 7, 14.2, -2.3, 0.8, -0.2],
  [8, 0, 23.2, 0.0, -0.1, 0.0],
  [8, 1, 10.8, 7.1, 0.2, -0.2],
  [8, 2, -17.5, -12.6, 0.0, 0.5],
  [8, 3, 2.0, 11.4, 0.5, -0.4],
  [8, 4, -21.7, -9.7, -0.1, 0.4],
  [8, 5, 16.9, 12.7, 0.3, -0.5],
  [8, 6, 15.0, 0.7, 0.2, -0.6],
  [8, 7, -16.8, -5.2, 0.0, 0.3],
  [8, 8, 0.9, 3.9, 0.2, 0.2],
  [9, 0, 4.6, 0.0, 0.0, 0.0],
  [9, 1, 7.8, -24.8, -0.1, -0.3],
  [9, 2, 3.0, 12.2, 0.1, 0.3],
  [9, 3, -0.2, 8.3, 0.3, -0.3],
  [9, 4, -2.5, -3.3, -0.3, 0.3],
  [9, 5, -13.1, -5.2, 0.0, 0.2],
  [9, 6, 2.4, 7.2, 0.3, -0.1],
  [9, 7, 8.6, -0.6, -0.1, -0.2],
  [9, 8, -8.7, 0.8, 0.1, 0.4],
  [9, 9, -12.9, 10.0, -0.1, 0.1],
  [10, 0, -1.3, 0.0, 0.1, 0.0],
  [10, 1, -6.4, 3.3, 0.0, 0.0],
  [10, 2, 0.2, 0.0, 0.1, 0.0],
  [10, 3, 2.0, 2.4, 0.1, -0.2],
  [10, 4, -1.0, 5.3, 0.0, 0.1],
  [10, 5, -0.6, -9.1, -0.3, -0.1],
  [10, 6, -0.9, 0.4, 0.0, 0.1],
  [10, 7, 1.5, -4.2, -0.1, 0.0],
  [10, 8, 0.9, -3.8, -0.1, -0.1],
  [10, 9, -2.7, 0.9, 0.0, 0.2],
  [10, 10, -3.9, -9.1, 0.0, 0.0],
  [11, 0, 2.9, 0.0, 0.0, 0.0],
  [11, 1, -1.5, 0.0, 0.0, 0.0],
  [11, 2, -2.5, 2.9, 0.0, 0.1],
  [11, 3, 2.4, -0.6, 0.0, 0.0],
  [11, 4, -0.6, 0.2, 0.0, 0.1],
  [11, 5, -0.1, 0.5, -0.1, 0.0],
  [11, 6, -0.6, -0.3, 0.0, 0.0],
  [11, 7, -0.1, -1.2, 0.0, 0.1],
  [11, 8, 1.1, -1.7, -0.1, 0.0],
  [11, 9, -1.0, -2.9, -0.1, 0.0],
  [11, 10, -0.2, -1.8, -0.1, 0.0],
  [11, 11, 2.6, -2.3, -0.1, 0.0],
  [12, 0, -2.0, 0.0, 0.0, 0.0],
  [12, 1, -0.2, -1.3, 0.0, 0.0],
  [12, 2, 0.3, 0.7, 0.0, 0.0],
  [12, 3, 1.2, 1.0, 0.0, -0.1],
  [12, 4, -1.3, -1.4, 0.0, 0.1],
  [12, 5, 0.6, 0.0, 0.0, 0.0],
  [12, 6, 0.6, 0.6, 0.1, 0.0],
  [12, 7, 0.5, -0.1, 0.0, 0.0],
  [12, 8, -0.1, 0.8, 0.0, 0.0],
  [12, 9, -0.4, 0.1, 0.0, 0.0],
  [12, 10, -0.2, -1.0, -0.1, 0.0],
  [12, 11, -1.3, 0.1, 0.0, 0.0],
  [12, 12, -0.7, 0.2, -0.1, -0.1],
];

/** Coefficients indexed `[n][m]`, filled once from the table above. */
const coefficients = (() => {
  const empty = () =>
    Array.from({ length: MAX_DEGREE + 1 }, () => new Array<number>(MAX_DEGREE + 1).fill(0));
  const table = { g: empty(), h: empty(), gDot: empty(), hDot: empty() };
  for (const [n, m, g, h, gDot, hDot] of WMM2025) {
    table.g[n]![m] = g;
    table.h[n]![m] = h;
    table.gDot[n]![m] = gDot;
    table.hDot[n]![m] = hDot;
  }
  return table;
})();

/**
 * Schmidt semi-normalised associated Legendre functions of cos θ and their
 * derivatives with respect to θ, indexed `[n][m]`.
 */
function legendre(cosTheta: number, sinTheta: number) {
  const p = Array.from({ length: MAX_DEGREE + 1 }, () => new Array<number>(MAX_DEGREE + 1).fill(0));
  const dp = Array.from({ length: MAX_DEGREE + 1 }, () =>
    new Array<number>(MAX_DEGREE + 1).fill(0)
  );
  p[0]![0] = 1;
  // Gauss-normalised recursion first, then rescaled to Schmidt below.
  for (let n = 1; n <= MAX_DEGREE; n += 1) {
    for (let m = 0; m <= n; m += 1) {
      if (m === n) {
        p[n]![m] = sinTheta * p[n - 1]![m - 1]!;
        dp[n]![m] = sinTheta * dp[n - 1]![m - 1]! + cosTheta * p[n - 1]![m - 1]!;
      } else {
        const k = n >= 2 ? ((n - 1) ** 2 - m ** 2) / ((2 * n - 1) * (2 * n - 3)) : 0;
        const p2 = n >= 2 ? p[n - 2]![m]! : 0;
        const dp2 = n >= 2 ? dp[n - 2]![m]! : 0;
        p[n]![m] = cosTheta * p[n - 1]![m]! - k * p2;
        dp[n]![m] = cosTheta * dp[n - 1]![m]! - sinTheta * p[n - 1]![m]! - k * dp2;
      }
    }
  }
  let schmidt = 1;
  for (let n = 1; n <= MAX_DEGREE; n += 1) {
    schmidt *= (2 * n - 1) / n;
    let factor = schmidt;
    for (let m = 0; m <= n; m += 1) {
      if (m > 0) factor *= Math.sqrt(((n - m + 1) * (m === 1 ? 2 : 1)) / (n + m));
      p[n]![m] = p[n]![m]! * factor;
      dp[n]![m] = dp[n]![m]! * factor;
    }
  }
  return { p, dp };
}

/** A date as a decimal year in UTC, the time scale the model uses. */
export function decimalYearOf(date: Date): number {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return year + (date.getTime() - start) / (end - start);
}

/**
 * The magnetic declination in degrees, east positive: how far magnetic north
 * lies clockwise of true north. A magnetic heading plus the declination is a
 * true heading.
 *
 * Returns `undefined` outside the model's validity window, and at the poles,
 * where declination has no meaning. `heightKm` is above the WGS 84 ellipsoid.
 */
export function magneticDeclination(
  point: { latitude: number; longitude: number },
  decimalYear: number,
  heightKm = 0
): number | undefined {
  if (
    !Number.isFinite(decimalYear) ||
    decimalYear < MODEL_EPOCH ||
    decimalYear >= MODEL_VALID_UNTIL ||
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    Math.abs(point.latitude) >= 90
  ) {
    return undefined;
  }

  // Geodetic latitude and height to geocentric spherical coordinates.
  const latitude = (point.latitude * Math.PI) / 180;
  const longitude = (point.longitude * Math.PI) / 180;
  const sinLat = Math.sin(latitude);
  const cosLat = Math.cos(latitude);
  const primeVerticalRadius =
    WGS84_SEMI_MAJOR_KM / Math.sqrt(1 - WGS84_ECCENTRICITY_SQUARED * sinLat ** 2);
  const equatorial = (primeVerticalRadius + heightKm) * cosLat;
  const axial = (primeVerticalRadius * (1 - WGS84_ECCENTRICITY_SQUARED) + heightKm) * sinLat;
  const radius = Math.hypot(equatorial, axial);
  const geocentricLatitude = Math.asin(axial / radius);
  // θ is the geocentric colatitude.
  const cosTheta = Math.sin(geocentricLatitude);
  const sinTheta = Math.cos(geocentricLatitude);

  const { p, dp } = legendre(cosTheta, sinTheta);
  const elapsed = decimalYear - MODEL_EPOCH;
  let north = 0;
  let east = 0;
  let down = 0;
  for (let n = 1; n <= MAX_DEGREE; n += 1) {
    const radial = (REFERENCE_RADIUS_KM / radius) ** (n + 2);
    for (let m = 0; m <= n; m += 1) {
      const g = coefficients.g[n]![m]! + elapsed * coefficients.gDot[n]![m]!;
      const h = coefficients.h[n]![m]! + elapsed * coefficients.hDot[n]![m]!;
      const cosM = Math.cos(m * longitude);
      const sinM = Math.sin(m * longitude);
      const inPhase = g * cosM + h * sinM;
      north += radial * inPhase * dp[n]![m]!;
      east += radial * m * (g * sinM - h * cosM) * p[n]![m]!;
      down -= radial * (n + 1) * inPhase * p[n]![m]!;
    }
  }
  east /= sinTheta;

  // The field above is in the geocentric frame; tilt it back to geodetic.
  // Declination only needs the horizontal north component.
  const tilt = geocentricLatitude - latitude;
  const geodeticNorth = north * Math.cos(tilt) - down * Math.sin(tilt);
  return (Math.atan2(east, geodeticNorth) * 180) / Math.PI;
}
