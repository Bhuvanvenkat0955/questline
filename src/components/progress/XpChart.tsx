"use client";

// Total XP over time: one yellow line with a faint wash underneath, faint
// lines where each level starts, and a hover crosshair that reads out the day.
// One series, so no legend: the section title says what's plotted.

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { date: string; xp: number };

const axisText = { fill: "var(--text-dim)", fontSize: 11, fontFamily: "var(--font-jetbrains-mono)" };

function formatDay(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function XpChart({ points, levelMarks }: { points: Point[]; levelMarks: { level: number; xp: number }[] }) {
  if (points.length < 2) {
    return (
      <p className="flex h-64 items-center justify-center border-2 border-dashed border-line text-sm text-text-dim">
        Your XP line starts after your first full day. Finish a quest and check back tomorrow.
      </p>
    );
  }

  const last = points[points.length - 1];

  // Early levels sit close together, so only draw level lines far enough
  // apart for their labels not to collide (at least ~8% of the chart height).
  const minGap = Math.max(last.xp, levelMarks.at(-1)?.xp ?? 0) * 0.08;
  // Walk down from the highest level and keep each one only if it's far
  // enough below the last level we kept.
  const shownMarks: typeof levelMarks = [];
  for (const mark of [...levelMarks].reverse()) {
    const above = shownMarks.at(-1);
    if (!above || above.xp - mark.xp >= minGap) shownMarks.push(mark);
  }

  return (
    <div className="h-72 w-full" role="img" aria-label={`Total XP over time, now ${last.xp.toLocaleString()} XP. The daily log table lists the same days.`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 16, right: 56, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="xp-wash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--yellow)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--yellow)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeWidth={1} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tick={axisText}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            minTickGap={40}
          />
          <YAxis
            tick={axisText}
            tickLine={false}
            axisLine={false}
            width={48}
            allowDecimals={false}
            tickFormatter={(xp: number) => xp.toLocaleString()}
          />

          {/* Where each level starts: quiet hairlines with a small label. */}
          {shownMarks.map((mark) => (
            <ReferenceLine
              key={mark.level}
              y={mark.xp}
              stroke="var(--line)"
              strokeWidth={1}
              label={{ value: `LV ${mark.level}`, position: "right", ...axisText }}
            />
          ))}

          <Tooltip
            cursor={{ stroke: "var(--text-dim)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as Point | undefined;
              if (!active || !point) return null;
              return (
                <div className="border-2 border-ink bg-panel-raised px-3 py-2 text-sm shadow-pixel">
                  <p className="font-bold text-text">{point.xp.toLocaleString()} XP</p>
                  <p className="text-xs text-text-dim">{formatDay(point.date)}</p>
                </div>
              );
            }}
          />

          <Area
            type="monotone"
            dataKey="xp"
            stroke="var(--yellow)"
            strokeWidth={2}
            fill="url(#xp-wash)"
            dot={false}
            activeDot={{ r: 5, fill: "var(--yellow)", stroke: "var(--panel)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
