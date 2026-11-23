import { describe, expect, it } from "vitest";
import { hasUnplacedBlock, legalChanges, mergeLegalChanges, paragraphs, sentences, UNPLACED_END, UNPLACED_START, type LegalChange } from "@/lib/content/legal-diff";
import {
  BASE_FIELD,
  baseToRecord,
  LEGAL_KEYS,
  legalDefault,
  legalHash,
  legalUpdateFor,
  legalVersions,
} from "@/lib/content/legal-updates";
import { contentPage, readContentForm } from "@/lib/content/site";
import type { Lang } from "@/i18n/config";

/**
 * 172 A saved version of a legal page that lacks changes made to Yallapp's
 * default text since: the detection, the diff and "Add the new text".
 */

const LANGS: Lang[] = ["en", "ar", "tr"];

/** The three sentences Phase 106.11 added to the privacy policy, by language. */
const NEW_SENTENCES: Record<Lang, string[]> = {
  en: [
    "We use these details only to verify your identity and to pay out your earnings.",
    "We send the transfer details to our bank only to pay out designers' earnings.",
    "We keep the record of designers' earnings and payouts for as long as accounting and tax laws require, and we delete the copy of the ID and the verification details when the account is closed.",
  ],
  ar: [
    "نستخدم هذه البيانات فقط للتحقق من هويتك وتحويل أرباحك.",
    "نرسل بيانات التحويل إلى بنكنا لإتمام تحويل أرباح المصممين فقط.",
    "نحتفظ بسجل أرباح المصممين وتحويلاتهم طوال المدة التي تشترطها قوانين المحاسبة والضرائب، ونحذف صورة الهوية وبيانات التحقق عند إغلاق الحساب.",
  ],
  tr: [
    "Bu bilgileri yalnızca kimliğinizi doğrulamak ve kazançlarınızı ödemek için kullanırız.",
    "Ödeme bilgilerini bankamıza yalnızca tasarımcıların kazançlarının ödemesini tamamlamak için göndeririz.",
    "Tasarımcıların kazanç ve ödeme kayıtlarını muhasebe ve vergi yasalarının gerektirdiği süre boyunca saklarız; kimlik kopyasını ve doğrulama bilgilerini hesap kapatıldığında sileriz.",
  ],
};

/** 106.14 What 23 November 2026 added: two list items in section 2 (their start) and a sentence in section 6. */
const PUBLIC_PAGE: Record<Lang, { items: string[]; shared: string }> = {
  en: { items: ["- **Studio Market designers' public page:**", "- **Ratings of Studio Market templates:**"], shared: "A Studio Market designer's public page and the ratings and replies on Studio Market are public, and anyone can see them." },
  ar: { items: ["- **صفحة مصمم Studio Market العامة:**", "- **تقييمات قوالب Studio Market:**"], shared: "وصفحة مصمم Studio Market العامة والتقييمات والردود في Studio Market عامة، ويمكن لأي شخص رؤيتها." },
  tr: { items: ["- **Studio Market tasarımcısının herkese açık sayfası:**", "- **Studio Market şablonlarının puanları:**"], shared: "Studio Market tasarımcısının herkese açık sayfası ile Studio Market'teki puanlar ve yanıtlar herkese açıktır ve herkes görebilir." },
};

/** The privacy policy's default of 18 November 2026 (Phase 106.11's three sentences, before 106.14's public page). */
function of18(lang: Lang) {
  const found = legalVersions("privacy", lang).find((v) => v.updated.includes("18 ") && v.body.includes(NEW_SENTENCES[lang][0]!));
  if (!found) throw new Error("no 18 November version");
  return found;
}

/** The privacy policy's default before 18 November 2026. */
function before18(lang: Lang) {
  const versions = legalVersions("privacy", lang);
  const old = versions.filter((v) => Date.parse(v.since) < Date.parse("2026-11-18T00:00:00Z")).at(-1);
  if (!old) throw new Error("no earlier version");
  return old;
}

/** A saved version: by default saved on 17 November 2026, when the default was the one before 18 November. */
const savedOn = (fields: Record<string, string>, day = "2026-11-17T12:00:00Z") => ({ fields, updatedAt: new Date(day) });

describe("the default's history (src/content/legal-history.ts)", () => {
  it.each(LANGS.flatMap((lang) => LEGAL_KEYS.map((key) => [key, lang] as const)))("has the current default of %s (%s): run scripts/legal-history.mjs after changing it", (key, lang) => {
    expect(legalVersions(key, lang).at(-1)?.hash).toBe(legalHash(legalDefault(key, lang)));
  });

  it.each(LANGS)("has the privacy policy as it was before 18 November 2026 in %s, without the new sentences", (lang) => {
    const old = before18(lang);
    expect(old.updated).toMatch(/16/);
    for (const s of NEW_SENTENCES[lang]) {
      expect(old.body).not.toContain(s);
      expect(legalDefault("privacy", lang).body).toContain(s);
    }
  });
});

describe("the diff", () => {
  it.each(LANGS)("finds the one new list item and the two changed paragraphs of 18 November 2026 (%s)", (lang) => {
    const changes = legalChanges(before18(lang).body, of18(lang).body);
    expect(changes.map((c) => c.type)).toEqual(["added", "changed", "changed"]);
    const [item, shared, kept] = changes as [LegalChange, LegalChange, LegalChange];
    expect(item!.type === "added" && item.kind).toBe("item");
    expect(item!.type === "added" && item.text).toContain(NEW_SENTENCES[lang][0]);
    expect(item!.section).toMatch(/^## 2\./);
    expect(shared!.section).toMatch(/^## 6\./);
    expect(shared!.type === "changed" && shared.added.map((s) => s.text)).toEqual([NEW_SENTENCES[lang][1]]);
    expect(shared!.type === "changed" && shared.removed).toEqual([]);
    expect(kept!.section).toMatch(/^## 8\./);
    expect(kept!.type === "changed" && kept.added.map((s) => s.text)).toEqual([NEW_SENTENCES[lang][2]]);
  });

  it.each(LANGS)("finds 106.14's two new list items and the sentence added to section 6 on 23 November 2026 (%s)", (lang) => {
    const changes = legalChanges(of18(lang).body, legalDefault("privacy", lang).body);
    expect(changes.map((c) => c.type)).toEqual(["added", "added", "changed"]);
    const [page, ratings, shared] = changes as [LegalChange, LegalChange, LegalChange];
    expect(page.type === "added" && page.text.startsWith(PUBLIC_PAGE[lang].items[0]!)).toBe(true);
    expect(ratings.type === "added" && ratings.text.startsWith(PUBLIC_PAGE[lang].items[1]!)).toBe(true);
    expect(page.section).toMatch(/^## 2\./);
    expect(shared.section).toMatch(/^## 6\./);
    expect(shared.type === "changed" && shared.added.map((x) => x.text)).toEqual([PUBLIC_PAGE[lang].shared]);
    expect(shared.type === "changed" && shared.removed).toEqual([]);
  });

  it("splits a text into headings, list items and paragraphs, a wrapped line staying with its paragraph", () => {
    const text = "## 1. One\n\nFirst line\ncarries on.\n\n- a\n- b\n  more of b\n\nLast.";
    expect(paragraphs(text).map((p) => [p.kind, p.text])).toEqual([
      ["heading", "## 1. One"],
      ["para", "First line\ncarries on."],
      ["item", "- a"],
      ["item", "- b\n  more of b"],
      ["para", "Last."],
    ]);
    expect(sentences("- **Bold:** one. Two? Three.")).toEqual(["**Bold:**", "one.", "Two?", "Three."]);
  });

  it("tells a removed paragraph and a reworded sentence apart", () => {
    const changes = legalChanges("## A\n\nOne. Two. Three.\n\nGone for good here.", "## A\n\nOne. Two and a half. Three.");
    expect(changes).toEqual([
      { type: "changed", section: "## A", from: "One. Two. Three.", to: "One. Two and a half. Three.", added: [{ text: "Two and a half.", prev: "One.", next: "Three." }], removed: ["Two."] },
      { type: "removed", section: "## A", text: "Gone for good here." },
    ]);
  });
});

describe("the notice's detection", () => {
  it.each(LANGS)("shows for a saved privacy policy with no recorded base that lacks the three sentences (%s)", (lang) => {
    const old = before18(lang);
    const update = legalUpdateFor("privacy", lang, savedOn({ title: old.title, updated: old.updated, body: old.body }));
    expect(update).not.toBeNull();
    expect(update!.updatedOn).toBe("23 November 2026");
    expect(update!.updated).toBe(legalDefault("privacy", lang).updated);
    expect(update!.baseUpdated).toBe(old.updated);
    // 106.11's three and 106.14's two list items (its section 6 sentence is in the paragraph 106.11 changed).
    expect(update!.changes.filter((c) => c.pending)).toHaveLength(5);
  });

  it.each(LANGS)("doesn't show when the saved version already has the three sentences (%s)", (lang) => {
    const current = legalDefault("privacy", lang);
    // Saved before 18 November with no base: the team added them by hand, the retention sentence in a paragraph of its own and a paragraph of its own text.
    const own = current.body.replace(` ${NEW_SENTENCES[lang][2]}`, "").replace(/\n## 9\./, `\n${NEW_SENTENCES[lang][2]}\n\nOur own paragraph.\n\n## 9.`);
    expect(own).not.toBe(current.body);
    expect(legalUpdateFor("privacy", lang, savedOn({ body: own }))).toBeNull();
    expect(legalUpdateFor("privacy", lang, savedOn({ body: current.body }, "2026-11-18T12:00:00Z"))).toBeNull();
  });

  it("takes a version saved with no base as based on the default when it was saved", () => {
    const fourth = legalVersions("privacy", "en").find((v) => v.updated === "4 November 2026")!;
    const update = legalUpdateFor("privacy", "en", savedOn({ body: fourth.body }, "2026-11-10T10:00:00Z"));
    expect(update!.baseUpdated).toBe("4 November 2026");
    expect(update!.changes.filter((c) => c.pending).length).toBeGreaterThan(3);
    // Saved after 18 November with no base (before bases were recorded): still compared with the version before 18 November.
    const late = legalUpdateFor("privacy", "en", savedOn({ body: before18("en").body }, "2026-11-25T10:00:00Z"));
    expect(late!.baseUpdated).toBe("16 November 2026");
    expect(late!.changes.filter((c) => c.pending)).toHaveLength(5);
  });

  it("shows when only one of the three sentences is missing, with the other two marked as already there", () => {
    const current = legalDefault("privacy", "en").body;
    const update = legalUpdateFor("privacy", "en", savedOn({ body: current.replace(` ${NEW_SENTENCES.en[1]}`, "") }, "2026-11-18T12:00:00Z"));
    expect(update!.changes.map((c) => c.pending)).toEqual([false, false, false, true, false]);
  });

  it("uses the recorded base: none for a version based on the current default, the changes since an older one", () => {
    const current = legalDefault("privacy", "en");
    const old = before18("en");
    // Based on the current default, even with the team's own text and without the sentences: the team saw them.
    expect(legalUpdateFor("privacy", "en", savedOn({ body: "Our own text.\n", [BASE_FIELD]: legalHash(current) }, "2026-11-19T00:00:00Z"))).toBeNull();
    const older = legalVersions("privacy", "en").find((v) => v.updated === "4 November 2026")!;
    const update = legalUpdateFor("privacy", "en", savedOn({ body: old.body, [BASE_FIELD]: older.hash }, "2026-11-19T00:00:00Z"));
    expect(update!.baseUpdated).toBe("4 November 2026");
    // What 16 November added is in the saved text (it is the 16 November text): only the three and 106.14's two are pending.
    expect(update!.changes.filter((c) => c.pending)).toHaveLength(5);
    expect(update!.changes.length).toBeGreaterThan(5);
    // Based on the 18 November version: only 106.14's changes.
    const since18 = legalUpdateFor("privacy", "en", savedOn({ body: of18("en").body, [BASE_FIELD]: of18("en").hash }, "2026-11-20T00:00:00Z"));
    expect(since18!.baseUpdated).toBe("18 November 2026");
    expect(since18!.changes.filter((c) => c.pending)).toHaveLength(3);
  });

  it("shows nothing for a page with no saved text, a translation saved without its text, the terms and the refund policy unchanged since", () => {
    expect(legalUpdateFor("privacy", "en", null)).toBeNull();
    expect(legalUpdateFor("privacy", "ar", savedOn({ title: "عنوان" }))).toBeNull();
    expect(legalUpdateFor("terms", "en", savedOn({ body: legalDefault("terms", "en").body }, "2026-11-17T12:00:00Z"))).toBeNull();
    expect(legalUpdateFor("refund", "tr", savedOn({ body: legalDefault("refund", "tr").body }))).toBeNull();
    expect(legalUpdateFor("home", "en", savedOn({ body: "x" }))).toBeNull();
  });

  it("records only a base that is a version of the page's default", () => {
    const current = legalHash(legalDefault("privacy", "ar"));
    expect(baseToRecord("privacy", "ar", current)).toBe(current);
    expect(baseToRecord("privacy", "ar", before18("ar").hash)).toBe(before18("ar").hash);
    expect(baseToRecord("privacy", "en", current)).toBeNull();
    expect(baseToRecord("privacy", "en", "0123456789abcdef")).toBeNull();
    expect(baseToRecord("privacy", "en", "")).toBeNull();
    expect(baseToRecord("home", "en", legalHash(legalDefault("privacy", "en")))).toBeNull();
  });
});

describe("Add the new text", () => {
  it.each(LANGS)("turns the old default into the new one exactly (%s)", (lang) => {
    const update = legalUpdateFor("privacy", lang, savedOn({ body: before18(lang).body }))!;
    const merged = mergeLegalChanges(before18(lang).body, update.changes);
    expect(merged).toEqual({ text: legalDefault("privacy", lang).body, placed: 5, unplaced: [] });
  });

  it("keeps the team's own wording and puts each sentence next to the one it follows", () => {
    const old = before18("en").body;
    const own = old
      .replace("Billing records are kept for as long as accounting and tax laws require.", "Billing records are kept for 10 years.")
      .replace("We never sell personal data.", "We never sell or rent personal data.")
      .replace("- **Billing records:** your plan, dates and payment notes.", "- **Billing records:** your plan and invoices.");
    const update = legalUpdateFor("privacy", "en", savedOn({ body: own }))!;
    const merged = mergeLegalChanges(own, update.changes);
    expect(merged.unplaced).toEqual([]);
    expect(merged.placed).toBe(5);
    expect(merged.text).toContain(`Billing records are kept for 10 years. ${NEW_SENTENCES.en[2]} Signing keys`);
    expect(merged.text).toContain(`when the law requires it. ${NEW_SENTENCES.en[1]} ${PUBLIC_PAGE.en.shared} We never sell or rent personal data.`);
    // The new list item after the one before it in the default, though the team reworded the one before that.
    expect(merged.text).toMatch(/- \*\*How you found us:\*\*[^\n]*\n- \*\*Studio Market designers' details:\*\*/);
    expect(merged.text).toContain("- **Billing records:** your plan and invoices.");
    expect(legalUpdateFor("privacy", "en", savedOn({ body: merged.text }))).toBeNull();
  });

  it("puts what it can't place in a block at the end of its section, and the save is refused until the team moves it", () => {
    const old = before18("en").body;
    const section6 = old.match(/## 6\. Who we share it with\n\n([^\n]+)/)![1]!;
    const own = old.replace(section6, "Our providers are listed on request.");
    const update = legalUpdateFor("privacy", "en", savedOn({ body: own }))!;
    const merged = mergeLegalChanges(own, update.changes);
    expect(merged.placed).toBe(4);
    expect(merged.unplaced).toHaveLength(1);
    expect(merged.unplaced[0]).toContain(NEW_SENTENCES.en[1]);
    expect(merged.text).toMatch(new RegExp(`Our providers are listed on request\\.\\n\\n${UNPLACED_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n\\n[^\\n]+\\n\\n${UNPLACED_END}\\n\\n## 7\\.`));
    expect(hasUnplacedBlock(merged.text)).toBe(true);
    const page = contentPage("privacy")!;
    const refused = readContentForm(page, { title: "Privacy policy", updated: "18 November 2026", body: merged.text });
    expect(refused.ok).toBe(false);
    expect(!refused.ok && refused.errors.body).toMatch(/==== lines/);
    const placed = merged.text.replace(`${UNPLACED_START}\n\n`, "").replace(`\n\n${UNPLACED_END}`, "");
    expect(readContentForm(page, { title: "Privacy policy", updated: "18 November 2026", body: placed }).ok).toBe(true);
  });

  it("adds nothing twice, and leaves a text that has every change as it is", () => {
    const current = legalDefault("privacy", "tr").body;
    const changes = legalChanges(before18("tr").body, current);
    expect(mergeLegalChanges(current, changes)).toEqual({ text: current, placed: 0, unplaced: [] });
  });
});
