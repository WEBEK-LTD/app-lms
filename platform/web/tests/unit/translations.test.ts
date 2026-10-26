import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { APP_STRINGS, parseInterfaceStrings } from "@/lib/i18n/app-strings";
import { builtInText, DICTIONARY_LANGUAGES, DICTIONARY_VERSION, localizedError, requestLanguage, serverMessage } from "@/lib/i18n/builtin";
import { PAGE_TEXTS_AR, SERVER_MESSAGES_AR } from "@/lib/i18n/builtin/ar";
import { PAGE_TEXTS_TR, SERVER_MESSAGES_TR } from "@/lib/i18n/builtin/tr";
import { parseImport, toCsv, toJson, toXliff, type ExchangeRow } from "@/lib/i18n/exchange";
import { checkTranslation, parseIcu, placeholderNames } from "@/lib/i18n/icu";
import { isLanguageCode, LOCALES, RTL_CODES } from "@/lib/i18n/locales";
import { languageList, packVersion, stringPack } from "@/lib/i18n/packs";
import { applyTranslations, contentRows, interfaceRows, progress } from "@/lib/i18n/translations";
import { hasWords, yallappPageTexts } from "@/lib/i18n/yallapp-texts";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { builtInSuggestions, withBuiltInTexts } from "@/lib/pages/builtin";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { applyDesign, DESIGNS } from "@/lib/pages/designs";
import { loadLayout, lookAndLanguages, publishLayout, saveDraft } from "@/lib/pages/layout";
import { languagesForPlan } from "@/lib/pages/plan";
import { pickLanguage, translated } from "@/lib/pages/translate";
import type { Layout, LayoutContent } from "@/lib/pages/types";
import { parseLanguages, parseLayoutContent } from "@/lib/pages/validate";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
// @ts-expect-error A plain ES module script, without types.
import { appStringsJson } from "../../scripts/app-strings.mjs";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

beforeEach(() => clearPlatformSettingsCache());

const ROOT = join(__dirname, "../..");

describe("43 Yallapp's own texts in Arabic and Turkish", () => {
  it("has every text Yallapp writes into an app's pages", () => {
    // Default tabs, page titles and home blocks of every kind of app, the designs' sample texts,
    // and what a new block starts with. Add the Arabic and Turkish to lib/i18n/builtin when this fails.
    const texts = yallappPageTexts();
    expect(texts.length).toBeGreaterThan(300);
    for (const lang of ["ar", "tr"]) {
      const missing = texts.filter((t) => hasWords(t) && builtInText(t, lang) === null);
      expect(missing, `missing in ${lang}`).toEqual([]);
    }
  });

  it("keeps placeholders and the HTML of every entry, and has no stale ones", () => {
    const texts = new Set(yallappPageTexts());
    for (const [name, source, ar, tr] of [
      ["pages", Object.keys(PAGE_TEXTS_AR), PAGE_TEXTS_AR, PAGE_TEXTS_TR],
      ["messages", Object.keys(SERVER_MESSAGES_AR), SERVER_MESSAGES_AR, SERVER_MESSAGES_TR],
    ] as const) {
      expect(Object.keys(tr).sort(), name).toEqual([...source].sort());
      for (const key of source) {
        for (const translation of [ar[key]!, tr[key]!]) {
          expect(translation.trim(), key).not.toBe("");
          expect(translation.match(/\{[a-z0-9]+\}/g)?.sort() ?? [], key).toEqual(key.match(/\{[a-z0-9]+\}/g)?.sort() ?? []);
          expect(translation.match(/<\/?[a-z0-9]+>/g) ?? [], key).toEqual(key.match(/<\/?[a-z0-9]+>/g) ?? []);
        }
      }
    }
    // Every page text in the dictionary is one Yallapp still writes.
    expect(Object.keys(PAGE_TEXTS_AR).filter((k) => !texts.has(k))).toEqual([]);
  });

  it("matches the app's name in texts it wrote, also an app without a name", () => {
    expect(builtInText("<h2>Welcome to Nile Academy</h2>", "ar")).toBe("<h2>مرحبًا بك في Nile Academy</h2>");
    expect(builtInText("<h2>Welcome to our app</h2>", "ar")).toBe("<h2>مرحبًا بك في تطبيقنا</h2>");
    expect(builtInText("<h2>Welcome to Nile &amp; Co</h2>", "tr")).toBe("<h2>Nile &amp; Co uygulamasına hoş geldiniz</h2>");
    expect(builtInText("Home", "tr")).toBe("Ana sayfa");
    // The owner's own text, and languages without Yallapp's translations.
    expect(builtInText("Start here", "ar")).toBeNull();
    expect(builtInText("Home", "fr")).toBeNull();
    expect(builtInText("Home", "en")).toBeNull();
    expect(DICTIONARY_LANGUAGES).toEqual(["ar", "tr"]);
  });

  it("has every message the hosted API answers with", () => {
    // The literal messages in the hosted API's code (`error(…, "…")`, `badRequest("…")`,
    // `message: "…"`), with `${…}` as {0}, {1}. Add them to lib/i18n/builtin when this fails.
    const files = ["hosted", "events", "news", "bookings", "donations", "listings", "courses", "catalog"].flatMap((d) => tsFiles(join(ROOT, "src/lib", d)));
    // Not answered to apps: a store's webhook, and the sign-in code's text message.
    // 58 Nor what the dashboard and Yallapp Business tell the owner (their catalogs translate it): 61 also sending later and moving appointments, 85.2 campaigns.
    const skip = /salla-webhook\.ts$|otp-sender\.ts$|send-notification\.ts$|courses\/edit\.ts$|courses\/quizzes\.ts$|scheduled-notifications\.ts$|bookings\/reschedule\.ts$|hosted\/campaigns\.ts$/;
    // 43 follow-up: the opening time in it is English (lib/catalog/fulfilment.ts).
    const later = new Set(["We're closed now.{0}{1}"]);
    const messages = new Set<string>();
    const patterns = [
      /(?:error|badRequest|bad|fail|refuse|reject|invalid|conflict)\(\s*(?:\d{3}\s*,\s*)?(?:[^,()]{1,60},\s*)?("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g,
      /message:\s*("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g,
      /\[\s*\d{3}\s*,\s*"[a-z_]+"\s*,\s*("(?:[^"\\]|\\.)*")/g,
    ];
    for (const file of files.filter((f) => !skip.test(f))) {
      const source = readFileSync(file, "utf8");
      for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
          const literal = match[1]!;
          let text = literal.startsWith('"') ? (JSON.parse(literal) as string) : literal.slice(1, -1);
          if (!/^[A-Z$]/.test(text)) continue;
          let n = 0;
          text = text.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, () => `{${n++}}`);
          messages.add(text);
        }
      }
    }
    expect(messages.size).toBeGreaterThan(100);
    for (const lang of ["ar", "tr"]) {
      const dictionary = lang === "ar" ? SERVER_MESSAGES_AR : SERVER_MESSAGES_TR;
      expect([...messages].filter((m) => !later.has(m) && !(m in dictionary)), `missing in ${lang}`).toEqual([]);
    }
  });

  it("answers hosted API messages in the asked language", () => {
    expect(serverMessage("Course not found.", "ar")).toBe("الدورة غير موجودة.");
    expect(serverMessage("Write a message of up to 2000 characters.", "tr")).toBe("En fazla 2000 karakterlik bir mesaj yazın.");
    expect(serverMessage("Nile Homes is paused right now. Please contact Nile Homes to bring it back.", "ar")).toBe("Nile Homes متوقف مؤقتًا الآن. يُرجى التواصل مع Nile Homes لإعادة تشغيله.");
    expect(serverMessage("Course not found.", "fr")).toBeNull();
    expect(requestLanguage("ar-EG,ar;q=0.9,en;q=0.8")).toBe("ar");
    expect(requestLanguage("fil_PH")).toBe("fil");
    expect(requestLanguage(null)).toBeNull();
    expect(localizedError({ code: "not_found", message: "Course not found." }, "tr")).toEqual({ code: "not_found", message: "Kurs bulunamadı." });
    expect(localizedError({ code: "x", message: "Something only the owner wrote." }, "tr")).toEqual({ code: "x", message: "Something only the owner wrote." });
  });
});

describe("43 Yallapp's translations in served layouts", () => {
  function layout(content: Partial<LayoutContent> = {}): Layout {
    const app = { ...newApp("c", null, NOW, "lms"), appName: "Nile Academy", backend: "hosted" as const };
    return { version: "v1", ...defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), ...content };
  }

  it("fills Arabic and Turkish where the owner wrote none, and the owner's always wins", () => {
    const base = layout({ languages: { default: "en", available: ["en", "ar", "tr", "fr"] } });
    base.tabs[0] = { ...base.tabs[0]!, translations: { ar: { label: "البداية" } } };
    base.tabs[1] = { ...base.tabs[1]!, label: "Lessons" };
    const served = withBuiltInTexts(base);
    expect(served.version).toBe(`v1~t${DICTIONARY_VERSION}`);
    expect(translated(served.tabs[0]!, "ar", "en").label).toBe("البداية");
    expect(translated(served.tabs[0]!, "tr", "en").label).toBe("Ana sayfa");
    // A name the owner changed is theirs: no translation.
    expect(translated(served.tabs[1]!, "ar", "en").label).toBe("Lessons");
    // French has no Yallapp texts: English shows until the owner translates.
    expect(translated(served.tabs[2]!, "fr", "en").label).toBe("My courses");
    expect(translated(served.tabs[2]!, "ar", "en").label).toBe("دوراتي");
    expect(translated(served.pages[0]!.blocks[0]!, "ar", "en").html).toBe("<h2>مرحبًا بك في Nile Academy</h2>");
    // The stored layout isn't changed.
    expect(base.tabs[2]).not.toHaveProperty("translations");
  });

  it("gives an Arabic-first app its main texts in Arabic", () => {
    const served = withBuiltInTexts(layout({ languages: { default: "ar", available: ["ar", "en"] } }));
    expect(served.tabs.map((t) => translated(t, "ar", "ar").label)).toEqual(["الرئيسية", "الدورات", "دوراتي", "الحساب"]);
    expect(translated(served.tabs[0]!, "en", "ar").label).toBe("Home");
  });

  it("gives the dashboard's phone preview the same texts, with the app's name", () => {
    const texts = builtInSuggestions("Nile & Co", ["en", "ar", "tr", "fr"]);
    expect(texts.Home).toEqual({ ar: "الرئيسية", tr: "Ana sayfa" });
    expect(texts["<h2>Welcome to Nile &amp; Co</h2>"]?.ar).toBe("<h2>مرحبًا بك في Nile &amp; Co</h2>");
    expect(builtInSuggestions("Nile", ["en", "fr"])).toEqual({});
  });

  it("leaves an English-only layout as it is", () => {
    const plain = layout();
    expect(withBuiltInTexts(plain)).toBe(plain);
  });

  it("translates every design in both languages", () => {
    for (const design of DESIGNS) {
      const content = applyDesign(design, {
        appName: "Nile",
        facts: { website: null, email: "hi@nile.test", whatsapp: null },
        current: { appearance: { ...BUILT_IN_APP_DEFAULTS.appearance, secondary_color: null }, languages: { default: "en", available: ["en", "ar", "tr"] } },
        now: NOW,
      });
      const app = { appType: "lms" as const, backend: "hosted" as const };
      void app;
      const served = withBuiltInTexts({ version: "v", ...content });
      for (const tab of served.tabs) {
        expect(tab.translations?.ar?.label, `${design.id} ${tab.label}`).toBeTruthy();
        expect(tab.translations?.tr?.label, `${design.id} ${tab.label}`).toBeTruthy();
      }
    }
  });
});

describe("43 any language", () => {
  it("lists every language the app's system screens come in, right to left set by the language", () => {
    expect(LOCALES).toHaveLength(82);
    expect(new Set(LOCALES.map((l) => l.code)).size).toBe(82);
    expect(LOCALES.filter((l) => l.rtl).map((l) => l.code)).toEqual(["ar", "fa", "he", "ps", "ug", "ur"]);
    expect(RTL_CODES).toEqual(expect.arrayContaining(["ku", "sd", "yi", "dv"]));
    for (const l of LOCALES) expect(l.nativeName.trim(), l.code).not.toBe("");
    expect(isLanguageCode("fr")).toBe(true);
    expect(isLanguageCode("xx")).toBe(false);
  });

  it("keeps the app's list the same as the platform's", () => {
    const dart = readFileSync(join(ROOT, "../../mobile/lib/core/l10n/locales.dart"), "utf8");
    const entries = [...dart.matchAll(/AppLocale\('([a-z]+)', '([^']+)', '([^']+)'\)/g)].map((m) => [m[1], m[2], m[3]]);
    expect(entries).toEqual(LOCALES.map((l) => [l.code, l.name, l.nativeName]));
    // And the plugin's, which passes the languages on.
    const php = readFileSync(join(ROOT, "../../wp-plugin/yallapp/includes/pages/class-translator.php"), "utf8");
    expect(/const LANGUAGES = '([a-z ]+)';/.exec(php)?.[1]?.split(" ")).toEqual(LOCALES.map((l) => l.code));
  });

  it("takes any of them, in the owner's order", () => {
    expect(parseLanguages({ default: "fr", available: ["en", "fr", "ar", "fa"] })).toEqual({ default: "fr", available: ["en", "fr", "ar", "fa"] });
    expect(parseLanguages({ default: "de", available: ["en"] })).toEqual({ default: "de", available: ["de", "en"] });
    const languages = { default: "en", available: ["en", "fr", "ar"] };
    expect(pickLanguage("fr-CA,fr;q=0.9", languages)).toBe("fr");
    expect(pickLanguage("de", languages)).toBe("en");
  });

  it("counts every language in the plan's limit, keeping the owner's order", () => {
    const plan = { limits: { languages: 2 } } as Parameters<typeof languagesForPlan>[1];
    expect(languagesForPlan({ default: "ar", available: ["fr", "ar", "en"] }, plan)).toEqual({ default: "ar", available: ["fr", "ar"] });
  });
});

describe("43 the app's own texts", () => {
  it("are a copy of the app's string files", () => {
    expect(readFileSync(join(ROOT, "src/lib/i18n/app-strings.json"), "utf8"), "run node scripts/app-strings.mjs").toBe(appStringsJson());
    expect(APP_STRINGS.length).toBeGreaterThan(800);
    expect(APP_STRINGS.find((s) => s.key === "tabHome")).toMatchObject({ en: "Home", ar: "الرئيسية", tr: "Ana sayfa" });
  });

  it("reads the app's message format", () => {
    expect(parseIcu("{count, plural, =1{1 item} other{{count} items}}")).toHaveLength(1);
    expect(placeholderNames("Hello {name}, {count, plural, =0{none} other{{count}}}")).toEqual(["name", "count"]);
    for (const entry of APP_STRINGS) {
      for (const text of [entry.en, entry.ar, entry.tr]) {
        if (text) expect(checkTranslation(entry.en, text, entry.placeholders ?? {}).errors, `${entry.key}: ${text}`).toEqual([]);
      }
    }
  });

  it("refuses unknown placeholders and broken plurals, and warns about missing ones", () => {
    const source = "{count, plural, =1{1 item} other{{count} items}}";
    expect(checkTranslation(source, "{count, plural, =1{1 article} other{{count} articles}}", { count: "int" })).toEqual({ errors: [], warnings: [] });
    expect(checkTranslation(source, "{total} articles", { count: "int" }).errors).toEqual(["{total} isn't a placeholder here. Use {count}."]);
    expect(checkTranslation(source, "{count, plural, =1{1 article}}", { count: "int" }).errors[0]).toContain('"other"');
    expect(checkTranslation(source, "{count, plural, =1{1 article} other{{count} articles}", { count: "int" }).errors[0]).toContain("closing }");
    expect(checkTranslation("Hi {name}", "{name, plural, other{x}}", { name: "String" }).errors).toEqual(["{name} isn't a number, so it can't have plural forms."]);
    expect(checkTranslation("Home", "Accueil {x}", {}).errors).toEqual(["{x} isn't a placeholder here: this text has none."]);
    expect(checkTranslation("Hi {name}", "Salut", { name: "String" })).toEqual({ errors: [], warnings: ["{name} isn't in your text."] });
    expect(checkTranslation("Hi {name}", "Salut }", { name: "String" }).errors).toHaveLength(1);
  });

  it("keeps the owner's strings that are valid, and says which aren't", () => {
    const problems: string[] = [];
    const strings = parseInterfaceStrings(
      { fr: { tabHome: " Accueil ", itemCount: "{total} articles", nope: "x", tabCourses: "" }, xx: { tabHome: "?" } },
      (where, message) => problems.push(`${where}: ${message}`),
    );
    expect(strings).toEqual({ fr: { tabHome: "Accueil" } });
    expect(problems).toEqual(["Translations (French): itemCount: {total} isn't a placeholder here. Use {count}.", "Translations: xx isn't a language apps support."]);
  });
});

describe("43 the Translations page", () => {
  function draft(): LayoutContent {
    const app = { ...newApp("c", null, NOW, "lms"), appName: "Nile Academy", backend: "hosted" as const };
    return { ...defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), languages: { default: "en", available: ["en", "ar", "fr"] } };
  }

  it("lists the owner's texts and the app's, with Yallapp's where it has one", () => {
    const layout = draft();
    const ar = contentRows(layout, "ar");
    expect(ar.find((r) => r.id === "tab|home|label")).toMatchObject({ source: "Home", value: "", builtin: "الرئيسية" });
    expect(contentRows(layout, "fr").find((r) => r.id === "tab|home|label")).toMatchObject({ builtin: null });
    expect(contentRows(layout, "en")).toEqual([]);
    const fr = interfaceRows(layout, "fr");
    expect(fr).toHaveLength(APP_STRINGS.length);
    expect(fr.find((r) => r.id === "itemCount")).toMatchObject({ builtin: null, placeholders: { count: "int" } });
    expect(progress([...contentRows(layout, "fr"), ...fr]).done).toBe(0);
    const arProgress = progress([...ar, ...interfaceRows(layout, "ar")]);
    expect(arProgress.done).toBe(arProgress.total);
  });

  it("saves translations of both kinds; empty brings back the fallback", () => {
    let layout = applyTranslations(draft(), "fr", { "tab|home|label": "Accueil", tabHome: "Accueil", "page|home|title": "Accueil", "block|home|welcome|html": "<h2>Bienvenue</h2>" });
    expect(layout.tabs[0]!.translations).toEqual({ fr: { label: "Accueil" } });
    expect(layout.pages[0]!.blocks[0]!.translations).toEqual({ fr: { html: "<h2>Bienvenue</h2>" } });
    expect(layout.strings).toEqual({ fr: { tabHome: "Accueil" } });
    layout = applyTranslations(layout, "fr", { "tab|home|label": "", tabHome: "" });
    expect(layout.tabs[0]).not.toHaveProperty("translations");
    expect(layout.strings).toEqual({});
    // Yallapp's own text isn't stored as the owner's.
    layout = applyTranslations(layout, "ar", { "tab|home|label": "الرئيسية", tabHome: "الرئيسية", tabCourses: "الكورسات" });
    expect(layout.tabs[0]).not.toHaveProperty("translations");
    expect(layout.strings).toEqual({ ar: { tabCourses: "الكورسات" } });
  });

  it("exports and imports CSV, JSON and XLIFF without losing a character", () => {
    const rows: ExchangeRow[] = [
      { id: "tab|home|label", source: "Home", translation: "Accueil", where: "Tab label" },
      { id: "itemCount", source: "{count, plural, =1{1 item} other{{count} items}}", translation: "{count, plural, =1{1 article} other{{count} articles}}" },
      { id: "block|home|welcome|html", source: '<h2>Welcome, "friends" & co</h2>', translation: '<h2>Bienvenue, "amis" & co</h2>\nLigne 2; fin' },
      { id: "tabCart", source: "Cart", translation: "عربة التسوق" },
      { id: "empty", source: "Not translated", translation: "" },
    ];
    const expected = { "tab|home|label": "Accueil", itemCount: rows[1]!.translation, "block|home|welcome|html": rows[2]!.translation, tabCart: "عربة التسوق" };
    expect(parseImport("translations-fr.csv", toCsv(rows))).toEqual({ translations: expected, language: null, error: null });
    expect(parseImport("translations-fr.json", toJson(rows, "fr"))).toEqual({ translations: expected, language: "fr", error: null });
    expect(parseImport("translations-fr.xlf", toXliff(rows, "en", "fr"))).toEqual({ translations: expected, language: "fr", error: null });
    expect(parseImport("x.json", JSON.stringify({ tabHome: "Accueil" })).translations).toEqual({ tabHome: "Accueil" });
    expect(parseImport("x.csv", "key,text\nx,y").error).toContain('"id"');
    expect(parseImport("x.json", "{not json").error).toBeTruthy();
  });
});

describe("43 string packs and the fallback chain", () => {
  let store: MemoryStore;
  let app: App;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", appName: "Nile Academy" };
    await store.createApp(app);
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now: NOW,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender: new LogSender(),
    push: false,
    assetUrl: (id) => `https://yallapp.test/a/${id}`,
    platformUrl: "https://yallapp.test",
  });

  it("serves the owner's French over English, Yallapp's Arabic, and a pack for the app's own texts", async () => {
    const record = await loadLayout(store, app, NOW);
    let content: LayoutContent = { ...record.draft, languages: { default: "en", available: ["en", "fr", "ar"] } };
    content = applyTranslations(content, "fr", { "tab|home|label": "Accueil", tabHome: "Accueil", itemCount: "{count, plural, =1{1 article} other{{count} articles}}" });
    const published = await publishLayout(store, app, { ...content, strings: content.strings }, "owner@nile.test", NOW);
    expect(published.ok).toBe(true);

    const config = await handleHosted(context(), { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }), body: undefined, token: null });
    expectContract("GET", "/config", config);
    const languages = (config.body as { languages: { list: { code: string; native_name: string; direction: string; strings: { url: string; version: string } | null }[] } }).languages;
    expect(languages.list.map((l) => [l.code, l.native_name, l.direction])).toEqual([
      ["en", "English", "ltr"],
      ["fr", "Français", "ltr"],
      ["ar", "العربية", "rtl"],
    ]);
    const version = packVersion({ tabHome: "Accueil", itemCount: "{count, plural, =1{1 article} other{{count} articles}}" })!;
    expect(languages.list[1]!.strings).toEqual({ url: `https://yallapp.test/api/app/${app.id}/strings/fr?v=${version}`, version });
    expect(languages.list[0]!.strings).toBeNull();

    const nav = async (lang: string) =>
      (
        await handleHosted(context(), { method: "GET", path: ["pages"], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) })
      ).body as { tabs: { label: string }[] };
    // The owner's string, then Yallapp's for that language, then the default (English).
    expect((await nav("fr")).tabs.map((t) => t.label)).toEqual(["Accueil", "Courses", "My courses", "Account"]);
    expect((await nav("ar")).tabs.map((t) => t.label)).toEqual(["الرئيسية", "الدورات", "دوراتي", "الحساب"]);
    expect((await nav("en")).tabs.map((t) => t.label)).toEqual(["Home", "Courses", "My courses", "Account"]);

    const saved = await loadLayout(store, app, NOW);
    expect(stringPack(saved.published?.strings, "fr")).toEqual({ language: "fr", version, strings: { tabHome: "Accueil", itemCount: "{count, plural, =1{1 article} other{{count} articles}}" } });
    expect(stringPack(saved.published?.strings, "ar")).toEqual({ language: "ar", version: "empty", strings: {} });
  });

  it("answers errors in the app's language", async () => {
    const result = await handleHosted(context(), { method: "GET", path: ["pages", "Bad Slug"], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": "tr-TR" }) });
    expect(result.body).toEqual({ code: "invalid_request", message: "Bu sayfa adresi geçerli değil." });
    const me = await handleHosted(context(), { method: "GET", path: ["me"], query: new URLSearchParams(), body: undefined, token: null, headers: new Headers({ "accept-language": "ar" }) });
    expect(me.body).toMatchObject({ message: "انتهت جلستك. يُرجى تسجيل الدخول مرة أخرى." });
  });

  it("keeps the strings when the page editor saves, and checks them", async () => {
    const record = await loadLayout(store, app, NOW);
    const withStrings = await saveDraft(store, app, { ...record.draft, strings: { fr: { tabHome: "Accueil" } } }, NOW);
    expect(withStrings.ok).toBe(true);
    const { strings: _s, ...editorDraft } = (await loadLayout(store, app, NOW)).draft;
    void _s;
    const saved = await saveDraft(store, app, editorDraft, NOW);
    expect(saved.ok && saved.value.draft.strings).toEqual({ fr: { tabHome: "Accueil" } });
    const bad = parseLayoutContent({ ...editorDraft, strings: { fr: { itemCount: "{n} articles" } } }, { app, now: NOW });
    expect(bad.ok ? [] : bad.errors).toEqual(["Translations (French): itemCount: {n} isn't a placeholder here. Use {count}."]);
  });

  it("names each language even before the first publish", async () => {
    const { languages } = await lookAndLanguages(store, app, undefined, null, { platformUrl: "https://yallapp.test" });
    expect(languages).toEqual({ ...BUILT_IN_APP_DEFAULTS.languages, list: [{ code: "en", name: "English", native_name: "English", direction: "ltr", strings: null }] });
    expect(languageList({ available: ["ug"] }, undefined, { platformUrl: "https://p.test", appId: "a" })[0]).toMatchObject({ native_name: "ئۇيغۇرچە", direction: "rtl" });
  });
});

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsFiles(path);
    return name.endsWith(".ts") ? [path] : [];
  });
}
