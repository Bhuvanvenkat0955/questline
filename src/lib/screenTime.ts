// Everything the Time screen shows: today's apps and sites with their labels,
// the productive / distracting split, a per-hour view and the last 7 days.
//
// "Depends" time (e.g. YouTube) is split by your evening answer: the useful
// share counts as productive, the rest as distracting. Until you answer, it's
// left out of the focus score rather than guessed.

import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLabels, dependsReviews, usage, type ActivityLabel } from "@/db/schema";
import { addDays } from "./progress";

export type ActivityRow = {
  kind: "app" | "site";
  name: string;
  seconds: number;
  label: ActivityLabel | null;
  /** For "Depends" rows: today's answer, 0–100, if given. */
  usefulPercent: number | null;
};

export type Split = {
  productive: number;
  neutral: number;
  distracting: number;
  /** Depends time not reviewed yet. */
  depends: number;
  unlabeled: number;
  total: number;
  /** Productive share of productive + distracting time, 0–100, or null with nothing to compare. */
  focusPercent: number | null;
};

const key = (kind: string, name: string) => `${kind}:${name}`;

function labelMap() {
  return new Map(db.select().from(activityLabels).all().map((l) => [key(l.kind, l.name), l.label]));
}

function reviewMap(date: string) {
  return new Map(
    db.select().from(dependsReviews).where(eq(dependsReviews.date, date)).all().map((r) => [key(r.kind, r.name), r.usefulPercent]),
  );
}

/** Seconds per app/site for one day, with labels and answers attached, biggest first. */
export function activitiesOn(date: string): ActivityRow[] {
  const labels = labelMap();
  const reviews = reviewMap(date);
  return db
    .select({ kind: usage.kind, name: usage.name, seconds: sql<number>`sum(${usage.seconds})` })
    .from(usage)
    .where(eq(usage.date, date))
    .groupBy(usage.kind, usage.name)
    .orderBy(sql`sum(${usage.seconds}) desc`)
    .all()
    .map((row) => ({
      ...row,
      label: labels.get(key(row.kind, row.name)) ?? null,
      usefulPercent: reviews.get(key(row.kind, row.name)) ?? null,
    }));
}

/** Adds rows up into productive / neutral / distracting / depends / unlabeled. */
export function splitOf(rows: ActivityRow[]): Split {
  const split = { productive: 0, neutral: 0, distracting: 0, depends: 0, unlabeled: 0, total: 0 };
  for (const row of rows) {
    split.total += row.seconds;
    if (row.label === "depends") {
      if (row.usefulPercent === null) {
        split.depends += row.seconds;
      } else {
        const useful = Math.round((row.seconds * row.usefulPercent) / 100);
        split.productive += useful;
        split.distracting += row.seconds - useful;
      }
    } else if (row.label) {
      split[row.label] += row.seconds;
    } else {
      split.unlabeled += row.seconds;
    }
  }
  const compared = split.productive + split.distracting;
  return { ...split, focusPercent: compared > 0 ? Math.round((split.productive / compared) * 100) : null };
}

/** Active seconds in each hour of a day (24 numbers). */
export function hoursOn(date: string): number[] {
  const hours = Array<number>(24).fill(0);
  for (const row of db
    .select({ hour: usage.hour, seconds: sql<number>`sum(${usage.seconds})` })
    .from(usage)
    .where(eq(usage.date, date))
    .groupBy(usage.hour)
    .all()) {
    hours[row.hour] = row.seconds;
  }
  return hours;
}

/** The split for each of the last 7 days, oldest first. */
export function lastWeek(today: string) {
  const start = addDays(today, -6);
  const days = new Set(
    db.select({ date: usage.date }).from(usage).where(gte(usage.date, start)).groupBy(usage.date).all().map((r) => r.date),
  );
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, split: days.has(date) ? splitOf(activitiesOn(date)) : splitOf([]) };
  });
}

export function getTimeView(today: string) {
  const activities = activitiesOn(today);
  return {
    activities,
    split: splitOf(activities),
    hours: hoursOn(today),
    week: lastWeek(today),
    // "How useful was it?" questions: Depends items with at least 5 minutes today.
    toReview: activities.filter((a) => a.label === "depends" && a.seconds >= 5 * 60),
  };
}

/** True when today has Depends time (5+ minutes) that hasn't been answered yet. */
export function needsReview(today: string) {
  return activitiesOn(today).some((a) => a.label === "depends" && a.seconds >= 5 * 60 && a.usefulPercent === null);
}

export function setLabel(kind: "app" | "site", name: string, label: ActivityLabel | null) {
  if (label === null) {
    db.delete(activityLabels).where(and(eq(activityLabels.kind, kind), eq(activityLabels.name, name))).run();
    return;
  }
  db.insert(activityLabels)
    .values({ kind, name, label })
    .onConflictDoUpdate({ target: [activityLabels.kind, activityLabels.name], set: { label } })
    .run();
}

export function saveReview(date: string, kind: "app" | "site", name: string, usefulPercent: number) {
  db.insert(dependsReviews)
    .values({ date, kind, name, usefulPercent })
    .onConflictDoUpdate({ target: [dependsReviews.date, dependsReviews.kind, dependsReviews.name], set: { usefulPercent } })
    .run();
}

/** "1h 40m", "12m", or "<1m". */
export function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "<1m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
