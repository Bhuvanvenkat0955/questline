// The shape of every table in the local database.
// Drizzle reads this file to create the SQL tables (via `npm run db:generate`)
// and to give queries full TypeScript types.
//
// Nothing here is about one kind of goal: the goal, its worlds and every quest
// are written by the AI for whatever the user wants to achieve.
//
// Dates are stored as plain "YYYY-MM-DD" text in your local time zone, so
// "the day I did this quest" never shifts because of UTC conversions.

import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** A quest line: the big goal the user typed in. */
export const goals = sqliteTable("goals", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  description: text(),
  /** Where the user is starting from, in their own words. The AI plans from it. */
  startingPoint: text(),
  /** Usual minutes per day. A day's check-in can override it. */
  dailyMinutes: integer().notNull().default(30),
  targetDate: text(),
  status: text({ enum: ["active", "completed", "archived"] }).notNull().default("active"),
  createdAt: text().notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * A world: one big milestone on the way to the goal. The AI writes all of a
 * goal's worlds when the goal is created, so the roadmap is visible from day 1.
 */
export const phases = sqliteTable("phases", {
  id: integer().primaryKey({ autoIncrement: true }),
  goalId: integer()
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  /** Order inside the goal: 1, 2, 3... */
  position: integer().notNull(),
  title: text().notNull(),
  /** What "finished with this world" means. The AI checks progress against it. */
  doneCriteria: text().notNull(),
  /** upcoming – not reached yet, current – the world you're in, done – cleared */
  status: text({ enum: ["upcoming", "current", "done"] }).notNull().default("upcoming"),
  completedOn: text(),
});

/**
 * One small task for one day. The AI writes a day's quests fresh each morning,
 * using that day's check-in and everything done so far, so future quests
 * don't exist until their day comes.
 */
export const quests = sqliteTable("quests", {
  id: integer().primaryKey({ autoIncrement: true }),
  phaseId: integer()
    .notNull()
    .references(() => phases.id, { onDelete: "cascade" }),
  /** The day this quest was planned for, "YYYY-MM-DD". */
  date: text().notNull(),
  /** Order within that day's list: 1, 2, 3... */
  position: integer().notNull(),
  title: text().notNull(),
  instructions: text(),
  estMinutes: integer().notNull(),
  /**
   * learn    – take in knowledge
   * practice – repeat a skill
   * create   – make something
   * boss     – a milestone that proves progress in this world
   */
  type: text({ enum: ["learn", "practice", "create", "boss"] }).notNull(),
  /** A `todo` left over from an earlier day counts as missed. */
  status: text({ enum: ["todo", "done", "skipped"] }).notNull().default("todo"),
  /** Local date the quest was finished, "YYYY-MM-DD". */
  completedOn: text(),
  feedback: text({ enum: ["too_easy", "just_right", "too_hard"] }),
});

/**
 * The start-of-day check-in: today's circumstances, which the AI reads
 * before planning the day's quests. At most one per goal per day.
 */
export const checkins = sqliteTable(
  "checkins",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    goalId: integer()
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    date: text().notNull(),
    minutesAvailable: integer().notNull(),
    energy: text({ enum: ["low", "ok", "high"] }).notNull(),
    /** Anything else that matters today, e.g. "travelling", "exam tomorrow". */
    note: text(),
    /** The AI's short message explaining today's plan. */
    planNote: text(),
  },
  (t) => [uniqueIndex("checkins_goal_date").on(t.goalId, t.date)],
);

/**
 * App settings as simple key/value pairs, e.g. which AI plans your days.
 * Lives only in your local database file, like everything else.
 */
export const settings = sqliteTable("settings", {
  key: text().primaryKey(),
  value: text().notNull(),
});

/**
 * Screen time: how many seconds were spent in each app or website, per hour.
 * Only totals are kept, never a minute-by-minute log, and for websites only
 * the site's name ("YouTube"), never page or video titles.
 */
export const usage = sqliteTable(
  "usage",
  {
    /** Local day, "YYYY-MM-DD". */
    date: text().notNull(),
    /** Hour of the day, 0–23. */
    hour: integer().notNull(),
    kind: text({ enum: ["app", "site"] }).notNull(),
    name: text().notNull(),
    seconds: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.date, t.hour, t.kind, t.name] })],
);

/** How you've labelled each app or site. Unlabelled ones simply have no row. */
export const activityLabels = sqliteTable(
  "activity_labels",
  {
    kind: text({ enum: ["app", "site"] }).notNull(),
    name: text().notNull(),
    label: text({ enum: ["productive", "neutral", "distracting", "depends"] }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.name] })],
);

/** The evening answer for a "Depends" app: how much of that day's time was useful. */
export const dependsReviews = sqliteTable(
  "depends_reviews",
  {
    date: text().notNull(),
    kind: text({ enum: ["app", "site"] }).notNull(),
    name: text().notNull(),
    /** 0–100: the share of the time that was useful. */
    usefulPercent: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.date, t.kind, t.name] })],
);

// Row types, e.g. `Quest` is what you get back when you read a quest.
export type Goal = typeof goals.$inferSelect;
export type Phase = typeof phases.$inferSelect;
export type Quest = typeof quests.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type QuestType = Quest["type"];
export type ActivityLabel = (typeof activityLabels.$inferSelect)["label"];
