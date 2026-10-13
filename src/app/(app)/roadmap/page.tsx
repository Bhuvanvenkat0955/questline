import { connection } from "next/server";
import { Suspense } from "react";
import { AddWorld } from "@/components/roadmap/AddWorld";
import { QuestLog } from "@/components/roadmap/QuestLog";
import { WorldCard } from "@/components/roadmap/WorldCard";
import { dayLabel, localDate } from "@/lib/progress";
import { getRoadmapView } from "@/lib/roadmap";

// The Roadmap screen: every world of the goal as a path, from cleared
// worlds at the top to locked ones at the bottom, each with its quest log.

export default function RoadmapPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<p className="px-6 py-10 text-text-dim sm:px-10">Loading roadmap...</p>}>
        <Roadmap />
      </Suspense>
    </main>
  );
}

async function Roadmap() {
  await connection();
  const view = getRoadmapView();
  if (!view) {
    return (
      <p className="mx-6 my-10 max-w-xl border-2 border-line bg-panel p-6 text-sm text-text-dim sm:mx-10">
        No quest line yet, so there&apos;s no roadmap to show.
      </p>
    );
  }

  const today = localDate();
  const { goal, worlds } = view;
  const upcoming = worlds.filter((w) => w.status === "upcoming").map((w) => w.id);

  return (
    <>
      <section className="bg-pixel-grid px-6 py-10 text-text-ink sm:px-10">
        <p className="font-display text-xs uppercase">Roadmap</p>
        <h1 className="mt-3 font-display text-4xl leading-none font-bold uppercase sm:text-5xl">{goal.title}</h1>
        {goal.description && <p className="mt-3 max-w-2xl text-sm">{goal.description}</p>}
        <p className="mt-4 font-display text-xs uppercase tabular-nums">
          {view.worldsCleared} of {worlds.length} worlds cleared · {view.questsDone} quests done · {view.totalXp} XP
          {goal.targetDate && ` · Target ${dayLabel(goal.targetDate, today)}`}
        </p>
      </section>

      <div className="px-6 py-8 sm:px-10">
        {worlds.length === 0 ? (
          <p className="mb-6 text-sm text-text-dim">This goal has no worlds yet. Add the first one below.</p>
        ) : (
          <ol aria-label="Worlds" className="max-w-3xl">
            {worlds.map((world, i) => (
              <WorldCard
                key={world.id}
                world={world}
                questsDone={world.questsDone}
                xpEarned={world.xpEarned}
                hasQuests={world.quests.length > 0}
                canMoveUp={upcoming.indexOf(world.id) > 0}
                canMoveDown={upcoming.includes(world.id) && upcoming.indexOf(world.id) < upcoming.length - 1}
                isLast={i === worlds.length - 1}
                clearedLabel={world.completedOn ? dayLabel(world.completedOn, today) : undefined}
              >
                <QuestLog quests={world.quests} today={today} open={world.status === "current"} />
              </WorldCard>
            ))}
          </ol>
        )}
        <AddWorld />
      </div>
    </>
  );
}
