import { BookOpen, Brush, Repeat, Skull } from "pixelarticons/react";
import type { ReactNode } from "react";
import type { Accent } from "@/components/ui/accents";
import type { QuestType } from "@/db/schema";

/** How each quest type looks: its color, label and icon. */
export const questTypeStyle: Record<QuestType, { accent: Accent; label: string; icon: ReactNode }> = {
  learn: { accent: "cyan", label: "Learn", icon: <BookOpen /> },
  practice: { accent: "green", label: "Practice", icon: <Repeat /> },
  create: { accent: "purple", label: "Create", icon: <Brush /> },
  boss: { accent: "red", label: "Boss", icon: <Skull /> },
};
