import { useEffect, useState } from "react";

/**
 * A clock that ticks every half minute and catches up as soon as the tab is
 * visible again, so a countdown does not sit frozen at whatever it read when
 * the reader switched away. This drives display only — prayer times refetch
 * when the local date rolls over, not on focus.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    const refreshVisiblePage = () => {
      if (document.visibilityState === "visible") setNow(new Date());
    };
    document.addEventListener("visibilitychange", refreshVisiblePage);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisiblePage);
    };
  }, []);

  return now;
}
