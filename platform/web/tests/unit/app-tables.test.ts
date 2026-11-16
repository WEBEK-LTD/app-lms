import { getTableName, is } from "drizzle-orm";
import { getTableConfig, MySqlTable } from "drizzle-orm/mysql-core";
import { describe, expect, it } from "vitest";
import { APP_TABLES } from "@/lib/apps/app-tables";
import { COPIERS, tablesWithoutCopier } from "@/lib/apps/copy";
import * as schema from "@/lib/db/schema";

/**
 * 132.112–132.114 Every table has its place for copying and moving an app:
 * a table added to the schema without one fails here, and so does a
 * content table without a copier (lib/apps/copy.ts).
 */
const tables = (Object.values(schema) as unknown[]).filter((value): value is MySqlTable => is(value, MySqlTable));

describe("132 the tables of an app, for copies and moves", () => {
  it("places every table of the schema", () => {
    const names: string[] = tables.map((t) => getTableName(t)).sort();
    expect(names.filter((name) => !(name in APP_TABLES))).toEqual([]);
    expect(Object.keys(APP_TABLES).filter((name) => !names.includes(name))).toEqual([]);
  });

  it("has a copier for every content table, and copies nothing else", () => {
    expect(tablesWithoutCopier()).toEqual([]);
    const copied = COPIERS.flatMap((c) => c.tables);
    expect(copied.filter((table) => APP_TABLES[table] !== "content")).toEqual([]);
    expect(new Set(copied).size).toBe(copied.length);
  });

  it("keeps the app's own rows apart from the accounts' (every content table names its app)", () => {
    for (const table of tables) {
      const role = APP_TABLES[getTableName(table)];
      const columns = getTableConfig(table).columns.map((c) => c.name);
      if (role === "content") expect(columns, getTableName(table)).toContain("app_id");
    }
  });
});
