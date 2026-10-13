# Questline — Plan

Turn any big goal the user types in (run a marathon, learn Spanish, become a
clipper...) into a map of worlds, then get fresh AI-planned quests every day
that fit that day's circumstances.

## Progress
- [x] **Step 1 — Project setup:** Next.js + Tailwind, libraries, pixel fonts, palette
- [x] **Step 2 — Pixel components:** PixelButton, PixelCard, StatTile, XPBar, `/kit` showcase
- [x] **Step 3 — Database:** SQLite tables (goals, worlds, daily quests, check-ins), XP/level/streak rules, test seed data
- [x] **Step 4 — Today screen:** daily check-in form + today's quest checklist that saves, earns XP, updates streak
- [x] **Step 5 — App shell + Roadmap screen:** sidebar nav + player card, worlds map with quest logs, edit / add / reorder / delete / clear worlds
- [x] **Step 6 — AI planning:** new-goal intake → Claude writes the worlds; each day's check-in → Claude writes that day's quests (via Claude Code headless, on the user's subscription)
- [x] **Step 7 — Progress page:** stat tiles, 16-week streak calendar, XP-over-time chart with level lines, daily log table
- [ ] **Step 8 — Public release:** bring-your-own-AI providers in Settings, manual planning for no-AI users, setup guide in README

## Decisions
- **Platform:** desktop only (runs locally on this PC)
- **Goals:** anything the user defines; nothing in the app is specific to one kind of goal
- **Planning:** Claude writes the worlds once per goal, then plans quests fresh each day from that day's check-in + history (no quests pre-written for future days)
- **Storage:** local-first SQLite file, no account/login
- **AI access:** no paid API. The server runs the installed Claude Code CLI in headless mode (`claude -p ... --output-format json --json-schema ...`), which uses the user's Claude subscription. Personal use on this PC only; all AI calls go through `src/lib/ai.ts` so it can later swap to the Claude API or a local model (Ollama).

## Core loop
1. Create a goal → answer intake questions (current level, minutes/day, deadline, tools).
2. Claude writes the **worlds**: ordered milestones, each with a "done when..." line. This is the roadmap.
3. Each day starts with a **check-in**: minutes available today, energy, anything going on.
4. Claude reads the check-in + current world + recent quests/feedback and writes **today's quests** to fit.
5. Check quests off → XP, level, streak. Leftover quests count as missed; the AI sees them when planning tomorrow.
6. When the current world's "done when..." is met (often via a boss quest), the next world becomes current.
7. Feedback ("too easy / too hard") shapes the next day's plan.

## Data model
| Table | Key fields |
|---|---|
| `goals` | id, title, description, daily_minutes, target_date, status (active/completed/archived), created_at |
| `phases` (worlds) | id, goal_id, position, title, done_criteria, status (upcoming/current/done), completed_on |
| `quests` | id, phase_id, date, position, title, instructions, est_minutes, type (learn/practice/create/boss), status (todo/done/skipped), completed_on, feedback (too_easy/just_right/too_hard) |
| `checkins` | id, goal_id, date (one per goal per day), minutes_available, energy (low/ok/high), note |

Dates are local `YYYY-MM-DD` text. A `todo` quest from an earlier date counts as missed.
XP, level and streak are computed from `quests` in `src/lib/progress.ts`, not stored:
- quest XP = est_minutes + type bonus (learn 10, practice 15, create 20, boss 40)
- level 1→2 costs 100 XP, each next level costs 50 more
- streak = days in a row with ≥1 finished quest (today counts once done)

DB commands: `npm run db:generate` (after editing schema.ts), `npm run db:seed [-- --reset]`, `npm run db:studio`.

## Screens
1. **New Goal** — intake form → preview/edit the AI's worlds → start
2. **Today** — check-in, then the day's quest checklist (home screen)
3. **Roadmap** — worlds (done / current / upcoming) with past quests under each; edit worlds
4. **Progress** — streak, heatmap, stats
5. **Settings** — goal settings, daily minutes

## Tech stack
- **Next.js + TypeScript + Tailwind** running on `localhost` (open in browser)
  - can be wrapped as a real desktop window later with Tauri/Electron
- **SQLite** via Drizzle ORM (`data/app.db`)
- **Claude Code CLI (headless)** for planning worlds and daily quests, using the
  user's subscription (no API key); `--json-schema` gives structured JSON output
  so worlds and quests save straight to the DB

## Folder structure
```
src/
  app/
    layout.tsx            # fonts, pop-up toasts (wraps everything)
    actions.ts            # Server Actions: save check-in, tick/skip quests
    kit/                  # component showcase (no sidebar)
    (app)/                # route group: every real screen, shares the sidebar
      layout.tsx          # sidebar + page area
      page.tsx            # Today screen  (/)
      roadmap/page.tsx    # Roadmap screen (/roadmap)
      roadmap/actions.ts  # Server Actions: edit / add / move / delete / clear worlds
      goals/new/page.tsx  # New goal + AI worlds preview (step 6)
      progress/page.tsx   # Progress screen (/progress)
      settings/page.tsx   # (step 8)
  db/
    schema.ts             # Drizzle tables
    index.ts              # SQLite connection, runs migrations on startup
    seed.ts               # test data: one goal, a few days of quests
  lib/
    progress.ts           # XP / level / streak rules (pure math)
    today.ts              # reads everything the Today screen shows
    roadmap.ts            # reads worlds + quest logs for the Roadmap
    history.ts            # stats, calendar weeks and XP line for Progress
    ai.ts                 # runs `claude -p`, prompts + JSON schemas (only file that knows how AI is called)
  components/
    ui/                   # PixelButton, PixelCard, StatTile, XPBar
    today/                # CheckinPanel, QuestCard, quest type styles
    roadmap/              # WorldCard, WorldForm, AddWorld, QuestLog
    progress/             # ActivityCalendar, XpChart
    shell/                # Sidebar, NavLinks
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
| Reordering worlds / today's quests | ↑/↓ buttons for now (keyboard-friendly); dnd kit later if needed |
| Progress page charts | recharts |
| Pixel fonts + pixel icons *(not on curated list)* | Google Fonts pixel font + pixelarticons |

## Milestones
- **v1 (MVP):** one goal, AI worlds + daily AI quests from check-in, Today checklist, streak
- **v2:** smarter replanning from feedback, desktop reminders, multiple goals
- **v3:** stats dashboard, proof links, weekly review, desktop app wrapper

## Public release — bring your own AI
When the repo goes public, nobody uses the owner's login or usage. Each person
clones the repo and runs Questline on their own PC with their own database and
their own AI access, chosen in **Settings**:

| Provider | For | Cost to them |
|---|---|---|
| Claude Code login | already have a Claude subscription + Claude Code installed | included in their plan |
| Anthropic API key | no subscription | pay per use (~$1–2/month) |
| Ollama (local model) | free and offline; needs a decent PC | free |
| None | anyone | free; plan worlds/quests by hand in Roadmap |

Rules:
- `src/lib/ai.ts` picks the provider; every provider returns the same JSON shape.
- An API key is saved only on that person's PC (`.env.local` or the local DB), never in the repo.
- README presents the API key and Ollama as the main supported options; Claude Code login is "if you already use it" (Anthropic recommends API keys for apps).
- Never host Questline as a public website with the owner's key or login: strangers' usage would be billed to the owner.
- Before publishing: re-scan full git history for secrets, and consider switching the commit email to GitHub's noreply address.
