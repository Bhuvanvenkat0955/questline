// Test data only. Fills the database with what it would look like after a few
// days of using the app, so the screens have something to show before the AI
// is connected (step 6). Real goals, worlds and quests will be written by the
// AI for whatever goal the user types in.
//
//   npm run db:seed            add the sample if the database is empty
//   npm run db:seed -- --reset wipe everything first, then add it

import { db } from "./index";
import { checkins, goals, phases, quests, type QuestType } from "./schema";
import { addDays, localDate } from "@/lib/progress";

type SampleQuest = { title: string; type: QuestType; estMinutes: number; instructions: string };

const goal = {
  title: "Become a clipper",
  description: "Turn long videos and streams into short clips that get views, then get paid for it.",
  dailyMinutes: 45,
};

/** The worlds the AI would write when the goal is created. */
const worlds = [
  ["Learn the editor", "You can cut, caption and reframe a clip without looking anything up."],
  ["Find the moments", "You can spot 5 clip-worthy moments in a long video in under an hour."],
  ["Post every day", "You've published 5 clips and know which hooks hold viewers."],
  ["Get paid", "You've applied to a paid campaign or pitched a creator."],
];

/** Quests the AI planned on earlier days, all finished. */
const history: SampleQuest[][] = [
  [
    { title: "Install an editor and tour the timeline", type: "learn", estMinutes: 20, instructions: "Find split, trim, speed and the text tool." },
    { title: "Cut a 60-second clip from a podcast", type: "practice", estMinutes: 25, instructions: "Pick one surprising moment and trim it." },
  ],
  [
    { title: "Add captions and fix the mistakes", type: "practice", estMinutes: 25, instructions: "Auto-caption, then correct every wrong word." },
    { title: "Study 3 viral clips", type: "learn", estMinutes: 15, instructions: "Write down what happens in each one's first 3 seconds." },
  ],
];

/** What the AI would plan today for a low-energy, 30-minute check-in. */
const todayCheckin = { minutesAvailable: 30, energy: "low" as const, note: "Busy day, only have the evening." };
const todayQuests: SampleQuest[] = [
  { title: "Reframe one old clip to vertical", type: "practice", estMinutes: 15, instructions: "Keep the speaker's face centered as the shot changes." },
  { title: "Make a full clip from scratch", type: "boss", estMinutes: 15, instructions: "Cut, caption and reframe a short moment, start to finish." },
];

const reset = process.argv.includes("--reset");

if (reset) {
  // Deleting goals also deletes their worlds, quests and check-ins (foreign key cascade).
  db.delete(goals).run();
} else if (db.select().from(goals).get()) {
  console.log("The database already has a goal. Run `npm run db:seed -- --reset` to start over.");
  process.exit(0);
}

const today = localDate();

// A transaction means all of this is saved together, or none of it is.
db.transaction((tx) => {
  const g = tx.insert(goals).values(goal).returning().get();

  const [firstWorld] = worlds.map(([title, doneCriteria], i) =>
    tx
      .insert(phases)
      .values({ goalId: g.id, position: i + 1, title, doneCriteria, status: i === 0 ? "current" : "upcoming" })
      .returning()
      .get(),
  );

  history.forEach((dayQuests, i) => {
    const date = addDays(today, i - history.length);
    tx.insert(checkins).values({ goalId: g.id, date, minutesAvailable: 45, energy: "ok" }).run();
    tx.insert(quests)
      .values(dayQuests.map((q, j) => ({ ...q, phaseId: firstWorld.id, date, position: j + 1, status: "done" as const, completedOn: date })))
      .run();
  });

  tx.insert(checkins).values({ goalId: g.id, date: today, ...todayCheckin }).run();
  tx.insert(quests)
    .values(todayQuests.map((q, j) => ({ ...q, phaseId: firstWorld.id, date: today, position: j + 1 })))
    .run();
});

console.log(`Seeded test goal "${goal.title}"`);
console.log(`  ${worlds.length} worlds, ${history.length} finished days, ${todayQuests.length} quests for today (${today})`);
