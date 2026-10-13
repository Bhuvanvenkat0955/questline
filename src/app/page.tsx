import { connection } from "next/server";
import { Suspense } from "react";
import { Checkbox, Crown, Fire, Trophy, Zap } from "pixelarticons/react";
import { CheckinPanel } from "@/components/today/CheckinPanel";
import { QuestCard } from "@/components/today/QuestCard";
import { StatTile } from "@/components/ui/StatTile";
import { XPBar } from "@/components/ui/XPBar";
import { addDays, localDate, questXp } from "@/lib/progress";
import { getTodayView, type TodayView } from "@/lib/today";

// The Today screen: the home page of Questline.
// The page shell renders instantly; <Today> reads the database and streams in.

export default function TodayPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b-4 border-line px-6 py-4 sm:px-10">
        <span className="font-display text-lg uppercase">Questline</span>
      </header>
      <Suspense fallback={<p className="px-6 py-10 text-text-dim sm:px-10">Loading today...</p>}>
        <Today />
      </Suspense>
    </main>
  );
}

async function Today() {
  // The database driver is synchronous, so without this Next.js would read it
  // once at build time and bake the answer into the page. connection() says
  // "wait for a real visit", so every visit sees fresh data and today's date.
  await connection();

  const today = localDate();
  const view = getTodayView(today);
  if (!view) return <NoGoal />;

  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <section className="bg-pixel-grid px-6 py-10 text-text-ink sm:px-10">
        <p className="font-display text-xs uppercase">
          {view.world
            ? `World ${view.world.position} of ${view.worldCount} · ${view.world.title}`
            : "All worlds cleared"}
        </p>
        <h1 className="mt-3 font-display text-4xl leading-none font-bold uppercase sm:text-5xl">{view.goal.title}</h1>
        <p className="mt-3 text-sm">{dateLabel}</p>
      </section>

      <div className="flex flex-col gap-8 px-6 py-8 sm:px-10">
        <Stats view={view} />
        <CheckinPanel checkin={view.checkin} defaultMinutes={view.goal.dailyMinutes} />
        {view.checkin && <TodayQuests view={view} today={today} />}
        {view.missed.length > 0 && <MissedQuests view={view} today={today} />}
      </div>
    </>
  );
}

function Stats({ view }: { view: TodayView }) {
  const { stats, quests } = view;
  const doneToday = quests.filter((q) => q.status === "done").length;

  return (
    <section aria-label="Your progress" className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Level" value={stats.level} caption={`${stats.xpForNext - stats.xpIntoLevel} XP to next`} accent="yellow" icon={<Crown />} />
        <StatTile label="Total XP" value={stats.totalXp} caption="All time" accent="cyan" icon={<Zap />} />
        <StatTile label="Streak" value={stats.streak} caption={stats.streak === 1 ? "Day in a row" : "Days in a row"} accent="red" icon={<Fire />} />
        <StatTile label="Today" value={doneToday} caption={`of ${quests.length} quests done`} accent="green" icon={<Checkbox />} />
      </div>
      <div className="border-2 border-line bg-panel p-5">
        <XPBar label={`Level ${stats.level}`} value={stats.xpIntoLevel} max={stats.xpForNext} />
      </div>
    </section>
  );
}

function TodayQuests({ view, today }: { view: TodayView; today: string }) {
  const { quests } = view;
  const done = quests.filter((q) => q.status === "done").length;
  const minutes = quests.reduce((sum, q) => sum + q.estMinutes, 0);
  const allDone = quests.length > 0 && quests.every((q) => q.status !== "todo");

  return (
    <section aria-labelledby="today-quests" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="today-quests" className="font-display text-xl uppercase">Today&apos;s quests</h2>
        {quests.length > 0 && (
          <p className="text-sm text-text-dim tabular-nums">
            {done}/{quests.length} done · {minutes} min · {view.xpAvailableToday} XP
          </p>
        )}
      </div>

      {allDone && (
        <div className="flex items-center gap-4 border-[3px] border-ink bg-yellow p-4 text-ink shadow-pixel [--shadow-color:var(--yellow-deep)]">
          <Trophy className="size-9 shrink-0" />
          <div>
            <p className="font-display text-lg uppercase">Day cleared!</p>
            <p className="text-sm">Every quest is done. Come back tomorrow to keep the streak going.</p>
          </div>
        </div>
      )}

      {quests.length === 0 ? (
        <p className="border-2 border-dashed border-line p-6 text-sm text-text-dim">
          No quests are planned for today yet. Automatic planning from your check-in is coming in a later update.
        </p>
      ) : (
        quests.map((q) => (
          <QuestCard key={q.id} quest={q} xp={questXp(q)} missedFrom={q.date < today ? dayLabel(q.date, today) : undefined} />
        ))
      )}
    </section>
  );
}

function MissedQuests({ view, today }: { view: TodayView; today: string }) {
  return (
    <section aria-labelledby="missed-quests" className="flex flex-col gap-4">
      <div>
        <h2 id="missed-quests" className="font-display text-xl text-red uppercase">Missed quests</h2>
        <p className="mt-1 text-sm text-text-dim">Left over from earlier days. Finish one today for full XP, or skip it.</p>
      </div>
      {view.missed.map((q) => (
        <QuestCard key={q.id} quest={q} xp={questXp(q)} missedFrom={dayLabel(q.date, today)} />
      ))}
    </section>
  );
}

/** "yesterday" or a short date like "Oct 11", for labelling quests from earlier days. */
function dayLabel(date: string, today: string) {
  if (date === addDays(today, -1)) return "yesterday";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NoGoal() {
  return (
    <section className="mx-6 my-10 max-w-xl border-2 border-line bg-panel p-6 sm:mx-10">
      <h1 className="font-display text-2xl text-yellow uppercase">No quest line yet</h1>
      <p className="mt-3 text-sm text-text-dim">
        Creating your own goal is coming soon. For now, load the sample goal by running{" "}
        <code className="bg-ink px-1.5 py-0.5 text-text">npm run db:seed</code> and refresh this page.
      </p>
    </section>
  );
}
