"use client";

// Choose which AI plans your worlds and days. Each option shows only the
// fields it needs. The saved API key is never sent back to this page: it
// only knows the last few characters, to show that a key is saved.

import clsx from "clsx";
import { Check, Close } from "pixelarticons/react";
import { useActionState, useState, useTransition } from "react";
import { forgetApiKey, saveAiSettings, testAi, type TestResult } from "@/app/(app)/settings/actions";
import { PixelButton } from "@/components/ui/PixelButton";

type Provider = "claude-code" | "anthropic" | "ollama" | "none";

const options: { value: Provider; title: string; cost: string; text: string }[] = [
  { value: "claude-code", title: "Claude Code", cost: "Included in your Claude plan", text: "Uses the Claude Code app on this computer and your own Claude login." },
  { value: "anthropic", title: "Claude API key", cost: "Pay per use, about $1–2 a month", text: "Uses your own key from console.anthropic.com." },
  { value: "ollama", title: "Ollama", cost: "Free, runs offline", text: "A model running on this computer. Needs a decent graphics card." },
  { value: "none", title: "No AI", cost: "Free", text: "You write your own worlds and quests." },
];

const inputClass =
  "h-11 border-2 border-line bg-ink px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-cyan focus:outline-none";

type AiSettingsFormProps = {
  provider: Provider;
  /** e.g. "…a1B2", or null when no key is saved. */
  keyHint: string | null;
  anthropicModel: string;
  ollamaUrl: string;
  ollamaModel: string;
};

export function AiSettingsForm(props: AiSettingsFormProps) {
  const [selected, setSelected] = useState<Provider>(props.provider);
  const [state, action, pending] = useActionState(saveAiSettings, null);
  const [test, setTest] = useState<TestResult | null>(null);
  const [testing, startTest] = useTransition();
  const unsaved = selected !== props.provider;

  return (
    <form action={action} className="flex flex-col gap-5" onChange={() => setTest(null)}>
      <fieldset>
        <legend className="sr-only">How Questline plans</legend>
        <div className="grid gap-3 lg:grid-cols-2">
          {options.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name="aiProvider"
                value={option.value}
                checked={selected === option.value}
                onChange={() => setSelected(option.value)}
                className="peer sr-only"
              />
              <span
                className={clsx(
                  "flex h-full flex-col gap-1 border-2 bg-panel-raised p-4 hover:border-text-dim",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-yellow",
                  selected === option.value ? "border-yellow" : "border-line",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm uppercase">{option.title}</span>
                  {props.provider === option.value && <span className="text-xs text-yellow">In use</span>}
                </span>
                <span className="text-xs text-cyan">{option.cost}</span>
                <span className="text-sm text-text-dim">{option.text}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {selected === "claude-code" && (
        <p className="text-sm text-text-dim">
          Needs Claude Code installed and logged in. If planning says you&apos;re not logged in, run{" "}
          <code className="bg-ink px-1.5 py-0.5 text-text">claude auth login</code> in a terminal.
        </p>
      )}

      {selected === "anthropic" && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-display text-xs uppercase">API key</span>
            <input
              name="anthropicApiKey"
              type="password"
              autoComplete="off"
              placeholder={props.keyHint ? `Saved key ${props.keyHint}. Leave empty to keep it.` : "sk-ant-..."}
              className={inputClass}
            />
            <span className="text-xs text-text-dim">Saved only in this computer&apos;s Questline database, never in the code.</span>
          </label>
          {props.keyHint && (
            <button
              type="button"
              onClick={() => forgetApiKey()}
              className="self-start text-xs text-text-dim underline underline-offset-2 hover:text-text"
            >
              Forget the saved key
            </button>
          )}
          <label className="flex flex-col gap-2">
            <span className="font-display text-xs uppercase">Model</span>
            <input name="anthropicModel" defaultValue={props.anthropicModel} className={`max-w-xs ${inputClass}`} />
          </label>
        </div>
      )}

      {selected === "ollama" && (
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-display text-xs uppercase">Ollama address</span>
            <input name="ollamaUrl" defaultValue={props.ollamaUrl} className={`w-72 ${inputClass}`} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-display text-xs uppercase">Model</span>
            <input name="ollamaModel" defaultValue={props.ollamaModel} className={`w-48 ${inputClass}`} />
          </label>
          <p className="w-full text-xs text-text-dim">
            Install Ollama from ollama.com, then download the model once with{" "}
            <code className="bg-ink px-1.5 py-0.5 text-text">ollama pull {props.ollamaModel}</code>.
          </p>
        </div>
      )}

      {state?.error && (
        <p role="alert" className="text-sm text-red">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <PixelButton type="submit" color="green" disabled={pending}>
          {pending ? "Saving..." : "Save AI settings"}
        </PixelButton>
        <PixelButton
          color="dark"
          disabled={testing || unsaved}
          title={unsaved ? "Save first, then test" : undefined}
          onClick={() => startTest(async () => setTest(await testAi()))}
        >
          {testing ? "Testing..." : "Test connection"}
        </PixelButton>
        {state?.saved && !pending && <span className="text-sm text-green">Saved.</span>}
      </div>

      {test && (
        <p role="status" className={clsx("flex items-center gap-2 text-sm [&_svg]:size-5", test.ok ? "text-green" : "text-red")}>
          {test.ok ? <Check /> : <Close />}
          {test.ok ? `Connected: "${test.message}"` : test.message}
        </p>
      )}
    </form>
  );
}
