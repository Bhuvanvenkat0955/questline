// Settings for the drizzle-kit command line tool (`npm run db:generate`).
// It compares src/db/schema.ts with the existing migrations and writes the SQL
// needed to bring the database up to date into the drizzle/ folder.

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // goalId in TypeScript becomes goal_id in SQL.
  casing: "snake_case",
  dbCredentials: { url: "./data/app.db" },
});
