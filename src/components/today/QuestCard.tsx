"use client";

// One quest on the Today screen. This is a client component because it reacts
// to clicks instantly: the tick shows straight away (an "optimistic" update),
// then the Server Action saves it and the page refreshes with the real numbers.

import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { Check, Clock, Forward, Undo, Zap } from "pixelarticons/react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { setQuestStatus } from "@/app/actions";
import { accentBg, accentOn, accentText } from "@/components/ui/accents";
import type { Quest } from "@/db/schema";
import { questTypeStyle } from "./questTypes";

type QuestCardProps = {
  quest: Quest;
  xp: number;
  /** For quests left over from an earlier day: when they were planned, e.g. "yesterday". */
  missedFrom?: string;
};

export function QuestCard({ quest, xp, missedFrom }: QuestCardProps) {
  const [status, setOptimisticStatus] = useOptimistic(quest.status);
  const [isPending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();
  // Only pop the tick when you click it, not for quests already done on page load.
  const [justTicked, setJustTicked] = useState(false);
  const type = questTypeStyle[quest.type];
  const done = status === "done";
  const skipped = status === "skipped";

  function update(next: Quest["status"]) {
    setJustTicked(next === "done");
    startTransition(async () => {
      setOptimisticStatus(next);
      try {
        const result = await setQuestStatus(quest.id, next);
        if (result.xpGained > 0) toast(`+${result.xpGained} XP`, { description: quest.title });
        if (result.leveledUp) toast.success(`Level up! You reached level ${result.level}`);
      } catch {
        toast.error("Couldn't save that. Try again.");
      }
    });
  }

  return (
    <article
      className={clsx(
        "flex items-start gap-4 border-2 bg-panel p-4 transition-colors duration-150",
        done ? "border-green" : "border-line",
        skipped && "opacity-60",
      )}
      aria-busy={isPending}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark "${quest.title}" as not done` : `Complete "${quest.title}"`}
        disabled={skipped}
        onClick={() => update(done ? "todo" : "done")}
        className={clsx(
          "grid size-11 shrink-0 cursor-pointer place-items-center border-[3px] border-ink shadow-pixel",
          "transition-[translate,box-shadow] duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none",
          "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-yellow",
          "disabled:cursor-not-allowed",
          done ? "bg-green text-ink [--shadow-color:var(--green-deep)]" : "bg-panel-raised [--shadow-color:#000]",
        )}
      >
        {done && (
          <motion.span
            initial={justTicked && !reduceMotion ? { scale: 0.4 } : false}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.5 }}
          >
            <Check className="size-7" />
          </motion.span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={clsx(
              "inline-flex items-center gap-1 px-1.5 py-0.5 font-display uppercase [&_svg]:size-4",
              accentBg[type.accent],
              accentOn[type.accent],
            )}
          >
            {type.icon} {type.label}
          </span>
          <span className="inline-flex items-center gap-1 text-text-dim [&_svg]:size-4">
            <Clock /> {quest.estMinutes} min
          </span>
          <span className={clsx("inline-flex items-center gap-1 [&_svg]:size-4", accentText.yellow)}>
            <Zap /> {xp} XP
          </span>
          {missedFrom && (
            <span className={done ? "text-text-dim" : "text-red"}>
              {done ? "From" : "Missed"} {missedFrom}
            </span>
          )}
        </div>

        <h3 className={clsx("mt-2 text-base font-bold", done && "text-text-dim line-through")}>{quest.title}</h3>
        {quest.instructions && <p className="mt-1 text-sm text-text-dim">{quest.instructions}</p>}
      </div>

      {!done && (
        <button
          type="button"
          onClick={() => update(skipped ? "todo" : "skipped")}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 px-2 py-1 font-display text-xs text-text-dim uppercase hover:text-text focus-visible:outline-2 focus-visible:outline-yellow [&_svg]:size-4"
        >
          {skipped ? (
            <>
              <Undo /> Undo skip
            </>
          ) : (
            <>
              <Forward /> Skip
            </>
          )}
        </button>
      )}
    </article>
  );
}
