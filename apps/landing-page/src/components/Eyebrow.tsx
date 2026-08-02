import clsx from "clsx";
import type { ReactNode } from "react";

/** Small all-caps label above a section heading, with its leading hairline. */
export function Eyebrow({ tone, children }: { tone: "raml" | "fajr"; children: ReactNode }) {
  return (
    <p
      className={clsx(
        "mb-[18px] mt-0 flex items-center gap-[9px] text-11 font-extrabold tracking-[0.075em]",
        tone === "raml" ? "text-raml" : "text-fajr"
      )}
    >
      <span
        className="block h-px w-7 bg-[image:linear-gradient(90deg,transparent,currentColor)]"
        aria-hidden="true"
      />
      {children}
    </p>
  );
}
