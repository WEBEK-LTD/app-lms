// Applies the SQL migrations in ./drizzle to the MySQL database in DATABASE_URL.
//
//   node --env-file=.env.production.local scripts/migrate.mjs
//   (or: DATABASE_URL=... DATABASE_SSL=required npm run db:migrate)
//
// Uses one TLS connection, like the app. Safe to run again: applied
// migrations are recorded in the __drizzle_migrations table.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sslMode = (process.env.DATABASE_SSL ?? "required").toLowerCase();
if (sslMode !== "required" && sslMode !== "disabled") {
  console.error('DATABASE_SSL must be "required" or "disabled".');
  process.exit(1);
}
// DATABASE_CA: a PEM certificate, or the name of a server in src/lib/db/known-cas.json.
const caSetting = process.env.DATABASE_CA?.trim();
const knownCas = JSON.parse(readFileSync(new URL("../src/lib/db/known-cas.json", import.meta.url), "utf8"));
const ca = caSetting ? (caSetting.startsWith("_") ? undefined : knownCas[caSetting]) ?? caSetting.replace(/\\n/g, "\n") : undefined;
if (ca && !ca.includes("-----BEGIN CERTIFICATE-----")) {
  console.error("DATABASE_CA must be a PEM certificate or one of: " + Object.keys(knownCas).filter((k) => !k.startsWith("_")).join(", "));
  process.exit(1);
}

const connection = await mysql.createConnection({
  uri: url,
  timezone: "Z",
  charset: "utf8mb4_unicode_ci",
  connectTimeout: 15_000,
  ssl: sslMode === "required" ? { rejectUnauthorized: true, minVersion: "TLSv1.2", ...(ca ? { ca } : {}) } : undefined,
});

try {
  // New tables inherit the database default: make sure it's utf8mb4 (names in any language, emoji).
  await connection.query("ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  await migrate(drizzle({ client: connection }), { migrationsFolder: path.join(root, "drizzle") });
  console.log("Migrations applied.");
} finally {
  await connection.end();
}
