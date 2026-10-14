"use client";

// Start / Pause for screen-time tracking, with a status light and what's
// being counted right now. The same switch is in the tray menu.

import clsx from "clsx";
import { Pause, Play } from "pixelarticons/react";
import { useTransition } from "react";
import { toast } from "sonner";
import { setTrackingAction } from "@/app/(app)/time/actions";
import { PixelButton } from "@/components/ui/PixelButton";
import type { TrackerStatus } from "@/lib/tracker/tracker";

export function TrackerControl({ status }: { status: TrackerStatus }) {
  const [pending, startTransition] = useTransition();
  const on = status.state === "tracking";

  function toggle() {
    startTransition(async () => {
      try {
        await setTrackingAction(!on);
        toast(on ? "Tracking paused" : "Tracking started");
      } catch {
        toast.error("Couldn't change tracking. Try again.");
      }
    });
  }

  const since = status.since ? new Date(status.since).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;

  return (
    <section aria-label="Tracking" className="flex flex-wrap items-center gap-4 border-2 border-line bg-panel p-5">
      <span
        aria-hidden="true"
        className={clsx("size-3", on ? "bg-green" : status.state === "error" ? "bg-red" : "bg-text-dim")}
      />
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm uppercase">
          {on ? "Tracking" : status.state === "unsupported" ? "Not available" : status.state === "error" ? "Tracking stopped" : "Tracking is off"}
        </p>
        <p className="text-sm text-text-dim">
          {on
            ? status.current
              ? `Now: ${status.current.name}${since ? ` · since ${since}` : ""}`
              : `Away or idle, not counting${since ? ` · since ${since}` : ""}`
            : (status.message ?? "Press Start to begin counting which apps and sites you use.")}
        </p>
      </div>
      {status.state !== "unsupported" && (
        <PixelButton color={on ? "dark" : "green"} onClick={toggle} disabled={pending}>
          {on ? <Pause /> : <Play />} {pending ? "..." : on ? "Pause tracking" : "Start tracking"}
        </PixelButton>
      )}
    </section>
  );
}
