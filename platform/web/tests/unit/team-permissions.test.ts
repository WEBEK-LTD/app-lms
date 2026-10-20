import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appAreas } from "@/lib/app/areas";
import type { App } from "@/lib/data/types";
import {
  allowedAreas,
  APP_AREA_PERMISSION,
  areasOf,
  DASHBOARD_PATHS,
  inScope,
  OWNER_ACCESS,
  OWNER_ONLY,
  pathPermission,
  PUSH_PERMISSION,
  readAccess,
  scopedApps,
  TEAM_AREAS,
  teamCan,
  type TeamAccess,
  type TeamPermission,
} from "@/lib/team/permissions";

/** 60 The one permission helper: roles, areas, apps, and every dashboard page asking it with the right permission. */

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const manager: TeamAccess = { role: "manager", areas: [], appIds: null };
const ordersOnly: TeamAccess = { role: "staff", areas: ["orders"], appIds: null };
const scoped: TeamAccess = { role: "staff", areas: ["orders", "media"], appIds: [A] };

describe("60 teamCan", () => {
  it("lets the owner do everything, on every app", () => {
    for (const permission of [...TEAM_AREAS, ...OWNER_ONLY, "settings", "dashboard"] as TeamPermission[]) {
      expect(teamCan(OWNER_ACCESS, permission, A)).toBe(true);
    }
    // The owner's access ignores a list of apps.
    expect(teamCan({ ...OWNER_ACCESS, appIds: [B] }, "billing", A)).toBe(true);
  });

  it("lets a manager do everything but billing, the team and the apps themselves", () => {
    for (const area of TEAM_AREAS) expect(teamCan(manager, area, A)).toBe(true);
    expect(teamCan(manager, "settings", A)).toBe(true);
    expect(teamCan(manager, "dashboard")).toBe(true);
    for (const only of OWNER_ONLY) expect(teamCan(manager, only, A)).toBe(false);
  });

  it("lets Staff do only their areas: never settings or the owner's things", () => {
    expect(teamCan(ordersOnly, "orders", A)).toBe(true);
    expect(teamCan(ordersOnly, "dashboard", A)).toBe(true);
    for (const area of TEAM_AREAS.filter((a) => a !== "orders")) expect(teamCan(ordersOnly, area, A)).toBe(false);
    expect(teamCan(ordersOnly, "settings", A)).toBe(false);
    for (const only of OWNER_ONLY) expect(teamCan(ordersOnly, only)).toBe(false);
  });

  it("refuses an app outside the member's apps, whatever the permission", () => {
    expect(teamCan(scoped, "orders", A)).toBe(true);
    expect(teamCan(scoped, "orders", B)).toBe(false);
    expect(teamCan(scoped, "dashboard", B)).toBe(false);
    expect(teamCan({ ...manager, appIds: [A] }, "settings", B)).toBe(false);
    expect(inScope(scoped, B)).toBe(false);
    expect(scopedApps(scoped, [{ id: A }, { id: B }])).toEqual([{ id: A }]);
    expect(scopedApps(OWNER_ACCESS, [{ id: A }, { id: B }])).toHaveLength(2);
  });

  it("refuses nobody signed in", () => {
    expect(teamCan(null, "dashboard")).toBe(false);
    expect(teamCan(undefined, "orders", A)).toBe(false);
  });

  it("lists the areas a role has", () => {
    expect(areasOf(OWNER_ACCESS)).toEqual([...TEAM_AREAS]);
    expect(areasOf(manager)).toEqual([...TEAM_AREAS]);
    expect(areasOf({ role: "staff", areas: ["media", "orders"], appIds: null })).toEqual(["orders", "media"]);
  });
});

describe("60 what each part needs", () => {
  it("maps the dashboard's addresses", () => {
    expect(pathPermission("/dashboard")).toBe("dashboard");
    expect(pathPermission("/dashboard/orders")).toBe("orders");
    expect(pathPermission("/dashboard/catalog/new")).toBe("catalog");
    expect(pathPermission("/dashboard/license#renew")).toBe("billing");
    expect(pathPermission("/dashboard/license/receipts/x")).toBe("billing");
    expect(pathPermission("/dashboard/team")).toBe("team");
    expect(pathPermission("/dashboard/app-type?new=1")).toBe("apps");
    expect(pathPermission("/dashboard/setup?step=branding")).toBe("settings");
    expect(pathPermission("/dashboard/members")).toBe("bookings");
    expect(pathPermission("/dashboard/media")).toBe("media");
    expect(pathPermission("/dashboard/phones")).toBe("dashboard");
    // A page not listed is the app's settings, not open to Staff.
    expect(pathPermission("/dashboard/something-new")).toBe("settings");
    expect(pathPermission("https://wa.me/123")).toBe("dashboard");
  });

  it("masks what an app has by the role", () => {
    const shop = appAreas({ connector: { kind: "catalog" }, backend: "hosted", vertical: null, catalogSettings: null } as unknown as App);
    const masked = allowedAreas(shop, ordersOnly, A);
    expect(masked).toMatchObject({ orders: true, products: false, media: false, analytics: false, builds: false, preview: true, notifications: false, appUsers: false });
    expect(allowedAreas(shop, OWNER_ACCESS, A)).toEqual(shop);
    expect(allowedAreas(shop, scoped, B).orders).toBe(false);
    // Every area of an app has a permission.
    for (const key of Object.keys(shop)) expect(APP_AREA_PERMISSION[key as keyof typeof shop]).toBeDefined();
  });

  it("pushes each kind to whoever has its area", () => {
    expect(PUSH_PERMISSION.new_order).toBe("orders");
    expect(PUSH_PERMISSION.new_booking).toBe("bookings");
    expect(PUSH_PERMISSION.new_message).toBe("messages");
    expect(PUSH_PERMISSION.payment_received).toBe("billing");
    expect(PUSH_PERMISSION.yallapp_updates).toBe("dashboard");
    // 63 A course question is a message; a review is the catalog's.
    expect(PUSH_PERMISSION.new_review).toBe("catalog");
  });

  it("63 guards course questions as Messages, reviews as Catalog & content and the gym's door as Bookings", () => {
    expect(pathPermission("/dashboard/courses/questions")).toBe("messages");
    expect(pathPermission("/dashboard/courses/questions/12")).toBe("messages");
    expect(pathPermission("/dashboard/courses/reviews")).toBe("catalog");
    expect(pathPermission("/dashboard/courses/12")).toBe("catalog");
    expect(pathPermission("/dashboard/members/check-in")).toBe("bookings");
    expect(APP_AREA_PERMISSION).toMatchObject({ questions: "messages", reviews: "catalog", memberCheckIn: "bookings" });
    const school = appAreas({ connector: { kind: "courses" }, backend: "hosted", vertical: null, catalogSettings: null } as unknown as App);
    expect(school).toMatchObject({ questions: true, reviews: true, memberCheckIn: false });
    const gym = appAreas({ connector: { kind: "bookings" }, backend: "hosted", vertical: "fitness", catalogSettings: null } as unknown as App);
    expect(gym).toMatchObject({ memberCheckIn: true, questions: false });
    const messagesOnly = { role: "staff" as const, areas: ["messages" as const], appIds: null };
    expect(allowedAreas(school, messagesOnly, A)).toMatchObject({ questions: true, reviews: false, courses: false });
    expect(allowedAreas(gym, ordersOnly, A).memberCheckIn).toBe(false);
  });
});

describe("60 the owner's choices", () => {
  it("reads a role, areas and apps", () => {
    expect(readAccess({ role: "staff", areas: ["media", "orders"], appIds: null }, [A, B])).toEqual({ ok: true, access: { role: "staff", areas: ["orders", "media"], appIds: null } });
    // Managers have every area: what was ticked isn't kept.
    expect(readAccess({ role: "manager", areas: ["media"], appIds: [B] }, [A, B])).toEqual({ ok: true, access: { role: "manager", areas: [], appIds: [B] } });
  });

  it("refuses an owner, no areas for Staff, unknown areas and apps that aren't the client's", () => {
    expect(readAccess({ role: "owner", areas: [], appIds: null }, [A])).toMatchObject({ ok: false, errors: { role: "Choose Manager or Staff." } });
    expect(readAccess({ role: "staff", areas: [], appIds: null }, [A])).toMatchObject({ ok: false, errors: { areas: "Choose at least one thing Staff can work on." } });
    expect(readAccess({ role: "staff", areas: ["billing"], appIds: null }, [A])).toMatchObject({ ok: false, errors: { areas: "Choose what they can work on." } });
    expect(readAccess({ role: "staff", areas: ["orders"], appIds: [B] }, [A])).toMatchObject({ ok: false, errors: { appIds: "Choose at least one of your apps." } });
    expect(readAccess({ role: "staff", areas: ["orders"], appIds: [] }, [A])).toMatchObject({ ok: false, errors: { appIds: "Choose at least one of your apps." } });
  });
});

// Every dashboard page asks requireClient with the permission of its address.

const ROOT = path.join(__dirname, "../../src/app/dashboard");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : full.endsWith(".tsx") ? [full] : [];
  });
}

describe("60 every dashboard page is guarded", () => {
  it("calls requireClient with its address's permission", () => {
    const checked: string[] = [];
    for (const file of files(ROOT)) {
      if (file.endsWith("layout.tsx")) continue;
      const source = readFileSync(file, "utf8");
      const calls = [...source.matchAll(/requireClient\(([^)]*)\)/g)];
      if (!calls.length) continue;
      const route = `/dashboard${path.dirname(path.relative(ROOT, file)).replace(/^\.$/, "").replace(/\\/g, "/").replace(/^(?=.)/, "/")}`.replace(/\/\[[^\]]+\]/g, "/x");
      for (const call of calls) {
        expect(call[1], `${path.relative(ROOT, file)} names its permission`).toMatch(/^"[a-z_]+"$/);
        expect(call[1]!.slice(1, -1), `${path.relative(ROOT, file)} (${route})`).toBe(pathPermission(route));
      }
      checked.push(file);
    }
    expect(checked.length).toBeGreaterThan(40);
    // Each listed address is a real folder.
    for (const [prefix] of DASHBOARD_PATHS) {
      if (prefix === "/dashboard") continue;
      expect(statSync(path.join(ROOT, prefix.slice("/dashboard/".length))).isDirectory(), prefix).toBe(true);
    }
  });

  it("leaves no client server action reading the context without a permission", () => {
    const actions = path.join(__dirname, "../../src/app/actions");
    for (const name of readdirSync(actions)) {
      if (name.startsWith("admin") || ["auth.ts", "give.ts", "pay.ts", "dashboard-language.ts", "app-defaults.ts"].includes(name)) continue;
      const source = readFileSync(path.join(actions, name), "utf8");
      expect(source.includes("getClientContext()"), `${name} uses clientFor(permission)`).toBe(false);
    }
  });
});
