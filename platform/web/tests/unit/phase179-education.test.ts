import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { connectorFor } from "@/lib/hosted/connectors";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { loadLayout, publishLayout, withoutStrings } from "@/lib/pages/layout";
import type { LayoutContent, StudioNode, StudioPage } from "@/lib/pages/types";
import { PLAN_INFO } from "@/lib/plans";
import { ICON_NAMES } from "@/components/icon-names";
import { tickerLines, withNewsTicker } from "@/lib/school/news-ticker";
import { appWords } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { TEMPLATES } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";

/**
 * 179 The education templates tested by hand (docs/qa/2026-11-18-education).
 */

const BLOBS = mkdtempSync(join(tmpdir(), "phase179-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;
afterAll(() => rmSync(BLOBS, { recursive: true, force: true }));

const NOW = new Date("2026-11-18T10:00:00Z");
const LATER = new Date("2026-11-18T10:05:00Z");

let store: MemoryStore;
let n = 0;
beforeEach(() => {
  store = new MemoryStore();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

/** A Studio project as /studio/new (or /start/<demo>/make with `fromDemo`) makes it, published as Studio's editor publishes it. */
async function project(kind: string, templateId: string, lang: "en" | "ar", fromDemo: string | null = null): Promise<App> {
  const { client } = await registerClient(store, { name: "Owner", email: `owner-${++n}@school.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  const languages = lang === "ar" ? { default: "ar", available: ["ar", "en", "tr"] } : { default: "en", available: ["en", "ar", "tr"] };
  const template = TEMPLATES.find((t) => t.id === templateId)!;
  const made = await makeStudioProject(store, { clientId: client.id, name: "Cedar School", kind: kindById(kind)!, source: "catalog", template, words: appWords(lang, "Cedar School"), lang, languages, fromDemo: fromDemo as never }, NOW);
  const app = (await store.getAppById(made.id))!;
  const draft = JSON.parse(JSON.stringify(withoutStrings((await loadLayout(store, app, NOW)).draft))) as LayoutContent;
  expect((await publishLayout(store, app, draft, "owner@school.test", NOW, PLAN_INFO.studio_1)).ok).toBe(true);
  return app;
}

function contextOf(app: App): HostedContext {
  const assetUrl = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
  const connector = connectorFor(app, Buffer.alloc(32, 1), { store, assetUrl, platformUrl: "https://yallapp.test" });
  return { store, app, active: true, now: LATER, plan: PLAN_INFO.studio_1, ip: "203.0.113.9", secret: "s", sender: new LogSender(), push: false, assetUrl, platformUrl: "https://yallapp.test", connector };
}

async function served(app: App, slug: string, lang: string): Promise<StudioPage> {
  const res = await handleHosted(contextOf(app), { method: "GET", path: ["pages", slug], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
  expect(res.status).toBe(200);
  return (res.body as { studio: StudioPage }).studio;
}

/** The page without its lists' entries (sample courses are the owner's sample entries, with their teachers' names). */
const withoutEntries = (page: StudioPage): string => JSON.stringify(page, (key, value) => (key === "items" ? undefined : value));
const tickers = (page: StudioPage) => allNodes(page).filter((x) => x.type === "marquee");
/** The rows holding the "News" label (the pill). */
const pills = (page: StudioPage) => allNodes(page).filter((x) => x.type === "row" && (x.children ?? []).some((k) => k.type === "badge_text" && ["News", "أخبار", "Haberler"].includes(k.text ?? "")));

describe("179.1 Nakhla's news ticker runs the school's own news", () => {
  const news = async (app: App, title: string, audience: "school" | "class", at: number) =>
    store.createSchoolAnnouncement({ appId: app.id, audience, classId: audience === "class" ? 1 : null, studentId: null, title, body: "", teacherId: null, createdAt: new Date(NOW.getTime() + at * 1000) });

  for (const fromDemo of [null, "school"] as const) {
    it(`${fromDemo ? "from the demo" : "from Studio's template"}: the school's news, newest first; only the school's to everyone`, async () => {
      const app = await project("school", "school_signature_a", "en", fromDemo);
      for (const a of await store.listSchoolAnnouncements(app.id)) await store.deleteSchoolAnnouncement(app.id, a.id);
      await news(app, "Winter break starts Friday", "school", 1);
      await news(app, "Grade 3 B: bring your atlas", "class", 2);
      await news(app, "Book fair in the library", "school", 3);
      for (const lang of ["en", "ar", "tr"]) {
        const home = await served(app, "home", lang);
        expect(tickers(home).map((t) => t.text), lang).toEqual(["Book fair in the library\nWinter break starts Friday"]);
        expect(JSON.stringify(home), lang).not.toMatch(/Parents' evening|أولياء أمور الصف الخامس|veli akşamı|This week's news/);
        expect(pills(home), lang).toHaveLength(1);
      }
    });

    it(`${fromDemo ? "from the demo" : "from Studio's template"}: a school without news has no empty News pill`, async () => {
      const app = await project("school", "school_signature_a", "ar", fromDemo);
      for (const a of await store.listSchoolAnnouncements(app.id)) await store.deleteSchoolAnnouncement(app.id, a.id);
      for (const lang of ["ar", "en", "tr"]) {
        const home = await served(app, "home", lang);
        expect(tickers(home), lang).toEqual([]);
        expect(pills(home), lang).toEqual([]);
      }
    });
  }

  it("the version changes with the news, so the app asks for the home again", async () => {
    const app = await project("school", "school_signature_a", "en");
    const version = async () => ((await handleHosted(contextOf(app), { method: "GET", path: ["pages"], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null })).body as { version: string }).version;
    const before = await version();
    await news(app, "Sports day moved to Monday", "school", 5);
    expect(await version()).not.toBe(before);
  });

  it("a ticker in the owner's own words stays as they wrote it", () => {
    const own: StudioNode = { id: "r", type: "row", children: [{ id: "b", type: "badge_text", text: "News" }, { id: "m", type: "marquee", text: "Our own line" }] };
    expect(withNewsTicker(own, [])).toEqual(own);
    expect(withNewsTicker(own, ["x"])).toEqual(own);
    expect(tickerLines([])).toEqual([]);
  });
});

describe("179.2 Rawaq's faculty is the academy's own teachers", () => {
  const TEMPLATE_PEOPLE = /Hannah Clarke|Deniz Kaya|Salma Nasser|Omar Farouk|هانا كلارك|دنيز كايا|سلمى ناصر|عمر فاروق|Arabic for Beginners|Start Your Own Small Business|UX Design Fundamentals/;

  /** The academy's own teachers in place of the samples, the first one's teacher of a published course. */
  const ownTeachers = async (app: App) => {
    for (const t of await store.listTeachers(app.id)) await store.deleteTeacher(app.id, t.id);
    const add = async (name: string, subjects: string[], featured: boolean) => {
      const made = await store.createTeacher({ appId: app.id, name, phone: null, email: `${name.split(" ")[0]!.toLowerCase()}@cedar.test`, userId: null, photoAssetId: null, bio: "Ten years in classrooms.", subjects, status: "active", shareBp: 7000, featured }, NOW);
      if (!made.ok) throw new Error("teacher");
      return made.teacher.id;
    };
    const layla = await add("Layla Haddad", ["Physics", "Maths"], false);
    await add("Yusuf Demir", ["Chemistry"], true);
    const fresh = (await store.getAppById(app.id))!;
    const setup = fresh.courseSetup!;
    const first = setup.courses[0]!;
    await store.updateApp(app.id, { courseSetup: { ...setup, courses: [{ ...first, title: "Physics in Everyday Life", description: "Forces and motion, from the kitchen to the car.\nTwelve lessons.", teacherId: layla, teacherStage: null, active: true }, ...setup.courses.slice(1).map((c) => ({ ...c, teacherId: null }))] } }, NOW);
    return (await store.getAppById(app.id))!;
  };

  for (const look of ["a", "b"] as const) {
    for (const fromDemo of [null, "instructors"] as const) {
      it(`look ${look.toUpperCase()}${fromDemo ? " from the demo" : ""}: the academy's teachers, featured first, never the template's`, async () => {
        const made = await project("instructors", `instructors_signature_${look}`, "en", fromDemo);
        const app = await ownTeachers(made);
        for (const lang of ["en", "ar", "tr"]) {
          const home = await served(app, "home", lang);
          const json = withoutEntries(home);
          expect(json, lang).not.toMatch(TEMPLATE_PEOPLE);
          const texts = allNodes(home).map((x) => x.text);
          expect(texts, lang).toContain("Yusuf Demir");
          expect(texts, lang).toContain("Layla Haddad");
          expect(texts, lang).toContain("YD");
          expect(texts, lang).toContain("Physics · Maths");
          if (look === "a") {
            // Two rows, featured first, one hairline between them; nobody "teaching live".
            const rows = allNodes(home).filter((x) => x.type === "row" && (x.name === "Yusuf Demir" || x.name === "Layla Haddad"));
            expect(rows.map((r) => r.name), lang).toEqual(["Yusuf Demir", "Layla Haddad"]);
            expect(json, lang).not.toMatch(/Live classes|حصص مباشرة|Canlı dersler/);
          } else {
            const slider = allNodes(home).find((x) => x.type === "slider")!;
            expect(slider.children!.map((s) => s.name), lang).toEqual(["Yusuf Demir", "Physics in Everyday Life"]);
            expect(texts, lang).toContain("Forces and motion, from the kitchen to the car.");
            const rings = allNodes(home).find((x) => x.type === "stories")!;
            expect(rings.slides!.map((s) => [s.heading, s.label]), lang).toEqual([
              ["Yusuf Demir", "YD"],
              ["Layla Haddad", "LH"],
            ]);
          }
        }
      });
    }
  }

  it("an academy without teachers: no faculty, no slides, no rings, no heading over nothing", async () => {
    for (const look of ["a", "b"] as const) {
      const app = await project("instructors", `instructors_signature_${look}`, "ar");
      for (const t of await store.listTeachers(app.id)) await store.deleteTeacher(app.id, t.id);
      const home = await served(app, "home", "ar");
      expect(withoutEntries(home), look).not.toMatch(TEMPLATE_PEOPLE);
      expect(allNodes(home).some((x) => x.name === "هيئة التدريس"), look).toBe(false);
      expect(allNodes(home).some((x) => x.type === "slider" || x.type === "stories"), look).toBe(false);
      // The courses stay.
      expect(allNodes(home).some((x) => x.type === "items"), look).toBe(true);
    }
  });

  it("an Arabic academy's sample teachers are the ones its home names (the template wrote others)", async () => {
    const app = await project("instructors", "instructors_signature_a", "ar");
    const samples = (await store.listTeachers(app.id)).map((t) => t.name);
    expect(samples.length).toBeGreaterThan(0);
    const home = await served(app, "home", "ar");
    const named = allNodes(home).filter((x) => x.type === "row" && samples.includes(x.name ?? "")).map((x) => x.name);
    expect(named.length).toBe(Math.min(4, samples.length));
    // The template's own Arabic names, which no sample teacher has.
    expect(withoutEntries(home)).not.toMatch(/هانا كلارك|دنيز كايا/);
  });
});

describe("179.4 Studio's canvas draws every icon of the education templates", () => {
  /** Every icon a page names, its elements' own and their calls to action's lead, entries', slides' and buttons' too. */
  const iconsIn = (value: unknown, out = new Set<string>()): Set<string> => {
    if (Array.isArray(value)) for (const v of value) iconsIn(v, out);
    else if (value && typeof value === "object") {
      for (const [key, v] of Object.entries(value)) {
        if ((key === "icon" || key === "lead") && typeof v === "string" && /^[a-z0-9_]+$/.test(v)) out.add(v);
        else iconsIn(v, out);
      }
    }
    return out;
  };
  const CASES: [string, string, string | null][] = [
    ["school", "school_signature_a", "school"],
    ["school", "school_signature_b", "school"],
    ["school", "school", null],
    ["instructors", "instructors_signature_a", "instructors"],
    ["instructors", "instructors_signature_b", "instructors"],
    ["instructors", "teachers", null],
    ["academy", "premium_academy_signature_a", "premium_academy"],
    ["academy", "premium_academy_signature_b", "premium_academy"],
    ["academy", "academy_premium", null],
  ];
  it.each(CASES)("%s from %s: each icon is in the canvas's font (components/icon-names.ts)", async (kind, template, fromDemo) => {
    const app = await project(kind, template, "en", fromDemo);
    const layout = (await loadLayout(store, app, NOW)).draft;
    const icons = iconsIn([layout.pages.map((p) => p.studio), layout.tabs, app.hostedSettings?.studioScreens]);
    const subset = new Set<string>(ICON_NAMES);
    expect([...icons].filter((i) => !subset.has(i)), template).toEqual([]);
  });
});
