import { describe, expect, it, vi } from "vitest";
import { runAppCheck } from "@/lib/studio/app-check";
import { TEMPLATES } from "@/lib/studio/sections";
import { CHECK_NOW, checkDeps, checkProject } from "./support/app-check-project";

/**
 * 182 No false blocks: every Studio template, made fresh the way an owner
 * gets it (makeStudioProject in English with Arabic and Turkish on, then
 * published) and checked in en, ar and tr, has no error, so an owner who
 * publishes a template as it is is never stopped. A template that fails here
 * is fixed in the template (roadmap 166, 176–180), never by loosening a rule.
 */

vi.useFakeTimers({ toFake: ["Date"], now: CHECK_NOW });
vi.spyOn(console, "error").mockImplementation(() => undefined);

describe("182 every template, as an owner gets it, passes the app check", () => {
  it("has them all", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(60);
  });

  it.each(TEMPLATES.map((t) => [t.id] as const))("%s has no error in en, ar or tr", async (id) => {
    const p = await checkProject(id);
    const report = await runAppCheck(checkDeps(p), { app: p.app, layout: p.draft }, CHECK_NOW);
    expect(report.langs).toEqual(["en", "ar", "tr"]);
    const errors = report.problems.filter((x) => x.severity === "error").map((x) => `${x.rule} ${x.lang ?? ""} ${x.path} ${JSON.stringify(x.values)}`);
    expect(errors.join("\n")).toBe("");
  }, 60_000);
});
