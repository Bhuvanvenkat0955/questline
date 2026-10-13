import clsx from "clsx";
import { accentBg, type Accent } from "./accents";

type XPBarProps = {
  value: number;
  max: number;
  label?: string;
  accent?: Accent;
  /** How many pixel blocks the bar is split into. */
  segments?: number;
};

/** Blocky progress bar. Fills one segment at a time instead of a smooth stripe. */
export function XPBar({ value, max, label = "XP", accent = "yellow", segments = 20 }: XPBarProps) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const filled = Math.round(ratio * segments);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4 text-xs">
        <span className="font-display uppercase">{label}</span>
        <span className="text-text-dim tabular-nums">
          {value} / {max}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="flex gap-1 border-[3px] border-ink bg-ink p-1"
      >
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={clsx(
              "h-4 flex-1 transition-colors duration-150 ease-out motion-reduce:transition-none",
              i < filled ? accentBg[accent] : "bg-panel-raised",
            )}
            // Segments light up left to right in a quick wave.
            style={{ transitionDelay: `${i * 12}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
