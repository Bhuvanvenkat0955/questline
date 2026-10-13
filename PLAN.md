# Questline — Plan

Turn a big goal (e.g. "become a clipper") into a roadmap of small daily tasks,
check them off each day, and unlock the next ones as you progress.

## Progress
- [x] **Step 1 — Project setup:** Next.js + Tailwind, libraries, pixel fonts, palette
- [x] **Step 2 — Pixel components:** PixelButton, PixelCard, StatTile, XPBar, `/kit` showcase
- [x] **Step 3 — Database:** SQLite tables (goals, phases, quests, check-ins), XP/level rules, sample clipper quest line
- [ ] **Step 4 — Today screen:** daily checklist that saves, earns XP, updates streak, unlocks next quest
- [ ] **Step 5 — App shell + Roadmap screen:** sidebar nav, phases view, edit/reorder quests
- [ ] **Step 6 — Create goal with AI:** intake form + Claude-generated roadmap (needs API key)
- [ ] **Step 7 — Progress page:** streak calendar, XP over time

## Decisions
- **Platform:** desktop only (runs locally on this PC)
- **Tasks:** AI-generated roadmap via Claude API, fully editable
- **Storage:** local-first SQLite file, no account/login

## Core loop
1. Create a goal → answer intake questions (current level, minutes/day, deadline, tools).
2. Claude generates a roadmap: Phases → ordered Tasks (each sized to fit the daily budget).
3. **Today** screen shows 1–3 tasks that fit your time budget → check them off.
4. Completing today's tasks unlocks the next ones. Missed tasks roll over (no pile-up).
5. Progress: streak, % of current phase, % of goal, calendar heatmap.
6. Feedback ("too easy / too hard / skipped") lets Claude adjust upcoming tasks.

## Data model
| Table | Key fields |
|---|---|
| `goals` | id, title, description, daily_minutes, target_date, status (active/completed/archived), created_at |
| `phases` | id, goal_id, position, title, done_criteria |
| `quests` | id, phase_id, position, title, instructions, est_minutes, type (learn/practice/build/publish), status (locked/active/done/skipped), completed_on, feedback (too_easy/just_right/too_hard) |
| `checkins` | id, goal_id, date (one per goal per day), note, proof_link, difficulty (easy/ok/hard) |

Dates are local `YYYY-MM-DD` text. Missed quests just stay `active`, so they roll over.
XP, level and streak are computed from `quests` in `src/lib/progress.ts`, not stored:
- quest XP = est_minutes + type bonus (learn 10, practice 15, build 20, publish 30)
- level 1→2 costs 100 XP, each next level costs 50 more
- streak = days in a row with ≥1 finished quest (today counts once done)

DB commands: `npm run db:generate` (after editing schema.ts), `npm run db:seed [-- --reset]`, `npm run db:studio`.

## Screens
1. **New Goal** — intake form → preview/edit generated roadmap → start
2. **Today** — the daily checklist (home screen)
3. **Roadmap** — phases with done / current / locked tasks; edit, reorder, add
4. **Progress** — streak, heatmap, stats
5. **Settings** — goal settings, daily minutes, API key

## Tech stack
- **Next.js + TypeScript + Tailwind** running on `localhost` (open in browser)
  - can be wrapped as a real desktop window later with Tauri/Electron
- **SQLite** via Drizzle ORM (`data/app.db`)
- **Claude API** (`@anthropic-ai/sdk`) for roadmap generation + adaptation,
  using structured JSON output so phases/tasks save straight to the DB
- API key kept in `.env.local` (never committed)

## Folder structure
```
src/
  app/
    page.tsx              # Today screen
    goals/new/page.tsx    # New goal + roadmap preview
    roadmap/page.tsx      # Roadmap view/edit
    progress/page.tsx     # Streak + heatmap
    settings/page.tsx
    api/
      generate-roadmap/route.ts
      adapt-plan/route.ts
  db/
    schema.ts             # Drizzle tables
    index.ts              # SQLite connection, runs migrations on startup
    seed.ts               # sample "Become a clipper" quest line
  lib/
    scheduler.ts          # picks today's tasks, rollover, unlock logic
    progress.ts           # streak / % calculations
    ai.ts                 # Claude prompts + response parsing
  components/             # TaskCard, Checklist, PhaseList, Heatmap...
drizzle/                  # generated SQL migrations (committed)
data/app.db               # local database (gitignored)
```

## Design direction — gamified pixel UI
Reference: "Blockcraft"-style retro pixel look.
- Pixel display font for headings, monospace for body text
- Chunky, saturated buttons with thick borders and hard (non-blurred) offset shadows
- Dark panels + one cream/light hero area; bright category colors (green, blue, yellow, purple, red)
- Big stat numbers in a stats bar (XP, streak, level, tasks done)
- Game language: goal = quest line, phase = world/level, task = quest, completion = XP

## Libraries (from pick-ui-library)
| Need | Library |
|---|---|
| Check-off pop, unlock reveal, level-up animation | motion |
| XP / streak / stat counters ticking up | NumberFlow (`@number-flow/react`) |
| "+50 XP", "Level up" popups | Sonner |
| Dialogs, menus, tooltips (accessible primitives) | base-ui |
| Shared app state (XP, level, today's tasks) | zustand |
| Pixel button/card variants (red/cyan/yellow…) | cva + clsx |
| Reordering roadmap tasks | dnd kit |
| Progress page charts | recharts |
| Pixel fonts + pixel icons *(not on curated list)* | Google Fonts pixel font + pixelarticons |

## Milestones
- **v1 (MVP):** one goal, AI roadmap + edit, Today checklist, unlock next, streak
- **v2:** adaptive replanning from feedback, desktop reminders, multiple goals
- **v3:** stats dashboard, proof links, weekly review, desktop app wrapper
