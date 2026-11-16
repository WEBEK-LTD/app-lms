import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KINDS, ENGINES } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import { ownContentSetup } from "@/lib/app/own-content";
import type { App } from "@/lib/data/types";
import { dashboardTextFor } from "@/lib/dashboard-words";
import { inStudioFrame, studioJumpTargets, studioProjectNav, type StudioNavInput } from "@/lib/studio/project-nav";
import { studioFramePath, studioPathFor, teamPath } from "@/lib/studio/section";
import { teamCan, type TeamAccess, type TeamPermission } from "@/lib/team/permissions";
import { matchPages, searchable } from "@/app/studio/project/command-palette";
import { NOW } from "./helpers";

/**
 * 132.1–132.3 A Studio project's menu: every page of the dashboard that
 * applies to the project's kind, in Studio's frame, behind the dashboard's
 * own gates, in a few groups; the quick search finds them in English,
 * Arabic and Turkish.
 */

const WEB = path.resolve(__dirname, "../..");
const text = dashboardTextFor("en");
const owner = () => true;

/** A Studio project of a kind, its content kept in Yallapp (as /studio/new makes it). */
function project(kindId: string, extra: Partial<App> = {}): App {
  const kind = KINDS.find((k) => k.id === kindId)!;
  const fresh = newApp("client-1", null, NOW, kind.engine, kind.vertical);
  const base = { ...fresh, section: "studio", appName: kind.name } as App;
  return { ...base, backend: "hosted", ...ownContentSetup(ENGINES[kind.engine].ownContent.kind, base), websiteDoneAt: NOW, ...extra } as App;
}

const input = (app: App, can: StudioNavInput["can"] = owner): StudioNavInput => ({ app, text, can, supportUrl: "https://wa.me/905000000000" });
const hrefs = (app: App, can?: StudioNavInput["can"]) => studioProjectNav(input(app, can)).flatMap((g) => g.items.map((i) => i.href));

describe("132.1 the Studio project's menu", () => {
  it("has the pages the owner missed, in Studio's frame", () => {
    const shown = hrefs(project("store"));
    for (const page of ["media", "chat", "integrations", "team", "protection", "preview", "stability", "announcements", "phones", "account", "screens", "app-sign-in", "notifications", "languages", "publishing", "builds", "license", "invoices"]) {
      expect(shown, page).toContain(`/studio/project/${page}`);
    }
    expect(shown).toContain("/studio/project");
    expect(shown).toContain("/studio/editor");
    // A store's own pages, its delivery and offers, its card messages.
    expect(shown).toEqual(expect.arrayContaining(["/studio/project/catalog", "/studio/project/orders", "/studio/project/selling", "/studio/project/selling/messages"]));
    // Support opens WhatsApp in a new tab.
    const support = studioProjectNav(input(project("store"))).flatMap((g) => g.items).find((i) => i.external);
    expect(support).toMatchObject({ href: "https://wa.me/905000000000", icon: "support_agent" });
  });

  it.each(KINDS.map((k) => k.id).filter((id, i, all) => all.indexOf(id) === i))("%s: its kind's pages, each with its page in Studio", (id) => {
    const app = project(id);
    const groups = studioProjectNav(input(app));
    const shown = groups.flatMap((g) => g.items.filter((i) => !i.external).map((i) => i.href));
    // No page twice, every page a route of Studio's frame.
    expect(new Set(shown).size).toBe(shown.length);
    for (const href of shown) {
      const route = href.split("?")[0]!;
      const file = route === "/studio/editor" ? "src/app/studio/editor/page.tsx" : `src/app${route}/page.tsx`;
      expect(existsSync(path.join(WEB, file)), `${href} has a page`).toBe(true);
    }
    // The kind's own group first after the start, with the dashboard's own pages of it.
    const kind = groups.find((g) => g.id === "kind");
    if (id === "delivery") expect(kind?.items.map((i) => i.href)).toContain("/studio/project/shipments");
    else if (id === "school") expect(kind?.items.length).toBeGreaterThanOrEqual(25);
    else expect(kind?.items.length ?? 0).toBeGreaterThan(0);
    // Short groups: the start, the kind, the app, its people, publishing, the account.
    expect(groups.map((g) => g.id)).toEqual(["start", "kind", "app", "people", "publish", "account"]);
  });

  it("reaches every page of the dashboard that a project can have", () => {
    const routes = readdirSync(path.join(WEB, "src/app/dashboard"), { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(path.join(WEB, "src/app/dashboard", d.name, "page.tsx")))
      .map((d) => d.name);
    // The account's pages for a new app or another business, and the regular editor (Studio has its own).
    const elsewhere = new Set(["app-type", "builder", "businesses", "pages"]);
    const reached = new Set<string>();
    const apps = [
      ...KINDS.map((k) => project(k.id)),
      // On WordPress: the site's campaigns; an academy there sells in the app.
      { ...project("store"), backend: "wordpress", connector: null } as App,
      { ...project("academy"), backend: "wordpress", connector: null } as App,
    ];
    for (const app of apps) {
      for (const href of [...hrefs(app), ...studioJumpTargets(input(app)).map((i) => i.href)]) {
        const first = /^\/studio\/project\/([^/?]+)/.exec(href)?.[1];
        if (first) reached.add(first);
      }
    }
    expect(routes.filter((r) => !elsewhere.has(r) && !reached.has(r))).toEqual([]);
  });

  it("keeps the dashboard's gates", () => {
    // Chat and the notifications where Yallapp knows the app's people; a WordPress site's campaigns.
    const wordpress = { ...project("store"), backend: "wordpress", connector: null } as App;
    expect(hrefs(wordpress)).toContain("/studio/project/notifications/campaigns");
    expect(hrefs(wordpress)).not.toContain("/studio/project/notifications");
    expect(hrefs(wordpress)).toContain("/studio/project/chat");
    const ownApi = { ...project("store"), backend: "custom_api", connector: null, apiBaseUrl: "https://api.example.com" } as App;
    expect(hrefs(ownApi)).not.toContain("/studio/project/chat");
    expect(hrefs(ownApi)).not.toContain("/studio/project/notifications");
    // In-app purchases: academies with courses in Yallapp, for whoever may change the settings.
    expect(hrefs(project("academy"))).toContain("/studio/project/in-app-purchases");
    expect(hrefs(project("store"))).not.toContain("/studio/project/in-app-purchases");
    expect(hrefs(project("academy"), (p) => p !== "settings")).not.toContain("/studio/project/in-app-purchases");
    // The kind's pages from its content, as on the dashboard: a store on WordPress has no products of Yallapp's, but its delivery and offers.
    expect(hrefs(wordpress)).not.toContain("/studio/project/catalog");
    expect(hrefs(wordpress)).toContain("/studio/project/selling");
  });

  it("shows a team member only what they may open", () => {
    const access: TeamAccess = { role: "staff", areas: ["orders", "catalog"], appIds: null };
    const can = (permission: TeamPermission) => teamCan(access, permission, "app-1");
    const groups = studioProjectNav(input(project("store"), can));
    const shown = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(shown).toContain("/studio/project/orders");
    expect(shown).toContain("/studio/project/catalog");
    expect(shown).not.toContain("/studio/project/team");
    expect(shown).not.toContain("/studio/project/screens");
    expect(shown).not.toContain("/studio/project/invoices");
    // A group left empty goes.
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
  });

  it("names its links in each of the dashboard's languages", () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      const groups = studioProjectNav({ ...input(project("school")), text: dashboardTextFor(lang) });
      for (const label of groups.flatMap((g) => [g.label ?? "x", ...g.items.map((i) => i.label)])) {
        expect(label, lang).not.toMatch(/^(studio|nav|team|owner|account|chat|inapp|integrations|selling)\./);
        expect(label.trim().length).toBeGreaterThan(0);
      }
    }
    const ar = studioProjectNav({ ...input(project("store")), text: dashboardTextFor("ar") }).flatMap((g) => g.items.map((i) => i.label));
    expect(ar).toContain("الوسائط");
  });
});

describe("132.3 the account's pages in Studio's frame", () => {
  it("maps the dashboard's addresses", () => {
    expect(inStudioFrame("/dashboard")).toBe("/studio/project");
    expect(inStudioFrame("/dashboard/pages")).toBe("/studio/editor");
    expect(inStudioFrame("/dashboard/setup?step=branding")).toBe("/studio/project/setup?step=branding");
    expect(studioFramePath("/dashboard/team?done=cancelled")).toBe("/studio/project/team?done=cancelled");
    expect(studioFramePath("/ar/dashboard/account")).toBe("/studio/project/account");
    expect(studioFramePath("/dashboard/media")).toBe("/studio/project/media");
    // The account's other pages stay where they are, and the dashboard's own mapping is as before.
    expect(studioFramePath("/dashboard/businesses")).toBeNull();
    expect(studioPathFor("/dashboard/team")).toBeNull();
    expect(teamPath({ section: "studio" }, "?done=closed")).toBe("/studio/project/team?done=closed");
    expect(teamPath({ section: null } as never)).toBe("/dashboard/team");
  });
});

describe("132.2 the quick search", () => {
  const items = studioProjectNav(input(project("store"))).flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
  it("finds a page by its name or its group, the names starting with the words first", () => {
    expect(matchPages(items, "media")[0]?.href).toBe("/studio/project/media");
    expect(matchPages(items, "  MED ")[0]?.href).toBe("/studio/project/media");
    expect(matchPages(items, "publishing").map((i) => i.href)).toEqual(expect.arrayContaining(["/studio/project/publishing", "/studio/project/builds"]));
    expect(matchPages(items, "zzz")).toEqual([]);
    expect(matchPages(items, "")).toHaveLength(items.length);
  });
  it("in Arabic and Turkish, whatever their marks", () => {
    const ar = studioProjectNav({ ...input(project("store")), text: dashboardTextFor("ar") }).flatMap((g) => g.items);
    expect(matchPages(ar, "الوسائط")[0]?.href).toBe("/studio/project/media");
    expect(searchable("إعدادات")).toBe(searchable("اعدادات"));
    expect(searchable("Yayın")).toBe("yayin");
    const tr = studioProjectNav({ ...input(project("store")), text: dashboardTextFor("tr") }).flatMap((g) => g.items);
    expect(matchPages(tr, "medya")[0]?.href).toBe("/studio/project/media");
  });
});
