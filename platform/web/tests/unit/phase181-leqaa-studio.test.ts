import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { ScreensEditor } from "@/app/dashboard/screens/editor";
import { StoriesControls } from "@/app/studio/editor/premium-motion-controls";
import { fromDashboard, StoriesSourceControls } from "@/app/studio/editor/stories-source-controls";
import { DashboardI18n } from "@/components/dashboard-i18n";
import { StudioView, type StudioEditing } from "@/components/studio/view";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { dashboardMessages, knownEnglish } from "@/i18n/dashboard";
import { screenTextForms } from "@/lib/demo/screen-text-forms";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import { loadLayout } from "@/lib/pages/layout";
import { screenTextState, screenWordsIn, withoutStaleScreenTexts } from "@/lib/pages/template-translations";
import type { LanguageCode, StudioPage } from "@/lib/pages/types";
import { storyViewOf } from "@/lib/stories/view";
import { appWords } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import type { StudioScreens } from "@/lib/studio/screens";
import { TEMPLATES } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";
import { isLanguageCode } from "@/lib/i18n/locales";
import { NOW, storiesApp, storyOf } from "./app-stories-store-suite";

/**
 * 181 What phases 157 to 163 left open for Leqaa and Kech Flora, in Studio.
 *
 * Studio's canvas, a stories row with more than 6 rings: the row was cut at
 * the phone's width, so the 7th ring and those after it couldn't be picked
 * or edited there. It scrolls sideways as the app's does; a ring clicked
 * picks its story, marked there and in the inspector, and the story picked
 * in the inspector is marked on the canvas. Once the owner saved the
 * stories in Dashboard › Stories (165), the rings are the dashboard's, every
 * one of them on the canvas, and the inspector says so, with no edits.
 *
 * Studio › Screens, the owner's own translation: under each text in a
 * language other than the main one, what the app shows there, as the page
 * inspector says it (156): the owner's own translation, Yallapp's (the
 * template's) or the owner's text.
 */

const LEQAA_A = TEMPLATES.find((t) => t.id === "flowers_signature_a")!;

function html(node: ReactNode, lang: "en" | "ar" | "tr" = "en"): string {
  const props: ComponentProps<typeof DashboardI18n> = { lang, messages: dashboardMessages(lang), knownEnglish: lang === "en" ? {} : knownEnglish(), children: node };
  return renderToStaticMarkup(createElement(DashboardI18n, props)).replaceAll("&#x27;", "'");
}

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
});

/** Kech Flora, made from Leqaa's look A in English, Arabic and Turkish. */
async function kechFlora(): Promise<App> {
  const { client } = await registerClient(store, { name: "Kech Flora", email: `kech-${Date.now()}@flora.test`, whatsapp: "+905446731981", siteUrl: "", password: null }, NOW);
  const made = await makeStudioProject(store, { clientId: client.id, name: "Kech Flora", kind: kindById("store")!, source: "catalog", template: LEQAA_A, words: appWords("en", "Kech Flora"), lang: "en", languages: { default: "en", available: ["en", "ar", "tr"] } }, NOW);
  return (await store.getAppById(made.id))!;
}

async function homeOf(app: App): Promise<StudioPage> {
  return (await loadLayout(store, app, NOW)).draft.pages.find((p) => p.slug === "home")!.studio!;
}

const ringsOf = (page: StudioPage) => allNodes(page).find((n) => n.type === "stories")!;

/** The page with its rings made `count` stories long (the template's, then more of the same). */
function withRings(page: StudioPage, count: number): StudioPage {
  const json = JSON.parse(JSON.stringify(page)) as StudioPage;
  const rings = ringsOf(json);
  const designed = rings.slides!;
  rings.slides = Array.from({ length: count }, (_, i) => ({ ...designed[i % designed.length]!, heading: `Ring ${i + 1}` }));
  return json;
}

const WORDS = { price: "Price", addPicture: "Add a picture", addVideo: "Add a video", send: "Send", search: "Search", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds", copy: "Copy" };
const LOOK = { name: "Kech Flora", logoUrl: null, brand: "#8E2445", font: "Cairo", tabs: [], activeTab: null };

function editing(part: StudioEditing["part"] = null): StudioEditing {
  const none = () => undefined;
  return { selectedId: part?.id ?? null, hoveredId: null, drop: null, onSelect: none, onHover: none, onDragOver: none, onDrop: none, onDragStartNode: none, dropLabel: "Drop here", tagOf: () => "", part, onSelectPart: none };
}

function canvas(page: StudioPage, options: { pickable?: Pickable; editing?: StudioEditing; lang?: LanguageCode; dark?: boolean } = {}): string {
  return renderToStaticMarkup(createElement(StudioView, { page, lang: options.lang ?? "en", defaultLang: "en", dark: options.dark ?? false, look: LOOK, pickable: options.pickable ?? ({ items: {}, categories: {} } as unknown as Pickable), words: WORDS, editing: options.editing }));
}

/** The canvas's stories row: its own tag and each ring's. */
function rowOf(markup: string): { row: string; rings: string[] } {
  const row = /<span[^>]*data-studio-stories=""[^>]*>/.exec(markup)?.[0] ?? "";
  const rings = [...markup.matchAll(/<span[^>]*data-studio-story="(\d+)"[^>]*>/g)].map((m) => m[0]);
  return { row, rings };
}

describe("181 Studio's canvas: a stories row with more than 6 rings", () => {
  it("scrolls sideways as the app's row does, every ring on it to be picked, in both directions and looks", async () => {
    const app = await kechFlora();
    const page = withRings(await homeOf(app), 9);
    const id = ringsOf(page).id;
    for (const lang of ["en", "ar"] as const) {
      for (const dark of [false, true]) {
        const { row, rings } = rowOf(canvas(page, { editing: editing(), lang, dark }));
        expect(row, `${lang} ${dark}`).toContain("overflow-x:auto");
        expect(row).not.toMatch(/overflow:hidden/);
        expect(rings, `${lang} ${dark}`).toHaveLength(9);
        expect(rings.every((r) => r.includes("cursor:pointer")), "each ring is picked by a click").toBe(true);
        // The 7th, 8th and 9th rings too.
        for (const i of [6, 7, 8]) expect(rings[i]).toContain(`data-studio-story="${i}"`);
      }
    }
    // Picked: its ring marked, the others not.
    const picked = rowOf(canvas(page, { editing: editing({ id, index: 7 }) })).rings;
    expect(picked.filter((r) => r.includes("data-studio-story-picked"))).toEqual([picked[7]]);
    expect(picked[7]).toContain("outline:2px solid #3D63FF");
    // The app's preview (no editor): the row still scrolls, nothing to pick.
    const shown = rowOf(canvas(page));
    expect(shown.row).toContain("overflow-x:auto");
    expect(shown.rings.some((r) => r.includes("cursor:pointer"))).toBe(false);
  });

  it("the inspector lists every story, the one picked on the canvas marked", async () => {
    const app = await kechFlora();
    const rings = ringsOf(withRings(await homeOf(app), 9));
    for (const lang of ["en", "ar", "tr"] as const) {
      const markup = html(createElement(StoriesControls, { node: rings, onChange: () => undefined, lang: "en", defaultLang: "en", link: () => null, shop: true, story: 6, onStory: () => undefined }), lang);
      const entries = [...markup.matchAll(/<div[^>]*data-studio-story-entry="(\d+)"[^>]*>/g)].map((m) => m[0]);
      expect(entries, lang).toHaveLength(9);
      expect(entries.filter((e) => e.includes("data-studio-story-picked"))).toEqual([entries[6]]);
      // Each story's own fields (its title among them) for the 7th and after too.
      expect(markup).toContain('value="Ring 7"');
      expect(markup).toContain('value="Ring 9"');
    }
  });

  it("165 still: once the stories are saved in Dashboard › Stories, the rings are the dashboard's, all of them, and Studio says so", async () => {
    const app = await storiesApp(store);
    for (let n = 0; n < 9; n++) await store.createAppStory(storyOf(app.id, n));
    const views = (await store.listAppStories(app.id)).map(storyViewOf);
    expect(views).toHaveLength(9);
    const made = await kechFlora();
    const page = await homeOf(made);
    const rings = ringsOf(page);
    expect(fromDashboard(rings, page.body)).toBe(true);
    const pickable = { items: {}, categories: {}, stories: views, storiesSaved: true } as unknown as Pickable;
    const { row, rings: drawn } = rowOf(canvas(page, { pickable, editing: editing() }));
    expect(row).toContain("overflow-x:auto");
    expect(drawn).toHaveLength(9);
    const markup = canvas(page, { pickable, editing: editing() });
    for (const n of [0, 6, 8]) expect(markup).toContain(`Ring ${n}`);
    // The inspector: the note, with no edits that wouldn't show.
    const words = { en: "These rings come from Dashboard › Stories.", ar: "الدواير دي جاية من لوحة التحكم › الستوريز.", tr: "Bu halkalar Panel › Hikâyeler'den gelir." } as const;
    for (const lang of ["en", "ar", "tr"] as const) {
      const note = html(createElement(StoriesSourceControls, { node: rings, body: page.body, pickable, onChange: () => undefined }), lang);
      expect(note, lang).toContain("data-studio-stories-from-dashboard");
      expect(note, lang).toContain(words[lang]);
    }
  });
});

describe("181 Studio › Screens: the owner's own translation, and the template's", () => {
  const states = (markup: string, attribute = "data-screen-text-state") => [...markup.matchAll(new RegExp(`${attribute}="([a-z]+)" data-language="([a-z]+)"`, "g"))].map((m) => `${m[2]}:${m[1]}`);

  it("tells each language's words apart by the rule the app is served by", async () => {
    const app = await kechFlora();
    const screens = app.hostedSettings!.studioScreens!;
    const forms = screenTextForms();
    const options = { appName: app.appName, more: forms };
    const title = screens.sign_in!.title;
    expect(Object.keys(title).sort()).toEqual(["ar", "en", "tr"]);
    // The template's welcome: Yallapp's translations of it.
    expect(screenTextState(title, "ar", "en", options)).toBe("template");
    expect(screenTextState(title, "tr", "en", options)).toBe("template");
    expect(screenTextState(title, "en", "en", options)).toBe("own");
    // The owner changed it in English: the template's words go (the app shows the owner's text).
    const changed = { ...title, en: "Welcome to Kech Flora" };
    expect(screenTextState(changed, "ar", "en", options)).toBe("stale");
    // And typed their own Arabic: theirs.
    const own = { ...changed, ar: "أهلاً بك في كيش فلورا" };
    expect(screenTextState(own, "ar", "en", options)).toBe("own");
    expect(screenTextState({ en: "Welcome to Kech Flora" }, "tr", "en", options)).toBe("none");
    // What Studio › Screens says is what the app is served.
    const served = withoutStaleScreenTexts({ sign_in: { title: own } }, "en", isLanguageCode, options).sign_in.title;
    expect(Object.keys(served).sort()).toEqual(["ar", "en"]);
    // The words Studio › Screens is given are those the screens use: enough to tell.
    const used = screenWordsIn(screens, forms, app.appName);
    expect(used.length).toBeGreaterThan(0);
    expect(used.length).toBeLessThan(forms.length);
    expect(screenTextState(title, "ar", "en", { appName: app.appName, more: used })).toBe("template");
  });

  it("says it under each text in Arabic and Turkish, in the dashboard's three languages", async () => {
    const app = await kechFlora();
    const screens = app.hostedSettings!.studioScreens!;
    const words = screenWordsIn(screens, screenTextForms(), app.appName);
    const languages = [
      { code: "en", name: "English" },
      { code: "ar", name: "Arabic" },
      { code: "tr", name: "Turkish" },
    ];
    const editor = (initial: StudioScreens, lang: "en" | "ar" | "tr" = "en") =>
      html(createElement(ScreensEditor, { initial, languages, pages: [], appName: app.appName ?? "", color: "#8E2445", store: true, mainLanguage: "en", templateWords: words }), lang);
    const before = editor(screens);
    // The template's welcome and line: Yallapp's translation in Arabic and Turkish; nothing said under English.
    expect(states(before)).toEqual(expect.arrayContaining(["ar:template", "tr:template"]));
    expect(states(before).some((s) => s.startsWith("en:"))).toBe(false);
    expect(before).toContain("Arabic: Yallapp's translation of this text");
    // The owner's English welcome and their own Arabic one.
    const title = { ...screens.sign_in!.title, en: "Welcome to Kech Flora", ar: "أهلاً بك في كيش فلورا" };
    const after = editor({ ...screens, sign_in: { ...screens.sign_in!, title } });
    // The welcome's fields, in each language its title then its line.
    const welcome = (markup: string) => states(markup.slice(markup.indexOf(">The welcome<"))).slice(0, 4);
    expect(welcome(before)).toEqual(["ar:template", "ar:template", "tr:template", "tr:template"]);
    expect(welcome(after)).toEqual(["ar:own", "ar:template", "tr:none", "tr:template"]);
    expect(after).toContain("Arabic: your own translation");
    expect(after).toContain("Turkish: shows your text");
    // In Egyptian Arabic and Turkish.
    expect(editor({ ...screens, sign_in: { ...screens.sign_in!, title } }, "ar")).toContain("ترجمتك انت");
    expect(editor({ ...screens, sign_in: { ...screens.sign_in!, title } }, "tr")).toContain("kendi çeviriniz");
  });
});
