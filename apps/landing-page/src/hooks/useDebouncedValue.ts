import { useEffect, useState } from "react";

/** Holds a value back until it stops changing, so typing does not fire a request per keystroke. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return settled;
}
