import { afterAll, describe } from "vitest";
import { createPool } from "@/lib/data/mysql";
import { MysqlQaStore } from "@/lib/community/qa/mysql";
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
    return new MysqlQaStore(pool);
  });
});
