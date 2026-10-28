import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { cardPlanOptions } from "@/lib/billing/card-plans";
import { lowestPlanWith, PLAN_INFO, planFamily, planFitsSection, planOffered, plansOfFamily, plansWith, planSettingOf, hasFeature } from "@/lib/plans";
import { projectSource } from "@/lib/studio/projects";
import { isStudioProject, studioPathFor, studioSourcesFor } from "@/lib/studio/section";

describe("103R.3 Studio's own plans", () => {
  it("keeps the two families apart", () => {
    expect(plansOfFamily("regular")).toEqual(["starter", "growth", "pro", "business"]);
    expect(plansOfFamily("studio")).toEqual(["studio_1", "studio_2", "studio_3", "studio_4", "studio_5", "studio_6", "studio_7", "studio_8"]);
    expect(planFamily("pro")).toBe("regular");
    expect(planFamily("studio_2")).toBe("studio");
    expect(planFitsSection("growth", undefined)).toBe(true);
    expect(planFitsSection("growth", "studio")).toBe(false);
    expect(planFitsSection("studio_1", "studio")).toBe(true);
    expect(planFitsSection("studio_1", "regular")).toBe(false);
  });

  it("offers a Studio plan only when the team turns it on, every regular plan always", () => {
    expect(planOffered(PLAN_INFO.starter)).toBe(true);
    expect(planOffered(PLAN_INFO.studio_1)).toBe(false);
    const plans = plansWith({ studio_1: { ...planSettingOf(PLAN_INFO.studio_1), offered: true, name: "Studio Plus" } });
    expect(plans.studio_1).toMatchObject({ offered: true, name: "Studio Plus" });
    expect(planOffered(plans.studio_1)).toBe(true);
    expect(planOffered(plans.studio_2)).toBe(false);
  });

  it("only Studio plans have Studio's own features, and upgrade hints stay in the family", () => {
    for (const id of plansOfFamily("regular")) expect(hasFeature(PLAN_INFO[id], "studio_motion")).toBe(false);
    const plans = plansWith({
      studio_1: { ...planSettingOf(PLAN_INFO.studio_1), offered: true },
      studio_2: { ...planSettingOf(PLAN_INFO.studio_2), offered: true, features: [...PLAN_INFO.studio_2.features, "studio_motion"] },
    });
    expect(lowestPlanWith(plans, (p) => hasFeature(p, "studio_motion"), "studio_1")?.id).toBe("studio_2");
    // A regular app is never pointed at a Studio plan.
    expect(lowestPlanWith(plans, (p) => hasFeature(p, "studio_motion"), "starter")).toBeNull();
  });
});

describe("103R.3 paying a plan by card", () => {
  it("offers a regular app (and an account before its first app) the regular plans only, a Studio project the Studio plans the team offers", () => {
    const plans = plansWith({
      growth: { ...planSettingOf(PLAN_INFO.growth), priceCents: 150_000, onRequest: false },
      studio_1: { ...planSettingOf(PLAN_INFO.studio_1), offered: true, priceCents: 50_000, onRequest: false },
      studio_2: { ...planSettingOf(PLAN_INFO.studio_2), priceCents: 90_000, onRequest: false },
    });
    expect(cardPlanOptions(plans).map((p) => p.id)).toEqual(["growth"]);
    expect(cardPlanOptions(plans, null, undefined, undefined, "studio").map((p) => p.id)).toEqual(["studio_1"]);
  });
});

describe("103R.3 Studio's own section", () => {
  it("knows a Studio project", () => {
    expect(isStudioProject({ section: "studio" })).toBe(true);
    expect(isStudioProject({ section: "regular" })).toBe(false);
    expect(isStudioProject({})).toBe(false);
    expect(isStudioProject(null)).toBe(false);
  });

  it("opens the dashboard's pages of a Studio project in Studio's frame", () => {
    expect(studioPathFor("/dashboard")).toBe("/studio/project");
    expect(studioPathFor("/ar/dashboard/")).toBe("/studio/project");
    expect(studioPathFor("/dashboard/pages")).toBe("/studio/editor");
    expect(studioPathFor("/dashboard/catalog/products?page=2")).toBe("/studio/project/catalog/products?page=2");
    expect(studioPathFor("/dashboard/setup?step=branding")).toBe("/studio/project/setup?step=branding");
    // The account's own pages stay where they are.
    for (const page of ["app-type", "businesses", "account", "team", "open"]) expect(studioPathFor(`/dashboard/${page}`)).toBeNull();
  });

  it("has every dashboard page of an app in Studio's frame too", () => {
    const root = path.join(process.cwd(), "src/app/dashboard");
    const pages = (readdirSync(root, { recursive: true }) as string[]).filter((f) => f.endsWith("page.tsx")).map((f) => path.dirname(f)).filter((d) => d !== ".");
    // The account's own pages, and the regular page editor (Studio has its own), stay in the dashboard.
    const own = pages.filter((d) => !["app-type", "businesses", "account", "team", "open", "pages"].includes(d.split(path.sep)[0]!));
    expect(own.length).toBeGreaterThan(50);
    expect(own.filter((d) => !existsSync(path.join(process.cwd(), "src/app/studio/project", d, "page.tsx")))).toEqual([]);
  });

  it("offers each kind the content sources its engine takes, content kept in Yallapp first", () => {
    const store = kindById("store")!;
    const sources = studioSourcesFor(store);
    expect(sources[0]).toBe("catalog");
    expect(sources).toEqual(expect.arrayContaining(["wordpress", "shopify", "platform", "custom_api"]));
    expect(sources).not.toContain("setup_requested");
    expect(studioSourcesFor({ id: "delivery", engine: "store" })).toEqual(["catalog"]);
  });

  it("names where a project's content comes from", () => {
    expect(projectSource({ backend: "wordpress", connector: null, websiteDoneAt: new Date() })).toEqual({ key: "wordpress" });
    // A website or API not connected yet.
    expect(projectSource({ backend: "wordpress", connector: null, websiteDoneAt: null })).toEqual({ key: "none" });
    expect(projectSource({ backend: "custom_api", connector: null })).toEqual({ key: "custom_api" });
    expect(projectSource({ backend: "hosted", connector: { kind: "catalog" } })).toEqual({ key: "catalog" });
    expect(projectSource({ backend: "hosted", connector: { kind: "shopify", shopDomain: "x.myshopify.com", storefrontTokenEncrypted: "e" } })).toEqual({ key: "shopify" });
    expect(projectSource({ backend: "hosted", connector: { kind: "platform", platform: "wix", settings: {}, secretsEncrypted: "e" } })).toMatchObject({ key: "platform" });
  });
});
