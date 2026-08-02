/**
 * Utility bundles that repeat across sections. Kept as complete literal strings
 * so Tailwind's scanner sees every class name — see docs/STYLING.md.
 */

export const HEADING = "m-0 font-display font-bold tracking-[-0.045em]";

export const BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-13 px-[15px] py-2.5 text-13 font-extrabold transition-[transform,box-shadow,background] duration-200 hover:-translate-y-0.5 hover:shadow-lift";

export const BUTTON_PRIMARY = `${BUTTON} bg-raml text-layl shadow-[inset_0_1px_rgba(255,255,255,0.55),0_8px_18px_rgba(235,194,118,0.25)]`;

export const ICON_BASE = "fill-none stroke-current";
