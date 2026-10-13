"use server";

// Server Actions for the Settings screen. The API key only ever travels from
// the form to the database: nothing here sends it back to the browser.

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { AiError, askAi } from "@/lib/ai";
import { localDate } from "@/lib/progress";
import { AI_PROVIDERS, getSettings, saveSettings, type Settings } from "@/lib/settings";
import { getActiveGoal } from "@/lib/today";

export type FormState = { error?: string; saved?: boolean } | null;

/** Model names like "claude-opus-5-5" or "qwen3:8b". */
const MODEL_NAME = /^[\w.:/-]{1,100}$/;

export async function saveAiSettings(_prev: FormState, form: FormData): Promise<FormState> {
  const provider = AI_PROVIDERS.find((p) => p === form.get("aiProvider"));
  if (!provider) return { error: "Pick how Questline should plan." };

  const changes: Partial<Settings> = { aiProvider: provider };

  if (provider === "anthropic") {
    const key = String(form.get("anthropicApiKey") ?? "").trim();
    const model = String(form.get("anthropicModel") ?? "").trim();
    if (key) {
      if (!key.startsWith("sk-ant-") || key.length > 300) return { error: "That doesn't look like a Claude API key (they start with sk-ant-)." };
      changes.anthropicApiKey = key;
    } else if (!getSettings().anthropicApiKey) {
      return { error: "Paste your Claude API key." };
    }
    if (!MODEL_NAME.test(model)) return { error: "Enter a model name, e.g. claude-opus-5-5." };
    changes.anthropicModel = model;
  }

  if (provider === "ollama") {
    const url = String(form.get("ollamaUrl") ?? "").trim();
    const model = String(form.get("ollamaModel") ?? "").trim();
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    } catch {
      return { error: "Enter Ollama's address, e.g. http://localhost:11434." };
    }
    if (!MODEL_NAME.test(model)) return { error: "Enter an Ollama model name, e.g. qwen3:8b." };
    changes.ollamaUrl = url;
    changes.ollamaModel = model;
  }

  saveSettings(changes);
  refresh();
  return { saved: true };
}

/** Removes a saved API key from the database. */
export async function forgetApiKey() {
  saveSettings({ anthropicApiKey: "" });
  refresh();
}

export type TestResult = { ok: boolean; message: string };

/** Sends the saved AI a tiny request to check that planning will work. */
export async function testAi(): Promise<TestResult> {
  const settings = getSettings();
  if (settings.aiProvider === "none") return { ok: true, message: "AI planning is off, so there's nothing to test." };
  try {
    const answer = (await askAi(
      {
        system: "You check that a connection works. Answer only with the requested JSON.",
        prompt: 'Reply with {"ok": true, "message": "<a 3 to 6 word cheerful greeting for a quest game>"}.',
        schema: {
          type: "object",
          properties: { ok: { type: "boolean" }, message: { type: "string" } },
          required: ["ok", "message"],
          additionalProperties: false,
        },
      },
      settings,
    )) as { ok?: boolean; message?: string };
    return { ok: answer?.ok === true, message: String(answer?.message ?? "Connected.").slice(0, 120) };
  } catch (error) {
    if (error instanceof AiError) return { ok: false, message: error.message };
    console.error(error);
    return { ok: false, message: "Something went wrong. Try again." };
  }
}

export async function saveGoalSettings(_prev: FormState, form: FormData): Promise<FormState> {
  const goal = getActiveGoal();
  if (!goal) return { error: "There's no goal yet." };

  const field = (name: string, max: number) => String(form.get(name) ?? "").trim().slice(0, max) || null;
  const title = field("title", 80);
  const dailyMinutes = Number(form.get("dailyMinutes"));
  const targetDate = field("targetDate", 10);

  if (!title) return { error: "The goal needs a name." };
  if (!Number.isInteger(dailyMinutes) || dailyMinutes < 5 || dailyMinutes > 600) {
    return { error: "Daily minutes should be a whole number between 5 and 600." };
  }
  if (targetDate && (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || targetDate <= localDate())) {
    return { error: "The target date should be a day in the future." };
  }

  db.update(goals)
    .set({ title, description: field("description", 500), startingPoint: field("startingPoint", 500), dailyMinutes, targetDate })
    .where(eq(goals.id, goal.id))
    .run();
  refresh();
  return { saved: true };
}
