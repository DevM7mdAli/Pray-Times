import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

/**
 * Raised panel used by every block on the Today dashboard. Background is left
 * to the caller so panels with a gradient wash never fight this component over
 * the same CSS property.
 */
export function Card({
  className = "",
  children,
  ...rest
}: { className?: string; children: ReactNode } & Omit<
  HTMLAttributes<HTMLElement>,
  "className" | "children"
>) {
  return (
    <section
      className={clsx(
        "rounded-27 border border-nur/[0.13] shadow-[0_24px_80px_rgba(0,0,0,0.16)]",
        className
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

/** Small all-caps label that opens a dashboard panel. */
export function Kicker({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <p className={clsx("text-11 font-extrabold tracking-[0.09em] text-raml", className)}>
      {children}
    </p>
  );
}
