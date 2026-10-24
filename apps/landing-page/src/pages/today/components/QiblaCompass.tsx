import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  cityName,
  compassPointFor,
  decimalYearOf,
  isHeadingAccuracyLow,
  magneticDeclination,
  orientationHeadingFrom,
  qiblaForCity,
  smoothHeading,
  type City,
  type SupportedLocale,
} from "@pray-times/core";
import { useLocale } from "../../../i18n/useLocale";
import { Card, Kicker } from "../../../components/Card";

type HeadingState = "idle" | "live" | "unsupported" | "denied";

/** Safari exposes the compass heading directly; elsewhere alpha is used. */
type CompassEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

/** A compass that has not reported within this long is treated as missing. */
const NO_COMPASS_TIMEOUT_MS = 3000;

/** The screen's counter-clockwise rotation from the device's natural orientation. */
function screenAngle(): number {
  if (typeof screen.orientation?.angle === "number") return screen.orientation.angle;
  // Safari before 16.4 only has the older, deprecated `window.orientation`.
  const legacy = (window as { orientation?: unknown }).orientation;
  return typeof legacy === "number" ? legacy : 0;
}

type OrientationConstructor = {
  requestPermission?: () => Promise<"granted" | "denied" | "default">;
};

function formatDistance(km: number, locale: SupportedLocale): string {
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 1,
  }).format(rounded);
}

export function QiblaCompass({ city }: { city: City }) {
  const { t } = useTranslation("qibla");
  const locale = useLocale();
  const qibla = qiblaForCity(city);
  const [headingState, setHeadingState] = useState<HeadingState>("idle");
  const [deviceHeading, setDeviceHeading] = useState<number>();
  const [isAccuracyLow, setIsAccuracyLow] = useState(false);
  const [isTrueNorth, setIsTrueNorth] = useState(false);
  const { latitude, longitude } = city;

  useEffect(() => {
    if (headingState !== "live") return;
    setDeviceHeading(undefined);
    setIsAccuracyLow(false);
    setIsTrueNorth(false);
    // Browsers report magnetic north. Declination barely changes over a few
    // hundred km, so the city's coordinates are close enough to correct it.
    const declination = magneticDeclination({ latitude, longitude }, decimalYearOf(new Date()));
    let received = false;
    const onOrientation = (event: Event) => {
      const orientation = event as CompassEvent;
      const reading = orientationHeadingFrom(
        {
          alpha: orientation.alpha,
          absolute: orientation.absolute,
          webkitCompassHeading: orientation.webkitCompassHeading,
          webkitCompassAccuracy: orientation.webkitCompassAccuracy,
        },
        screenAngle(),
        declination
      );
      if (!reading) return;
      received = true;
      setDeviceHeading((previous) => smoothHeading(previous, reading.degrees));
      setIsAccuracyLow(reading.accuracy !== undefined && isHeadingAccuracyLow(reading.accuracy));
      setIsTrueNorth(reading.isTrueNorth);
    };
    // Chrome's plain `deviceorientation` alpha is relative to wherever the page
    // started, so listen to the absolute event alone where it exists. Safari
    // has no absolute event and puts its compass on `deviceorientation`.
    const eventName =
      "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(eventName, onOrientation);
    // Desktop browsers accept the listener but never report a heading.
    const timeout = window.setTimeout(() => {
      if (!received) setHeadingState("unsupported");
    }, NO_COMPASS_TIMEOUT_MS);
    return () => {
      window.removeEventListener(eventName, onOrientation);
      window.clearTimeout(timeout);
    };
  }, [headingState, latitude, longitude]);

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
  const roseRotation = headingState === "live" && deviceHeading !== undefined ? -deviceHeading : 0;
  const point = compassPointFor(qibla.bearing);
  const bearingLabel = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(qibla.bearing));

  return (
    <Card className="mt-6 bg-layl-soft/[0.72] px-7.5 py-[27px]" aria-labelledby="qibla-title">
      <Kicker className="m-0">{t("kicker")}</Kicker>
      <h2 className="mb-[22px] mt-1 font-display text-2xl font-bold" id="qibla-title">
        {t("heading")} {cityName(city, locale)}
      </h2>

      {qibla.atHaram ? (
        <div>
          <strong className="font-display text-[24px] font-bold">{t("atHaram")}</strong>
          <p className="mb-0 mt-1.5 text-13 text-muted">{t("atHaramBody")}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-8">
            <div
              className="w-[190px] flex-none"
              role="img"
              aria-label={`${bearingLabel}° ${t(`points.${point}`)}`}
            >
              <svg className="block h-auto w-full" viewBox="0 0 200 200" aria-hidden="true">
                <g
                  style={{
                    transform: `rotate(${roseRotation}deg)`,
                    transformOrigin: "100px 100px",
                  }}
                >
                  <circle className="fill-layl/70 stroke-sama/40" cx="100" cy="100" r="88" />
                  <circle className="fill-none stroke-nur/10" cx="100" cy="100" r="66" />
                  {Array.from({ length: 24 }, (_, index) => (
                    <line
                      key={index}
                      className={
                        index % 6 === 0
                          ? "stroke-sama stroke-[2.5]"
                          : "stroke-nur/[0.28] stroke-[1.5]"
                      }
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
                  <text
                    className="fill-muted text-13 font-bold [text-anchor:middle]"
                    x="100"
                    y="16"
                  >
                    {t("north")}
                  </text>
                  <text
                    className="fill-muted text-13 font-bold [text-anchor:middle]"
                    x="192"
                    y="105"
                  >
                    {t("east")}
                  </text>
                  <text
                    className="fill-muted text-13 font-bold [text-anchor:middle]"
                    x="100"
                    y="196"
                  >
                    {t("south")}
                  </text>
                  <text className="fill-muted text-13 font-bold [text-anchor:middle]" x="8" y="105">
                    {t("west")}
                  </text>
                  <g
                    style={{
                      transform: `rotate(${qibla.bearing}deg)`,
                      transformOrigin: "100px 100px",
                    }}
                  >
                    <path className="fill-fajr" d="M100 30 L112 112 L100 104 L88 112 Z" />
                    <circle className="fill-raml" cx="100" cy="100" r="7" />
                  </g>
                </g>
              </svg>
            </div>

            <div>
              <dl className="m-0 grid gap-4">
                <div>
                  <dt className="text-11 text-muted">{t("fromNorth")}</dt>
                  <dd className="mb-0 mt-0.75 flex flex-wrap items-baseline gap-2.5">
                    <strong className="font-display text-27 font-bold text-raml">
                      {bearingLabel}°
                    </strong>
                    <span className="max-w-[26rem] text-xs text-muted">{t(`points.${point}`)}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-11 text-muted">{t("distance")}</dt>
                  <dd className="mb-0 mt-0.75 flex flex-wrap items-baseline gap-2.5">
                    <strong className="font-display text-27 font-bold text-raml">
                      {formatDistance(qibla.distanceKm, locale)} {locale === "ar" ? "كم" : "km"}
                    </strong>
                  </dd>
                </div>
              </dl>
              <p className="mb-0 mt-4 max-w-md text-xs text-muted">{t("note")}</p>
            </div>
          </div>

          <div className="mt-[22px] flex flex-wrap items-center gap-3.5 border-t border-nur/10 pt-[18px]">
            {headingState === "live" ? (
              <div className="grid gap-1.5" role="status">
                {deviceHeading === undefined ? (
                  <p className="m-0 text-xs text-muted">{t("waiting")}</p>
                ) : (
                  <>
                    <p className="m-0 text-xs text-muted">{t("aligning")}</p>
                    {isAccuracyLow ? (
                      <p className="m-0 text-xs text-muted">{t("calibrate")}</p>
                    ) : null}
                    {isTrueNorth ? null : <p className="m-0 text-xs text-muted">{t("magnetic")}</p>}
                  </>
                )}
              </div>
            ) : (
              <>
                <button
                  className="min-h-[42px] cursor-pointer rounded-xl border border-nur/[0.18] bg-transparent px-[18px] font-bold text-nur"
                  type="button"
                  onClick={() => void enableCompass()}
                >
                  {t("align")}
                </button>
                {headingState === "unsupported" ? (
                  <p className="m-0 text-xs text-muted" role="status">
                    {t("unsupported")}
                  </p>
                ) : null}
                {headingState === "denied" ? (
                  <p className="m-0 text-xs text-muted" role="status">
                    {t("denied")}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
