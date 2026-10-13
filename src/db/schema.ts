// The shape of every table in the local database.
// Drizzle reads this file to create the SQL tables (via `npm run db:generate`)
// and to give queries full TypeScript types.
//
// Dates are stored as plain "YYYY-MM-DD" text in your local time zone, so
// "the day I did this quest" never shifts because of UTC conversions.

import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** A quest line: the big goal, e.g. "Become a clipper". */
export const goals = sqliteTable("goals", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  description: text(),
  /** How many minutes a day you can spend on this goal. */
  dailyMinutes: integer().notNull().default(30),
  targetDate: text(),
  status: text({ enum: ["active", "completed", "archived"] }).notNull().default("active"),
  createdAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
});

/** A world inside a quest line, e.g. "World 1: Learn the editor". */
export const phases = sqliteTable("phases", {
  id: integer().primaryKey({ autoIncrement: true }),
  goalId: integer()
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  /** Order inside the goal: 1, 2, 3... */
  position: integer().notNull(),
  title: text().notNull(),
  /** What "finished with this world" means, in plain words. */
  doneCriteria: text(),
});

/** One small task you can finish in a single sitting. */
export const quests = sqliteTable("quests", {
  id: integer().primaryKey({ autoIncrement: true }),
  phaseId: integer()
    .notNull()
    .references(() => phases.id, { onDelete: "cascade" }),
  /** Order inside the phase: 1, 2, 3... */
  position: integer().notNull(),
  title: text().notNull(),
  instructions: text(),
  estMinutes: integer().notNull(),
  type: text({ enum: ["learn", "practice", "build", "publish"] }).notNull(),
  /**
   * locked  – not reachable yet
   * active  – unlocked and waiting to be done (missed ones simply stay active)
   * done    – finished, earns XP
   * skipped – passed over on purpose, earns nothing
   */
  status: text({ enum: ["locked", "active", "done", "skipped"] }).notNull().default("locked"),
  /** Local date the quest was finished, "YYYY-MM-DD". */
  completedOn: text(),
  feedback: text({ enum: ["too_easy", "just_right", "too_hard"] }),
});

/** A note about one day of work on a goal. At most one per goal per day. */
export const checkins = sqliteTable(
  "checkins",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    goalId: integer()
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    date: text().notNull(),
    note: text(),
    proofLink: text(),
    difficulty: text({ enum: ["easy", "ok", "hard"] }),
  },
  (t) => [uniqueIndex("checkins_goal_date").on(t.goalId, t.date)],
);

// Row types, e.g. `Quest` is what you get back when you read a quest.
export type Goal = typeof goals.$inferSelect;
export type Phase = typeof phases.$inferSelect;
export type Quest = typeof quests.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type QuestType = Quest["type"];
