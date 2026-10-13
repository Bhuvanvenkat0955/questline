# Questline

Turn any big goal into a game. Type a goal (run a marathon, learn Spanish,
pass your driving test...) and Questline splits it into **worlds**, big
milestones you clear one by one. Each morning you check in with how much time
and energy you have, and it plans small **daily quests** that fit. Finish
quests to earn XP, level up and keep your streak going.

Retro pixel-art look. Runs on your own computer. No account, no cloud: your
goals and progress stay in one file on your PC.

## Try it

You need [Node.js](https://nodejs.org) 22 or newer and [Git](https://git-scm.com).

```bash
git clone https://github.com/Bhuvanvenkat0955/questline.git
cd questline
npm install
npm run dev
```

Open <http://localhost:3000>, then:

1. Go to **Settings** and choose how Questline plans (see below).
2. Go to **New goal**, describe your goal and where you're starting from.
3. Look over your worlds on the **Roadmap**. Rename, reorder or add any.
4. On **Today**, do the morning check-in. Your quests appear. Tick them off!

Want to look around first? `npm run db:seed` loads a sample goal with a few
days of history.

## Choose how Questline plans

Questline doesn't come with an AI account. You connect your own in
**Settings**, so you only ever use (and pay for) your own. Use **Test
connection** there to check it works.

### Option 1: Claude API key (recommended for most people)

Pay per use, roughly $1–2 a month for daily planning.

1. Create a key at [console.anthropic.com](https://console.anthropic.com).
2. In **Settings**, pick **Claude API key** and paste it.

The key is saved only in your local database (`data/app.db`), which is never
committed. You can also put it in a `.env.local` file as `ANTHROPIC_API_KEY=...`.

### Option 2: Ollama (free, runs offline)

A model running on your own computer. Nothing leaves your PC. Plans are
simpler than Claude's, and you need a reasonable graphics card (8 GB of video
memory is enough for an 8B model).

1. Install [Ollama](https://ollama.com).
2. Download a model once: `ollama pull qwen3:8b`
3. In **Settings**, pick **Ollama**. The default address `http://localhost:11434` is usually right.

### Option 3: Claude Code (if you already use it)

If you have a Claude subscription and [Claude Code](https://claude.com/claude-code)
installed, Questline can plan through it on your own plan.

1. Make sure you're logged in: `claude auth login`
2. In **Settings**, pick **Claude Code**.

### Option 4: No AI

Plan by hand: add worlds on the **Roadmap** and add your own quests on
**Today**. Everything else (XP, levels, streaks, progress) works the same.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app at localhost:3000 |
| `npm run db:seed` | Add a sample goal (`-- --reset` wipes your data first) |
| `npm run db:studio` | Browse your database in the browser |
| `npm run db:generate` | Create a migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | Apply new migrations to your database (also happens on app start) |

## Troubleshooting

- **"npm.ps1 cannot be loaded because running scripts is disabled" (Windows PowerShell):**
  use `npm.cmd` instead of `npm` (e.g. `npm.cmd run dev`), or allow local
  scripts with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- **"Claude Code isn't logged in":** run `claude auth login`, then try again.
- **"Couldn't reach Ollama":** start the Ollama app, or check the address in Settings.
- **Planning failed after check-in:** your check-in is still saved. Press
  **Plan today's quests** on Today to try again.
- **"no such column" after updating:** run `npm run db:migrate`, then restart `npm run dev`.

## Your data and keys

- Everything lives in `data/app.db` on your computer. Delete that file to start over.
- `data/` and `.env*` files are in `.gitignore`, so your progress and keys are
  never committed.
- **Please don't host Questline as a public website** with your API key or
  login in it: anyone who finds it could run up usage on your account. It's
  meant to run on your own computer.

## Built with

Next.js, TypeScript, Tailwind CSS, SQLite + Drizzle ORM, Recharts, and Claude
(or Ollama) for planning. The design and build plan is in [PLAN.md](PLAN.md).
