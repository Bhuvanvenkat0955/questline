// The one place that knows HOW Questline talks to an AI. Everything else just
// calls askAi() with a system prompt, a request and the JSON shape it wants back.
//
// Each person picks their own AI in Settings (nobody uses anyone else's account):
//   claude-code  the Claude Code CLI on this PC, using their own Claude login
//   anthropic    the Claude API, with their own API key (pay per use)
//   ollama       a free model running locally with Ollama
//   none         no AI: worlds and quests are planned by hand

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "node:child_process";
import os from "node:os";
import { getSettings, type Settings } from "./settings";

/** A problem talking to the AI, with a message that's safe to show on screen. */
export class AiError extends Error {}

export type AskOptions = {
  /** Who the AI is and the rules it follows. */
  system: string;
  /** The actual request, including the data to plan from. */
  prompt: string;
  /** JSON Schema the answer must match. */
  schema: object;
};

/** Asks the configured AI and returns its structured answer (callers still validate it). */
export async function askAi(options: AskOptions, settings: Settings = getSettings()): Promise<unknown> {
  switch (settings.aiProvider) {
    case "claude-code":
      return askClaudeCode(options);
    case "anthropic":
      return askClaudeApi(options, settings);
    case "ollama":
      return askOllama(options, settings);
    case "none":
      throw new AiError("AI planning is turned off. Plan by hand, or pick an AI in Settings.");
  }
}

// ---------------------------------------------------------------------------
// Claude Code CLI (claude -p): uses the person's own Claude subscription login.
// ---------------------------------------------------------------------------

// Override with QUESTLINE_CLAUDE_PATH in .env.local if `claude` isn't on PATH.
const CLAUDE_COMMAND = process.env.QUESTLINE_CLAUDE_PATH || "claude";

async function askClaudeCode({ system, prompt, schema }: AskOptions): Promise<unknown> {
  const args = [
    "-p", // print mode: answer once, then exit
    "--output-format", "json",
    "--json-schema", JSON.stringify(schema),
    "--system-prompt", system,
    "--tools", "", // no tools: it can't read or change any files
    "--safe-mode", // skip the person's plugins, hooks and memory so every plan starts clean
    "--no-session-persistence", // don't save these calls in their session history
  ];

  const stdout = await run(CLAUDE_COMMAND, args, prompt, 180_000);

  let reply: { is_error?: boolean; result?: string; structured_output?: unknown };
  try {
    reply = JSON.parse(stdout);
  } catch {
    throw new AiError("Claude Code sent back something that wasn't JSON.");
  }

  if (reply.is_error) {
    const reason = reply.result ?? "unknown error";
    if (/auth|log ?in|oauth/i.test(reason)) {
      throw new AiError("Claude Code isn't logged in. Run `claude auth login` in a terminal, then try again.");
    }
    throw new AiError(`Claude Code reported an error: ${reason}`);
  }
  if (reply.structured_output === undefined) throw new AiError("Claude Code didn't return a structured answer.");
  return reply.structured_output;
}

/** Runs a command with `input` on stdin and resolves with everything it printed. */
function run(command: string, args: string[], input: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // Run from the temp folder so Claude Code doesn't pick up this project's files.
    const child = spawn(command, args, { cwd: os.tmpdir(), windowsHide: true });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new AiError("Claude took too long to answer. Try again."));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => (out += chunk));
    child.stderr.on("data", (chunk) => (err += chunk));
    child.on("error", () => {
      clearTimeout(timer);
      reject(new AiError("Couldn't start Claude Code. Is it installed? Or pick another AI in Settings."));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      // A failed run still prints a JSON reply with the reason, so prefer that.
      if (out.trim()) resolve(out);
      else reject(new AiError(`Claude Code exited with code ${code}. ${err.trim().slice(0, 200)}`));
    });

    child.stdin.end(input);
  });
}

// ---------------------------------------------------------------------------
// Claude API: the person's own API key, billed to their own account.
// ---------------------------------------------------------------------------

async function askClaudeApi({ system, prompt, schema }: AskOptions, settings: Settings): Promise<unknown> {
  if (!settings.anthropicApiKey) throw new AiError("Add your Claude API key in Settings first.");
  const client = new Anthropic({ apiKey: settings.anthropicApiKey, timeout: 180_000 });

  let response;
  try {
    response = await client.beta.messages.create({
      model: settings.anthropicModel,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: prompt }],
      // Structured output: the reply must match our JSON Schema.
      output_config: { effort: "medium", format: { type: "json_schema", schema: schema as Record<string, unknown> } },
      // If a request is ever declined by a safety check, retry it on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new AiError("Your Claude API key was rejected. Check it in Settings.");
    if (error instanceof Anthropic.PermissionDeniedError) throw new AiError("Your API key can't use this model. Check the model name in Settings.");
    if (error instanceof Anthropic.NotFoundError) throw new AiError(`Model "${settings.anthropicModel}" wasn't found. Check it in Settings.`);
    if (error instanceof Anthropic.RateLimitError) throw new AiError("The Claude API is rate limiting you. Wait a minute and try again.");
    if (error instanceof Anthropic.APIConnectionError) throw new AiError("Couldn't reach the Claude API. Check your internet connection.");
    if (error instanceof Anthropic.APIError) throw new AiError(`The Claude API returned an error (${error.status}). Try again.`);
    throw error;
  }

  if (response.stop_reason === "refusal") throw new AiError("Claude declined to plan this. Try rewording the goal or note.");
  if (response.stop_reason === "max_tokens") throw new AiError("Claude's answer was cut off. Try again.");

  const text = response.content.map((block) => (block.type === "text" ? block.text : "")).join("");
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError("The Claude API sent back something that wasn't JSON.");
  }
}

// ---------------------------------------------------------------------------
// Ollama: a free, local model. Nothing leaves the PC.
// ---------------------------------------------------------------------------

async function askOllama({ system, prompt, schema }: AskOptions, settings: Settings): Promise<unknown> {
  const url = `${settings.ollamaUrl.replace(/\/+$/, "")}/api/chat`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: settings.ollamaModel,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        format: schema, // Ollama's structured output: the reply must match this JSON Schema
        stream: false,
      }),
      signal: AbortSignal.timeout(300_000),
    });
  } catch {
    throw new AiError(`Couldn't reach Ollama at ${settings.ollamaUrl}. Is it running?`);
  }

  if (res.status === 404) {
    throw new AiError(`Ollama doesn't have the model "${settings.ollamaModel}". Run \`ollama pull ${settings.ollamaModel}\`.`);
  }
  if (!res.ok) throw new AiError(`Ollama returned an error (${res.status}).`);

  const body = (await res.json()) as { message?: { content?: string } };
  try {
    return JSON.parse(body.message?.content ?? "");
  } catch {
    throw new AiError("Ollama sent back something that wasn't JSON. A bigger model may do better.");
  }
}
