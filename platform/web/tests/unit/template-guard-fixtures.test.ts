import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { GUARD_CASES, GUARD_NOW, guardProject, mainSlugs, serve, type GuardCase } from "./support/template-guard";

/**
 * 166 The template guard's fixtures for the app (mobile/test/support/
 * template_guard/<template>.json): each template's Home and the pages its
 * tabs open, as the hosted API serves them in English (left to right) and
 * Arabic (right to left), for mobile/test/widget/template_guard_test.dart to
 * draw through the app's own renderer. Written by
 * mobile/tool/template_guard_fixtures.sh (YALLAPP_WRITE_GUARD=1); otherwise
 * this test fails when the committed files differ from what the platform
 * serves now, so the app is never checked against stale pages.
 */

// The clock at the guard's own time: what the samples date from "now" (a flash sale's end) is the same every run.
vi.useFakeTimers({ toFake: ["Date"], now: GUARD_NOW });

const DIR = join(__dirname, "../../../../mobile/test/support/template_guard");
const WRITE = process.env.YALLAPP_WRITE_GUARD === "1";

/**
 * The same pages every run: Studio's node ids (random when a project is
 * made) become g1, g2… in the order they first appear, and the sample
 * entries' pictures asset-1, asset-2…
 */
function stable(value: unknown): unknown {
  const ids = new Map<string, string>();
  const assets = new Map<string, string>();
  const collect = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.id === "string" && typeof o.type === "string" && /^n[a-z0-9]{6,}$/.test(o.id) && !ids.has(o.id)) ids.set(o.id, `g${ids.size + 1}`);
      Object.values(o).forEach(collect);
    }
  };
  collect(value);
  const map = (v: unknown): unknown => {
    if (typeof v === "string") {
      if (ids.has(v)) return ids.get(v);
      return v.replace(/\/api\/v1\/assets\/([A-Za-z0-9_-]+)/g, (_m, id: string) => {
        if (!assets.has(id)) assets.set(id, `asset-${assets.size + 1}`);
        return `/api/v1/assets/${assets.get(id)}`;
      });
    }
    if (Array.isArray(v)) return v.map(map);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, map(x)]));
    return v;
  };
  return map(value);
}

async function fixtureOf(c: GuardCase): Promise<string> {
  const p = await guardProject(c);
  const en = await serve(p, "en");
  const ar = await serve(p, "ar");
  const slugs = mainSlugs(en);
  const pagesOf = (app: typeof en) =>
    Object.fromEntries(slugs.map((slug) => { const page = app.pages.find((pg) => pg.slug === slug)!; return [slug, { screen: page.screen, studio: page.studio }]; }));
  const fixture = {
    template: c.template.id,
    look: c.template.look ?? null,
    kind: c.kind.id,
    app_type: p.app.appType,
    vertical: p.app.vertical ?? null,
    primary_color: p.app.primaryColor,
    // The look the app draws it in: its template and its bundled font (the one shown until an own font is on the phone).
    appearance: { template: p.draft.appearance.template, font: p.draft.appearance.font },
    tabs: en.navigation.tabs,
    // The bar under the tabs' pages: one that floats leaves the page to end above it (mobile TabBarOverBody).
    tab_bar: en.navigation.tab_bar ?? null,
    pages: { en: pagesOf(en), ar: pagesOf(ar) },
  };
  return `${JSON.stringify(stable(fixture), null, 1)}\n`;
}

describe("166 the template guard's fixtures for the app", () => {
  it("are what the platform serves for every template now", async () => {
    const files = new Map<string, string>();
    for (const c of GUARD_CASES) files.set(`${c.template.id}.json`, await fixtureOf(c));
    if (WRITE) {
      rmSync(DIR, { recursive: true, force: true });
      mkdirSync(DIR, { recursive: true });
      for (const [name, text] of files) writeFileSync(join(DIR, name), text);
      return;
    }
    const committed = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".json")).sort() : [];
    expect(committed, "Run mobile/tool/template_guard_fixtures.sh and commit the result.").toEqual([...files.keys()].sort());
    const stale = [...files].filter(([name, text]) => readFileSync(join(DIR, name), "utf8") !== text).map(([name]) => name);
    expect(stale, "Run mobile/tool/template_guard_fixtures.sh and commit the result.").toEqual([]);
  }, 120_000);
});
