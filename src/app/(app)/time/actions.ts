"use server";

// Server Actions for the Time screen: start/pause tracking, label an app or
// site, and answer the evening "how useful was it?" question.

import { refresh } from "next/cache";
import type { ActivityLabel } from "@/db/schema";
import { localDate } from "@/lib/progress";
import { saveReview, setLabel } from "@/lib/screenTime";
import { setTracking } from "@/lib/tracker/tracker";

const KINDS = ["app", "site"] as const;
const LABELS = ["productive", "neutral", "distracting", "depends"] as const;

function checkName(kind: unknown, name: unknown) {
  const k = KINDS.find((x) => x === kind);
  if (!k || typeof name !== "string" || !name || name.length > 100) throw new Error("Invalid app or site.");
  return { kind: k, name };
}

export async function setTrackingAction(on: boolean) {
  setTracking(on === true);
  refresh();
}

/** Sets an app's label, or clears it with null. */
export async function labelActivity(kind: "app" | "site", name: string, label: ActivityLabel | null) {
  const target = checkName(kind, name);
  if (label !== null && !LABELS.includes(label)) throw new Error("Invalid label.");
  setLabel(target.kind, target.name, label);
  refresh();
}

/** Saves today's "how much was useful" answer (0–100) for a Depends app or site. */
export async function reviewActivity(kind: "app" | "site", name: string, usefulPercent: number) {
  const target = checkName(kind, name);
  if (!Number.isInteger(usefulPercent) || usefulPercent < 0 || usefulPercent > 100) throw new Error("Invalid answer.");
  saveReview(localDate(), target.kind, target.name, usefulPercent);
  refresh();
}
