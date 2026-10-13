"use server";

// Server Actions for editing the roadmap's worlds by hand.
// Rules that keep the map sensible:
//   - worlds always run done → current → upcoming, top to bottom
//   - only upcoming worlds can be reordered or deleted
//   - a world with quests in it can't be deleted (its history would vanish)

import { and, asc, count, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { phases, quests } from "@/db/schema";
import { localDate } from "@/lib/progress";
import { getActiveGoal } from "@/lib/today";

export type WorldFormState = { error?: string } | null;

/** Reads and checks the title / "clear when" fields shared by the edit and add forms. */
function readWorldFields(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const doneCriteria = String(form.get("doneCriteria") ?? "").trim();
  if (!title || title.length > 80) return { error: "Give the world a name (up to 80 characters)." };
  if (!doneCriteria || doneCriteria.length > 300) {
    return { error: "Describe when the world is cleared (up to 300 characters)." };
  }
  return { title, doneCriteria };
}

/** The goal's worlds in order, used by every action below. */
function worldsOfActiveGoal() {
  const goal = getActiveGoal();
  if (!goal) throw new Error("There's no goal yet.");
  const worlds = db.select().from(phases).where(eq(phases.goalId, goal.id)).orderBy(asc(phases.position)).all();
  return { goal, worlds };
}

function findWorld(worldId: number) {
  const { goal, worlds } = worldsOfActiveGoal();
  const world = worlds.find((w) => w.id === worldId);
  if (!Number.isInteger(worldId) || !world) throw new Error("World not found.");
  return { goal, worlds, world };
}

/** Rewrites positions as 1, 2, 3... in the given order. */
function renumber(ids: number[]) {
  db.transaction((tx) => {
    ids.forEach((id, i) => tx.update(phases).set({ position: i + 1 }).where(eq(phases.id, id)).run());
  });
}

export async function editWorld(worldId: number, _prev: WorldFormState, form: FormData): Promise<WorldFormState> {
  findWorld(worldId);
  const fields = readWorldFields(form);
  if ("error" in fields) return fields;

  db.update(phases).set(fields).where(eq(phases.id, worldId)).run();
  refresh();
  return null;
}

export async function addWorld(_prev: WorldFormState, form: FormData): Promise<WorldFormState> {
  const { goal, worlds } = worldsOfActiveGoal();
  const fields = readWorldFields(form);
  if ("error" in fields) return fields;

  // If every world is already cleared, the new one becomes the current world.
  const hasCurrent = worlds.some((w) => w.status === "current");
  db.insert(phases)
    .values({ goalId: goal.id, position: worlds.length + 1, ...fields, status: hasCurrent ? "upcoming" : "current" })
    .run();
  refresh();
  return null;
}

export async function moveWorld(worldId: number, direction: -1 | 1) {
  const { worlds, world } = findWorld(worldId);
  const index = worlds.indexOf(world);
  const neighbour = worlds[index + direction];
  if (world.status !== "upcoming" || neighbour?.status !== "upcoming") return;

  const ids = worlds.map((w) => w.id);
  [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
  renumber(ids);
  refresh();
}

export async function deleteWorld(worldId: number) {
  const { worlds, world } = findWorld(worldId);
  if (world.status !== "upcoming") throw new Error("Only upcoming worlds can be deleted.");

  const [{ n }] = db.select({ n: count() }).from(quests).where(eq(quests.phaseId, worldId)).all();
  if (n > 0) throw new Error("This world already has quests, so it can't be deleted.");

  db.delete(phases).where(eq(phases.id, worldId)).run();
  renumber(worlds.filter((w) => w.id !== worldId).map((w) => w.id));
  refresh();
}

/** Marks the current world as cleared and moves you into the next one. */
export async function clearWorld(worldId: number) {
  const { goal, worlds, world } = findWorld(worldId);
  if (world.status !== "current") throw new Error("Only the current world can be cleared.");

  const next = worlds.find((w) => w.status === "upcoming");
  db.transaction((tx) => {
    tx.update(phases).set({ status: "done", completedOn: localDate() }).where(eq(phases.id, worldId)).run();
    if (next) {
      tx.update(phases)
        .set({ status: "current" })
        .where(and(eq(phases.id, next.id), eq(phases.goalId, goal.id)))
        .run();
    }
  });
  refresh();
}
