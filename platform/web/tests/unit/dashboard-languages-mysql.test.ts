import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";

/**
 * 56 The dashboard's language on MySQL or MariaDB (`users.language`,
 * migration 0042): null for a new person, saved and read back by id and
 * email, and changed again. Runs only with YALLAPP_TEST_DATABASE_URL (a
 * database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-20T12:00:00.000Z");

describe.skipIf(!url)("56 the dashboard's language on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  it("is saved on the person and read back", async () => {
    const email = `lang-${randomUUID()}@school.test`;
    const user = await store.createUser({ email, name: "Mona", passwordHash: null, now: NOW });
    expect((await store.getUserById(user.id))?.language ?? null).toBeNull();
    await store.updateUser(user.id, { language: "ar" }, NOW);
    expect((await store.getUserById(user.id))?.language).toBe("ar");
    expect((await store.getUserByEmail(email))?.language).toBe("ar");
    await store.updateUser(user.id, { language: "tr" }, NOW);
    expect((await store.getUserById(user.id))?.language).toBe("tr");
  });
});
