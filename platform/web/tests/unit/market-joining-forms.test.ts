import { describe, expect, it } from "vitest";
import type { MarketApplicationForm } from "@/lib/data/types";
import { checkApplication } from "@/lib/market/joining";
import { addQuestion, answersFromForm, chosenKind, moveQuestion, parseJoinFormMeta, parseQuestion, removeQuestion, replaceQuestion } from "@/lib/market/joining-forms";
import { PRIVATE_PATHS } from "@/lib/sitemap";

const q = (label: string, kind: string, extra: Record<string, string> = {}) => parseQuestion({ label, kind, ...extra });

describe("115.12 the joining form's builder", () => {
  it("reads the form's words and kinds, all kinds when none is ticked", () => {
    expect(parseJoinFormMeta({ title: "Join Nile Market", intro: "Hello", kind_grocery: "on", open: "on" })).toEqual({ ok: true, value: { title: "Join Nile Market", intro: "Hello", kinds: ["grocery"], open: true } });
    expect(parseJoinFormMeta({ title: "Join" })).toMatchObject({ ok: true, value: { kinds: ["restaurant", "grocery", "shop"], open: false, intro: null } });
    expect(parseJoinFormMeta({ title: " " })).toMatchObject({ ok: false, field: "title" });
  });

  it("adds, edits, moves and removes questions, keeping their keys", () => {
    let r = addQuestion([], q("Tax number", "text", { required: "on" }));
    if (!r.ok) throw new Error(r.error);
    r = addQuestion(r.fields, q("Cuisine", "list", { options: "Grills\nPizza\n\nPizza" }));
    if (!r.ok) throw new Error(r.error);
    expect(r.fields.map((f) => [f.key, f.kind, f.required, f.options])).toEqual([
      ["tax_number", "text", true, []],
      ["cuisine", "list", false, ["Grills", "Pizza"]],
    ]);
    const edited = replaceQuestion(r.fields, 0, q("Commercial register number", "text"));
    expect(edited.ok && edited.fields[0]).toMatchObject({ key: "tax_number", label: "Commercial register number" });
    expect(moveQuestion(r.fields, 1, -1).map((f) => f.key)).toEqual(["cuisine", "tax_number"]);
    expect(moveQuestion(r.fields, 0, -1)).toBe(r.fields);
    expect(removeQuestion(r.fields, 0).map((f) => f.key)).toEqual(["cuisine"]);
    expect(addQuestion(r.fields, q("Tax number", "text"))).toMatchObject({ ok: false });
    expect(addQuestion([], q("Size", "list", { options: "Only one" }))).toMatchObject({ ok: false });
  });

  it("turns the public page's inputs into answers checkApplication takes", () => {
    const fields = [q("About you", "long_text", { required: "on" }), q("Delivers itself", "yes_no"), q("Where", "place", { required: "on" }), q("Hours", "hours"), q("Logo", "logo"), q("Papers", "documents")];
    const form: MarketApplicationForm = { id: 1, appId: "a", title: "Join", intro: null, kinds: ["restaurant"], fields: addAll(fields), token: "t", open: true, createdAt: new Date(), updatedAt: new Date() };
    const answers = answersFromForm(
      form.fields,
      { about_you: "Grills since 1990", delivers_itself: "on", "where.address": "9 Road 233, Maadi", "where.lat": "29.96", "where.lng": "31.25", "hours.mon.opens": "10:00", "hours.mon.closes": "23:00" },
      { logo: ["asset-logo-1"], papers: ["asset-paper-1", "asset-paper-2"] },
    );
    expect(answers).toMatchObject({ about_you: "Grills since 1990", delivers_itself: true, where: { address: "9 Road 233, Maadi", lat: 29.96, lng: 31.25 }, hours: [{ day: "mon", opens: "10:00", closes: "23:00" }], logo: "asset-logo-1", papers: ["asset-paper-1", "asset-paper-2"] });
    const checked = checkApplication(form, { businessName: "Nile Grill", email: "Owner@NileGrill.example", kind: chosenKind(form, undefined), answers });
    expect(checked).toMatchObject({ ok: true, value: { kind: "restaurant", email: "owner@nilegrill.example", fileAssetIds: ["asset-logo-1", "asset-paper-1", "asset-paper-2"] } });
    expect(checkApplication(form, { businessName: "Nile Grill", email: "a@b.example", kind: "restaurant", answers: answersFromForm(form.fields, {}, {}) })).toMatchObject({ ok: false, field: "about_you" });
  });

  it("keeps the joining pages out of search engines", () => {
    expect(PRIVATE_PATHS).toContain("/join/");
  });
});

function addAll(fields: ReturnType<typeof q>[]) {
  let out: ReturnType<typeof q>[] = [];
  for (const f of fields) {
    const r = addQuestion(out, f);
    if (!r.ok) throw new Error(r.error);
    out = r.fields;
  }
  return out;
}
