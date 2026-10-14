// Opens the local SQLite database and hands out a ready-to-use `db` object.
// Import it from server code only (server components, server actions, scripts):
// the browser can't open files on your disk.
//
// On first use it creates data/app.db and runs any SQL migrations in drizzle/
// that haven't been applied yet, so the tables always match schema.ts.

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

// The desktop app passes its own folders (your Windows user data folder and
// the installed migrations); `npm run dev` uses the project folder.
const DB_FILE = path.join(process.env.QUESTLINE_DATA_DIR || path.join(process.cwd(), "data"), "app.db");
const MIGRATIONS_DIR = process.env.QUESTLINE_MIGRATIONS_DIR || path.join(process.cwd(), "drizzle");

function openConnection() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

  const sqlite = new Database(DB_FILE);
  // WAL lets the app read while a write is happening; foreign keys make
  // deleting a goal also delete its phases, quests and check-ins.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

// `next dev` re-runs this file every time you save a change. Keeping the raw
// connection on globalThis stops each reload from opening another one.
// The Drizzle wrapper below is rebuilt on every reload instead, so it always
// knows the latest schema.ts (a kept wrapper would remember old columns).
const globalForDb = globalThis as unknown as { questlineSqlite?: Database.Database };
const sqlite = globalForDb.questlineSqlite ?? openConnection();
if (process.env.NODE_ENV !== "production") globalForDb.questlineSqlite = sqlite;

export const db = drizzle({ client: sqlite, schema, casing: "snake_case" });

// Applies any new migrations. Already-applied ones are skipped, so this is cheap.
migrate(db, { migrationsFolder: MIGRATIONS_DIR });
