"use client";

// "Add your own quest": a quest you write yourself, added to today's list.
// The only way to plan with no AI, and handy alongside the AI's plan too.

import clsx from "clsx";
import { Plus } from "pixelarticons/react";
import { useActionState, useState } from "react";
import { addQuest, type AddQuestState } from "@/app/actions";
import type { Accent } from "@/components/ui/accents";
import { PixelButton } from "@/components/ui/PixelButton";
import { questTypeStyle } from "./questTypes";

// Spelled out in full so Tailwind can find and generate every class.
const checkedStyle: Record<Accent, string> = {
  red: "peer-checked:bg-red peer-checked:text-cream",
  cyan: "peer-checked:bg-cyan peer-checked:text-ink",
  yellow: "peer-checked:bg-yellow peer-checked:text-ink",
  green: "peer-checked:bg-green peer-checked:text-ink",
  blue: "peer-checked:bg-blue peer-checked:text-cream",
  purple: "peer-checked:bg-purple peer-checked:text-cream",
};

const inputClass =
  "border-2 border-line bg-ink px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-cyan focus:outline-none";

export function AddQuest({ startOpen = false }: { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  // Bumped after each added quest so the form remounts empty.
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(async (prev: AddQuestState, form: FormData) => {
    const result = await addQuest(prev, form);
    if (result?.added) {
      setFormKey((k) => k + 1);
      if (!startOpen) setOpen(false);
    }
    return result;
  }, null);

  if (!open) {
    return (
      <PixelButton color="dark" size="sm" className="self-start" onClick={() => setOpen(true)}>
        <Plus /> Add your own quest
      </PixelButton>
    );
  }

  return (
    <form key={formKey} action={action} className="flex flex-col gap-4 border-2 border-dashed border-line bg-panel p-5">
      <h3 className="font-display text-sm text-cyan uppercase">Add your own quest</h3>
      <label className="flex flex-col gap-2">
        <span className="font-display text-xs uppercase">Quest</span>
        <input name="title" required maxLength={120} placeholder="e.g. Practise for 15 minutes" className={`h-11 ${inputClass}`} />
      </label>

      <div className="flex flex-wrap gap-6">
        <label className="flex flex-col gap-2">
          <span className="font-display text-xs uppercase">Minutes</span>
          <input name="estMinutes" type="number" required min={5} max={240} defaultValue={15} className={`h-11 w-24 tabular-nums ${inputClass}`} />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-display text-xs uppercase">Type</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(questTypeStyle).map(([value, style]) => (
              <label key={value} className="cursor-pointer">
                <input type="radio" name="type" value={value} defaultChecked={value === "practice"} className="peer sr-only" />
                <span
                  className={clsx(
                    "inline-flex h-11 items-center gap-2 border-2 border-line bg-panel-raised px-3 text-sm [&_svg]:size-4",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-yellow hover:border-text-dim",
                    "peer-checked:border-ink",
                    checkedStyle[style.accent],
                  )}
                >
                  {style.icon} {style.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-display text-xs uppercase">
          Details <span className="text-text-dim normal-case">(optional)</span>
        </span>
        <textarea name="instructions" rows={2} maxLength={400} placeholder="What to do, and what done looks like." className={`resize-none py-2 ${inputClass}`} />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-red">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <PixelButton type="submit" color="green" size="sm" disabled={pending}>
          {pending ? "Adding..." : "Add quest"}
        </PixelButton>
        {!startOpen && (
          <PixelButton color="dark" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </PixelButton>
        )}
      </div>
    </form>
  );
}
