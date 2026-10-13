// A world's quest history, newest first. Rendered on the server: it only
// displays data, and the native <details> element handles opening and
// closing without any JavaScript.

import clsx from "clsx";
import { Check, Close, Forward } from "pixelarticons/react";
import { questTypeStyle } from "@/components/today/questTypes";
import { accentText } from "@/components/ui/accents";
import type { Quest } from "@/db/schema";
import { dayLabel, questXp } from "@/lib/progress";

export function QuestLog({ quests, today, open }: { quests: Quest[]; today: string; open?: boolean }) {
  if (quests.length === 0) return null;

  return (
    <details open={open} className="group mt-4 border-t-2 border-line pt-3">
      <summary className="cursor-pointer font-display text-xs text-text-dim uppercase hover:text-text focus-visible:outline-2 focus-visible:outline-yellow">
        Quest log ({quests.length})
      </summary>
      <ul className="mt-3 flex flex-col gap-2">
        {quests.map((q) => {
          const type = questTypeStyle[q.type];
          const missed = q.status === "todo" && q.date < today;
          return (
            <li key={q.id} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 text-xs text-text-dim">{dayLabel(q.date, today)}</span>
              <StatusIcon status={q.status} missed={missed} />
              <span className={clsx("shrink-0 [&_svg]:size-4", accentText[type.accent])} title={type.label}>
                {type.icon}
              </span>
              <span className={clsx("min-w-0 flex-1 truncate", q.status !== "done" && "text-text-dim")}>{q.title}</span>
              <span className="shrink-0 text-xs tabular-nums">
                {q.status === "done" ? (
                  <span className="text-yellow">+{questXp(q)} XP</span>
                ) : (
                  <span className="text-text-dim">{missed ? "Missed" : q.status === "skipped" ? "Skipped" : "To do"}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function StatusIcon({ status, missed }: { status: Quest["status"]; missed: boolean }) {
  const label = status === "done" ? "Done" : status === "skipped" ? "Skipped" : missed ? "Missed" : "To do";
  return (
    <span
      role="img"
      aria-label={label}
      className={clsx(
        "grid size-5 shrink-0 place-items-center border-2 [&_svg]:size-3.5",
        status === "done" && "border-ink bg-green text-ink",
        status === "skipped" && "border-line text-text-dim",
        status === "todo" && (missed ? "border-red text-red" : "border-line"),
      )}
    >
      {status === "done" && <Check />}
      {status === "skipped" && <Forward />}
      {missed && <Close />}
    </span>
  );
}
