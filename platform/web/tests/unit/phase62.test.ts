import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { totalsOfDay } from "@/lib/analytics/aggregate";
import { reportCsv } from "@/lib/analytics/csv";
import { dayOf } from "@/lib/analytics/days";
import { parseBatch } from "@/lib/analytics/ingest";
import { csvWords, localizedReport } from "@/lib/analytics/localize";
import { loadReport, rangeFrom } from "@/lib/analytics/report";
import type { AnalyticsEventRow } from "@/lib/analytics/types";
import { itemWord } from "@/lib/analytics/words";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { dashboardTextFor } from "@/lib/dashboard-words";
import { getDashT, knownTranslator } from "@/i18n/dashboard";
import { checkTranslation } from "@/lib/i18n/icu";
import { APP_STRINGS } from "@/lib/i18n/app-strings";
import { APP_STRING_NOTES, appStringNote, plainDescription } from "@/lib/i18n/app-string-notes";
import { interfaceRows } from "@/lib/i18n/translations";
import { PaymentError } from "@/lib/payments/errors";
import { explainPaymentError } from "@/lib/payments/explain";
import { IyzicoError } from "@/lib/payments/iyzico";
import { DONATIONS_REVIEW_NOTE } from "@/lib/publishing/review-notes";

const NOW = new Date("2026-10-19T12:00:00Z");
const INSTALL = "3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b";

describe("62 payment providers' answers in plain words", () => {
  it("keeps our own sentences and explains a refusal, with the provider's words after Details", () => {
    expect(explainPaymentError("kashier", new PaymentError("Kashier can't be reached.", { unreachable: true }))).toBe("Kashier can't be reached.");
    expect(explainPaymentError("iyzico", new IyzicoError("iyzico couldn't make the refund."))).toBe("iyzico couldn't make the refund.");
    expect(explainPaymentError("iyzico", new IyzicoError("api bilgileri bulunamadı"))).toBe(
      "iyzico didn't accept the API keys. Check them in your iyzico panel and enter them again. Details: api bilgileri bulunamadı",
    );
    // Yallapp's own keys: the client can't fix them.
    expect(explainPaymentError("kashier", new PaymentError("Invalid merchant"), { whose: "yallapp" })).toBe(
      "Kashier didn't accept Yallapp's request. Try again later, or message us on WhatsApp. Details: Invalid merchant",
    );
    expect(explainPaymentError("kashier", new PaymentError("Refund amount exceeds the captured amount"))).toBe(
      "Kashier refused the amount: it's more than what's left of this payment. Details: Refund amount exceeds the captured amount",
    );
    expect(explainPaymentError("iyzico", new IyzicoError("Geçersiz IBAN numarası"))).toMatch(/^iyzico didn't accept the IBAN\./);
    expect(explainPaymentError("iyzico", new IyzicoError("Something odd"), { fallback: "iyzico didn't accept these details." })).toBe(
      "iyzico didn't accept these details. Details: Something odd",
    );
    expect(explainPaymentError("fawaterk", new PaymentError("Something odd"))).toBe("Fawaterk refused the request. Details: Something odd");
  });

  it("are translated in the dashboard, the provider's own words kept, also inside other messages", () => {
    const ar = knownTranslator("ar");
    const tr = knownTranslator("tr");
    expect(ar("iyzico didn't accept the IBAN. Check it and try again. Details: Geçersiz IBAN")).toBe("لم يقبل iyzico رقم الآيبان. تحقّق منه وحاول مرة أخرى. التفاصيل: Geçersiz IBAN");
    expect(tr("Nothing was refunded. Kashier refused the amount: it's more than what's left of this payment. Details: Refund amount exceeds")).toBe(
      "Hiçbir şey iade edilmedi. Kashier tutarı reddetti: bu ödemeden kalandan fazla. Ayrıntılar: Refund amount exceeds",
    );
    expect(ar("The payment couldn't start: Kashier can't be reached.")).not.toMatch(/[A-Za-z]{3,} can't/);
    expect(ar("The payment couldn't start: Kashier can't be reached.")).toContain("تعذّر الوصول إلى Kashier.");
    expect(tr("Kashier didn't accept these keys. Check them, and that they're your test keys.")).toBe(
      "Kashier bu anahtarları kabul etmedi. Kontrol edin ve test anahtarlarınız olduğundan emin olun.",
    );
    expect(tr("Choose who sends your app's emails.")).toBe("Uygulamanızın e-postalarını kimin göndereceğini seçin.");
  });

  it("translate an email server's answer inside the warning about it", () => {
    const ar = knownTranslator("ar");
    const said = 'The email server refused the username or password. Check both; Google, Microsoft, Zoho and Yandex need an app password here. The server said: "535 5.7.8 Username and Password not accepted"';
    const notice = ar(`The test email wasn't sent. ${said}`);
    expect(notice).toContain('"535 5.7.8 Username and Password not accepted"');
    expect(notice).not.toContain("The email server refused");
    expect(ar("1 customer signed up with their email address. A connected platform finds customers by their phone number, so this app would sign in by phone only, and they couldn't sign in any more. Tick the box to switch anyway.")).not.toMatch(
      /Tick the box|signed up with/,
    );
  });

  it("translate what's wrong with a text's placeholders", () => {
    const tr = knownTranslator("tr");
    const [error] = checkTranslation("Hello {name}", "Merhaba {name", {}).errors;
    expect(error).toBe("A { has no } after it.");
    expect(tr(error!)).toBe("Bir { işaretinden sonra } yok.");
    expect(knownTranslator("ar")('{count, plural, …} needs an "other" choice.')).toBe('{count, plural, …} يحتاج إلى خيار "other".');
  });
});

describe("62 counts in English", () => {
  it("say 1 lesson and 1 student", () => {
    const t = getDashT("en");
    expect(t("courses.courseLine", { price: "₺450.00", lessons: 1, students: 0 })).toBe("₺450.00 · 1 lesson · 0 students");
    expect(t("courses.courseLine", { price: "Free", lessons: 3, students: 1 })).toBe("Free · 3 lessons · 1 student");
    expect(getDashT("ar")("bookings.classLine", { coach: "Ali", minutes: 45, spots: 2 })).toBe("Ali · 45 د · مكانان");
  });
});

describe("62 notes for store reviewers", () => {
  it("stay in English, with their meaning in the dashboard's language", () => {
    const meaning = knownTranslator("ar")(DONATIONS_REVIEW_NOTE);
    expect(meaning).not.toBe(DONATIONS_REVIEW_NOTE);
    expect(meaning).toContain("Safari");
    expect(getDashT("tr")("publishing.reviewMeaning", { meaning: "x" })).toBe("Önerilen notun anlamı: x");
  });
});

describe("62 the Languages page's interface strings", () => {
  it("say what each is for in the dashboard's language, without the app's code names", () => {
    const described = [...new Set(APP_STRINGS.map((s) => s.description).filter((d): d is string => Boolean(d)))];
    const missing = described.filter((d) => !APP_STRING_NOTES[d]);
    expect(missing).toEqual([]);
    for (const description of described) {
      for (const lang of ["en", "ar", "tr"] as const) {
        const note = appStringNote(description, lang);
        expect(note, `${lang}: ${description}`).not.toMatch(/\.dart|Config\.|lib\//);
        if (lang !== "en") expect(note).not.toBe(description);
      }
      expect(APP_STRING_NOTES[description]!.tr, description).not.toMatch(/[؀-ۿ]/);
    }
    const rows = interfaceRows({ strings: {} }, "fr", "ar");
    expect(rows.find((r) => r.id === "languageName")!.where).toBe("اسم اللغة بلغتها نفسها، ويظهر في قائمة اختيار اللغة.");
    expect(plainDescription("lib/core/l10n/vertical_wording.dart uses it in gym apps (Config.vertical fitness) instead of the general bookings word.")).toBe("");
    expect(plainDescription("47 A ticket the organiser refunded.")).toBe("A ticket the organiser refunded.");
  });
});

const contract = parse(readFileSync(path.join(__dirname, "../../../../docs/api/platform.yaml"), "utf8")) as Record<string, unknown>;
const ajv = new Ajv2020({ strict: false, validateSchema: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(contract, "platform");
const batchSchema = ajv.getSchema("platform#/components/schemas/AnalyticsBatch")!;

function row(over: Partial<AnalyticsEventRow>): AnalyticsEventRow {
  const at = over.at ?? new Date("2026-10-18T10:00:00Z");
  return {
    appId: "app",
    installId: INSTALL,
    type: "app_open",
    at,
    day: dayOf(at),
    platform: "ios",
    appVersion: "1.2.0",
    osVersion: "iOS 18.1",
    language: "ar",
    country: "EG",
    firstOpen: false,
    screen: null,
    itemKind: null,
    itemId: null,
    title: null,
    amountCents: null,
    currency: null,
    notificationId: null,
    pushType: null,
    ...over,
  };
}

async function academy(store: MemoryStore): Promise<App> {
  const app: App = { ...newApp("client-1", "https://school.test", NOW, "lms"), appName: "Nour Academy" };
  await store.createApp(app);
  return app;
}

describe("62 screenshots of protected lessons", () => {
  it("come in as a contract event, with the lesson or without", () => {
    const body = {
      install_id: INSTALL,
      platform: "ios",
      app_version: "1.3.0",
      events: [
        { type: "screenshot", at: "2026-10-19T11:00:00Z", item_kind: "lesson", item_id: "12", title: "Fractions" },
        { type: "screenshot", at: "2026-10-19T11:01:00Z" },
      ],
    };
    expect(batchSchema(body), JSON.stringify(batchSchema.errors)).toBe(true);
    const parsed = parseBatch(body, NOW);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.events.map((e) => [e.type, e.itemKind, e.itemId, e.title])).toEqual([
      ["screenshot", "lesson", "12", "Fractions"],
      ["screenshot", null, null, null],
    ]);
  });

  it("are counted per lesson, shown most first, and exported in the downloader's language", async () => {
    const rows = totalsOfDay([
      row({ type: "screenshot", itemKind: "lesson", itemId: "12", title: "Fractions" }),
      row({ type: "screenshot", itemKind: "lesson", itemId: "12", title: "Fractions" }),
      row({ type: "screenshot", itemKind: "lesson", itemId: "13", title: "Decimals" }),
      row({ type: "screenshot" }),
    ]);
    expect(rows.filter((r) => r.metric === "screenshot")).toEqual([
      { metric: "screenshot", key: "lesson:12", label: "Fractions", value: 2 },
      { metric: "screenshot", key: "lesson:13", label: "Decimals", value: 1 },
      { metric: "screenshot", key: "other", label: null, value: 1 },
    ]);

    const store = new MemoryStore();
    const app = await academy(store);
    await store.insertAnalyticsEvents([
      row({ appId: app.id, type: "app_open" }),
      row({ appId: app.id, type: "screenshot", itemKind: "lesson", itemId: "12", title: "Fractions" }),
      row({ appId: app.id, type: "screenshot", itemKind: "lesson", itemId: "12", title: "Fractions" }),
      row({ appId: app.id, type: "screenshot" }),
    ]);
    const report = await loadReport(store, app.id, rangeFrom({ range: "7" }, NOW), NOW);
    expect(report.screenshots).toEqual([
      { kind: "lesson", id: "12", title: "Fractions", count: 2 },
      { kind: "other", id: "", title: "", count: 1 },
    ]);

    const english = reportCsv(report, itemWord);
    expect(english.split("\r\n")[0]).toBe("section,name,detail,value,previous_period");
    expect(english).toContain("Screenshots taken,Fractions,Lesson 12,2,");
    expect(english).toContain("Screenshots taken,Elsewhere in the app,,1,");

    const text = dashboardTextFor("ar");
    const arabic = reportCsv(localizedReport(report, text), itemWord, csvWords(text));
    const [head, ...rest] = arabic.split("\r\n");
    expect(head).toBe("القسم,الاسم,التفاصيل,القيمة,الفترة السابقة");
    expect(arabic).toContain("لقطات الشاشة,Fractions,درس 12,2,");
    expect(arabic).toContain("المنصات,iOS,,1,");
    expect(arabic).toContain("الدول,مصر,,1,");
    expect(rest.join("\n")).not.toMatch(/Summary|Platforms|Screenshots|Elsewhere/);
    const turkish = reportCsv(localizedReport(report, dashboardTextFor("tr")), itemWord, csvWords(dashboardTextFor("tr")));
    expect(turkish.split("\r\n")[0]).toBe("Bölüm,Ad,Ayrıntı,Değer,Önceki dönem");
  });
});

describe("62 the donations' and attendees' CSV files", () => {
  it("have their column names and words in the downloader's language", async () => {
    const { donationsCsv } = await import("@/lib/donations/forms");
    const k = knownTranslator("tr");
    const file = donationsCsv(
      [
        {
          id: 7,
          appId: "app",
          campaignId: 1,
          campaignTitle: "Water wells",
          userId: null,
          amountCents: 10_000,
          currency: "TRY",
          recurring: "monthly",
          donorName: "Ali",
          donorEmail: "ali@example.com",
          donorPhone: null,
          anonymous: false,
          message: null,
          status: "paid",
          createdAt: NOW,
          paidAt: NOW,
        } as unknown as Parameters<typeof donationsCsv>[0][number],
      ],
      k,
    );
    const [head, line] = file.replace(/^﻿/, "").split("\r\n");
    expect(head).toBe("Referans,Tarih (UTC),Durum,Kampanya,Tutar,Para birimi,Tekrar,Bağışçı,E-posta,Telefon,Anonim,Mesaj");
    expect(line).toContain(",ödendi,Water wells,100.00,TRY,Aylık,Ali,ali@example.com,,Hayır,");
    expect(knownTranslator("ar")("Checked in at")).toBe("وقت الدخول");
  });
});

describe("62 plan texts in Arabic and Turkish", () => {
  it("show what the team wrote in the language, else the built-in translation, else the English", async () => {
    const { planFor, plansIn } = await import("@/lib/marketing-lang");
    const { PLAN_INFO, plansWith, planSettingOf, cleanPlanTranslations } = await import("@/lib/plans");
    // Untouched: the built-in translation, the name as it is.
    const growthAr = planFor("ar", PLAN_INFO.growth);
    expect(growthAr.name).toBe("Growth");
    expect(growthAr.tagline).not.toBe(PLAN_INFO.growth.tagline);
    // The team's English edit, without Arabic: the English.
    const edited = plansWith({ growth: { ...planSettingOf(PLAN_INFO.growth), tagline: "Apps that grow" } }).growth;
    expect(planFor("ar", edited).tagline).toBe("Apps that grow");
    // The team's Arabic: first, empty fields fall back.
    const withAr = plansWith({
      growth: { ...planSettingOf(PLAN_INFO.growth), tagline: "Apps that grow", translations: { ar: { name: "النمو", tagline: "تطبيقات تنمو", highlights: ["أ", " ", "ب"], price: "" } } },
    }).growth;
    expect(withAr.translations).toEqual({ ar: { name: "النمو", tagline: "تطبيقات تنمو", highlights: ["أ", "ب"] } });
    const ar = planFor("ar", withAr);
    expect([ar.name, ar.tagline, ar.highlights]).toEqual(["النمو", "تطبيقات تنمو", ["أ", "ب"]]);
    expect(planFor("tr", withAr).name).toBe("Growth");
    expect(planFor("tr", withAr).tagline).toBe("Apps that grow");
    expect(planFor("en", withAr).name).toBe("Growth");
    expect(plansIn("ar", { growth: withAr }).growth.name).toBe("النمو");
    // Saved again, the translations stay.
    expect(planSettingOf(withAr).translations?.ar?.name).toBe("النمو");
    expect(cleanPlanTranslations({ fr: { name: "x" }, tr: { name: "  " } })).toBeUndefined();
  });
});

describe("62 Arabic in the share images", () => {
  const cp = (s: string) => [...s].map((c) => c.codePointAt(0)!.toString(16)).join(" ");
  it("joins letters by their joining types, across marks, with lam-alef and Persian letters", async () => {
    const { shapeArabic, visualLine } = await import("@/lib/arabic-shape");
    // مَرْحَبًا: meem initial, reh final (it doesn't join forward), hah initial, beh medial, alef final; the marks stay with their letters.
    expect(cp(shapeArabic("مَرْحَبًا"))).toBe("fee3 64e feae 652 fea3 64e fe92 64b fe8e");
    // Drawn last letter first; the renderer puts a zero-width mark over the glyph after it, so each mark comes just before its letter.
    expect(cp(visualLine("مَرْحَبًا"))).toBe("fe8e 64b fe92 64e fea3 652 feae 64e fee3");
    // لا after a joining letter: the final ligature; a mark on the lam follows it.
    expect(cp(shapeArabic("فلا"))).toBe("fed3 fefc");
    expect(cp(shapeArabic("لَا"))).toBe("fefb 64e");
    // Hamza on the line joins nothing; tatweel joins both sides; ZWNJ stops joining and goes.
    expect(cp(shapeArabic("جاء"))).toBe("fe9f fe8e fe80");
    expect(cp(shapeArabic("بـب"))).toBe("fe91 640 fe90");
    expect(cp(shapeArabic("می‌خواهم"))).toBe("fee3 fbfd fea7 feee fe8d feeb fee2");
    expect(cp(shapeArabic("پیام"))).toBe("fb58 fbff fe8e fee1");
  });

  it("keeps numbers and Latin words reading left to right, and mirrors brackets", async () => {
    const { rtlWords, visualLine, visualWord } = await import("@/lib/arabic-shape");
    const users = visualWord("مستخدم");
    const upTo = visualWord("حتى");
    expect(visualLine("حتى 1,000 مستخدم")).toBe(`${users} 1,000 ${upTo}`);
    expect(visualLine("الإصدار 3.5 جاهز")).toBe(`${visualWord("جاهز")} 3.5 ${visualWord("الإصدار")}`);
    // Arabic-Indic digits too.
    expect(visualLine("١٢٣ درسًا")).toBe(`${visualWord("درسًا")} ١٢٣`);
    // A Latin phrase stays in its order, between Arabic words.
    expect(visualLine("على Google Play الآن")).toBe(`${visualWord("الآن")} Google Play ${visualWord("على")}`);
    expect(rtlWords("حتى 1,000 مستخدم على Google Play")).toEqual([upTo, "1,000", users, visualWord("على"), "Google Play"]);
    // Brackets are drawn mirrored around right-to-left text.
    expect(visualLine("(تجربة)")).toBe(`(${visualWord("تجربة")})`);
    expect(visualLine("تطبيق Android (APK وAAB)")).toBe(`(AAB${visualWord("و")} APK) Android ${visualWord("تطبيق")}`);
    expect(visualLine("Yallapp")).toBe("Yallapp");
  });
});

describe("62 Arabic share images wrap by words", () => {
  it("cut the line at the spaces between right-to-left words, brackets kept with their words", async () => {
    const { rtlWords, visualWord } = await import("@/lib/arabic-shape");
    expect(rtlWords("تطبيق Android (APK وAAB)")).toEqual([visualWord("تطبيق"), "Android", "APK)", `(AAB${visualWord("و")}`]);
    expect(rtlWords("  Yallapp  app ")).toEqual(["Yallapp app"]);
    expect(rtlWords("")).toEqual([]);
  });
});
