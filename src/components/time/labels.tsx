import { Check, Circle, Close, Hourglass } from "pixelarticons/react";
import type { ReactNode } from "react";
import type { ActivityLabel } from "@/db/schema";

/**
 * How each label looks. Classes are spelled out in full so Tailwind finds them.
 * Every label also has an icon and a word, so it never relies on color alone.
 */
export const labelStyle: Record<ActivityLabel, { name: string; icon: ReactNode; bar: string; chip: string; text: string }> = {
  productive: { name: "Productive", icon: <Check />, bar: "bg-green", chip: "border-ink bg-green text-ink", text: "text-green" },
  neutral: { name: "Neutral", icon: <Circle />, bar: "bg-text-dim", chip: "border-ink bg-text-dim text-ink", text: "text-text-dim" },
  distracting: { name: "Distracting", icon: <Close />, bar: "bg-red", chip: "border-ink bg-red text-cream", text: "text-red" },
  depends: { name: "Depends", icon: <Hourglass />, bar: "bg-yellow", chip: "border-ink bg-yellow text-ink", text: "text-yellow" },
};

export const LABEL_ORDER: ActivityLabel[] = ["productive", "neutral", "distracting", "depends"];
