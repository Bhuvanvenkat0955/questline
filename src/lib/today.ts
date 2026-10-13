// Everything the Today screen shows, read from the database in one place.
// `server-only` makes the build fail if a browser component ever imports this
// file by mistake: the database lives on your disk, not in the browser.

import "server-only";
import { and, asc, eq, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { checkins, goals, phases, quests, type Quest } from "@/db/schema";
import { currentStreak, levelFromXp, questXp } from "./progress";

/** The goal you're working on. For now that's the first active one. */
export function getActiveGoal() {
  return db.select().from(goals).where(eq(goals.status, "active")).orderBy(asc(goals.id)).get();
}

/** Every quest of a goal, across all its worlds and days. */
function allQuests(goalId: number) {
  return db
    .select({ quest: quests })
    .from(quests)
    .innerJoin(phases, eq(quests.phaseId, phases.id))
    .where(eq(phases.goalId, goalId))
    .all()
    .map((row) => row.quest);
}

/** XP, level and streak, worked out from finished quests (never stored). */
export function getStats(goalId: number, today: string) {
  const done = allQuests(goalId).filter((q) => q.status === "done");
  const totalXp = done.reduce((sum, q) => sum + questXp(q), 0);
  return {
    totalXp,
    ...levelFromXp(totalXp),
    streak: currentStreak(
      done.map((q) => q.completedOn).filter((d): d is string => d !== null),
      today,
    ),
    questsDone: done.length,
  };
}

/**
 * Quests for one day's list: the ones planned for that day, plus missed ones
 * from earlier days that were finished on it (so they don't vanish when ticked).
 */
function questsOn(goalId: number, date: string): Quest[] {
  return db
    .select({ quest: quests })
    .from(quests)
    .innerJoin(phases, eq(quests.phaseId, phases.id))
    .where(and(eq(phases.goalId, goalId), or(eq(quests.date, date), eq(quests.completedOn, date))))
    .orderBy(asc(quests.date), asc(quests.position))
    .all()
    .map((row) => row.quest);
}

/** Quests from earlier days that were never finished or skipped. */
function missedBefore(goalId: number, date: string): Quest[] {
  return db
    .select({ quest: quests })
    .from(quests)
    .innerJoin(phases, eq(quests.phaseId, phases.id))
    .where(and(eq(phases.goalId, goalId), lt(quests.date, date), eq(quests.status, "todo")))
    .orderBy(asc(quests.date), asc(quests.position))
    .all()
    .map((row) => row.quest);
}

/** All the data for the Today screen, or null if there's no goal yet. */
export function getTodayView(today: string) {
  const goal = getActiveGoal();
  if (!goal) return null;

  const worlds = db.select().from(phases).where(eq(phases.goalId, goal.id)).orderBy(asc(phases.position)).all();
  const world = worlds.find((w) => w.status === "current") ?? null;
  const checkin =
    db
      .select()
      .from(checkins)
      .where(and(eq(checkins.goalId, goal.id), eq(checkins.date, today)))
      .get() ?? null;
  const todayQuests = questsOn(goal.id, today);

  return {
    goal,
    world,
    worldCount: worlds.length,
    checkin,
    quests: todayQuests,
    missed: missedBefore(goal.id, today),
    stats: getStats(goal.id, today),
    xpAvailableToday: todayQuests.reduce((sum, q) => sum + questXp(q), 0),
  };
}

export type TodayView = NonNullable<ReturnType<typeof getTodayView>>;
