"use client";

// The intake form for a new goal. Its answers are everything the AI knows
// when it writes the worlds, and the starting point is reused every morning.

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { createGoal } from "@/app/(app)/goals/new/actions";
import { PixelButton } from "@/components/ui/PixelButton";

const inputClass =
  "border-2 border-line bg-ink px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-cyan focus:outline-none";

export function NewGoalForm({ currentGoal, planner }: { currentGoal: string | null; planner: string | null }) {
  const [state, action, pending] = useActionState(createGoal, null);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      <Field label="Your goal" hint="One line. Anything you want to achieve.">
        <input name="title" required maxLength={80} placeholder="e.g. Run a half marathon" className={`h-11 ${inputClass}`} />
      </Field>

      <Field label="Why it matters" hint="Optional. Helps the plan aim at what you actually want.">
        <textarea name="description" rows={2} maxLength={500} placeholder="e.g. I want to feel fit again and do one in spring." className={`resize-none py-2 ${inputClass}`} />
      </Field>

      <Field label="Where you're starting from" hint="Be honest: the worlds skip what you can already do.">
        <textarea name="startingPoint" rows={3} maxLength={500} placeholder="e.g. I can jog 2 km slowly, haven't run in a year." className={`resize-none py-2 ${inputClass}`} />
      </Field>

      <div className="flex flex-wrap gap-6">
        <Field label="Minutes a day" hint="Your usual budget.">
          <input name="dailyMinutes" type="number" required min={5} max={600} defaultValue={30} className={`h-11 w-28 tabular-nums ${inputClass}`} />
        </Field>
        <Field label="Target date" hint="Optional.">
          <input name="targetDate" type="date" className={`h-11 ${inputClass} [color-scheme:dark]`} />
        </Field>
      </div>

      {currentGoal && (
        <label className="flex items-start gap-3 border-2 border-yellow bg-panel p-4 text-sm">
          <input type="checkbox" name="replaceGoal" className="mt-0.5 size-4 accent-[var(--yellow)]" />
          <span>
            Replace my current quest line, <strong>{currentGoal}</strong>. It will be archived, not deleted.
          </span>
        </label>
      )}

      {state?.error && (
        <p role="alert" className="text-sm text-red">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <PixelButton type="submit" color="green" size="lg" disabled={pending}>
          {pending ? (planner ? "Mapping your worlds..." : "Creating...") : "Create quest line"}
        </PixelButton>
        {pending && planner && (
          <p role="status" className="text-sm text-text-dim">
            {planner} is writing your worlds. This can take up to a minute.
          </p>
        )}
      </div>
      <p className="text-xs text-text-dim">
        {planner
          ? `${planner} will write your worlds.`
          : "AI planning is off: you'll add worlds yourself on the Roadmap."}{" "}
        <Link href="/settings" className="underline underline-offset-2 hover:text-text">
          Change in Settings
        </Link>
      </p>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-display text-xs uppercase">{label}</span>
      {children}
      <span className="text-xs text-text-dim">{hint}</span>
    </label>
  );
}
