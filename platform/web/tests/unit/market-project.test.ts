import { describe, expect, it } from "vitest";
import { contentNavOf, kindById, kindOf } from "@/lib/app/kinds";
import type { App } from "@/lib/data/types";
import { FoodConnector } from "@/lib/hosted/connectors/food";
import { foodRoutesOn, isMarketplaceApp, marketplaceInPlan, marketplaceOn } from "@/lib/market/plan";
import { PLAN_FEATURES, SECOND_APP_KINDS, STUDIO_ONLY_FEATURES, STUDIO_PLAN_CHOICES, type PlanInfo } from "@/lib/plans";
import { STUDIO_ONLY_KINDS } from "@/lib/studio/section";

const food = { appType: "food", vertical: null, connector: { kind: "restaurants" }, demo: false } as unknown as App;
const market = { ...food, vertical: "marketplace" } as App;
const plan = (...features: string[]) => ({ features }) as unknown as PlanInfo;

describe("115.13 the marketplace project type", () => {
  it("is the food engine with the vertical marketplace, made only in Studio", () => {
    const kind = kindById("marketplace");
    expect(kind).toMatchObject({ engine: "food", vertical: "marketplace" });
    expect(kindOf(market).id).toBe("marketplace");
    expect(kindOf(food).id).toBe("food");
    expect(STUDIO_ONLY_KINDS.has("marketplace")).toBe(true);
    expect(isMarketplaceApp(market)).toBe(true);
    expect(isMarketplaceApp(food)).toBe(false);
  });

  it("has the marketplace's pages in its menu; food delivery keeps the way into it", () => {
    const items = (app: App) => contentNavOf(app)?.items.map((i) => i.href) ?? [];
    expect(items(market)).toEqual(expect.arrayContaining(["/dashboard/market/orders", "/dashboard/market/complaints", "/dashboard/market/joining", "/dashboard/market/statements", "/dashboard/market/settings", "/dashboard/restaurants"]));
    expect(items(food)).toContain("/dashboard/market/settings");
    expect(items(food)).not.toContain("/dashboard/market/orders");
  });

  it("is its own Studio plan feature, `market` (9.5's removed `marketplace` stays unused)", () => {
    expect(PLAN_FEATURES.map((f) => f.id)).toContain("market");
    expect(PLAN_FEATURES.map((f) => f.id)).not.toContain("marketplace");
    for (const list of [STUDIO_ONLY_FEATURES, STUDIO_PLAN_CHOICES, SECOND_APP_KINDS]) expect(list).toContain("market");
  });

  it("opens the marketplace's routes only for marketplace projects whose plan has it, and for demos", () => {
    expect(marketplaceOn(market, plan("food", "market"))).toBe(true);
    expect(marketplaceOn(market, plan("market"))).toBe(true);
    expect(marketplaceOn(market, plan("food"))).toBe(false);
    expect(marketplaceOn(market, null)).toBe(false);
    expect(marketplaceOn(food, plan("food", "market"))).toBe(false);
    expect(marketplaceOn({ ...food, demo: true } as App, null)).toBe(true);
    expect(marketplaceInPlan(market, undefined)).toBe(true);
  });

  it("serves food delivery's routes underneath a marketplace without the food feature", () => {
    expect(foodRoutesOn(market, plan("market"))).toBe(true);
    expect(foodRoutesOn(food, plan("market"))).toBe(false);
    expect(foodRoutesOn(food, plan("food"))).toBe(true);
    expect(foodRoutesOn(food, null)).toBe(false);
  });

  it("refuses the marketplace's endpoints when they're off", async () => {
    const connector = new FoodConnector({ store: {} as never, app: food, assetUrl: (id: string) => id, platformUrl: "https://yallapp.test", food: true, marketplace: false } as never);
    const result = await connector.handle({ method: "GET", path: ["market", "vendors"], query: {}, headers: {}, body: null } as never);
    expect(result).toMatchObject({ status: 403 });
  });
});
