import { connection } from "next/server";
import { Suspense } from "react";
import { NewGoalForm } from "@/components/goals/NewGoalForm";
import { getSettings, PROVIDER_LABELS } from "@/lib/settings";
import { getActiveGoal } from "@/lib/today";

// The New goal screen: an intake form. On submit, the chosen AI writes the worlds
// (or you add them by hand) and you land on the Roadmap to look them over.

export default function NewGoalPage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-pixel-grid px-6 py-10 text-text-ink sm:px-10">
        <p className="font-display text-xs uppercase">New quest line</p>
        <h1 className="mt-3 font-display text-4xl leading-none font-bold uppercase sm:text-5xl">What&apos;s the goal?</h1>
        <p className="mt-3 max-w-xl text-sm">
          Describe it in your own words. It becomes a map of worlds to clear, with small quests each day that fit your
          time.
        </p>
      </section>
      <div className="px-6 py-8 sm:px-10">
        <Suspense fallback={null}>
          <Form />
        </Suspense>
      </div>
    </main>
  );
}

async function Form() {
  await connection();
  const { aiProvider } = getSettings();
  return (
    <NewGoalForm
      currentGoal={getActiveGoal()?.title ?? null}
      planner={aiProvider === "none" ? null : PROVIDER_LABELS[aiProvider]}
    />
  );
}
