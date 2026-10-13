"use client";

// The start-of-day check-in. Before you check in it's a form; afterwards it
// shows a one-line summary with an Edit button. Step 6's AI planner reads
// these answers to size the day's quests.

import clsx from "clsx";
import { BatteryFull, BatteryLow, BatteryMedium, Pencil } from "pixelarticons/react";
import { useActionState, useState } from "react";
import { saveCheckin, type CheckinState } from "@/app/actions";
import { PixelButton } from "@/components/ui/PixelButton";
import type { Checkin } from "@/db/schema";

const energyOptions = [
  { value: "low", label: "Low", icon: <BatteryLow /> },
  { value: "ok", label: "Okay", icon: <BatteryMedium /> },
  { value: "high", label: "High", icon: <BatteryFull /> },
] as const;

const minutePresets = [15, 30, 45, 60, 90];

type CheckinPanelProps = {
  checkin: Checkin | null;
  /** The goal's usual minutes per day, used as the starting value. */
  defaultMinutes: number;
};

export function CheckinPanel({ checkin, defaultMinutes }: CheckinPanelProps) {
  const [editing, setEditing] = useState(false);

  if (checkin && !editing) {
    const energy = energyOptions.find((e) => e.value === checkin.energy)!;
    return (
      <section className="flex flex-wrap items-center gap-x-5 gap-y-2 border-2 border-line bg-panel px-5 py-3 text-sm">
        <span className="font-display text-xs text-cyan uppercase">Today&apos;s check-in</span>
        <span>{checkin.minutesAvailable} min</span>
        <span className="inline-flex items-center gap-1 [&_svg]:size-5">
          {energy.icon} {energy.label} energy
        </span>
        {checkin.note && <span className="min-w-0 flex-1 truncate text-text-dim">“{checkin.note}”</span>}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-auto inline-flex cursor-pointer items-center gap-1 font-display text-xs text-text-dim uppercase hover:text-text focus-visible:outline-2 focus-visible:outline-yellow [&_svg]:size-4"
        >
          <Pencil /> Edit
        </button>
      </section>
    );
  }

  return (
    <CheckinForm
      checkin={checkin}
      defaultMinutes={defaultMinutes}
      onSaved={() => setEditing(false)}
      onCancel={checkin ? () => setEditing(false) : undefined}
    />
  );
}

function CheckinForm({
  checkin,
  defaultMinutes,
  onSaved,
  onCancel,
}: CheckinPanelProps & { onSaved: () => void; onCancel?: () => void }) {
  const [minutes, setMinutes] = useState(checkin?.minutesAvailable ?? defaultMinutes);

  // useActionState runs the Server Action and keeps its result (an error
  // message or null) plus a `pending` flag while it's saving.
  const [state, formAction, pending] = useActionState(async (prev: CheckinState, form: FormData) => {
    const result = await saveCheckin(prev, form);
    if (!result?.error) onSaved();
    return result;
  }, null);

  return (
    <form action={formAction} className="flex flex-col gap-6 border-2 border-line bg-panel p-6">
      <div>
        <h2 className="font-display text-xl text-cyan uppercase">Morning check-in</h2>
        <p className="mt-1 text-sm text-text-dim">Tell Questline what today looks like so the quests fit it.</p>
      </div>

      <fieldset>
        <legend className="font-display text-xs uppercase">Time you have today</legend>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {minutePresets.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(m)}
              aria-pressed={minutes === m}
              className={clsx(
                "h-9 cursor-pointer border-2 px-3 text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-yellow",
                minutes === m ? "border-ink bg-cyan text-ink" : "border-line bg-panel-raised hover:border-text-dim",
              )}
            >
              {m}
            </button>
          ))}
          <label className="ml-1 flex items-center gap-2 text-sm text-text-dim">
            <input
              type="number"
              name="minutes"
              min={5}
              max={600}
              required
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="h-9 w-20 border-2 border-line bg-ink px-2 text-text tabular-nums focus:border-cyan focus:outline-none"
            />
            minutes
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-display text-xs uppercase">Energy</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {energyOptions.map((e) => (
            <label key={e.value} className="cursor-pointer">
              <input
                type="radio"
                name="energy"
                value={e.value}
                defaultChecked={(checkin?.energy ?? "ok") === e.value}
                className="peer sr-only"
              />
              <span
                className={clsx(
                  "inline-flex h-11 items-center gap-2 border-2 border-line bg-panel-raised px-4 text-sm [&_svg]:size-5",
                  "peer-checked:border-ink peer-checked:bg-yellow peer-checked:text-ink",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-yellow",
                  "hover:border-text-dim",
                )}
              >
                {e.icon} {e.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="font-display text-xs uppercase">
          Anything going on? <span className="text-text-dim normal-case">(optional)</span>
        </span>
        <textarea
          name="note"
          rows={2}
          maxLength={280}
          defaultValue={checkin?.note ?? ""}
          placeholder="e.g. travelling today, exam tomorrow, feeling great"
          className="resize-none border-2 border-line bg-ink p-3 text-sm text-text placeholder:text-text-dim/60 focus:border-cyan focus:outline-none"
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-red">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-4">
        <PixelButton type="submit" color="green" size="lg" disabled={pending}>
          {pending ? "Saving..." : checkin ? "Save changes" : "Start the day"}
        </PixelButton>
        {onCancel && (
          <PixelButton color="dark" size="lg" onClick={onCancel}>
            Cancel
          </PixelButton>
        )}
      </div>
    </form>
  );
}
