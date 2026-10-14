// Today's time as one stacked bar: productive, neutral, distracting,
// not-yet-reviewed "Depends" time, and unlabelled time, with a legend that
// carries every value in words (so the colors are never the only way to read it).

import clsx from "clsx";
import { formatDuration, type Split } from "@/lib/screenTime";
import { labelStyle } from "./labels";

export function SplitBar({ split }: { split: Split }) {
  const parts = [
    { key: "productive", name: "Productive", seconds: split.productive, bar: labelStyle.productive.bar },
    { key: "neutral", name: "Neutral", seconds: split.neutral, bar: labelStyle.neutral.bar },
    { key: "distracting", name: "Distracting", seconds: split.distracting, bar: labelStyle.distracting.bar },
    { key: "depends", name: "Depends (not reviewed)", seconds: split.depends, bar: labelStyle.depends.bar },
    { key: "unlabeled", name: "Unlabelled", seconds: split.unlabeled, bar: "bg-panel-raised" },
  ].filter((p) => p.seconds > 0);

  if (split.total === 0) {
    return <p className="text-sm text-text-dim">Nothing counted yet today.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* gap-0.5: a 2px surface gap between segments instead of borders. */}
      <div className="flex h-6 gap-0.5" role="img" aria-label={parts.map((p) => `${p.name} ${formatDuration(p.seconds)}`).join(", ")}>
        {parts.map((p) => (
          <span key={p.key} className={clsx("h-full", p.bar)} style={{ flexGrow: p.seconds }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2">
            <span aria-hidden="true" className={clsx("size-3", p.bar)} />
            {p.name}
            <span className="text-text-dim tabular-nums">{formatDuration(p.seconds)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
