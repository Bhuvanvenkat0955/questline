"use server";

// Server Actions: functions that run on the server (where the database is)
// but can be called straight from buttons and forms in the browser.
// Next.js turns each call into a small POST request behind the scenes, so
// every input is treated as untrusted and checked before it touches the database.

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { checkins, phases, quests } from "@/db/schema";
import { AiError } from "@/lib/ai";
import { countQuestsOn, planToday } from "@/lib/dayPlan";
import { localDate } from "@/lib/progress";
import { aiEnabled } from "@/lib/settings";
import { getActiveGoal, getStats } from "@/lib/today";

export type CheckinState = {
  /** True once the check-in itself is stored, even if planning then failed. */
  saved?: boolean;
  error?: string;
  /** Set when saving the check-in also planned the day. */
  planned?: { worldCleared: boolean; nextWorld: string | null };
} | null;

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

  const today = localDate();
  db.insert(checkins)
    .values({ goalId: goal.id, date: today, minutesAvailable: minutes, energy, note })
    // Already checked in today? Replace the answers instead of adding a second row.
    .onConflictDoUpdate({
      target: [checkins.goalId, checkins.date],
      set: { minutesAvailable: minutes, energy, note },
    })
    .run();

  // First check-in of the day: ask the AI to plan today's quests right away.
  // (Editing the check-in later keeps the plan you already have.)
  let result: CheckinState = { saved: true };
  if (aiEnabled() && countQuestsOn(goal.id, today) === 0) {
    try {
      result = { saved: true, planned: await planToday(goal, today) };
    } catch (error) {
      result = { saved: true, error: `Check-in saved, but planning failed: ${messageOf(error)}` };
    }
  }

  // Re-render the page with the fresh data from the database.
  refresh();
  return result;
}

/** Plans today's quests again, e.g. after planning failed. */
export async function planTodayAction(): Promise<CheckinState> {
  const goal = getActiveGoal();
  if (!goal) return { error: "There's no goal yet." };
  try {
    const planned = await planToday(goal, localDate());
    refresh();
    return { planned };
  } catch (error) {
    return { error: messageOf(error) };
  }
}

/** Only our own AI errors have messages meant for the screen. */
function messageOf(error: unknown) {
  if (error instanceof AiError) return error.message;
  console.error(error);
  return "Something went wrong. Try again.";
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
    // Feedback only makes sense for finished quests, so un-ticking clears it.
    .set(status === "done" ? { status, completedOn: today } : { status, completedOn: null, feedback: null })
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

const FEEDBACK = ["too_easy", "just_right", "too_hard"] as const;

/** Saves how a finished quest felt, so tomorrow's plan can adjust. */
export async function setQuestFeedback(questId: number, feedback: (typeof FEEDBACK)[number]) {
  const goal = getActiveGoal();
  if (!goal || !Number.isInteger(questId) || !FEEDBACK.includes(feedback)) throw new Error("Invalid feedback.");

  const owned = db
    .select({ id: quests.id })
    .from(quests)
    .innerJoin(phases, eq(quests.phaseId, phases.id))
    .where(and(eq(quests.id, questId), eq(phases.goalId, goal.id), eq(quests.status, "done")))
    .get();
  if (!owned) throw new Error("Quest not found.");

  db.update(quests).set({ feedback }).where(eq(quests.id, questId)).run();
  refresh();
}

export type AddQuestState = { error?: string; added?: boolean } | null;

const QUEST_TYPES = ["learn", "practice", "create", "boss"] as const;

/** Adds a quest you wrote yourself to today's list, in the current world. */
export async function addQuest(_prev: AddQuestState, form: FormData): Promise<AddQuestState> {
  const goal = getActiveGoal();
  if (!goal) return { error: "There's no goal yet." };

  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  const instructions = String(form.get("instructions") ?? "").trim().slice(0, 400) || null;
  const estMinutes = Number(form.get("estMinutes"));
  const type = QUEST_TYPES.find((t) => t === form.get("type"));
  if (!title) return { error: "Give the quest a name." };
  if (!Number.isInteger(estMinutes) || estMinutes < 5 || estMinutes > 240) {
    return { error: "Minutes should be a whole number between 5 and 240." };
  }
  if (!type) return { error: "Pick a quest type." };

  const world = db
    .select()
    .from(phases)
    .where(and(eq(phases.goalId, goal.id), eq(phases.status, "current")))
    .get();
  if (!world) return { error: "There's no current world. Add one on the Roadmap first." };

  const today = localDate();
  const position = countQuestsOn(goal.id, today) + 1;
  db.insert(quests).values({ phaseId: world.id, date: today, position, title, instructions, estMinutes, type }).run();
  refresh();
  return { added: true };
}
