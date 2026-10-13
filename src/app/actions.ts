"use server";

// Server Actions: functions that run on the server (where the database is)
// but can be called straight from buttons and forms in the browser.
// Next.js turns each call into a small POST request behind the scenes, so
// every input is treated as untrusted and checked before it touches the database.

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { checkins, phases, quests } from "@/db/schema";
import { localDate } from "@/lib/progress";
import { getActiveGoal, getStats } from "@/lib/today";

export type CheckinState = { error?: string } | null;

const ENERGY = ["low", "ok", "high"] as const;

/** Saves (or updates) today's check-in from the form on the Today screen. */
export async function saveCheckin(_prev: CheckinState, form: FormData): Promise<CheckinState> {
  const goal = getActiveGoal();
  if (!goal) return { error: "There's no goal to check in to yet." };

  const minutes = Number(form.get("minutes"));
  const energy = ENERGY.find((e) => e === form.get("energy"));
  const note = String(form.get("note") ?? "").trim().slice(0, 280) || null;

  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 600) {
    return { error: "Minutes should be a whole number between 5 and 600." };
  }
  if (!energy) return { error: "Pick how much energy you have today." };

  const values = { goalId: goal.id, date: localDate(), minutesAvailable: minutes, energy, note };
  db.insert(checkins)
    .values(values)
    // Already checked in today? Replace the answers instead of adding a second row.
    .onConflictDoUpdate({
      target: [checkins.goalId, checkins.date],
      set: { minutesAvailable: minutes, energy, note },
    })
    .run();

  // Re-render the page with the fresh data from the database.
  refresh();
  return null;
}

export type QuestResult = { xpGained: number; level: number; leveledUp: boolean };

/** Marks a quest done, skipped, or back to todo, and reports the XP change. */
export async function setQuestStatus(questId: number, status: "done" | "todo" | "skipped"): Promise<QuestResult> {
  const goal = getActiveGoal();
  if (!goal || !Number.isInteger(questId) || !["done", "todo", "skipped"].includes(status)) {
    throw new Error("Invalid quest update.");
  }

  // Only quests that belong to the active goal can be changed.
  const owned = db
    .select({ id: quests.id })
    .from(quests)
    .innerJoin(phases, eq(quests.phaseId, phases.id))
    .where(and(eq(quests.id, questId), eq(phases.goalId, goal.id)))
    .get();
  if (!owned) throw new Error("Quest not found.");

  const today = localDate();
  const before = getStats(goal.id, today);

  db.update(quests)
    .set({ status, completedOn: status === "done" ? today : null })
    .where(eq(quests.id, questId))
    .run();

  const after = getStats(goal.id, today);
  refresh();
  return {
    xpGained: after.totalXp - before.totalXp,
    level: after.level,
    leveledUp: after.level > before.level,
  };
}
