import { describe, expect, it } from "vitest";
import { cardPlanOptions } from "@/lib/billing/card-plans";
import type { SwitchesSetting } from "@/lib/data/types";
import { PLAN_INFO, plansWith } from "@/lib/plans";
import {
  allSwitchKeys,
  appTypeOn,
  cleanSwitches,
  featureOn,
  isOn,
  noWebsiteFor,
  plansWithSwitches,
  switchGroups,
  websiteOf,
  websiteOn,
} from "@/lib/switches";

describe("switches", () => {
  const setting: SwitchesSetting = {
    off: ["website:ikas", "app_type:real_estate", "feature:push"],
    offByPlan: { starter: ["website:shopify", "feature:plan_card_payments"] },
  };

  it("lists every app type, website, platform connector and feature", () => {
    const keys = allSwitchKeys();
    for (const key of [
      "app_type:lms",
      "app_type:store",
      "app_type:booking",
      "app_type:real_estate",
      "website:wordpress",
      "website:custom_api",
      "website:shopify",
      "website:catalog",
      "website:bookings",
      "website:courses",
      "website:listings",
      "website:ikas",
      "website:ticimax",
      "website:ideasoft",
      "website:teachable",
      "website:thinkific",
      "website:simplybook",
      "website:wix",
      "website:salla",
      "website:zid",
      "feature:push",
      "feature:offline_downloads",
      "feature:auto_publish",
      "feature:plan_card_payments",
    ]) {
      expect(keys, key).toContain(key);
    }
    // 72 No marketplace: selling through Yallapp's account can't be switched on.
    expect(keys).not.toContain("feature:marketplace");
    expect(switchGroups().map((g) => g.kind)).toEqual(["app_type", "website", "feature"]);
  });

  it("is on unless switched off for everyone or for the plan", () => {
    expect(isOn(null, "website:ikas")).toBe(true);
    expect(websiteOn(setting, "ikas", "pro")).toBe(false);
    expect(websiteOn(setting, "shopify", "starter")).toBe(false);
    expect(websiteOn(setting, "shopify", "pro")).toBe(true);
    // Without a plan, only the global switches count.
    expect(websiteOn(setting, "shopify", null)).toBe(true);
    expect(appTypeOn(setting, "real_estate")).toBe(false);
    expect(appTypeOn(setting, "store", "starter")).toBe(true);
    expect(featureOn(setting, "push", "pro")).toBe(false);
    expect(featureOn(setting, "plan_card_payments", "starter")).toBe(false);
    expect(featureOn(setting, "plan_card_payments", "pro")).toBe(true);
  });

  it("names the website an app uses now, and the no-website choice per app type", () => {
    expect(websiteOf({ backend: "wordpress", connector: null })).toBe("wordpress");
    expect(websiteOf({ backend: "hosted", connector: { kind: "catalog" } })).toBe("catalog");
    expect(websiteOf({ backend: "hosted", connector: { kind: "platform", platform: "teachable", settings: {}, secretsEncrypted: "" } })).toBe("teachable");
    expect(noWebsiteFor("lms")).toBe("courses");
    expect(noWebsiteFor("booking")).toBe("bookings");
    expect(noWebsiteFor("store")).toBe("catalog");
    expect(noWebsiteFor("real_estate")).toBe("listings");
  });

  it("takes switched-off features out of the license features", () => {
    const plans = plansWithSwitches(PLAN_INFO, { off: ["feature:push"], offByPlan: { pro: ["feature:auto_publish"] } });
    expect(plans.starter.features).toEqual([]);
    expect(plans.growth.features).toEqual(["ios", "offline_downloads", "page_editor", "card_payments", "auto_rebuild", "loyalty", "store_billing"]);
    expect(plans.pro.features).toEqual(["ios", "offline_downloads", "page_editor", "card_payments", "auto_rebuild", "chat", "loyalty", "store_billing"]);
    expect(PLAN_INFO.pro.features).toContain("push");
  });

  it("offers card payments only for plans where they're on", () => {
    const plans = plansWith({
      starter: { ...PLAN_INFO.starter, priceCents: 100_000, onRequest: false },
      pro: { ...PLAN_INFO.pro, priceCents: 200_000, onRequest: false },
    });
    expect(cardPlanOptions(plans).map((p) => p.id)).toEqual(["starter", "pro"]);
    expect(cardPlanOptions(plans, setting).map((p) => p.id)).toEqual(["pro"]);
  });

  it("keeps only known keys when saving", () => {
    expect(cleanSwitches(["website:ikas", "website:nope", "website:ikas"], { pro: ["feature:push", "x"], starter: [] })).toEqual({
      off: ["website:ikas"],
      offByPlan: { pro: ["feature:push"] },
    });
  });
});
