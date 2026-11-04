import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App, ApplicationField, MarketApplicationForm } from "@/lib/data/types";
import { acceptApplication, answerApplication, checkApplication, checkFormFields, joinFormUrl, joiningMail, newFormToken, submitApplication, vendorFromApplication } from "@/lib/market/joining";
import { NOW } from "./helpers";

const FIELDS: ApplicationField[] = [
  { key: "contact", kind: "text", label: "Your name", help: null, required: true, options: [] },
  { key: "about", kind: "long_text", label: "About your place", help: null, required: false, options: [] },
  { key: "phone", kind: "phone", label: "Phone", help: null, required: true, options: [] },
  { key: "cuisine", kind: "list", label: "Cuisine", help: null, required: false, options: ["Grills", "Pizza"] },
  { key: "delivers", kind: "yes_no", label: "Do you have drivers?", help: null, required: false, options: [] },
  { key: "branches", kind: "number", label: "Branches", help: null, required: false, options: [] },
  { key: "logo", kind: "logo", label: "Logo", help: null, required: false, options: [] },
  { key: "papers", kind: "documents", label: "Licence and tax card", help: null, required: true, options: [] },
  { key: "place", kind: "place", label: "Where are you?", help: null, required: true, options: [] },
  { key: "hours", kind: "hours", label: "Opening hours", help: null, required: false, options: [] },
];

async function setup(open = true) {
  const store = new MemoryStore();
  const { client } = await registerClient(store, { name: "Souk", email: `j-${Math.random()}@market.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
  const app: App = { ...newApp(client.id, null, NOW, "food"), backend: "hosted" };
  await store.createApp(app);
  const form: MarketApplicationForm = await store.createMarketApplicationForm({ appId: app.id, title: "Join Souk", intro: null, kinds: ["restaurant", "grocery"], fields: FIELDS, token: newFormToken(), open, createdAt: NOW, updatedAt: NOW });
  return { store, app, form };
}

const good = {
  businessName: "Grill House",
  email: "Owner@Grill.TEST",
  kind: "restaurant",
  answers: {
    contact: "Hany",
    about: "Charcoal grills since 1998.",
    phone: "+20 100 123 4567",
    cuisine: "Grills",
    delivers: "yes",
    branches: "3",
    logo: "asset-logo-1",
    papers: ["asset-doc-1", "asset-doc-2"],
    place: { address: "9 Road 233, Maadi", details: null, lat: 29.96, lng: 31.25 },
    hours: [{ day: "mon", opens: "12:00", closes: "02:00" }],
  },
};

describe("115.6 joining forms", () => {
  it("checks the owner's questions", () => {
    expect(checkFormFields(FIELDS)).toMatchObject({ ok: true });
    expect(checkFormFields([{ ...FIELDS[0]!, label: " " }])).toMatchObject({ ok: false, index: 0 });
    expect(checkFormFields([FIELDS[0]!, { ...FIELDS[1]!, key: "contact" }])).toMatchObject({ ok: false, index: 1 });
    expect(checkFormFields([{ ...FIELDS[3]!, options: ["Only one"] }])).toMatchObject({ ok: false, error: "A list needs at least two choices." });
    expect(checkFormFields([{ ...FIELDS[0]!, key: "email" }])).toMatchObject({ ok: false });
    expect(checkFormFields(Array.from({ length: 41 }, (_, i) => ({ ...FIELDS[0]!, key: `q${i}` })))).toMatchObject({ ok: false, index: null });
    const made = checkFormFields([{ key: "", kind: "text", label: "Commercial register no.", help: null, required: false, options: [] }]);
    expect(made).toMatchObject({ ok: true, fields: [{ key: "commercial_register_no_" }] });
  });

  it("links on Yallapp's site with a random token", () => {
    const a = newFormToken();
    expect(a).toMatch(/^[\w-]{24}$/);
    expect(newFormToken()).not.toBe(a);
    expect(joinFormUrl("abc")).toMatch(/\/join\/abc$/);
  });

  it("checks the answers against each question's kind", async () => {
    const { form } = await setup();
    const checked = checkApplication(form, good);
    expect(checked).toMatchObject({ ok: true, value: { email: "owner@grill.test", kind: "restaurant", fileAssetIds: ["asset-logo-1", "asset-doc-1", "asset-doc-2"] } });
    if (checked.ok) expect(checked.value.answers).toMatchObject({ phone: "+201001234567", delivers: true, branches: 3, papers: ["asset-doc-1", "asset-doc-2"], place: { lat: 29.96 } });
    const bad = (answers: Record<string, unknown>) => checkApplication(form, { ...good, answers: { ...good.answers, ...answers } });
    expect(bad({ contact: "" })).toMatchObject({ ok: false, field: "contact" });
    expect(bad({ phone: "123" })).toMatchObject({ ok: false, field: "phone" });
    expect(bad({ cuisine: "Sushi" })).toMatchObject({ ok: false, field: "cuisine" });
    expect(bad({ branches: "many" })).toMatchObject({ ok: false, field: "branches" });
    expect(bad({ papers: [] })).toMatchObject({ ok: false, field: "papers" });
    expect(bad({ place: { address: "x", lat: 200, lng: 0 } })).toMatchObject({ ok: false, field: "place" });
    expect(bad({ hours: [{ day: "funday", opens: "9", closes: "5" }] })).toMatchObject({ ok: false, field: "hours" });
    expect(checkApplication(form, { ...good, email: "not an email" })).toMatchObject({ ok: false, field: "email" });
    expect(checkApplication(form, { ...good, kind: "shop" })).toMatchObject({ ok: false, field: "kind" });
    expect(checkApplication(form, { ...good, businessName: " " })).toMatchObject({ ok: false, field: "business_name" });
  });

  it("takes one waiting application per email, only while the form is open", async () => {
    const { store, form } = await setup();
    expect(await submitApplication(store, form, good, NOW)).toMatchObject({ ok: true, application: { status: "new", email: "owner@grill.test" } });
    expect(await submitApplication(store, form, { ...good, email: "owner@grill.test" }, NOW)).toMatchObject({ ok: false, code: "already_applied" });
    const closed = await setup(false);
    expect(await submitApplication(closed.store, closed.form, good, NOW)).toMatchObject({ ok: false, code: "closed" });
  });

  it("asks for more, turns down once, or accepts: the vendor made from the answers, hidden, its first staff member invited", async () => {
    const { store, app, form } = await setup();
    const sent = await submitApplication(store, form, good, NOW);
    if (!sent.ok) throw new Error();
    expect(await answerApplication(store, sent.application, { status: "more_info", message: " ", by: "team@souk.test" }, NOW)).toMatchObject({ ok: false });
    const asked = await answerApplication(store, sent.application, { status: "more_info", message: "Please send your health certificate.", by: "team@souk.test" }, NOW);
    expect(asked).toMatchObject({ ok: true, application: { status: "more_info" } });
    const accepted = await acceptApplication(store, form, sent.application, "team@souk.test", NOW);
    expect(accepted).toMatchObject({ ok: true });
    if (!accepted.ok) throw new Error();
    const vendor = (await store.getRestaurant(app.id, accepted.vendorId!))!;
    expect(vendor).toMatchObject({ name: "Grill House", kind: "restaurant", active: false, phone: null, logoAssetId: "asset-logo-1", description: "Charcoal grills since 1998.", address: { address: "9 Road 233, Maadi" }, hours: [{ day: "mon", opens: "12:00", closes: "02:00" }] });
    const staff = await store.listRestaurantStaff(app.id, vendor.id);
    expect(staff).toMatchObject([{ email: "owner@grill.test", role: "owner", active: true }]);
    expect((await store.getMarketApplication(app.id, sent.application.id))!).toMatchObject({ status: "accepted", vendorId: vendor.id, decidedBy: "team@souk.test" });
    // Decided once: neither again nor turned down after.
    expect(await acceptApplication(store, form, sent.application, "other@souk.test", NOW)).toMatchObject({ ok: false });
    expect(await answerApplication(store, sent.application, { status: "rejected", message: null, by: "x" }, NOW)).toMatchObject({ ok: false });
    expect((await store.listRestaurants(app.id)).length).toBe(1);
  });

  it("writes the emails the vendor gets", () => {
    const input = { appName: "Souk Now", businessName: "Grill House", email: "owner@grill.test", message: "Please send your health certificate.", panelUrl: "https://yallapp.com.tr/vendor" };
    expect(joiningMail("more_info", input)).toMatchObject({ to: "owner@grill.test", subject: "Souk Now: we need a little more about Grill House" });
    expect(joiningMail("more_info", input).text).toContain("health certificate");
    expect(joiningMail("accepted", input).text).toContain("https://yallapp.com.tr/vendor");
    expect(joiningMail("rejected", { ...input, message: null }).text).not.toContain("null");
  });

  it("a form without place or hours makes a vendor to finish later", async () => {
    const { form } = await setup();
    const slim = { ...form, fields: FIELDS.slice(0, 1) };
    const v = vendorFromApplication(slim, { id: 1, appId: form.appId, formId: form.id, status: "accepted", businessName: "Corner Shop", kind: "shop", email: "a@b.test", answers: { contact: "A" }, fileAssetIds: [], message: null, vendorId: null, decidedBy: null, decidedAt: null, createdAt: NOW, updatedAt: NOW }, form.appId);
    expect(v).toMatchObject({ kind: "shop", hours: [], logoAssetId: null, address: { lat: null }, active: false });
  });
});
