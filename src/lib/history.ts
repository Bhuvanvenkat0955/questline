// Everything the Progress screen shows, worked out from finished quests:
// the headline stats, the activity calendar and the XP-over-time line.

import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { phases, quests } from "@/db/schema";
import { addDays, bestStreak, currentStreak, levelFromXp, questXp, xpToNextLevel } from "./progress";
import { getActiveGoal } from "./today";

/** How many weeks the activity calendar covers. */
const CALENDAR_WEEKS = 16;

export type DayActivity = { date: string; quests: number; xp: number };

export function getProgressView(today: string) {
  const goal = getActiveGoal();
  if (!goal) return null;

  const worlds = db.select().from(phases).where(eq(phases.goalId, goal.id)).all();
  const done = db
    .select({ quest: quests })
    .from(quests)
    .innerJoin(phases, eq(quests.phaseId, phases.id))
    .where(eq(phases.goalId, goal.id))
    .orderBy(asc(quests.completedOn))
    .all()
    .map((row) => row.quest)
    .filter((q) => q.status === "done" && q.completedOn);

  // Quests and XP per finished day.
  const byDay = new Map<string, DayActivity>();
  for (const q of done) {
    const day = byDay.get(q.completedOn!) ?? { date: q.completedOn!, quests: 0, xp: 0 };
    day.quests++;
    day.xp += questXp(q);
    byDay.set(day.date, day);
  }
  const activeDays = [...byDay.keys()];
  const totalXp = done.reduce((sum, q) => sum + questXp(q), 0);

  return {
    goal,
    stats: {
      streak: currentStreak(activeDays, today),
      bestStreak: bestStreak(activeDays),
      totalXp,
      level: levelFromXp(totalXp).level,
      questsDone: done.length,
      activeDays: activeDays.length,
      worldsCleared: worlds.filter((w) => w.status === "done").length,
      worldCount: worlds.length,
    },
    calendar: calendarWeeks(byDay, today),
    xpLine: xpLine(byDay, goal.createdAt.slice(0, 10), today),
    levelMarks: levelMarks(totalXp),
    // Newest first, for the table view.
    log: [...byDay.values()].reverse(),
  };
}

/**
 * The last CALENDAR_WEEKS weeks as columns of 7 days, Monday on top.
 * Days after today are null so the grid stays rectangular.
 */
function calendarWeeks(byDay: Map<string, DayActivity>, today: string) {
  const [y, m, d] = today.split("-").map(Number);
  const mondayOffset = (new Date(y, m - 1, d).getDay() + 6) % 7; // 0 = Monday
  const start = addDays(today, -mondayOffset - (CALENDAR_WEEKS - 1) * 7);

  return Array.from({ length: CALENDAR_WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, w * 7 + i);
      if (date > today) return null;
      return byDay.get(date) ?? { date, quests: 0, xp: 0 };
    }),
  );
}

/** Total XP at the end of each day, from the goal's first day (or first quest) to today. */
function xpLine(byDay: Map<string, DayActivity>, createdOn: string, today: string) {
  const first = [createdOn, ...byDay.keys()].sort()[0];
  const points: { date: string; xp: number }[] = [];
  let total = 0;
  for (let day = first; day <= today; day = addDays(day, 1)) {
    total += byDay.get(day)?.xp ?? 0;
    points.push({ date: day, xp: total });
  }
  return points;
}

/** The total XP where each level starts, up to the one after your current level. */
function levelMarks(totalXp: number) {
  const marks: { level: number; xp: number }[] = [];
  let xp = 0;
  for (let level = 1; xp <= totalXp; level++) {
    xp += xpToNextLevel(level);
    marks.push({ level: level + 1, xp });
  }
  return marks;
}

export type ProgressView = NonNullable<ReturnType<typeof getProgressView>>;
