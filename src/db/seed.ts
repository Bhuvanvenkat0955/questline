// Fills the database with a sample quest line so the screens have something
// real to show before Claude can generate roadmaps (step 6).
//
//   npm run db:seed            add the sample if the database is empty
//   npm run db:seed -- --reset wipe everything first, then add it

import { db } from "./index";
import { checkins, goals, phases, quests, type QuestType } from "./schema";
import { questXp } from "@/lib/progress";

type SeedQuest = [title: string, type: QuestType, estMinutes: number, instructions: string];

const sample = {
  title: "Become a clipper",
  description: "Turn long videos and streams into short clips that get views, then get paid for it.",
  dailyMinutes: 45,
  phases: [
    {
      title: "World 1: Learn the editor",
      doneCriteria: "You can cut, caption and reframe a clip without looking anything up.",
      quests: [
        ["Install CapCut and tour the timeline", "learn", 20, "Import any video, then find split, trim, speed and the text tool."],
        ["Cut a 60-second clip from a podcast", "practice", 30, "Pick one funny or surprising moment and trim it to under a minute."],
        ["Add captions and fix the mistakes", "practice", 25, "Use auto-captions, then correct every wrong word and timing."],
        ["Study 5 viral clips", "learn", 20, "For each one, write down what happens in the first 3 seconds."],
        ["Reframe a clip to vertical 9:16", "practice", 30, "Keep the speaker's face centered as the shot changes."],
      ] satisfies SeedQuest[],
    },
    {
      title: "World 2: Find the moments",
      doneCriteria: "You can spot clip-worthy moments in a long video quickly.",
      quests: [
        ["Pick 3 creators who allow clipping", "learn", 20, "Look for streamers and podcasters who say clipping is welcome."],
        ["Timestamp 5 moments in one long video", "practice", 40, "Note the start and end time and why each moment works."],
        ["Write 3 hook titles per moment", "practice", 20, "Short, curious, no spoilers. Pick a favourite for each."],
        ["Edit your best moment into a finished clip", "build", 45, "Captions, vertical crop, a strong first second."],
      ] satisfies SeedQuest[],
    },
    {
      title: "World 3: Post every day",
      doneCriteria: "You've published at least 5 clips and know which hooks work.",
      quests: [
        ["Set up your clip accounts", "build", 25, "TikTok, YouTube Shorts and Reels, with the same name and picture."],
        ["Publish your first clip", "publish", 15, "Post it. It doesn't have to be perfect."],
        ["Publish a clip with a different hook style", "publish", 35, "Try a question, a bold claim or a reaction as the opening."],
        ["Check your stats and note what held viewers", "learn", 15, "Compare watch time and drop-off between your clips."],
        ["Publish 2 clips using your best hook", "publish", 45, "Repeat what worked and change one thing."],
      ] satisfies SeedQuest[],
    },
    {
      title: "World 4: Get paid",
      doneCriteria: "You've applied to a paid campaign or pitched a creator.",
      quests: [
        ["Research clipping campaigns", "learn", 25, "Find programs that pay per view and read their rules."],
        ["Build a portfolio of your 5 best clips", "build", 30, "One link that shows your clips and their view counts."],
        ["Apply to a clipping campaign", "publish", 20, "Follow their rules exactly and include your portfolio."],
        ["Pitch one creator with a sample clip", "publish", 30, "Send a short message with a clip you made from their content."],
      ] satisfies SeedQuest[],
    },
  ],
};

/** How many quests start unlocked. The rest open up as you finish these. */
const START_ACTIVE = 3;

const reset = process.argv.includes("--reset");

if (reset) {
  // Deleting goals also deletes their phases and quests (foreign key cascade).
  db.delete(checkins).run();
  db.delete(goals).run();
} else if (db.select().from(goals).get()) {
  console.log("The database already has a goal. Run `npm run db:seed -- --reset` to start over.");
  process.exit(0);
}

// A transaction means all of this is saved together, or none of it is.
db.transaction((tx) => {
  const goal = tx
    .insert(goals)
    .values({ title: sample.title, description: sample.description, dailyMinutes: sample.dailyMinutes })
    .returning()
    .get();

  let questNumber = 0;
  sample.phases.forEach((p, i) => {
    const phase = tx
      .insert(phases)
      .values({ goalId: goal.id, position: i + 1, title: p.title, doneCriteria: p.doneCriteria })
      .returning()
      .get();

    tx.insert(quests)
      .values(
        p.quests.map(([title, type, estMinutes, instructions], j) => ({
          phaseId: phase.id,
          position: j + 1,
          title,
          type,
          estMinutes,
          instructions,
          status: questNumber++ < START_ACTIVE ? ("active" as const) : ("locked" as const),
        })),
      )
      .run();
  });
});

// Read everything back to show what was saved.
const allQuests = db.select().from(quests).all();
const totalXp = allQuests.reduce((sum, q) => sum + questXp(q), 0);

console.log(`Seeded "${sample.title}"`);
console.log(`  ${sample.phases.length} worlds, ${allQuests.length} quests, ${totalXp} XP available`);
console.log(`  Unlocked now: ${allQuests.filter((q) => q.status === "active").map((q) => q.title).join(", ")}`);
