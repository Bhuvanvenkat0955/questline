import { ArrowRight, Checkbox, Fire, Map as MapIcon, Plus, Trophy, Zap } from "pixelarticons/react";
import type { ReactNode } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelCard } from "@/components/ui/PixelCard";
import { XPDemo } from "./XPDemo";

// Component kit: a page that shows every building block in one place.
// Not part of the final app's navigation; it's our workbench for checking the look.
export default function KitPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-12 sm:px-10">
      <header>
        <p className="font-display text-sm text-text-dim uppercase">Questline</p>
        <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">Component kit</h1>
      </header>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-5">
          <PixelButton color="red" size="lg">
            <Zap /> Start quest
          </PixelButton>
          <PixelButton color="cyan" size="lg">
            <ArrowRight /> View roadmap
          </PixelButton>
          <PixelButton color="yellow">Claim reward</PixelButton>
          <PixelButton color="green">
            <Plus /> New goal
          </PixelButton>
          <PixelButton color="blue" size="sm">
            Blue
          </PixelButton>
          <PixelButton color="purple" size="sm">
            Purple
          </PixelButton>
          <PixelButton color="dark" size="sm">
            Cancel
          </PixelButton>
          <PixelButton color="red" size="sm" disabled>
            Locked
          </PixelButton>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PixelCard title="Daily quests" accent="green" icon={<Checkbox />} footer={<CardLink accent="text-green">Open today</CardLink>}>
            Small tasks sized to the time you have each day.
          </PixelCard>
          <PixelCard title="Keep the streak" accent="red" icon={<Fire />} footer={<CardLink accent="text-red">See streak</CardLink>}>
            Show up daily and watch the flame grow.
          </PixelCard>
          <PixelCard title="Level up" accent="yellow" icon={<Trophy />} footer={<CardLink accent="text-yellow">View levels</CardLink>}>
            Every finished quest earns XP toward your next level.
          </PixelCard>
          <PixelCard title="Roadmap" accent="purple" icon={<MapIcon />} footer={<CardLink accent="text-purple">Open roadmap</CardLink>}>
            Phases that turn a big goal into a path you can follow.
          </PixelCard>
        </div>
      </Section>

      <Section title="Stats and XP bar">
        <XPDemo />
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-5 border-b-2 border-line pb-2 font-display text-lg text-text-dim uppercase">{title}</h2>
      {children}
    </section>
  );
}

function CardLink({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 font-display text-xs uppercase ${accent}`}>
      {children} <ArrowRight className="size-4" aria-hidden="true" />
    </span>
  );
}
