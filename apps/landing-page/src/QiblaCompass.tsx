import { useEffect, useState } from "react";
import {
  cityName,
  compassPointFor,
  qiblaForCity,
  type City,
  type SupportedLocale,
} from "@pray-times/core";

const COPY = {
  ar: {
    kicker: "اتجاه القبلة",
    heading: "القبلة من",
    fromNorth: "الاتجاه من الشمال الحقيقي",
    distance: "المسافة إلى الكعبة",
    atHaram: "أنت عند المسجد الحرام",
    atHaramBody: "استقبل الكعبة مباشرة؛ لا حاجة إلى بوصلة.",
    align: "محاذاة مع اتجاه جهازي",
    aligning: "حرّك جهازك في شكل ٨ لمعايرة البوصلة.",
    unsupported: "هذا الجهاز لا يوفر بوصلة. السهم يشير بالنسبة إلى الشمال الحقيقي.",
    denied: "لم يُسمح باستخدام البوصلة. السهم يشير بالنسبة إلى الشمال الحقيقي.",
    note: "محسوبة من إحداثيات المدينة الثابتة، دون طلب موقعك.",
    north: "ش",
    east: "ق",
    south: "ج",
    west: "غ",
  },
  en: {
    kicker: "QIBLA DIRECTION",
    heading: "Qibla from",
    fromNorth: "Bearing from true north",
    distance: "Distance to the Kaaba",
    atHaram: "You are at the Sacred Mosque",
    atHaramBody: "Face the Kaaba directly; no compass is needed.",
    align: "Align with my device",
    aligning: "Move your device in a figure eight to calibrate the compass.",
    unsupported: "This device has no compass. The arrow points relative to true north.",
    denied: "Compass access was refused. The arrow points relative to true north.",
    note: "Calculated from the city’s fixed coordinates, without asking for your location.",
    north: "N",
    east: "E",
    south: "S",
    west: "W",
  },
} as const;

const COMPASS_POINT_NAMES = {
  ar: {
    N: "شمال",
    NE: "شمال شرق",
    E: "شرق",
    SE: "جنوب شرق",
    S: "جنوب",
    SW: "جنوب غرب",
    W: "غرب",
    NW: "شمال غرب",
  },
  en: {
    N: "North",
    NE: "North-east",
    E: "East",
    SE: "South-east",
    S: "South",
    SW: "South-west",
    W: "West",
    NW: "North-west",
  },
} as const;

type HeadingState = "idle" | "live" | "unsupported" | "denied";

/** Safari exposes the compass heading directly; elsewhere alpha is used. */
type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number };

type OrientationConstructor = {
  requestPermission?: () => Promise<"granted" | "denied" | "default">;
};

function formatDistance(km: number, locale: SupportedLocale): string {
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 1,
  }).format(rounded);
}

export function QiblaCompass({ city, locale }: { city: City; locale: SupportedLocale }) {
  const copy = COPY[locale];
  const qibla = qiblaForCity(city);
  const [headingState, setHeadingState] = useState<HeadingState>("idle");
  const [deviceHeading, setDeviceHeading] = useState(0);

  useEffect(() => {
    if (headingState !== "live") return;
    const onOrientation = (event: Event) => {
      const orientation = event as CompassEvent;
      // `webkitCompassHeading` is already degrees clockwise from north; `alpha`
      // is counter-clockwise, so it has to be inverted.
      const heading =
        typeof orientation.webkitCompassHeading === "number"
          ? orientation.webkitCompassHeading
          : typeof orientation.alpha === "number"
            ? 360 - orientation.alpha
            : undefined;
      if (heading !== undefined) setDeviceHeading(((heading % 360) + 360) % 360);
    };
    window.addEventListener("deviceorientationabsolute", onOrientation);
    window.addEventListener("deviceorientation", onOrientation);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrientation);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, [headingState]);

  const enableCompass = async () => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setHeadingState("unsupported");
      return;
    }
    const constructor = window.DeviceOrientationEvent as unknown as OrientationConstructor;
    // iOS requires an explicit grant, triggered from this click.
    if (typeof constructor.requestPermission === "function") {
      try {
        const result = await constructor.requestPermission();
        setHeadingState(result === "granted" ? "live" : "denied");
      } catch {
        setHeadingState("denied");
      }
      return;
    }
    setHeadingState("live");
  };

  // North-up until the device reports a heading, then the rose turns with it.
  const roseRotation = headingState === "live" ? -deviceHeading : 0;
  const point = compassPointFor(qibla.bearing);
  const bearingLabel = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(qibla.bearing));

  return (
    <section className="today-card mt-6 px-[30px] py-[27px]" aria-labelledby="qibla-title">
      <p className="section-kicker m-0">{copy.kicker}</p>
      <h2 className="mb-[22px] mt-1 font-display text-2xl font-bold" id="qibla-title">
        {copy.heading} {cityName(city, locale)}
      </h2>

      {qibla.atHaram ? (
        <div>
          <strong className="font-display text-[24px] font-bold">{copy.atHaram}</strong>
          <p className="mb-0 mt-1.5 text-13 text-muted">{copy.atHaramBody}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-8">
            <div
              className="w-[190px] flex-none"
              role="img"
              aria-label={`${bearingLabel}° ${COMPASS_POINT_NAMES[locale][point]}`}
            >
              <svg className="block h-auto w-full" viewBox="0 0 200 200" aria-hidden="true">
                <g
                  style={{
                    transform: `rotate(${roseRotation}deg)`,
                    transformOrigin: "100px 100px",
                  }}
                >
                  <circle className="compass-face" cx="100" cy="100" r="88" />
                  <circle className="compass-inner" cx="100" cy="100" r="66" />
                  {Array.from({ length: 24 }, (_, index) => (
                    <line
                      key={index}
                      className={index % 6 === 0 ? "compass-tick is-cardinal" : "compass-tick"}
                      x1="100"
                      y1={index % 6 === 0 ? 20 : 24}
                      x2="100"
                      y2="30"
                      style={{
                        transform: `rotate(${index * 15}deg)`,
                        transformOrigin: "100px 100px",
                      }}
                    />
                  ))}
                  <text className="compass-label" x="100" y="16">
                    {copy.north}
                  </text>
                  <text className="compass-label" x="192" y="105">
                    {copy.east}
                  </text>
                  <text className="compass-label" x="100" y="196">
                    {copy.south}
                  </text>
                  <text className="compass-label" x="8" y="105">
                    {copy.west}
                  </text>
                  <g
                    style={{
                      transform: `rotate(${qibla.bearing}deg)`,
                      transformOrigin: "100px 100px",
                    }}
                  >
                    <path className="compass-needle" d="M100 30 L112 112 L100 104 L88 112 Z" />
                    <circle className="compass-hub" cx="100" cy="100" r="7" />
                  </g>
                </g>
              </svg>
            </div>

            <div>
              <dl className="m-0 grid gap-4">
                <div>
                  <dt className="text-11 text-muted">{copy.fromNorth}</dt>
                  <dd className="mb-0 mt-[3px] flex flex-wrap items-baseline gap-2.5">
                    <strong className="font-display text-27 font-bold text-raml">
                      {bearingLabel}°
                    </strong>
                    <span className="max-w-[26rem] text-xs text-muted">
                      {COMPASS_POINT_NAMES[locale][point]}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-11 text-muted">{copy.distance}</dt>
                  <dd className="mb-0 mt-[3px] flex flex-wrap items-baseline gap-2.5">
                    <strong className="font-display text-27 font-bold text-raml">
                      {formatDistance(qibla.distanceKm, locale)} {locale === "ar" ? "كم" : "km"}
                    </strong>
                  </dd>
                </div>
              </dl>
              <p className="mb-0 mt-4 max-w-md text-xs text-muted">{copy.note}</p>
            </div>
          </div>

          <div className="mt-[22px] flex flex-wrap items-center gap-3.5 border-t border-nur/10 pt-[18px]">
            {headingState === "live" ? (
              <p className="m-0 text-xs text-muted" role="status">
                {copy.aligning}
              </p>
            ) : (
              <>
                <button
                  className="min-h-[42px] cursor-pointer rounded-xl border border-nur/[0.18] bg-transparent px-[18px] font-bold text-nur"
                  type="button"
                  onClick={() => void enableCompass()}
                >
                  {copy.align}
                </button>
                {headingState === "unsupported" ? (
                  <p className="m-0 text-xs text-muted" role="status">
                    {copy.unsupported}
                  </p>
                ) : null}
                {headingState === "denied" ? (
                  <p className="m-0 text-xs text-muted" role="status">
                    {copy.denied}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
