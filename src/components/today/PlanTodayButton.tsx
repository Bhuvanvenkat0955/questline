"use client";

// Shown when you've checked in but today has no quests yet, e.g. because
// planning failed. Asks the AI to plan the day again.

import { Zap } from "pixelarticons/react";
import { useActionState } from "react";
import { planTodayAction, type CheckinState } from "@/app/actions";
import { PixelButton } from "@/components/ui/PixelButton";
import { announcePlan } from "./CheckinPanel";

export function PlanTodayButton() {
  const [state, action, pending] = useActionState(async (): Promise<CheckinState> => {
    const result = await planTodayAction();
    if (result?.planned) announcePlan(result.planned);
    return result;
  }, null);

  return (
    <form action={action} className="flex flex-col items-start gap-3 border-2 border-dashed border-line p-6">
      <p className="text-sm text-text-dim">No quests planned for today yet.</p>
      <PixelButton type="submit" color="cyan" disabled={pending}>
        <Zap /> {pending ? "Planning..." : "Plan today's quests"}
      </PixelButton>
      {pending && (
        <p role="status" className="text-sm text-text-dim">
          Claude is planning today&apos;s quests. This can take up to a minute.
        </p>
      )}
      {state?.error && (
        <p role="alert" className="text-sm text-red">
          {state.error}
        </p>
      )}
    </form>
  );
}
