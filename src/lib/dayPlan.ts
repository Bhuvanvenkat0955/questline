// Planning a day: gather what the AI needs to know, ask it (planner.ts), then
// save its answer. Used by the morning check-in and the "Plan today" button.

import "server-only";
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { checkins, phases, quests, type Goal } from "@/db/schema";
import { AiError } from "./ai";
import { planDay, type DayContext } from "./planner";
import { addDays } from "./progress";

/** How many days of history the AI sees when planning. */
const HISTORY_DAYS = 14;

export async function planToday(goal: Goal, today: string) {
  const checkin = db
    .select()
    .from(checkins)
    .where(and(eq(checkins.goalId, goal.id), eq(checkins.date, today)))
    .get();
  if (!checkin) throw new AiError("Check in first, so the plan can fit your day.");

  const worlds = db.select().from(phases).where(eq(phases.goalId, goal.id)).orderBy(asc(phases.position)).all();
  const current = worlds.find((w) => w.status === "current") ?? null;
  if (!current) throw new AiError("Every world is cleared. Add a world on the Roadmap to keep going.");
  const next = worlds.find((w) => w.status === "upcoming") ?? null;
  if (countQuestsOn(goal.id, today) > 0) throw new AiError("Today is already planned.");

  // All of this goal's quests, joined to their world so we can filter by goal.
  const goalQuests = (where: Parameters<typeof and>[0]) =>
    db
      .select({ quest: quests })
      .from(quests)
      .innerJoin(phases, eq(quests.phaseId, phases.id))
      .where(and(eq(phases.goalId, goal.id), where))
      .orderBy(desc(quests.date), asc(quests.position))
      .all()
      .map((row) => row.quest);

  const recent = goalQuests(and(gte(quests.date, addDays(today, -HISTORY_DAYS)), lt(quests.date, today)));
  const missed = goalQuests(and(lt(quests.date, today), eq(quests.status, "todo")));

  const context: DayContext = {
    today,
    weekday: new Date().toLocaleDateString("en-US", { weekday: "long" }),
    goal: { title: goal.title, description: goal.description, startingPoint: goal.startingPoint, targetDate: goal.targetDate },
    checkin: { minutesAvailable: checkin.minutesAvailable, energy: checkin.energy, note: checkin.note },
    worlds: worlds.map((w) => ({ position: w.position, title: w.title, doneCriteria: w.doneCriteria, status: w.status })),
    currentWorld: { title: current.title, doneCriteria: current.doneCriteria },
    nextWorld: next && { title: next.title, doneCriteria: next.doneCriteria },
    recentQuests: recent.slice(0, 40).map((q) => ({
      date: q.date,
      title: q.title,
      type: q.type,
      estMinutes: q.estMinutes,
      status: q.status,
      feedback: q.feedback,
    })),
    missedQuests: missed.map((q) => ({ id: q.id, date: q.date, title: q.title, estMinutes: q.estMinutes })),
  };

  // The slow part: usually somewhere between a few seconds and a minute.
  const plan = await planDay(context);

  const worldCleared = plan.currentWorldCleared;
  const targetWorld = worldCleared ? next : current;

  db.transaction((tx) => {
    // Someone may have planned today while the AI was thinking (e.g. a double click).
    if (countQuestsOn(goal.id, today) > 0) throw new AiError("Today is already planned.");

    if (worldCleared) {
      tx.update(phases).set({ status: "done", completedOn: today }).where(eq(phases.id, current.id)).run();
      if (next) tx.update(phases).set({ status: "current" }).where(eq(phases.id, next.id)).run();
    }

    // Carried-over quests move to today and go first on the list.
    plan.carryOverIds.forEach((id, i) => {
      tx.update(quests).set({ date: today, position: i + 1 }).where(eq(quests.id, id)).run();
    });

    if (targetWorld && plan.quests.length > 0) {
      tx.insert(quests)
        .values(
          plan.quests.map((q, i) => ({
            ...q,
            phaseId: targetWorld.id,
            date: today,
            position: plan.carryOverIds.length + i + 1,
          })),
        )
        .run();
    }

    tx.update(checkins).set({ planNote: plan.note || null }).where(eq(checkins.id, checkin.id)).run();
  });

  return { worldCleared, nextWorld: worldCleared ? (next?.title ?? null) : null };
}

/** How many quests are already dated today for this goal. */
export function countQuestsOn(goalId: number, today: string) {
  const worldIds = db.select({ id: phases.id }).from(phases).where(eq(phases.goalId, goalId)).all().map((w) => w.id);
  if (worldIds.length === 0) return 0;
  return db
    .select({ id: quests.id })
    .from(quests)
    .where(and(inArray(quests.phaseId, worldIds), eq(quests.date, today)))
    .all().length;
}
