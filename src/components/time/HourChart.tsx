// Active minutes in each hour of today: 24 thin columns, one hue (more =
// taller). Hover a column for its value; the app list has the details.

import { formatDuration } from "@/lib/screenTime";

const hourName = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" });

export function HourChart({ hours }: { hours: number[] }) {
  const most = Math.max(...hours, 1);

  return (
    <div>
      <div className="flex h-32 items-end gap-1" role="img" aria-label="Active time in each hour of today">
        {hours.map((seconds, h) => (
          <div key={h} className="group relative flex h-full flex-1 items-end" title={`${hourName(h)}: ${formatDuration(seconds)}`}>
            <span
              className="block w-full bg-cyan group-hover:bg-yellow"
              style={{ height: seconds > 0 ? `${Math.max((seconds / most) * 100, 4)}%` : "1px", opacity: seconds > 0 ? 1 : 0.25 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex text-xs text-text-dim" aria-hidden="true">
        {[0, 6, 12, 18].map((h) => (
          <span key={h} className="flex-1">
            {hourName(h)}
          </span>
        ))}
      </div>
    </div>
  );
}
