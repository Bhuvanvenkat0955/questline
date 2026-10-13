// The game rules: how much XP a quest is worth, what level that makes you,
// and how long your streak is. These are plain functions with no database
// access, so the numbers are always worked out from your saved quests instead
// of being stored (and possibly drifting out of sync).

import type { QuestType } from "@/db/schema";

/** Flat bonus per quest type. Shipping work you'd rather hide pays the most. */
export const TYPE_BONUS: Record<QuestType, number> = {
  learn: 10,
  practice: 15,
  build: 20,
  publish: 30,
};

/** XP for finishing one quest: 1 XP per minute plus the type bonus. */
export function questXp(quest: { estMinutes: number; type: QuestType }): number {
  return quest.estMinutes + TYPE_BONUS[quest.type];
}

/**
 * XP needed to climb from `level` to the next one.
 * Level 1 → 2 costs 100, and each level after costs 50 more than the last.
 */
export function xpToNextLevel(level: number): number {
  return 100 + (level - 1) * 50;
}

/** Turns all-time XP into the numbers the XP bar shows. */
export function levelFromXp(totalXp: number) {
  let level = 1;
  let xpIntoLevel = totalXp;
  while (xpIntoLevel >= xpToNextLevel(level)) {
    xpIntoLevel -= xpToNextLevel(level);
    level++;
  }
  return { level, xpIntoLevel, xpForNext: xpToNextLevel(level) };
}

/** Today's date in your local time zone, as "YYYY-MM-DD". */
export function localDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Moves a "YYYY-MM-DD" date by a number of days. */
export function addDays(day: string, amount: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return localDate(new Date(y, m - 1, d + amount));
}

/**
 * Days in a row with at least one finished quest, counting back from today.
 * Today not done yet doesn't break the streak: it still counts up to
 * yesterday until the day is over.
 */
export function currentStreak(doneDays: Iterable<string>, today = localDate()): number {
  const days = new Set(doneDays);
  let day = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}
