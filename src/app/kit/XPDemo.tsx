"use client";

import { Checkbox, Crown, Fire, Zap } from "pixelarticons/react";
import { useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { StatTile } from "@/components/ui/StatTile";
import { XPBar } from "@/components/ui/XPBar";

// Fake numbers so the components can be played with before the database exists.
const XP_PER_QUEST = 50;
const XP_PER_LEVEL = 200;

export function XPDemo() {
  const [quests, setQuests] = useState(14);
  const totalXP = quests * XP_PER_QUEST;
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const xpIntoLevel = totalXP % XP_PER_LEVEL;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Streak" value={6} caption="Days in a row" accent="red" icon={<Fire />} />
        <StatTile label="Level" value={level} caption="Become a clipper" accent="yellow" icon={<Crown />} />
        <StatTile label="Total XP" value={totalXP} caption="All time" accent="cyan" icon={<Zap />} />
        <StatTile label="Quests done" value={quests} caption="of 44 planned" accent="green" icon={<Checkbox />} />
      </div>

      <div className="border-2 border-line bg-panel p-5">
        <XPBar label={`Level ${level}`} value={xpIntoLevel} max={XP_PER_LEVEL} />
        <div className="mt-5 flex flex-wrap gap-4">
          <PixelButton color="green" onClick={() => setQuests((q) => q + 1)}>
            <Checkbox /> Complete quest +{XP_PER_QUEST} XP
          </PixelButton>
          <PixelButton color="dark" onClick={() => setQuests(14)}>
            Reset
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
