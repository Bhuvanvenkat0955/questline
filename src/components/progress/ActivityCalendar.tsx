"use client";

// The streak calendar: one square per day for the last few weeks, Monday on
// top, brighter green = more quests finished that day. Hovering a square
// shows its numbers; the daily log table below has the same values for
// anyone not using a mouse.

import clsx from "clsx";
import { useState } from "react";
import type { DayActivity } from "@/lib/history";

const heat = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];
const heatFor = (quests: number) => heat[Math.min(quests, heat.length - 1)];
const weekdayLabels = ["Mon", "", "Wed", "", "Fri", "", ""];

function formatDay(date: string, options: Intl.DateTimeFormatOptions) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, options);
}

export function ActivityCalendar({ weeks, today }: { weeks: (DayActivity | null)[][]; today: string }) {
  const [hovered, setHovered] = useState<DayActivity | null>(null);

  // A month name above the week that contains the 1st of that month. The very
  // first column also gets one, unless another label would sit right next to it.
  const monthLabels = weeks.map((week) => {
    const firstOfMonth = week.find((day) => day?.date.endsWith("-01"));
    return firstOfMonth ? formatDay(firstOfMonth.date, { month: "short" }) : "";
  });
  if (!monthLabels.slice(0, 3).some(Boolean) && weeks[0][0]) {
    monthLabels[0] = formatDay(weeks[0][0].date, { month: "short" });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="h-5 text-sm text-text-dim" aria-live="polite">
        {hovered ? (
          <>
            <span className="text-text">{formatDay(hovered.date, { weekday: "short", month: "short", day: "numeric" })}</span>
            {" · "}
            {hovered.quests} {hovered.quests === 1 ? "quest" : "quests"} · {hovered.xp} XP
          </>
        ) : (
          "Hover a day to see it."
        )}
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {/* Weekday labels down the left side. */}
        <div className="grid grid-rows-[1rem_repeat(7,0.875rem)] gap-0.5 text-[10px] leading-none text-text-dim" aria-hidden="true">
          <span />
          {weekdayLabels.map((label, i) => (
            <span key={i} className="flex items-center">
              {label}
            </span>
          ))}
        </div>

        <div role="img" aria-label="Activity calendar: quests finished per day. The daily log table lists the same days." className="flex gap-0.5">
          {weeks.map((week, w) => (
            <div key={w} className="grid grid-rows-[1rem_repeat(7,0.875rem)] gap-0.5">
              <span className="text-[10px] leading-none whitespace-nowrap text-text-dim">{monthLabels[w]}</span>
              {week.map((day, i) =>
                day ? (
                  <span
                    key={day.date}
                    onPointerEnter={() => setHovered(day)}
                    onPointerLeave={() => setHovered(null)}
                    className={clsx(
                      "size-3.5 hover:outline-2 hover:outline-offset-1 hover:outline-yellow",
                      heatFor(day.quests),
                      day.date === today && "outline-2 outline-offset-1 outline-text-dim",
                    )}
                  />
                ) : (
                  <span key={i} className="size-3.5" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-text-dim" aria-hidden="true">
        Less
        {heat.map((cls) => (
          <span key={cls} className={clsx("size-3", cls)} />
        ))}
        More
        <span className="ml-3 inline-block size-3 outline-2 outline-offset-1 outline-text-dim" /> Today
      </div>
    </div>
  );
}
