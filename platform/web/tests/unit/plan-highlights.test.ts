import { describe, expect, it } from "vitest";
import { HIGHLIGHT_LIMITS, planHighlights } from "@/lib/plan-highlights";
import { PLAN_INFO, type PlanFeature } from "@/lib/plans";

/** A Studio plan's "What's included" written from its numbers when the team leaves it empty. */
describe("planHighlights", () => {
  const studio = PLAN_INFO.studio_1;
  const plan = (features: PlanFeature[], limits: Partial<typeof studio.limits> = {}) => ({ features: [...studio.features, ...features], limits: { ...studio.limits, ...limits } });

  it("names the pages, storage, users, languages, project types and support", () => {
    expect(planHighlights("en", plan(["delivery", "food", "rides"], { studioPages: 5, storageGb: 30, appUsers: 2000, languages: 2 }))).toEqual([
      "Up to 5 pages per project",
      "30 GB of media storage",
      "Up to 2,000 app users",
      "2 app languages",
      "Projects: delivery, food delivery and rides",
      "An Android app",
      "Email support",
    ]);
  });

  it("says unlimited when there's no limit, and adds what the plan has", () => {
    const lines = planHighlights("en", plan(["ios", "auto_publish", "courier_app", "studio_motion"], { studioPages: null, storageGb: null, appUsers: null, languages: null, support: "priority", accountManager: true }));
    expect(lines).toEqual([
      "Unlimited pages per project",
      "Unlimited media storage",
      "Unlimited app users",
      "Every app language",
      "Android and iOS apps",
      "A second app for couriers",
      "We publish to the stores for you",
      "Motion in the editor",
      "Priority support",
      "Your own account manager",
    ]);
  });

  it("writes Arabic and Turkish too, with Arabic counts", () => {
    const numbers = plan(["school"], { studioPages: 5, storageGb: 20, appUsers: 500, languages: 12 });
    expect(planHighlights("ar", numbers).slice(0, 5)).toEqual(["حتى 5 صفحات لكل مشروع", "20 جيجابايت لمساحة الوسائط", "حتى 500 مستخدم للتطبيق", "12 لغة للتطبيق", "المشاريع: المدارس"]);
    expect(planHighlights("tr", numbers)[0]).toBe("Proje başına 5 sayfaya kadar");
  });

  it("keeps to 10 lines of 80 characters, splitting the project types when they don't fit", () => {
    const every: PlanFeature[] = ["ios", "auto_publish", "delivery", "courier_app", "food", "rides", "instructors", "school", "studio_motion", "studio_templates"];
    for (const lang of ["en", "ar", "tr"] as const) {
      const lines = planHighlights(lang, plan(every, { accountManager: true }));
      expect(lines.length).toBeLessThanOrEqual(HIGHLIGHT_LIMITS.lines);
      for (const line of lines) expect(line.length).toBeLessThanOrEqual(HIGHLIGHT_LIMITS.length);
    }
    expect(planHighlights("en", plan(every)).filter((l) => l.startsWith("Projects: ")).join(" ")).toContain("schools");
  });
});
