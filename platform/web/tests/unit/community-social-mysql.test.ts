import { afterAll, describe } from "vitest";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "@/lib/data/mysql";
import { MysqlSocialStore } from "@/lib/community/social/mysql";
import { communitySocialSuite, MEMBERS, NOW } from "./community-social-suite";

/**
 * 232 The same suite on MySQL or MariaDB (migration 0169), with
 * YALLAPP_TEST_DATABASE_URL (a database with the migrations applied): each
 * test starts from empty tables and the suite's members.
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const TABLES = ["community_story_views", "community_stories", "community_reactions", "community_post_comments", "community_posts", "community_showcase", "community_media"];

describe.skipIf(!url)("232 community social on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  afterAll(async () => {
    await pool.end();
  });
  communitySocialSuite(async () => {
    for (const t of TABLES) await pool.query(`DELETE FROM \`${t}\``);
    await pool.query(`DELETE FROM community_members WHERE id IN (${MEMBERS.map(() => "?").join(",")})`, MEMBERS);
    for (const id of MEMBERS)
      await pool.query("INSERT INTO community_members (id, display_name, username, bio, skills, links, language, created_at, updated_at, last_active_at) VALUES (?, ?, ?, '', '[]', '[]', 'en', ?, ?, ?)", [id, id, `s_${id.replace(/-/g, "_")}`, NOW, NOW, NOW]);
    return new MysqlSocialStore(drizzle(pool));
  });
});
