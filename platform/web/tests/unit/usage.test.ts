import { describe, expect, it } from "vitest";
import { planUsage, usageLevel } from "@/lib/billing/usage";
import { PLAN_INFO } from "@/lib/plans";

/** 94.1 What an app uses of its plan. */
describe("94.1 the plan's limits and what the app uses", () => {
  it("counts app users only on the hosted API, with languages and storage against the plan", () => {
    const storage = { usedBytes: 1.5 * 1024 ** 3, limitBytes: 2 * 1024 ** 3 };
    expect(planUsage({ plan: PLAN_INFO.starter, hosted: true, appUsers: 950, languages: 1, storage })).toEqual([
      { key: "app_users", used: 950, limit: 1000 },
      { key: "languages", used: 1, limit: 1 },
      { key: "storage", used: storage.usedBytes, limit: storage.limitBytes },
    ]);
    expect(planUsage({ plan: PLAN_INFO.business, hosted: false, appUsers: 0, languages: 4, storage: { usedBytes: 0, limitBytes: null } }).map((r) => r.key)).toEqual(["languages", "storage"]);
    expect(planUsage({ plan: null, hosted: false, appUsers: 0, languages: 2, storage: { usedBytes: 0, limitBytes: 0 } })).toEqual([]);
  });

  it("says when a limit is nearly or fully used", () => {
    expect(usageLevel({ key: "app_users", used: 790, limit: 1000 })).toBe("ok");
    expect(usageLevel({ key: "app_users", used: 800, limit: 1000 })).toBe("near");
    expect(usageLevel({ key: "languages", used: 1, limit: 1 })).toBe("full");
    expect(usageLevel({ key: "storage", used: 5, limit: null })).toBe("ok");
  });
});
