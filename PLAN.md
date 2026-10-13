# Goal Tracker — Plan

Turn a big goal (e.g. "become a clipper") into a roadmap of small daily tasks,
check them off each day, and unlock the next ones as you progress.

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
| `goals` | id, title, description, daily_minutes, target_date, status, created_at |
| `phases` | id, goal_id, order, title, done_criteria |
| `tasks` | id, phase_id, order, title, instructions, est_minutes, type (learn/practice/build/publish), status (locked/today/done/skipped), scheduled_date, completed_at, feedback |
| `checkins` | id, goal_id, date, note, proof_link, mood/difficulty |

Streaks and progress % are computed from `tasks` + `checkins`, not stored.

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
    index.ts              # SQLite connection
  lib/
    scheduler.ts          # picks today's tasks, rollover, unlock logic
    progress.ts           # streak / % calculations
    ai.ts                 # Claude prompts + response parsing
  components/             # TaskCard, Checklist, PhaseList, Heatmap...
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
