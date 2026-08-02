import { useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

type RevealTag = "div" | "header" | "section" | "article" | "blockquote" | "p";
type RevealVariant = "up" | "down" | "scale";
type RevealDelay = 0 | 30 | 70 | 90 | 110 | 140 | 190;

/**
 * Resting position each variant animates out of. Uses the standalone
 * `translate` / `scale` properties rather than Tailwind's transform-based
 * utilities, so a child's own `transform` (e.g. a hover lift) never fights
 * with the reveal.
 */
const HIDDEN: Record<RevealVariant, string> = {
  up: "opacity-0 [translate:0_28px]",
  down: "opacity-0 [translate:0_-18px]",
  scale: "opacity-0 [scale:0.96]",
};

/** Written out in full so Tailwind's scanner can see every class name. */
const DELAY: Record<RevealDelay, string> = {
  0: "",
  30: "delay-30",
  70: "delay-70",
  90: "delay-90",
  110: "delay-110",
  140: "delay-140",
  190: "delay-190",
};

type RevealProps = {
  as?: RevealTag;
  variant?: RevealVariant;
  delay?: RevealDelay;
  className?: string;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

/**
 * Fades content in as it scrolls into view. Renders its children untouched
 * when the browser lacks IntersectionObserver or the reader prefers reduced
 * motion, so content is never hidden behind an animation that cannot run.
 */
export function Reveal({
  as: Tag = "div",
  variant = "up",
  delay = 0,
  className = "",
  children,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [animating, setAnimating] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    setAnimating(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setRevealed(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8%", threshold: 0.12 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const state = animating && !revealed ? HIDDEN[variant] : "";

  return (
    <Tag
      ref={ref as never}
      className={`transition-[opacity,translate,scale] duration-reveal ease-reveal ${DELAY[delay]} ${state} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
