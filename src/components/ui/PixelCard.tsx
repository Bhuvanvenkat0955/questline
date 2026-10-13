import clsx from "clsx";
import type { ReactNode } from "react";
import { accentBg, accentOn, accentShadow, accentText, type Accent } from "./accents";

/** The chunky colored square that holds an icon, like the reference's card icons. */
export function IconBlock({
  accent = "green",
  size = "md",
  children,
}: {
  accent?: Accent;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "grid shrink-0 place-items-center border-[3px] border-ink shadow-pixel",
        accentBg[accent],
        accentOn[accent],
        accentShadow[accent],
        size === "md" ? "size-16 [&_svg]:size-9" : "size-11 [&_svg]:size-6",
      )}
    >
      {children}
    </span>
  );
}

type PixelCardProps = {
  title: string;
  accent?: Accent;
  icon?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Dark panel with an icon block, colored title, body text and an optional footer. */
export function PixelCard({ title, accent = "green", icon, footer, children, className }: PixelCardProps) {
  return (
    <article className={clsx("flex gap-5 border-2 border-line bg-panel p-5", className)}>
      {icon && <IconBlock accent={accent}>{icon}</IconBlock>}
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className={clsx("font-display text-base leading-tight uppercase", accentText[accent])}>{title}</h3>
        {children && <div className="mt-2 text-sm leading-relaxed text-text-dim">{children}</div>}
        {footer && <div className="mt-auto pt-3">{footer}</div>}
      </div>
    </article>
  );
}
