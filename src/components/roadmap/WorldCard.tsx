"use client";

// One world on the roadmap: its stop on the map path, name, "cleared when"
// line, stats and the buttons to edit it. The quest log is rendered on the
// server and passed in as `children`, so it doesn't need any browser code.

import clsx from "clsx";
import { ArrowDown, ArrowUp, Check, Flag, Lock, Pencil, Trash } from "pixelarticons/react";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { clearWorld, deleteWorld, editWorld, moveWorld } from "@/app/(app)/roadmap/actions";
import type { Phase } from "@/db/schema";
import { PixelButton } from "@/components/ui/PixelButton";
import { WorldForm } from "./WorldForm";

type WorldCardProps = {
  world: Phase;
  questsDone: number;
  xpEarned: number;
  hasQuests: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isLast: boolean;
  /** e.g. "Oct 12", when the world was cleared. */
  clearedLabel?: string;
  children?: ReactNode;
};

const statusStyle = {
  done: { node: "bg-green text-ink [--shadow-color:var(--green-deep)]", pill: "bg-green text-ink", label: "Cleared" },
  current: { node: "bg-yellow text-ink [--shadow-color:var(--yellow-deep)]", pill: "bg-yellow text-ink", label: "You are here" },
  upcoming: { node: "bg-panel-raised text-text-dim [--shadow-color:#000]", pill: "bg-panel-raised text-text-dim", label: "Locked" },
};

export function WorldCard(props: WorldCardProps) {
  const { world, questsDone, xpEarned, hasQuests, canMoveUp, canMoveDown, isLast, clearedLabel, children } = props;
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState<"clear" | "delete" | null>(null);
  const [isPending, startTransition] = useTransition();
  const style = statusStyle[world.status];

  // Runs a Server Action and shows a pop-up if it fails.
  function run(action: () => Promise<void>, success?: string) {
    setConfirming(null);
    startTransition(async () => {
      try {
        await action();
        if (success) toast.success(success);
      } catch {
        toast.error("Couldn't save that. Try again.");
      }
    });
  }

  return (
    <li className="flex gap-5" aria-busy={isPending}>
      {/* The map path: a numbered stop with a line down to the next world. */}
      <div className="flex flex-col items-center">
        <span
          aria-hidden="true"
          className={clsx(
            "grid size-14 shrink-0 place-items-center border-[3px] border-ink font-display text-2xl shadow-pixel [&_svg]:size-8",
            style.node,
          )}
        >
          {world.status === "done" ? <Check /> : world.position}
        </span>
        {!isLast && (
          <span aria-hidden="true" className={clsx("w-1 flex-1", world.status === "done" ? "bg-green" : "bg-line")} />
        )}
      </div>

      <article
        className={clsx(
          "mb-6 min-w-0 flex-1 border-2 bg-panel p-5",
          world.status === "current" ? "border-yellow" : "border-line",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-display uppercase text-text-dim">World {world.position}</span>
          <span className={clsx("inline-flex items-center gap-1 px-1.5 py-0.5 font-display uppercase [&_svg]:size-4", style.pill)}>
            {world.status === "current" && <Flag />}
            {world.status === "upcoming" && <Lock />}
            {style.label}
            {clearedLabel && ` ${clearedLabel}`}
          </span>
        </div>

        {editing ? (
          <div className="mt-4">
            <WorldForm
              action={editWorld.bind(null, world.id)}
              defaults={{ title: world.title, doneCriteria: world.doneCriteria }}
              submitLabel="Save world"
              onDone={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <>
            <h3 className={clsx("mt-2 text-lg font-bold", world.status === "upcoming" && "text-text-dim")}>
              {world.title}
            </h3>
            <p className="mt-1 text-sm text-text-dim">
              <span className="text-text">Cleared when:</span> {world.doneCriteria}
            </p>
            {hasQuests && (
              <p className="mt-2 text-sm tabular-nums">
                {questsDone} {questsDone === 1 ? "quest" : "quests"} done ·{" "}
                <span className="text-yellow">{xpEarned} XP</span>
              </p>
            )}

            {children}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {confirming ? (
                <>
                  <span className="text-sm">
                    {confirming === "clear" ? "Clear this world and move to the next?" : "Delete this world?"}
                  </span>
                  <PixelButton
                    size="sm"
                    color={confirming === "clear" ? "yellow" : "red"}
                    onClick={() =>
                      confirming === "clear"
                        ? run(() => clearWorld(world.id), "World cleared!")
                        : run(() => deleteWorld(world.id))
                    }
                  >
                    Yes
                  </PixelButton>
                  <PixelButton size="sm" color="dark" onClick={() => setConfirming(null)}>
                    No
                  </PixelButton>
                </>
              ) : (
                <>
                  {world.status === "current" && (
                    <PixelButton size="sm" color="yellow" onClick={() => setConfirming("clear")}>
                      <Flag /> Mark cleared
                    </PixelButton>
                  )}
                  <ToolButton label="Edit" onClick={() => setEditing(true)} icon={<Pencil />} />
                  {world.status === "upcoming" && (
                    <>
                      <ToolButton label="Move up" disabled={!canMoveUp} onClick={() => run(() => moveWorld(world.id, -1))} icon={<ArrowUp />} />
                      <ToolButton label="Move down" disabled={!canMoveDown} onClick={() => run(() => moveWorld(world.id, 1))} icon={<ArrowDown />} />
                      {!hasQuests && <ToolButton label="Delete" onClick={() => setConfirming("delete")} icon={<Trash />} />}
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </article>
    </li>
  );
}

/** Small text button for secondary actions, so "Mark cleared" stays the loudest. */
function ToolButton({ label, icon, onClick, disabled }: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 cursor-pointer items-center gap-1 border-2 border-line px-2.5 font-display text-xs text-text-dim uppercase hover:border-text-dim hover:text-text focus-visible:outline-2 focus-visible:outline-yellow disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4"
    >
      {icon} {label}
    </button>
  );
}
