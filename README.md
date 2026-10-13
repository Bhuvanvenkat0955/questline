# Questline

Turn any big goal into a game. Type a goal (run a marathon, learn Spanish,
become a clipper...) and Questline splits it into **worlds** — big milestones —
then plans fresh **daily quests** each morning that fit how much time and energy
you have that day. Finish quests to earn XP, level up and keep your streak.

Retro pixel-art look, runs locally on your own computer, no account needed.

> **Status: in development.** The database and pixel UI are built. The Today
> screen, roadmap, AI planning and Settings are still being made — see the
> Progress list in [PLAN.md](PLAN.md). Steps below marked *(coming soon)* don't
> work yet.

## Try it on your computer

You need [Node.js](https://nodejs.org) 22 or newer and [Git](https://git-scm.com).

```bash
git clone https://github.com/Bhuvanvenkat0955/questline.git
cd questline
npm install
npm run db:seed
npm run dev
```

Then open <http://localhost:3000>.

`npm run db:seed` fills your database with a sample goal and a few days of
quests so there's something to look at. Your data is saved in `data/app.db` on
your own computer and is never uploaded anywhere.

| Command | What it does |
|---|---|
| `npm run dev` | Start the app at localhost:3000 |
| `npm run db:seed` | Add the sample goal (`-- --reset` wipes your data first) |
| `npm run db:studio` | Browse your database in the browser |
| `npm run db:generate` | Create a migration after changing `src/db/schema.ts` |

## AI planning: bring your own AI *(coming soon)*

Questline uses an AI to write your worlds and each day's quests. It doesn't come
with an AI account — you connect your own in **Settings**, so you only ever pay
for (or use) your own:

| Option | Good for | Cost |
|---|---|---|
| **Anthropic API key** | most people | pay per use, roughly $1–2 a month |
| **Ollama** (a model running on your PC) | free and offline; needs a decent graphics card | free |
| **Claude Code** | if you already have a Claude subscription and Claude Code installed | included in your plan |
| **No AI** | anyone | free — write your own worlds and quests |

Your API key is stored only on your computer. Never put it in the code or
commit it.

## Please don't host it publicly

Questline is meant to run on your own computer. Don't deploy it as a public
website with your API key or login in it: anyone who finds it could run up
usage on your account.

## Built with

Next.js, TypeScript, Tailwind CSS, SQLite + Drizzle ORM, and Claude for planning.
The full design and build plan is in [PLAN.md](PLAN.md).
