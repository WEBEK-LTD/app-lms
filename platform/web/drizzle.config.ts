import { defineConfig } from "drizzle-kit";

/**
 * `npm run db:generate` writes SQL migrations to ./drizzle from the schema.
 * It needs no database. `npm run db:migrate` applies them (scripts/migrate.mjs).
 */
export default defineConfig({
  dialect: "mysql",
  // 231 Yallapp Community keeps its tables in their own file.
  schema: ["./src/lib/db/schema.ts", "./src/lib/db/community-schema.ts", "./src/lib/db/community-engage-schema.ts"],
  out: "./drizzle",
  strict: true,
  verbose: true,
});
