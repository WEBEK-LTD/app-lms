import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@/lib/data/mysql";
import { mysqlCommunityStore } from "@/lib/community/store/mysql";
import { communityQaSuite } from "./community-qa-suite";

/**
 * 231 The community's Q&A and tutorials on MySQL or MariaDB (migrations
 * 0155 and 0156): the same suite as in memory. Runs only with
 * YALLAPP_TEST_DATABASE_URL (a database with the migrations applied); each
 * test starts from empty community tables and the suite's members.
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const TABLES = ["community_point_events", "community_section_follows", "community_bookmarks", "community_replies", "community_votes", "community_question_tags", "community_answers", "community_questions", "community_tutorials", "community_tags", "community_sections"];
const MEMBERS = ["karim", "nour", "omar", "team-1"];

describe.skipIf(!url)("231 the community's Q&A on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  afterAll(async () => {
    await pool.end();
  });
  communityQaSuite(async () => {
    for (const t of TABLES) await pool.query(`DELETE FROM \`${t}\``);
    await pool.query(`DELETE FROM community_members WHERE id IN (${MEMBERS.map(() => "?").join(",")})`, MEMBERS);
    const now = new Date();
    for (const id of MEMBERS)
      await pool.query("INSERT INTO community_members (id, display_name, username, bio, skills, links, language, created_at, updated_at, last_active_at) VALUES (?, ?, ?, '', '[]', '[]', 'en', ?, ?, ?)", [id, id, `u_${id.replace(/-/g, "_")}`, now, now, now]);
    // As the API builds it (lib/community/store/mysql.ts), on drizzle with the community schema.
    return mysqlCommunityStore(pool).qa;
  });
});

describe.skipIf(!url)("235 each community's Q&A on MySQL is its own", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  afterAll(async () => {
    await pool.end();
  });
  it("keeps sections, tags, questions and tutorials to their tenant", async () => {
    const { MysqlQaStore } = await import("@/lib/community/qa/mysql");
    for (const t of TABLES) await pool.query(`DELETE FROM \`${t}\``);
    await pool.query("DELETE FROM community_members WHERE id = 'tenant-karim'");
    const now = new Date();
    await pool.query("INSERT INTO community_members (id, display_name, username, bio, skills, links, language, created_at, updated_at, last_active_at) VALUES ('tenant-karim', 'k', 'u_tenant_karim', '', '[]', '[]', 'en', ?, ?, ?)", [now, now, now]);
    const yallapp = new MysqlQaStore(pool, "yallapp");
    const other = new MysqlQaStore(pool, "app-1");
    await yallapp.upsertSection({ id: "s-y", kind: "qa", slug: "studio", names: { en: "Studio", ar: "Studio", tr: "Studio" }, icon: "brush", position: 1 });
    await other.upsertSection({ id: "s-o", kind: "qa", slug: "studio", names: { en: "Studio", ar: "Studio", tr: "Studio" }, icon: "brush", position: 1 });
    expect((await yallapp.listSections("qa")).map((s) => s.id)).toEqual(["s-y"]);
    expect((await other.listSections("qa")).map((s) => s.id)).toEqual(["s-o"]);
    const tag = await yallapp.ensureTag("payments", "Payments", now);
    expect((await other.ensureTag("payments", "Payments", now)).id).not.toBe(tag.id);
    const q = await yallapp.createQuestion({ id: "q-tenant", authorId: "tenant-karim", sectionId: "s-y", slug: "how-to", title: "How to start", body: "A question body here.", language: "en", tagIds: [tag.id], status: "published", acceptedAnswerId: null, answerCount: 0, voteScore: 0, viewCount: 0, createdAt: now, updatedAt: now, lastActivityAt: now } as never);
    expect(await yallapp.getQuestion(q.id)).not.toBeNull();
    expect(await other.getQuestion(q.id)).toBeNull();
    expect(await other.getQuestionBySlug("how-to")).toBeNull();
    expect(await other.countQuestions({ statuses: ["published"] })).toBe(0);
  });
});
