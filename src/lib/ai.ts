// The one place that knows HOW Questline talks to an AI.
//
// Right now it runs the Claude Code CLI installed on this PC in "headless"
// mode (claude -p), which uses your own Claude subscription login — no API
// key. To switch to the Claude API or a local model later, only this file
// needs to change: everything else just calls askAi().

import "server-only";
import { spawn } from "node:child_process";
import os from "node:os";

/** A problem talking to the AI, with a message that's safe to show on screen. */
export class AiError extends Error {}

type AskOptions = {
  /** Who the AI is and the rules it follows. */
  system: string;
  /** The actual request, including the data to plan from. */
  prompt: string;
  /** JSON Schema the answer must match exactly (Claude Code's --json-schema). */
  schema: object;
  timeoutMs?: number;
};

// Override with QUESTLINE_CLAUDE_PATH in .env.local if `claude` isn't on PATH.
const CLAUDE_COMMAND = process.env.QUESTLINE_CLAUDE_PATH || "claude";

/** Asks the AI and returns its structured answer (not yet checked: callers validate). */
export async function askAi(options: AskOptions): Promise<unknown> {
  const { system, prompt, schema, timeoutMs = 180_000 } = options;

  const args = [
    "-p", // print mode: answer once, then exit
    "--output-format", "json",
    "--json-schema", JSON.stringify(schema),
    "--system-prompt", system,
    "--tools", "", // no tools: it can't read or change any files
    "--safe-mode", // skip your plugins, hooks and memory so every plan starts clean
    "--no-session-persistence", // don't save these calls in your session history
  ];

  const stdout = await run(CLAUDE_COMMAND, args, prompt, timeoutMs);

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
      reject(new AiError("Couldn't start Claude Code. Is it installed and on your PATH?"));
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
