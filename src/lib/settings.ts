// Questline's settings: which AI plans your days and how to reach it.
// Stored as key/value rows in the local database (data/app.db), which is
// never committed, so an API key typed into Settings stays on this PC.

import "server-only";
import { db } from "@/db";
import { settings } from "@/db/schema";

export const AI_PROVIDERS = ["claude-code", "anthropic", "ollama", "none"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  "claude-code": "Claude Code",
  anthropic: "Claude API",
  ollama: "Ollama",
  none: "No AI",
};

export type Settings = {
  aiProvider: AiProvider;
  anthropicApiKey: string;
  anthropicModel: string;
  ollamaUrl: string;
  ollamaModel: string;
};

const DEFAULTS: Settings = {
  aiProvider: "claude-code",
  anthropicApiKey: "",
  anthropicModel: "claude-opus-5-5",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "qwen3:8b",
};

export function getSettings(): Settings {
  const saved = Object.fromEntries(db.select().from(settings).all().map((row) => [row.key, row.value]));
  const merged = { ...DEFAULTS, ...saved } as Settings;
  if (!AI_PROVIDERS.includes(merged.aiProvider)) merged.aiProvider = DEFAULTS.aiProvider;
  // A key in .env.local (ANTHROPIC_API_KEY) works too, if none was typed into Settings.
  if (!merged.anthropicApiKey) merged.anthropicApiKey = process.env.ANTHROPIC_API_KEY ?? "";
  return merged;
}

export function saveSettings(changes: Partial<Settings>) {
  db.transaction((tx) => {
    for (const [key, value] of Object.entries(changes)) {
      tx.insert(settings)
        .values({ key, value: String(value) })
        .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } })
        .run();
    }
  });
}

/** True when some AI is set up to plan; false means you plan by hand. */
export function aiEnabled() {
  return getSettings().aiProvider !== "none";
}
