"use client";

// Edit the active goal's details. The AI reads these every time it plans,
// so updating your starting point or daily minutes changes future plans.

import { useActionState } from "react";
import { saveGoalSettings } from "@/app/(app)/settings/actions";
import { PixelButton } from "@/components/ui/PixelButton";
import type { Goal } from "@/db/schema";

const inputClass =
  "border-2 border-line bg-ink px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-cyan focus:outline-none";

export function GoalSettingsForm({ goal }: { goal: Goal }) {
  const [state, action, pending] = useActionState(saveGoalSettings, null);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="font-display text-xs uppercase">Goal</span>
        <input name="title" required maxLength={80} defaultValue={goal.title} className={`h-11 ${inputClass}`} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-display text-xs uppercase">Why it matters</span>
        <textarea name="description" rows={2} maxLength={500} defaultValue={goal.description ?? ""} className={`resize-none py-2 ${inputClass}`} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-display text-xs uppercase">Where you are now</span>
        <textarea name="startingPoint" rows={3} maxLength={500} defaultValue={goal.startingPoint ?? ""} className={`resize-none py-2 ${inputClass}`} />
        <span className="text-xs text-text-dim">Update this as you improve, so daily plans keep up with you.</span>
      </label>
      <div className="flex flex-wrap gap-6">
        <label className="flex flex-col gap-2">
          <span className="font-display text-xs uppercase">Minutes a day</span>
          <input name="dailyMinutes" type="number" required min={5} max={600} defaultValue={goal.dailyMinutes} className={`h-11 w-28 tabular-nums ${inputClass}`} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-display text-xs uppercase">Target date</span>
          <input name="targetDate" type="date" defaultValue={goal.targetDate ?? ""} className={`h-11 ${inputClass} [color-scheme:dark]`} />
        </label>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-red">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <PixelButton type="submit" color="green" disabled={pending}>
          {pending ? "Saving..." : "Save goal"}
        </PixelButton>
        {state?.saved && !pending && <span className="text-sm text-green">Saved.</span>}
      </div>
    </form>
  );
}
