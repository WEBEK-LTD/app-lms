// Applies the SQL migrations in ./drizzle to the MySQL database in DATABASE_URL.
//
//   node --env-file=.env.production.local scripts/migrate.mjs
//   (or: DATABASE_URL=... DATABASE_SSL=required npm run db:migrate)
//
// Uses one TLS connection, like the app. Safe to run again: applied
// migrations are recorded in the __drizzle_migrations table, the same way
// drizzle's migrator records them.
//
// MySQL and MariaDB can't undo schema changes, so a migration that stopped
// halfway leaves some of its tables, columns, keys or indexes behind. This
// script runs each statement on its own and skips a statement whose object
// already exists, so the next run finishes that migration instead of failing
// on it forever.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mysql from "mysql2/promise";

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
  await migrate(connection, path.join(root, "drizzle"));
} finally {
  await connection.end();
}

/** Errors that mean the statement's table, column, key or index is already there. */
function alreadyExists(error) {
  switch (error?.errno) {
    case 1050: // Table already exists
    case 1060: // Duplicate column name
    case 1061: // Duplicate key (index) name
    case 1826: // Duplicate foreign key name (MySQL)
      return true;
    case 1005: // Can't create table: errno 121 is a duplicate foreign key name (MariaDB)
      return /errno: 121\b/.test(error.sqlMessage ?? "");
    default:
      return false;
  }
}

/** drizzle's migrator, statement by statement: same table, same hash, same order. */
async function migrate(connection, folder) {
  await connection.query(
    "CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (id serial primary key, hash text not null, created_at bigint)",
  );
  const [rows] = await connection.query("SELECT created_at FROM `__drizzle_migrations` ORDER BY created_at DESC LIMIT 1");
  const last = rows.length ? Number(rows[0].created_at) : null;
  const journal = JSON.parse(readFileSync(path.join(folder, "meta", "_journal.json"), "utf8"));
  let applied = 0;
  for (const entry of journal.entries) {
    if (last !== null && entry.when <= last) continue;
    const query = readFileSync(path.join(folder, `${entry.tag}.sql`), "utf8");
    const statements = query.split("--> statement-breakpoint").map((it) => it.trim()).filter(Boolean);
    let skipped = 0;
    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (error) {
        if (!alreadyExists(error)) {
          console.error(`Migration ${entry.tag} failed on:\n${statement}`);
          throw error;
        }
        skipped++;
        console.warn(`${entry.tag}: already there, skipped: ${statement.split("\n")[0].slice(0, 120)}`);
      }
    }
    const hash = createHash("sha256").update(query).digest("hex");
    await connection.query("INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)", [hash, entry.when]);
    applied++;
    console.log(`${entry.tag} applied${skipped ? ` (${skipped} of ${statements.length} statements were already there)` : ""}.`);
  }
  console.log(applied ? `Migrations applied: ${applied}.` : "The database is up to date.");
}

