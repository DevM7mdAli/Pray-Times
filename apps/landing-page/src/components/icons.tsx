import clsx from "clsx";
import { ICON_URL } from "../lib/urls";
import { ICON_BASE } from "../styles/tokens";

/** The app icon. Decorative everywhere it appears — the wordmark carries the name. */
export function BrandMark({ className = "" }: { className?: string }) {
  return <img className={className} src={ICON_URL} width="48" height="48" alt="" />;
}

export function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={clsx(ICON_BASE, className)}>
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={clsx(ICON_BASE, className)}>
      <path d="M12 3 5 6v5c0 4.6 2.9 8.8 7 10 4.1-1.2 7-5.4 7-10V6l-7-3Zm0 6v5m0 3h.01" />
    </svg>
  );
}

export function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={clsx(ICON_BASE, className)}>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 6Z" />
    </svg>
  );
}

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={clsx(ICON_BASE, className)}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}
