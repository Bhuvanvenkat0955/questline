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

const DB_FILE = path.join(process.cwd(), "data", "app.db");
const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

function openDatabase() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

  const sqlite = new Database(DB_FILE);
  // WAL lets the app read while a write is happening; foreign keys make
  // deleting a goal also delete its phases, quests and check-ins.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle({ client: sqlite, schema, casing: "snake_case" });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

// `next dev` re-runs this file every time you save a change. Keeping the
// connection on globalThis stops each reload from opening another one.
const globalForDb = globalThis as unknown as { questlineDb?: ReturnType<typeof openDatabase> };

export const db = globalForDb.questlineDb ?? openDatabase();

if (process.env.NODE_ENV !== "production") globalForDb.questlineDb = db;
