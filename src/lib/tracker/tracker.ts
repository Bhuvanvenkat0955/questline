// The screen-time tracker. It runs inside Questline's server (which keeps
// running while the desktop app sits in the tray), reads ticks from the
// Windows probe, and adds the seconds to that hour's total for the app or site.
//
// Idle time doesn't count: after 2 minutes without keyboard or mouse input,
// ticks are ignored until you're back.

import "server-only";
import { spawn, type ChildProcess } from "node:child_process";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { usage } from "@/db/schema";
import { localDate } from "@/lib/progress";
import { getSettings, saveSettings } from "@/lib/settings";
import { activityFor, type Activity } from "./names";
import { encodedProbe } from "./probe";

const TICK_SECONDS = 5;
const IDLE_AFTER_MS = 2 * 60 * 1000;
/** Gaps longer than this (sleep, a frozen PC) aren't counted as time spent. */
const MAX_TICK_MS = 15 * 1000;
/** Windows' own lock screen and system idle aren't real activity. */
const IGNORED_PROCESSES = new Set(["", "idle", "lockapp", "searchhost", "shellexperiencehost"]);

export type TrackerStatus = {
  state: "off" | "tracking" | "unsupported" | "error";
  /** ISO time tracking started. */
  since: string | null;
  /** What's in front right now, or null when idle. */
  current: Activity | null;
  message?: string;
};

class Tracker {
  private probe: ChildProcess | null = null;
  private lastTick = 0;
  private restarts = 0;
  status: TrackerStatus = { state: "off", since: null, current: null };

  start() {
    if (process.platform !== "win32") {
      this.status = { state: "unsupported", since: null, current: null, message: "Screen time works on Windows for now." };
      return;
    }
    if (this.probe) return;

    const probe = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedProbe()], {
      windowsHide: true,
      env: { ...process.env, QUESTLINE_TICK_SECONDS: String(TICK_SECONDS), QUESTLINE_PARENT_PID: String(process.pid) },
    });
    this.probe = probe;
    this.lastTick = Date.now();
    this.status = { state: "tracking", since: this.status.since ?? new Date().toISOString(), current: null };

    let buffered = "";
    probe.stdout?.on("data", (chunk) => {
      buffered += chunk;
      const lines = buffered.split(/\r?\n/);
      buffered = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) this.onTick(line);
    });
    probe.on("error", () => this.onExit("Couldn't start PowerShell to read the active app."));
    probe.on("exit", () => this.onExit("The tracker stopped unexpectedly."));
  }

  stop() {
    const probe = this.probe;
    this.probe = null;
    probe?.kill();
    this.status = { state: "off", since: null, current: null };
  }

  private onExit(message: string) {
    if (!this.probe) return; // stopped on purpose
    this.probe = null;
    // Try again a few times (e.g. PowerShell was busy), then show the error.
    if (this.restarts++ < 3) {
      setTimeout(() => getSettings().trackerEnabled === "true" && this.start(), 10_000);
    }
    this.status = { ...this.status, state: "error", current: null, message };
  }

  private onTick(line: string) {
    let tick: { process?: string; app?: string; title?: string; idleMs?: number };
    try {
      tick = JSON.parse(line);
    } catch {
      return;
    }

    const now = Date.now();
    const elapsedMs = Math.min(now - this.lastTick, MAX_TICK_MS);
    this.lastTick = now;
    this.restarts = 0;

    const processName = String(tick.process ?? "");
    if ((tick.idleMs ?? 0) >= IDLE_AFTER_MS || IGNORED_PROCESSES.has(processName.toLowerCase())) {
      this.status = { ...this.status, state: "tracking", current: null };
      return;
    }

    // The title is used here to find the site name and then dropped: it's never stored.
    const activity = activityFor(processName, String(tick.app ?? ""), String(tick.title ?? ""));
    this.status = { ...this.status, state: "tracking", current: activity };
    record(activity, Math.round(elapsedMs / 1000));
  }
}

/** Adds seconds to this hour's total for an app or site. */
function record(activity: Activity, seconds: number) {
  if (seconds <= 0) return;
  const now = new Date();
  db.insert(usage)
    .values({ date: localDate(now), hour: now.getHours(), kind: activity.kind, name: activity.name, seconds })
    .onConflictDoUpdate({
      target: [usage.date, usage.hour, usage.kind, usage.name],
      set: { seconds: sql`${usage.seconds} + ${seconds}` },
    })
    .run();
}

// One tracker per server, even when `next dev` reloads this file.
const globalForTracker = globalThis as unknown as { questlineTracker?: Tracker };
const tracker = (globalForTracker.questlineTracker ??= new Tracker());

export function trackerStatus(): TrackerStatus {
  return tracker.status;
}

/** Turns tracking on or off, and remembers the choice for next time Questline starts. */
export function setTracking(on: boolean) {
  saveSettings({ trackerEnabled: on ? "true" : "false" });
  if (on) tracker.start();
  else tracker.stop();
  return tracker.status;
}

/** Called once when the server starts: carries on tracking if it was on last time. */
export function resumeTracking() {
  if (getSettings().trackerEnabled === "true") tracker.start();
}
