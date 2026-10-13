import { connection } from "next/server";
import { Suspense } from "react";
import { AiSettingsForm } from "@/components/settings/AiSettingsForm";
import { GoalSettingsForm } from "@/components/settings/GoalSettingsForm";
import { getSettings } from "@/lib/settings";
import { getActiveGoal } from "@/lib/today";

// The Settings screen: which AI plans your days, and the active goal's details.

export default function SettingsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-pixel-grid px-6 py-10 text-text-ink sm:px-10">
        <p className="font-display text-xs uppercase">Settings</p>
        <h1 className="mt-3 font-display text-4xl leading-none font-bold uppercase sm:text-5xl">Your setup</h1>
      </section>
      <Suspense fallback={<p className="px-6 py-10 text-text-dim sm:px-10">Loading settings...</p>}>
        <SettingsSections />
      </Suspense>
    </main>
  );
}

async function SettingsSections() {
  await connection();
  const settings = getSettings();
  const goal = getActiveGoal();
  const key = settings.anthropicApiKey;

  return (
    <div className="flex flex-col gap-8 px-6 py-8 sm:px-10">
      <section aria-labelledby="ai-title" className="border-2 border-line bg-panel p-5">
        <h2 id="ai-title" className="font-display text-base uppercase">Planning AI</h2>
        <p className="mt-1 mb-5 text-sm text-text-dim">
          Who writes your worlds and daily quests. Everything uses your own account or computer, never anyone else&apos;s.
        </p>
        <AiSettingsForm
          provider={settings.aiProvider}
          // Only the last 4 characters ever reach the browser.
          keyHint={key ? `…${key.slice(-4)}` : null}
          anthropicModel={settings.anthropicModel}
          ollamaUrl={settings.ollamaUrl}
          ollamaModel={settings.ollamaModel}
        />
      </section>

      {goal && (
        <section aria-labelledby="goal-title" className="border-2 border-line bg-panel p-5">
          <h2 id="goal-title" className="font-display text-base uppercase">Current goal</h2>
          <p className="mt-1 mb-5 text-sm text-text-dim">The AI reads these every time it plans.</p>
          <GoalSettingsForm goal={goal} />
        </section>
      )}
    </div>
  );
}
