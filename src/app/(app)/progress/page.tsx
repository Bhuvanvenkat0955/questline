import { connection } from "next/server";
import { Suspense } from "react";
import { Calendar, Checkbox, Fire, Flag, Trophy, Zap } from "pixelarticons/react";
import { ActivityCalendar } from "@/components/progress/ActivityCalendar";
import { XpChart } from "@/components/progress/XpChart";
import { GoalHeading } from "@/components/ui/GoalHeading";
import { StatTile } from "@/components/ui/StatTile";
import { getProgressView } from "@/lib/history";
import { dayLabel, localDate } from "@/lib/progress";

// The Progress screen: headline stats, the streak calendar, XP over time,
// and a daily log table with every number the charts show.

export default function ProgressPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<p className="px-6 py-10 text-text-dim sm:px-10">Loading progress...</p>}>
        <Progress />
      </Suspense>
    </main>
  );
}

async function Progress() {
  await connection();
  const today = localDate();
  const view = getProgressView(today);
  if (!view) {
    return (
      <p className="mx-6 my-10 max-w-xl border-2 border-line bg-panel p-6 text-sm text-text-dim sm:mx-10">
        No quest line yet, so there&apos;s no progress to show.
      </p>
    );
  }

  const { goal, stats } = view;

  return (
    <>
      <section className="bg-pixel-grid px-6 py-10 text-text-ink sm:px-10">
        <p className="font-display text-xs uppercase">Progress</p>
        <GoalHeading title={goal.title} />
        <p className="mt-3 text-sm">
          Level {stats.level} · {stats.worldsCleared} of {stats.worldCount} worlds cleared
        </p>
      </section>

      <div className="flex flex-col gap-8 px-6 py-8 sm:px-10">
        <section aria-label="Headline stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <StatTile label="Streak" value={stats.streak} caption={stats.streak === 1 ? "Day in a row" : "Days in a row"} accent="red" icon={<Fire />} />
          <StatTile label="Best streak" value={stats.bestStreak} caption="Longest run" accent="purple" icon={<Trophy />} />
          <StatTile label="Total XP" value={stats.totalXp} caption={`Level ${stats.level}`} accent="yellow" icon={<Zap />} />
          <StatTile label="Quests done" value={stats.questsDone} caption="All time" accent="green" icon={<Checkbox />} />
          <StatTile label="Active days" value={stats.activeDays} caption="With a finished quest" accent="cyan" icon={<Calendar />} />
        </section>

        <section aria-labelledby="calendar-title" className="border-2 border-line bg-panel p-5">
          <h2 id="calendar-title" className="font-display text-base uppercase">Streak calendar</h2>
          <p className="mt-1 mb-4 text-sm text-text-dim">Quests finished per day, last 16 weeks.</p>
          <ActivityCalendar weeks={view.calendar} today={today} />
        </section>

        <section aria-labelledby="xp-title" className="border-2 border-line bg-panel p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 id="xp-title" className="font-display text-base uppercase">XP over time</h2>
              <p className="mt-1 text-sm text-text-dim">Total XP at the end of each day. Faint lines mark where each level starts.</p>
            </div>
            <p className="text-2xl font-bold">{stats.totalXp.toLocaleString()} XP</p>
          </div>
          <XpChart points={view.xpLine} levelMarks={view.levelMarks} />
        </section>

        <DailyLog log={view.log} today={today} />
      </div>
    </>
  );
}

/** The table version of both charts: every active day with its numbers. */
function DailyLog({ log, today }: { log: { date: string; quests: number; xp: number }[]; today: string }) {
  return (
    <details className="border-2 border-line bg-panel p-5">
      <summary className="inline-flex cursor-pointer items-center gap-2 font-display text-sm uppercase hover:text-yellow focus-visible:outline-2 focus-visible:outline-yellow [&_svg]:size-5">
        <Flag /> Daily log ({log.length} {log.length === 1 ? "day" : "days"})
      </summary>
      {log.length === 0 ? (
        <p className="mt-4 text-sm text-text-dim">No finished quests yet.</p>
      ) : (
        <table className="mt-4 w-full max-w-lg text-sm">
          <thead>
            <tr className="border-b-2 border-line text-left font-display text-xs text-text-dim uppercase">
              <th className="py-2 font-normal">Day</th>
              <th className="py-2 text-right font-normal">Quests</th>
              <th className="py-2 text-right font-normal">XP</th>
            </tr>
          </thead>
          <tbody>
            {log.map((day) => (
              <tr key={day.date} className="border-b border-line">
                <td className="py-2">
                  {dayLabel(day.date, today)} <span className="text-text-dim">({day.date})</span>
                </td>
                <td className="py-2 text-right tabular-nums">{day.quests}</td>
                <td className="py-2 text-right tabular-nums">{day.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}
