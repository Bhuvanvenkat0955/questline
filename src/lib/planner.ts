// WHAT Questline asks the AI: the planner's rules, the exact shape of each
// answer (JSON Schema), and a check of every answer before it touches the
// database. HOW the AI is reached lives in ai.ts.
//
// Nothing here assumes a kind of goal: it has to work for "run a marathon",
// "learn Spanish", "pass my driving test" or anything else a user types.

import "server-only";
import type { QuestType } from "@/db/schema";
import { AiError, askAi } from "./ai";

const QUEST_TYPES = ["learn", "practice", "create", "boss"] as const;

// ---------------------------------------------------------------------------
// 1. Worlds: written once, when a goal is created.
// ---------------------------------------------------------------------------

export type GoalIntake = {
  title: string;
  description: string | null;
  startingPoint: string | null;
  dailyMinutes: number;
  targetDate: string | null;
  today: string;
};

export type PlannedWorld = { title: string; doneCriteria: string };

const WORLDS_SYSTEM = `You are the planner inside Questline, an app that turns any personal goal into a game.
A goal is split into "worlds": big milestones the player clears in order. Each day the app plans small quests inside the current world.

Write the worlds for the player's goal:
- 3 to 7 worlds, in the order they should be played. The last world means the goal is achieved.
- Each world is a concrete milestone the player could reach in roughly 1 to 4 weeks at their daily time budget.
- Start from where the player is now: skip what they can already do.
- If there's a target date, fit the worlds to it.
- title: short and specific, at most 40 characters, no "World 1:" prefix.
- doneCriteria: one sentence describing something observable that proves the world is cleared (a result, a test, a thing made), not "feel confident".
- Use plain, encouraging language. No emojis.`;

const WORLDS_SCHEMA = {
  type: "object",
  properties: {
    worlds: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, doneCriteria: { type: "string" } },
        required: ["title", "doneCriteria"],
        additionalProperties: false,
      },
    },
  },
  required: ["worlds"],
  additionalProperties: false,
};

export async function planWorlds(intake: GoalIntake): Promise<PlannedWorld[]> {
  const answer = await askAi({
    system: WORLDS_SYSTEM,
    prompt: `Plan the worlds for this goal.\n\n${JSON.stringify(intake, null, 2)}`,
    schema: WORLDS_SCHEMA,
  });

  const worlds = (answer as { worlds?: unknown })?.worlds;
  if (!Array.isArray(worlds)) throw new AiError("The AI's plan was missing its worlds.");

  const clean = worlds
    .map((w) => ({ title: text(w?.title, 80), doneCriteria: text(w?.doneCriteria, 300) }))
    .filter((w) => w.title && w.doneCriteria)
    .slice(0, 7);
  if (clean.length < 1) throw new AiError("The AI didn't return any usable worlds. Try again.");
  return clean;
}

// ---------------------------------------------------------------------------
// 2. A day's quests: planned fresh every morning from the check-in.
// ---------------------------------------------------------------------------

export type DayContext = {
  today: string;
  weekday: string;
  goal: { title: string; description: string | null; startingPoint: string | null; targetDate: string | null };
  checkin: { minutesAvailable: number; energy: "low" | "ok" | "high"; note: string | null };
  worlds: { position: number; title: string; doneCriteria: string; status: string }[];
  currentWorld: { title: string; doneCriteria: string } | null;
  nextWorld: { title: string; doneCriteria: string } | null;
  /** Recent quests, newest first, so the AI can build on them and read feedback. */
  recentQuests: { date: string; title: string; type: QuestType; estMinutes: number; status: string; feedback: string | null }[];
  /** Unfinished quests from earlier days, which the AI may carry over by id. */
  missedQuests: { id: number; date: string; title: string; estMinutes: number }[];
};

export type PlannedQuest = { title: string; instructions: string; estMinutes: number; type: QuestType };

export type DayPlan = {
  currentWorldCleared: boolean;
  carryOverIds: number[];
  quests: PlannedQuest[];
  note: string;
};

const DAY_SYSTEM = `You are the daily planner inside Questline, an app that turns any personal goal into a game.
The goal is split into worlds (milestones). Each morning the player checks in, and you plan today's quests inside the current world.

Rules:
- Fit the check-in. The total estMinutes of new quests plus carried-over quests must not exceed checkin.minutesAvailable.
- Match energy. Low: lighter, shorter, familiar practice. Ok: steady progress. High: a stretch is welcome.
- Respect checkin.note (e.g. travelling, exam tomorrow) when choosing what's realistic today.
- Plan 1 to 4 quests. Each one fits in a single sitting and moves the player toward the current world's doneCriteria.
- title: short and specific. instructions: 1 or 2 sentences saying exactly what to do and what "done" looks like.
- type: learn (take in knowledge), practice (repeat a skill), create (make something), boss (an attempt at the current world's doneCriteria). Only plan a boss quest when recent quests show the player is close.
- Build on recentQuests and never repeat a finished quest. Feedback "too_easy" means step up; "too_hard" means step back.
- missedQuests: put the id in carryOverIds only if the quest is still useful today; otherwise let it go.
- currentWorldCleared: true only if recentQuests clearly show the current world's doneCriteria was met (for example a finished boss quest). If true and there is a nextWorld, plan today's quests for the nextWorld instead.
- note: 1 or 2 warm sentences to the player explaining today's plan. No emojis.`;

const DAY_SCHEMA = {
  type: "object",
  properties: {
    currentWorldCleared: { type: "boolean" },
    carryOverIds: { type: "array", items: { type: "integer" } },
    quests: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          instructions: { type: "string" },
          estMinutes: { type: "integer" },
          type: { type: "string", enum: QUEST_TYPES },
        },
        required: ["title", "instructions", "estMinutes", "type"],
        additionalProperties: false,
      },
    },
    note: { type: "string" },
  },
  required: ["currentWorldCleared", "carryOverIds", "quests", "note"],
  additionalProperties: false,
};

export async function planDay(context: DayContext): Promise<DayPlan> {
  const answer = (await askAi({
    system: DAY_SYSTEM,
    prompt: `Plan today's quests.\n\n${JSON.stringify(context, null, 2)}`,
    schema: DAY_SCHEMA,
  })) as Partial<Record<keyof DayPlan, unknown>> | null;

  if (!answer || !Array.isArray(answer.quests)) throw new AiError("The AI's plan was missing its quests.");

  // Only quests that really are missed can be carried over.
  const missedIds = new Set(context.missedQuests.map((q) => q.id));
  const carryOverIds = Array.isArray(answer.carryOverIds)
    ? [...new Set(answer.carryOverIds.filter((id): id is number => typeof id === "number" && missedIds.has(id)))]
    : [];

  const quests = answer.quests
    .map((q) => ({
      title: text(q?.title, 120),
      instructions: text(q?.instructions, 400),
      estMinutes: Math.min(Math.max(Math.round(Number(q?.estMinutes) || 0), 5), 240),
      type: QUEST_TYPES.find((t) => t === q?.type) ?? "practice",
    }))
    .filter((q) => q.title)
    .slice(0, 4);

  return {
    currentWorldCleared: answer.currentWorldCleared === true,
    carryOverIds,
    quests,
    note: text(answer.note, 400),
  };
}

/** Trims a value to a string of at most `max` characters ("" if it isn't text). */
function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
