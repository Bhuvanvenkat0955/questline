"use client";

// Today's apps and sites, biggest first, each with label buttons:
// Productive / Neutral / Distracting / Depends. Labels are remembered, so
// you only label an app once.

import clsx from "clsx";
import { Globe, Monitor } from "pixelarticons/react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { labelActivity } from "@/app/(app)/time/actions";
import type { ActivityLabel } from "@/db/schema";
import type { ActivityRow } from "@/lib/screenTime";
import { LABEL_ORDER, labelStyle } from "./labels";

export function ActivityList({ rows, durations }: { rows: ActivityRow[]; durations: string[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-dim">Apps and sites you use show up here once tracking is on.</p>;
  }
  const most = rows[0].seconds;

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <ActivityItem key={`${row.kind}:${row.name}`} row={row} duration={durations[i]} share={row.seconds / most} />
      ))}
    </ul>
  );
}

function ActivityItem({ row, duration, share }: { row: ActivityRow; duration: string; share: number }) {
  const [label, setOptimisticLabel] = useOptimistic(row.label);
  const [, startTransition] = useTransition();

  function choose(next: ActivityLabel) {
    // Clicking the current label again clears it.
    const value = label === next ? null : next;
    startTransition(async () => {
      setOptimisticLabel(value);
      try {
        await labelActivity(row.kind, row.name, value);
      } catch {
        toast.error("Couldn't save that label. Try again.");
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-2 border-line bg-panel px-4 py-3">
      <span aria-hidden="true" className="text-text-dim [&_svg]:size-5">
        {row.kind === "site" ? <Globe /> : <Monitor />}
      </span>
      <div className="min-w-40 flex-1">
        <p className="flex items-baseline justify-between gap-3">
          <span className="truncate font-bold">{row.name}</span>
          <span className="shrink-0 text-sm text-text-dim tabular-nums">{duration}</span>
        </p>
        <span aria-hidden="true" className="mt-1.5 block h-1.5 bg-panel-raised">
          <span className={clsx("block h-full", label ? labelStyle[label].bar : "bg-cyan")} style={{ width: `${Math.max(share * 100, 2)}%` }} />
        </span>
      </div>
      <div role="group" aria-label={`Label for ${row.name}`} className="flex gap-1">
        {LABEL_ORDER.map((value) => {
          const style = labelStyle[value];
          const selected = label === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              title={style.name}
              onClick={() => choose(value)}
              className={clsx(
                "inline-flex h-8 cursor-pointer items-center gap-1 border-2 px-2 text-xs [&_svg]:size-4",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-yellow",
                selected ? style.chip : "border-line text-text-dim hover:border-text-dim hover:text-text",
              )}
            >
              {style.icon}
              <span className="hidden lg:inline">{style.name}</span>
            </button>
          );
        })}
      </div>
    </li>
  );
}
