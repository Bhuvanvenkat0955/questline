"use client";

import NumberFlow, { type Format } from "@number-flow/react";
import clsx from "clsx";
import type { ReactNode } from "react";
import { accentText, type Accent } from "./accents";

type StatTileProps = {
  label: string;
  value: number;
  caption?: string;
  icon?: ReactNode;
  accent?: Accent;
  suffix?: string;
  format?: Format;
};

/** A big number with a label, like the reference's bottom stats bar.
 *  When `value` changes, the digits roll to the new number. */
export function StatTile({ label, value, caption, icon, accent = "cyan", suffix, format }: StatTileProps) {
  return (
    <div className="flex items-center gap-4 border-2 border-line bg-panel px-5 py-4">
      {icon && (
        <span aria-hidden="true" className={clsx("shrink-0 [&_svg]:size-10", accentText[accent])}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className={clsx("font-display text-xs uppercase", accentText[accent])}>{label}</p>
        <NumberFlow
          value={value}
          suffix={suffix}
          format={format}
          className="block text-3xl leading-tight font-bold tabular-nums"
        />
        {caption && <p className="truncate text-xs text-text-dim">{caption}</p>}
      </div>
    </div>
  );
}
