import { useTranslation } from "react-i18next";
import { Card } from "../../../components/Card";
import type { LoadStatus } from "../../../queries/prayerDay";

/**
 * Shown in place of the day when there is nothing verified to show yet. A zone
 * that disagrees with the coordinates gets its own wording, because telling the
 * reader to check their connection would send them chasing the wrong fix.
 */
export function DayStatePanel({ status, onRetry }: { status: LoadStatus; onRetry: () => void }) {
  const { t } = useTranslation("today");
  const failed = status === "error" || status === "zone-mismatch";

  if (!failed) {
    return (
      <Card
        className="mt-[52px] bg-layl-soft/[0.72] px-7.5 py-[54px] text-center"
        aria-live="polite"
      >
        <span
          className="mx-auto mb-4 mt-0 grid size-[52px] animate-spin place-items-center rounded-full border border-sama/[0.55] border-t-transparent font-extrabold text-fajr"
          aria-hidden="true"
        />
        <p className="text-muted">{t("refreshing")}</p>
      </Card>
    );
  }

  return (
    <Card className="mt-[52px] bg-layl-soft/[0.72] px-7.5 py-[54px] text-center" role="alert">
      <span
        className="mx-auto mb-4 mt-0 grid size-[52px] place-items-center rounded-full border border-fajr/[0.55] font-extrabold text-fajr"
        aria-hidden="true"
      >
        !
      </span>
      <h2 className="mb-2">{status === "zone-mismatch" ? t("errorZoneTitle") : t("errorTitle")}</h2>
      <p className="text-muted">
        {status === "zone-mismatch" ? t("errorZoneBody") : t("errorBody")}
      </p>
      <button
        className="min-h-11 cursor-pointer rounded-xl border-0 bg-raml px-[22px] font-extrabold text-layl"
        type="button"
        onClick={onRetry}
      >
        {t("retry")}
      </button>
    </Card>
  );
}
