import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/**
 * 231 Yallapp Community's contract (docs/api/community.yaml): it parses,
 * every $ref resolves, every path is under one of the areas' groups, and
 * the app's paths sell nothing (no price, no checkout, no payment).
 */
const contract = parse(readFileSync(new URL("../../../../docs/api/community.yaml", import.meta.url), "utf8")) as {
  openapi: string;
  paths: Record<string, Record<string, unknown>>;
  components: Record<string, Record<string, unknown>>;
};

function refs(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) for (const v of node) refs(v, out);
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "$ref" && typeof v === "string") out.push(v);
      else refs(v, out);
    }
  }
  return out;
}

describe("231 the community contract", () => {
  it("is OpenAPI 3.1 and every $ref resolves", () => {
    expect(contract.openapi).toBe("3.1.0");
    const missing = refs(contract).filter((ref) => {
      const [, section, name] = /^#\/components\/(\w+)\/(\w+)$/.exec(ref) ?? [];
      return !section || !contract.components[section]?.[name!];
    });
    expect(missing).toEqual([]);
  });

  it("keeps every path in one of the areas' groups", () => {
    const groups = ["/auth/", "/me", "/members/", "/reports", "/config", "/qa/", "/tutorials", "/search", "/badges/", "/notifications", "/admin/",
      // 232–235
      "/messages/", "/groups", "/pros", "/jobs", "/feed", "/media", "/posts", "/comments/", "/stories", "/showcase", "/academy/", "/leaderboard", "/challenges", "/events"];
    const stray = Object.keys(contract.paths).filter((p) => !groups.some((g) => p.startsWith(g)));
    expect(stray).toEqual([]);
  });

  it("sells nothing: no price, checkout or payment anywhere in it", () => {
    const text = JSON.stringify(contract.paths).toLowerCase();
    for (const word of ["checkout", "\"price", "payment_url", "buy_url", "purchase"]) expect(text, word).not.toContain(word);
  });

  it("233 shows the Academy's courses open or locked, and no field of it sells anything", () => {
    const schemas = contract.components.schemas as Record<string, unknown>;
    const academy = ["CourseSummary", "Course", "Lesson", "CourseProgress", "QuizResult", "Certificate", "CourseInput", "LessonInput", "QuizQuestion", "AdminCourse"];
    for (const name of academy) expect(schemas[name], name).toBeDefined();
    const keys = (node: unknown, out: string[] = []): string[] => {
      if (Array.isArray(node)) for (const v of node) keys(v, out);
      else if (node && typeof node === "object")
        for (const [k, v] of Object.entries(node)) {
          if (k === "properties" && v && typeof v === "object") out.push(...Object.keys(v));
          keys(v, out);
        }
      return out;
    };
    const fields = keys(academy.map((n) => schemas[n]));
    expect(fields.length).toBeGreaterThan(20);
    expect(fields.filter((f) => /price|currency|checkout|payment|purchase|buy|amount/i.test(f))).toEqual([]);
    expect(JSON.stringify(schemas.CourseSummary)).toContain('"enum":["open","locked"]');
    const academyPaths = JSON.stringify(Object.entries(contract.paths).filter(([p]) => p.startsWith("/academy/") || p.startsWith("/admin/academy/")));
    expect(keys(JSON.parse(academyPaths)).filter((f) => /price|currency|checkout|payment|purchase|buy|amount/i.test(f))).toEqual([]);
  });

  it("names nothing in the community's migrations longer than MySQL's 64 characters", () => {
    const dir = new URL("../../drizzle/", import.meta.url);
    const files = readdirSync(dir).filter((f) => /^\d{4}_community.*\.sql$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    const names = files.flatMap((f) => [...readFileSync(new URL(f, dir), "utf8").matchAll(/(?:CONSTRAINT|INDEX|TABLE) `([^`]+)`/g)].map((m) => m[1]!));
    expect(names.filter((n) => n.length > 64)).toEqual([]);
  });
});
