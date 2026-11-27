import { afterAll, describe } from "vitest";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "@/lib/data/mysql";
import { MysqlAcademyStore } from "@/lib/community/academy/mysql";
import { communityAcademySuite, MEMBERS, NOW } from "./community-academy-suite";

/** 233 The same suite on MySQL or MariaDB (migration 0170), with YALLAPP_TEST_DATABASE_URL. */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const TABLES = ["community_certificates", "community_lesson_progress", "community_course_access", "community_quiz_questions", "community_lessons", "community_courses"];

describe.skipIf(!url)("233 community academy on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  afterAll(async () => {
    await pool.end();
  });
  communityAcademySuite(async () => {
    for (const t of TABLES) await pool.query(`DELETE FROM \`${t}\``);
    await pool.query(`DELETE FROM community_members WHERE id IN (${MEMBERS.map(() => "?").join(",")})`, MEMBERS);
    for (const id of MEMBERS)
      await pool.query("INSERT INTO community_members (id, display_name, username, bio, skills, links, language, created_at, updated_at, last_active_at) VALUES (?, ?, ?, '', '[]', '[]', 'en', ?, ?, ?)", [id, id, `a_${id}`, NOW, NOW, NOW]);
    return new MysqlAcademyStore(drizzle(pool));
  });
});
