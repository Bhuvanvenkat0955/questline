import Link from "next/link";
import { Flag, Heart, Trophy, Zap } from "pixelarticons/react";

// Temporary style check for step 1: fonts, palette and pixel shadows.
// Replaced by the Today screen in step 4.
const swatches = [
  { name: "Red", bg: "bg-red", shadow: "var(--red-deep)" },
  { name: "Cyan", bg: "bg-cyan", shadow: "var(--cyan-deep)" },
  { name: "Yellow", bg: "bg-yellow", shadow: "var(--yellow-deep)" },
  { name: "Green", bg: "bg-green", shadow: "var(--green-deep)" },
  { name: "Blue", bg: "bg-blue", shadow: "var(--blue-deep)" },
  { name: "Purple", bg: "bg-purple", shadow: "var(--purple-deep)" },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-pixel-grid text-text-ink px-10 py-14">
        <h1 className="font-display text-6xl leading-none font-bold uppercase">
          Level up
          <br />
          every day.
          <Heart className="pixel-icon text-red ml-3 inline size-12 align-baseline" />
        </h1>
        <p className="mt-6 max-w-md text-base">
          Questline turns a big goal into daily quests. Finish them, earn XP,
          unlock the next one.
        </p>
        <Link href="/kit" className="mt-6 inline-block font-display text-sm uppercase underline underline-offset-4">
          Open the component kit
        </Link>
      </section>

      <section className="grid flex-1 grid-cols-3 gap-6 border-t-4 border-line px-10 py-10 md:grid-cols-6">
        {swatches.map((s) => (
          <div key={s.name} className="flex flex-col gap-3">
            <div
              className={`${s.bg} shadow-pixel h-16 border-2 border-ink`}
              style={{ ["--shadow-color" as string]: s.shadow }}
            />
            <span className="font-display text-sm uppercase">{s.name}</span>
          </div>
        ))}
        <div className="col-span-full mt-4 flex gap-6 text-text-dim">
          <Zap className="pixel-icon text-yellow size-12" />
          <Trophy className="pixel-icon text-yellow size-12" />
          <Flag className="pixel-icon text-green size-12" />
        </div>
      </section>
    </main>
  );
}
