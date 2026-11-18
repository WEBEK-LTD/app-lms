import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ar, en, tr } from "@/i18n/dashboard/studio";
import { ar as pagesAr, en as pagesEn, tr as pagesTr } from "@/i18n/dashboard/pages";
import { newApp } from "@/lib/app/setup";
import { ACTION_TYPES, type StudioNode } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { accountSignOut, isSignOut } from "@/lib/studio/demo-pages";
import { APP_WORDS } from "@/lib/studio/app-words";

/**
 * 167 Sign out in Studio (the owner, 18 November 2026: "In the Leqaa or
 * KechFlora app, there's no Sign out in my account"): a `sign_out` tap
 * action the platform keeps, and every template's account page with an
 * explicit Sign out element, for a signed-in person, in English, Arabic
 * and Turkish. The app draws it as the account's own Sign out, last
 * (mobile/test/widget/phase167_sign_out_test.dart).
 */
const NOW = new Date("2026-11-18T09:00:00Z");
const app = { ...newApp("c", null, NOW, "store", null), section: "studio" as const };
const languages = { default: "en", available: ["en", "ar", "tr"] } as const;

describe("167 the sign_out action", () => {
  it("is one of the tap actions", () => {
    expect(ACTION_TYPES).toContain("sign_out");
  });

  it("is kept on a button, with nothing more to choose", () => {
    const parsed = parseStudioPage(
      { screen: "account", body: { id: "root", type: "column", children: [{ id: "out", type: "button", text: "Sign out", action: { type: "sign_out", url: "https://x.test" }, visibility: "signed_in" }] } },
      app,
      { ...languages, available: [...languages.available] },
    );
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    const out = parsed.ok ? parsed.value.body.children![0]! : null;
    expect(out?.action).toEqual({ type: "sign_out" });
    expect(out?.visibility).toBe("signed_in");
  });

  it("an unknown action is still refused", () => {
    const parsed = parseStudioPage({ body: { id: "root", type: "column", children: [{ id: "b", type: "button", text: "x", action: { type: "log_out" } }] } }, app, { ...languages, available: [...languages.available] });
    expect(parsed.ok).toBe(false);
  });

  it("has its words in Studio and the dashboard's pages, in the three languages", () => {
    for (const words of [en, ar, tr]) expect(words.tapSignOut).toBeTruthy();
    for (const words of [pagesEn, pagesAr, pagesTr]) expect(words.signsOut).toBeTruthy();
  });
});

describe("167 the templates' account pages", () => {
  it("the element: a Sign out button, for a signed-in person, its words in English, Arabic and Turkish", () => {
    let n = 0;
    const node = accountSignOut({ w: (word) => APP_WORDS.en[word], lang: "en", newId: () => `id${++n}` });
    expect(node).toMatchObject({ type: "button", text: "Sign out", action: { type: "sign_out" }, visibility: "signed_in", width: "fill" });
    expect(node.translations?.ar?.text).toBe("تسجيل الخروج");
    expect(node.translations?.tr?.text).toBe("Çıkış yap");
    expect(isSignOut(node)).toBe(true);
    expect(isSignOut({ id: "x", type: "button", action: { type: "screen", screen: "settings" } })).toBe(false);
    // In Arabic, the Arabic word first.
    const arabic = accountSignOut({ w: (word) => APP_WORDS.ar[word], lang: "ar", newId: () => "a" });
    expect(arabic.text).toBe("تسجيل الخروج");
    expect(arabic.translations?.en?.text).toBe("Sign out");
  });

  // The projects the templates make, as the platform writes them for the app's tests
  // (signature-looks.test.ts, studio-demo-templates.test.ts and leqaa-flowers.test.ts check they are current).
  const support = join(process.cwd(), "..", "..", "mobile", "test", "support");
  const files = [
    ...readdirSync(join(support, "signatures")).filter((f) => f.endsWith(".json")).map((f) => join("signatures", f)),
    ...readdirSync(support).filter((f) => f.endsWith("_demo.json")),
  ];

  it("there are the twenty looks and the demos", () => {
    expect(files.length).toBeGreaterThanOrEqual(30);
  });

  it.each(files)("%s: its account page has one Sign out element, for a signed-in person", (file) => {
    const project = JSON.parse(readFileSync(join(support, file), "utf8")) as { layout?: { pages: { studio?: { screen?: string; body: StudioNode } }[] }; pages?: { studio?: { screen?: string; body: StudioNode } }[] };
    const pages = project.layout?.pages ?? project.pages ?? [];
    const accounts = pages.filter((p) => p.studio?.screen === "account");
    expect(accounts.length).toBe(1);
    const outs = (accounts[0]!.studio!.body.children ?? []).filter(isSignOut);
    expect(outs).toHaveLength(1);
    expect(outs[0]).toMatchObject({ type: "button", visibility: "signed_in" });
  });
});
