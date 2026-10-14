import { connection } from "next/server";
import { Suspense } from "react";
import { ActivityList } from "@/components/time/ActivityList";
import { HourChart } from "@/components/time/HourChart";
import { ReviewCard } from "@/components/time/ReviewCard";
import { SplitBar } from "@/components/time/SplitBar";
import { TrackerControl } from "@/components/time/TrackerControl";
import { dayLabel, localDate } from "@/lib/progress";
import { formatDuration, getTimeView } from "@/lib/screenTime";
import { trackerStatus } from "@/lib/tracker/tracker";

// The Time screen: where your computer time actually goes. Only app names and
// website names are recorded, on this PC only, while tracking is on.

export default function TimePage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-pixel-grid px-6 py-10 text-text-ink sm:px-10">
        <p className="font-display text-xs uppercase">Screen time</p>
        <h1 className="mt-3 font-display text-4xl leading-none font-bold uppercase sm:text-5xl">Where time goes</h1>
        <p className="mt-3 max-w-xl text-sm">
          Only app names and website names are counted, never what&apos;s on screen. It stays on this computer, and stops
          counting after 2 minutes away.
        </p>
      </section>
      <Suspense fallback={<p className="px-6 py-10 text-text-dim sm:px-10">Loading...</p>}>
        <Time />
      </Suspense>
    </main>
  );
}

async function Time() {
  await connection();
  const today = localDate();
  const view = getTimeView(today);
  const { split } = view;

  return (
    <div className="flex flex-col gap-8 px-6 py-8 sm:px-10">
      <TrackerControl status={trackerStatus()} />

      {view.toReview.length > 0 && (
        <ReviewCard items={view.toReview} durations={view.toReview.map((a) => formatDuration(a.seconds))} />
      )}

      <section aria-labelledby="today-title" className="flex flex-col gap-4 border-2 border-line bg-panel p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="today-title" className="font-display text-base uppercase">Today</h2>
          <p className="text-sm text-text-dim">
            <span className="text-2xl font-bold text-text">{formatDuration(split.total)}</span> active
            {split.focusPercent !== null && (
              <>
                {" · "}
                <span className="text-text">{split.focusPercent}% focus</span>
              </>
            )}
          </p>
        </div>
        <SplitBar split={split} />
        {split.focusPercent === null && split.total > 0 && (
          <p className="text-xs text-text-dim">Label your apps below to see your focus score: productive vs distracting time.</p>
        )}
      </section>

      <section aria-labelledby="apps-title" className="flex flex-col gap-4">
        <div>
          <h2 id="apps-title" className="font-display text-base uppercase">Apps and sites today</h2>
          <p className="mt-1 text-sm text-text-dim">
            Label each one once and Questline remembers. Use <span className="text-yellow">Depends</span> for things like
            YouTube that can be learning or just scrolling: you&apos;ll get a quick question at the end of the day.
          </p>
        </div>
        <ActivityList rows={view.activities} durations={view.activities.map((a) => formatDuration(a.seconds))} />
      </section>

      <section aria-labelledby="hours-title" className="border-2 border-line bg-panel p-5">
        <h2 id="hours-title" className="mb-4 font-display text-base uppercase">Today by hour</h2>
        <HourChart hours={view.hours} />
      </section>

      <section aria-labelledby="week-title" className="border-2 border-line bg-panel p-5">
        <h2 id="week-title" className="mb-4 font-display text-base uppercase">Last 7 days</h2>
        <table className="w-full max-w-xl text-sm">
          <thead>
            <tr className="border-b-2 border-line text-left font-display text-xs text-text-dim uppercase">
              <th className="py-2 font-normal">Day</th>
              <th className="py-2 text-right font-normal">Active</th>
              <th className="py-2 text-right font-normal">Productive</th>
              <th className="py-2 text-right font-normal">Distracting</th>
              <th className="py-2 text-right font-normal">Focus</th>
            </tr>
          </thead>
          <tbody>
            {[...view.week].reverse().map(({ date, split: day }) => (
              <tr key={date} className="border-b border-line">
                <td className="py-2">{dayLabel(date, today)}</td>
                <td className="py-2 text-right tabular-nums">{day.total ? formatDuration(day.total) : "–"}</td>
                <td className="py-2 text-right text-green tabular-nums">{day.productive ? formatDuration(day.productive) : "–"}</td>
                <td className="py-2 text-right text-red tabular-nums">{day.distracting ? formatDuration(day.distracting) : "–"}</td>
                <td className="py-2 text-right tabular-nums">{day.focusPercent !== null ? `${day.focusPercent}%` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
