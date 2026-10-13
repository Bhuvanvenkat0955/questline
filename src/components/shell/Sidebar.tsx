// The app's sidebar: logo, page links and a mini "player card" with your
// level, XP and streak, visible on every screen. On narrow windows it turns
// into a top bar and hides the player card.

import { connection } from "next/server";
import { Suspense } from "react";
import { Fire } from "pixelarticons/react";
import { XPBar } from "@/components/ui/XPBar";
import { localDate } from "@/lib/progress";
import { getActiveGoal, getStats } from "@/lib/today";
import { NavLinks } from "./NavLinks";

export function Sidebar() {
  return (
    <aside className="flex items-center justify-between gap-4 border-b-4 border-line px-6 py-3 md:sticky md:top-0 md:h-screen md:w-64 md:flex-col md:items-stretch md:justify-start md:gap-8 md:border-r-4 md:border-b-0 md:px-5 md:py-6">
      <span className="font-display text-lg uppercase">Questline</span>
      <NavLinks />
      <div className="mt-auto hidden md:block">
        <Suspense fallback={null}>
          <PlayerCard />
        </Suspense>
      </div>
    </aside>
  );
}

async function PlayerCard() {
  // Same reason as on the Today page: read fresh data on every visit.
  await connection();
  const goal = getActiveGoal();
  if (!goal) return null;
  const stats = getStats(goal.id, localDate());

  return (
    <section aria-label="Your stats" className="flex flex-col gap-3 border-2 border-line bg-panel p-4">
      <p className="truncate text-xs text-text-dim">{goal.title}</p>
      <div className="flex items-center justify-between">
        <span className="font-display text-sm text-yellow uppercase">Level {stats.level}</span>
        <span className="inline-flex items-center gap-1 text-sm text-red [&_svg]:size-5" title="Streak">
          <Fire /> {stats.streak}
        </span>
      </div>
      <XPBar label="XP" value={stats.xpIntoLevel} max={stats.xpForNext} segments={10} />
    </section>
  );
}
