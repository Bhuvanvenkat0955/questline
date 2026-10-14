"use client";

// The evening question for "Depends" apps and sites: "1h 40m on YouTube today.
// How much was useful?" One slider each. Nothing about WHAT you watched is
// stored, only your answer.

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { reviewActivity } from "@/app/(app)/time/actions";
import { PixelButton } from "@/components/ui/PixelButton";
import type { ActivityRow } from "@/lib/screenTime";

export function ReviewCard({ items, durations }: { items: ActivityRow[]; durations: string[] }) {
  return (
    <section id="review" aria-labelledby="review-title" className="flex flex-col gap-4 border-[3px] border-ink bg-panel p-5 shadow-pixel [--shadow-color:var(--yellow-deep)]">
      <div>
        <h2 id="review-title" className="font-display text-base text-yellow uppercase">End-of-day review</h2>
        <p className="mt-1 text-sm text-text-dim">
          Some time is only useful sometimes. Be honest: this decides how it counts in your focus score.
        </p>
      </div>
      {items.map((item, i) => (
        <ReviewRow key={`${item.kind}:${item.name}`} item={item} duration={durations[i]} />
      ))}
    </section>
  );
}

function ReviewRow({ item, duration }: { item: ActivityRow; duration: string }) {
  const [percent, setPercent] = useState(item.usefulPercent ?? 50);
  const [saving, startSaving] = useTransition();
  const answered = item.usefulPercent !== null;

  function save() {
    startSaving(async () => {
      try {
        await reviewActivity(item.kind, item.name, percent);
        toast("Thanks, saved");
      } catch {
        toast.error("Couldn't save that. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t-2 border-line pt-4">
      <label htmlFor={`review-${item.kind}-${item.name}`} className="text-sm">
        <span className="font-bold">{duration}</span> on <span className="font-bold">{item.name}</span> today. How much was
        useful?
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <input
          id={`review-${item.kind}-${item.name}`}
          type="range"
          min={0}
          max={100}
          step={10}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="w-64 accent-[var(--yellow)]"
        />
        <span className="w-28 text-sm tabular-nums">
          {percent}% useful
        </span>
        <PixelButton size="sm" color={answered ? "dark" : "yellow"} onClick={save} disabled={saving}>
          {saving ? "Saving..." : answered ? "Update" : "Save answer"}
        </PixelButton>
      </div>
    </div>
  );
}
