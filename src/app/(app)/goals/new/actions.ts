"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { goals, phases } from "@/db/schema";
import { AiError } from "@/lib/ai";
import { planWorlds } from "@/lib/planner";
import { localDate } from "@/lib/progress";
import { getActiveGoal } from "@/lib/today";

export type NewGoalState = { error?: string } | null;

/** Reads the intake form, has the AI write the worlds, then saves everything. */
export async function createGoal(_prev: NewGoalState, form: FormData): Promise<NewGoalState> {
  const field = (name: string, max: number) => String(form.get(name) ?? "").trim().slice(0, max) || null;
  const title = field("title", 80);
  const description = field("description", 500);
  const startingPoint = field("startingPoint", 500);
  const dailyMinutes = Number(form.get("dailyMinutes"));
  const targetDate = field("targetDate", 10);
  const today = localDate();

  if (!title) return { error: "What's the goal? Give it a name." };
  if (!Number.isInteger(dailyMinutes) || dailyMinutes < 5 || dailyMinutes > 600) {
    return { error: "Daily minutes should be a whole number between 5 and 600." };
  }
  if (targetDate && (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || targetDate <= today)) {
    return { error: "The target date should be a day in the future." };
  }
  if (getActiveGoal() && form.get("replaceGoal") !== "on") {
    return { error: "Tick the box to confirm replacing your current quest line." };
  }

  let worlds;
  try {
    // The slow part: Claude writes the worlds.
    worlds = await planWorlds({ title, description, startingPoint, dailyMinutes, targetDate, today });
  } catch (error) {
    if (error instanceof AiError) return { error: error.message };
    console.error(error);
    return { error: "Something went wrong while planning. Try again." };
  }

  db.transaction((tx) => {
    // One quest line at a time for now: the old one is archived, not deleted.
    tx.update(goals).set({ status: "archived" }).where(eq(goals.status, "active")).run();
    const goal = tx
      .insert(goals)
      .values({ title, description, startingPoint, dailyMinutes, targetDate })
      .returning()
      .get();
    tx.insert(phases)
      .values(worlds.map((w, i) => ({ ...w, goalId: goal.id, position: i + 1, status: i === 0 ? ("current" as const) : ("upcoming" as const) })))
      .run();
  });

  // Show the new map, where the worlds can be tweaked before the first day.
  redirect("/roadmap");
}
