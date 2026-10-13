"use client";

// The name + "clear when" form, shared by editing a world and adding a new one.
// `action` is a Server Action; useActionState runs it and remembers its result.

import { useActionState } from "react";
import type { WorldFormState } from "@/app/(app)/roadmap/actions";
import { PixelButton } from "@/components/ui/PixelButton";

type WorldFormProps = {
  action: (prev: WorldFormState, form: FormData) => Promise<WorldFormState>;
  defaults?: { title: string; doneCriteria: string };
  submitLabel: string;
  onDone?: () => void;
  onCancel?: () => void;
};

export function WorldForm({ action, defaults, submitLabel, onDone, onCancel }: WorldFormProps) {
  const [state, formAction, pending] = useActionState(async (prev: WorldFormState, form: FormData) => {
    const result = await action(prev, form);
    if (!result?.error) onDone?.();
    return result;
  }, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="font-display text-xs uppercase">World name</span>
        <input
          name="title"
          required
          maxLength={80}
          defaultValue={defaults?.title}
          placeholder="e.g. Run 5K without stopping"
          className="h-11 border-2 border-line bg-ink px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-cyan focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-display text-xs uppercase">Cleared when...</span>
        <textarea
          name="doneCriteria"
          required
          rows={2}
          maxLength={300}
          defaultValue={defaults?.doneCriteria}
          placeholder="e.g. You've run 5 km in one go, at any pace."
          className="resize-none border-2 border-line bg-ink p-3 text-sm text-text placeholder:text-text-dim/60 focus:border-cyan focus:outline-none"
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-red">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <PixelButton type="submit" color="green" size="sm" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </PixelButton>
        {onCancel && (
          <PixelButton color="dark" size="sm" onClick={onCancel}>
            Cancel
          </PixelButton>
        )}
      </div>
    </form>
  );
}
