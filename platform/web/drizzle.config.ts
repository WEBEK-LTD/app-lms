import { defineConfig } from "drizzle-kit";

/**
 * `npm run db:generate` writes SQL migrations to ./drizzle from the schema.
 * It needs no database. `npm run db:migrate` applies them (scripts/migrate.mjs).
 */
export default defineConfig({
  dialect: "mysql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
});
