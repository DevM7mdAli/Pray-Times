import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

/** Page-content column, shared by every top-level section of the landing page. */
export function Shell({
  as: Tag = "section",
  className = "",
  children,
  ...rest
}: {
  as?: "section" | "header";
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <Tag className={clsx("mx-auto w-shell max-mobile:w-[calc(100%-32px)]", className)} {...rest}>
      {children}
    </Tag>
  );
}
