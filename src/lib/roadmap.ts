// Everything the Roadmap screen shows: the goal, every world in order, and
// each world's quest log with the XP it earned.

import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { phases, quests } from "@/db/schema";
import { questXp } from "./progress";
import { getActiveGoal } from "./today";

export function getRoadmapView() {
  const goal = getActiveGoal();
  if (!goal) return null;

  const worlds = db.select().from(phases).where(eq(phases.goalId, goal.id)).orderBy(asc(phases.position)).all();

  const withQuests = worlds.map((world) => {
    // Newest first, so the quest log reads like a diary.
    const log = db
      .select()
      .from(quests)
      .where(eq(quests.phaseId, world.id))
      .orderBy(desc(quests.date), asc(quests.position))
      .all();
    const done = log.filter((q) => q.status === "done");
    return {
      ...world,
      quests: log,
      questsDone: done.length,
      xpEarned: done.reduce((sum, q) => sum + questXp(q), 0),
    };
  });

  return {
    goal,
    worlds: withQuests,
    worldsCleared: worlds.filter((w) => w.status === "done").length,
    questsDone: withQuests.reduce((sum, w) => sum + w.questsDone, 0),
    totalXp: withQuests.reduce((sum, w) => sum + w.xpEarned, 0),
  };
}

export type RoadmapView = NonNullable<ReturnType<typeof getRoadmapView>>;
export type RoadmapWorld = RoadmapView["worlds"][number];
