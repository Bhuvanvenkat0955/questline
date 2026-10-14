"use client";

// The goal field: a box that wraps onto new lines as you type, so a long goal
// stays fully visible. Enter doesn't add a line break (a goal is one sentence),
// and a counter appears as you get near the limit.

import { useState } from "react";
import { GOAL_TITLE_MAX } from "@/lib/limits";

type GoalTitleInputProps = { defaultValue?: string; placeholder?: string; className?: string };

export function GoalTitleInput({ defaultValue = "", placeholder, className }: GoalTitleInputProps) {
  const [length, setLength] = useState(defaultValue.length);

  return (
    <>
      <textarea
        name="title"
        required
        rows={2}
        maxLength={GOAL_TITLE_MAX}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={(e) => setLength(e.target.value.length)}
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        // field-sizing-content: the box grows with the text instead of scrolling.
        className={`field-sizing-content min-h-16 resize-none py-2 ${className ?? ""}`}
      />
      {length > GOAL_TITLE_MAX - 40 && (
        <span className="self-end text-xs text-text-dim tabular-nums" aria-live="polite">
          {length} / {GOAL_TITLE_MAX}
        </span>
      )}
    </>
  );
}
