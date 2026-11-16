import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { can } from "@/lib/admin/permissions";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import type { BlobStore } from "@/lib/blobs";
import { MemoryStore } from "@/lib/data/memory";
import type { App, MarketTemplate, TemplateDesigner } from "@/lib/data/types";
import { loadLayout, saveDraft } from "@/lib/pages/layout";
import type { StudioNode } from "@/lib/pages/types";
import { en as appEn } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { isStudioProject, studioPathFor } from "@/lib/studio/section";
import { TEMPLATES, type SectionWord } from "@/lib/studio/sections";
import { applyTemplate, getsUpdates, mayMove, moveTemplate, readPrevious, restorePrevious, updateToLatest, type MarketDeps } from "@/lib/studio-market/apply";
import { buyerLicences, filterCards, marketCatalog, readMarketQuery } from "@/lib/studio-market/catalog";
import { designerInitials, designerSlug, joinAsDesigner, readDesignerProfile } from "@/lib/studio-market/designers";
import { afterSignInFor } from "@/lib/studio-market/join";
import { appKindId, kindsForEngine, templateFits } from "@/lib/studio-market/kinds";
import { decideReview, latestNotes, reviewQueue } from "@/lib/studio-market/review";
import { coverOf, orderedPages, versionDesign } from "@/lib/studio-market/snapshot";
import { publishUpdate, readKinds, readTags, readTexts, sendForReview, startTemplate, stepsDone, templateText } from "@/lib/studio-market/templates";
import { pathPermission, teamCan } from "@/lib/team/permissions";

/**
 * 106.1 Studio Market, stage 1: designers, a template made from a Studio
 * project and reviewed once, buyers applying it to their apps (the design
 * the app had kept to go back to), moving it once every 30 days, taking
 * newer versions, and who may do what.
 */

// The sample entries' pictures go to a folder of their own.
const BLOBS = mkdtempSync(join(tmpdir(), "studio-market-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;
afterAll(() => rmSync(BLOBS, { recursive: true, force: true }));

class MemoryBlobs implements BlobStore {
  files = new Map<string, { data: Buffer; contentType: string }>();
  async put(key: string, data: Buffer, contentType: string) {
    this.files.set(key, { data, contentType });
  }
  async get(key: string) {
    return this.files.get(key) ?? null;
  }
  async delete(key: string) {
    this.files.delete(key);
  }
}

const NOW = new Date("2026-11-15T10:00:00Z");
const DAY = 86_400_000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY);
const BLANK = TEMPLATES.find((t) => t.id === "blank")!;
const words = (name: string) => (word: SectionWord) => String(appEn[word]).replaceAll("{app}", name);

let store: MemoryStore;
let blobs: MemoryBlobs;
let n = 0;
const deps = (now = NOW): MarketDeps => ({ store, blobs, now });

beforeEach(() => {
  store = new MemoryStore();
  blobs = new MemoryBlobs();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

async function account(name: string): Promise<string> {
  n += 1;
  const { client } = await registerClient(store, { name, email: `${name.toLowerCase().replace(/\W+/g, "-")}-${n}@market.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  return client.id;
}

async function project(clientId: string, name: string, kind = "store"): Promise<App> {
  return makeStudioProject(store, { clientId, name, kind: kindById(kind)!, source: "catalog", template: BLANK, words: words(name), lang: "en" }, NOW);
}

/** A text on the project's first Studio page. */
async function write(app: App, text: string, extra: StudioNode[] = []): Promise<void> {
  const record = await loadLayout(store, app, NOW);
  const pages = record.draft.pages.map((p, i) =>
    i === record.draft.pages.findIndex((x) => x.studio) && p.studio
      ? { ...p, studio: { ...p.studio, body: { ...p.studio.body, children: [{ id: `t${n++}`, type: "text", text } as StudioNode, ...extra] } } }
      : p,
  );
  const saved = await saveDraft(store, app, { ...record.draft, pages }, NOW);
  expect(saved.ok, saved.ok ? "" : saved.errors.join(" ")).toBe(true);
}

async function homeTexts(app: App): Promise<string[]> {
  const record = await loadLayout(store, app, NOW);
  const out: string[] = [];
  const walk = (node: StudioNode) => {
    if (node.text) out.push(node.text);
    node.children?.forEach(walk);
  };
  for (const p of record.draft.pages) if (p.studio) walk(p.studio.body);
  return out;
}

async function designer(name = "Studio Nūr"): Promise<{ designer: TemplateDesigner; app: App }> {
  const clientId = await account(name);
  const joined = await joinAsDesigner(store, { id: clientId }, { name, slug: "", country: "TR", bio: "", terms: true }, NOW);
  if (!joined.ok) throw new Error(JSON.stringify(joined.errors));
  const app = { ...(await project(clientId, `${name} project`)), primaryColor: "#1F5A3E" };
  await store.updateApp(app.id, { primaryColor: "#1F5A3E" }, NOW);
  return { designer: joined.designer, app };
}

/** A template from the designer's project, sent and approved: on the market. */
async function published(d: { designer: TemplateDesigner; app: App }, text = "Hello from Nur"): Promise<MarketTemplate> {
  await write(d.app, text);
  let template = await startTemplate(store, d.designer, d.app, NOW);
  await store.updateMarketTemplate(template.id, { texts: { en: { title: "Rosé Atelier", short: "A soft flower shop.", description: "Photos first." } }, screens: [(await loadLayout(store, d.app, NOW)).draft.pages.find((p) => p.studio)!.slug] }, NOW);
  template = (await store.getMarketTemplate(template.id))!;
  const sent = await sendForReview({ store, blobs, now: NOW }, template, d.app, { rights: true, note: "" }, "nur@market.test");
  if (!sent.ok) throw new Error(sent.message + (sent.errors ?? []).join(" "));
  const decided = await decideReview(store, sent.template, { decision: "approved", notes: "", teamNote: "", checks: [] }, { email: "deniz@yallapp.test", name: "Deniz" }, NOW);
  if (!decided.ok) throw new Error(JSON.stringify(decided.errors));
  return decided.template;
}

describe("106.1 becoming a designer", () => {
  it("needs a name, an address, a country and the terms; one profile per account", async () => {
    expect(designerSlug("Studio Nūr")).toBe("studio-nur");
    expect(designerSlug("Atelier Kardelen ")).toBe("atelier-kardelen");
    expect(designerInitials("Studio Nūr")).toBe("SN");
    expect(designerInitials("Mina")).toBe("MI");
    expect(readDesignerProfile({ name: "", slug: "x", country: "ZZ", bio: "" })).toEqual({
      ok: false,
      errors: { name: expect.any(String), slug: expect.any(String), country: expect.any(String) },
    });
    expect(readDesignerProfile({ name: "Studio Nūr", slug: "", country: "tr", bio: " Calm shops. " })).toEqual({ ok: true, value: { name: "Studio Nūr", slug: "studio-nur", country: "TR", bio: "Calm shops." } });
    const clientId = await account("Nur");
    expect(await joinAsDesigner(store, { id: clientId }, { name: "Studio Nūr", slug: "", country: "TR", bio: "", terms: false }, NOW)).toEqual({ ok: false, errors: { terms: expect.any(String) } });
    const joined = await joinAsDesigner(store, { id: clientId }, { name: "Studio Nūr", slug: "", country: "TR", bio: "", terms: true }, NOW);
    expect(joined).toMatchObject({ ok: true, designer: { slug: "studio-nur", termsAcceptedAt: NOW, status: "active" } });
    expect(await joinAsDesigner(store, { id: clientId }, { name: "Studio Nūr", slug: "other", country: "TR", bio: "", terms: true }, NOW)).toMatchObject({ ok: false });
    // Another account can't take the address.
    expect(await joinAsDesigner(store, { id: await account("Other") }, { name: "Studio Nūr", slug: "", country: "EG", bio: "", terms: true }, NOW)).toEqual({ ok: false, errors: { slug: expect.any(String) } });
  });

  it("brings someone who signed up from it back to finish", () => {
    expect(afterSignInFor("1")).toBe("/designer/join");
    expect(afterSignInFor(undefined)).toBeNull();
  });
});

describe("106.1 a template from a Studio project, reviewed once", () => {
  it("checks each step: English texts, kinds of the project's engine, tags", () => {
    expect(readTexts({ en: { title: "", short: "", description: "" } })).toMatchObject({ ok: false, errors: { en_title: expect.any(String) } });
    expect(readTexts({ en: { title: "Rosé Atelier", short: "A soft flower shop.", description: "Photos first." }, ar: { title: "روزيه", short: "", description: "" } })).toMatchObject({ ok: false, errors: { ar_short: expect.any(String) } });
    expect(readTexts({ en: { title: "Rosé Atelier", short: "A soft flower shop.", description: "Photos first." }, tr: { title: "", short: "", description: "" } })).toEqual({ ok: true, value: { en: { title: "Rosé Atelier", short: "A soft flower shop.", description: "Photos first." } } });
    const shop = { appType: "store" as const };
    expect(kindsForEngine("store").map((k) => k.id)).toContain("restaurant");
    expect(readKinds(shop, ["store", "restaurant"])).toEqual(["store", "restaurant"]);
    expect(readKinds(shop, ["store", "food"])).toBeNull();
    expect(readKinds(shop, [])).toBeNull();
    expect(readTags("Parcels, couriers ,parcels")).toEqual(["parcels", "couriers"]);
    expect(readTags(Array.from({ length: 9 }, (_, i) => `t${i}`).join(","))).toBeNull();
  });

  it("goes Draft → In review → Changes requested (with notes) → In review → Published; updates go live without a review", async () => {
    const d = await designer();
    await write(d.app, "Hello from Nur");
    const template = await startTemplate(store, d.designer, d.app, NOW);
    expect(template).toMatchObject({ status: "draft", kinds: ["store"], free: true, afterEnd: "keep", sourceAppId: d.app.id });
    expect(stepsDone(template, d.app)).toMatchObject({ project: true, texts: false, screens: false });
    // Not ready yet.
    expect(await sendForReview(deps(), template, d.app, { rights: true, note: "" }, null)).toMatchObject({ ok: false });
    const home = (await loadLayout(store, d.app, NOW)).draft.pages.find((p) => p.studio)!.slug;
    await store.updateMarketTemplate(template.id, { texts: { en: { title: "Rosé Atelier", short: "A soft flower shop.", description: "Photos first." } }, screens: [home] }, NOW);
    const ready = (await store.getMarketTemplate(template.id))!;
    expect(Object.values(stepsDone(ready, d.app)).every(Boolean)).toBe(true);
    // The rights must be confirmed.
    expect(await sendForReview(deps(), ready, d.app, { rights: false, note: "" }, null)).toMatchObject({ ok: false, message: expect.stringContaining("rights") });
    const sent = await sendForReview(deps(), ready, d.app, { rights: true, note: "First one!" }, "nur@market.test");
    expect(sent).toMatchObject({ ok: true, template: { status: "in_review", noteToTeam: "First one!" } });
    if (!sent.ok) return;
    expect((await reviewQueue(store)).map((t) => t.id)).toEqual([template.id]);
    const version = (await store.getMarketTemplateVersion(sent.template.reviewVersionId!))!;
    expect(version).toMatchObject({ number: 1, pages: 1, languages: ["en"] });
    const file = (await versionDesign(blobs, version))!;
    expect(file.kind).toBe("project");
    expect(file.pages[0]!.slug).toBe(home);
    expect(file.look?.primary_color).toBe("#1F5A3E");
    expect(coverOf(file)?.brand).toBe("#1F5A3E");
    expect(JSON.stringify(file.pages[0]!.studio)).toContain("Hello from Nur");

    // Changes need notes; the designer reads them.
    expect(await decideReview(store, sent.template, { decision: "changes_requested", notes: " ", teamNote: "", checks: [] }, { email: "deniz@yallapp.test", name: null }, NOW)).toMatchObject({ ok: false, errors: { notes: expect.any(String) } });
    const back = await decideReview(store, sent.template, { decision: "changes_requested", notes: "Prices are hard to read in dark mode.", teamNote: "Second this month.", checks: ["rtl"] }, { email: "deniz@yallapp.test", name: "Deniz" }, NOW);
    expect(back).toMatchObject({ ok: true, template: { status: "changes_requested" }, review: { decision: "changes_requested", checks: ["rtl"] } });
    if (!back.ok) return;
    // Two decisions at once: the first counts.
    expect(await decideReview(store, sent.template, { decision: "approved", notes: "", teamNote: "", checks: [] }, { email: "x@yallapp.test", name: null }, NOW)).toMatchObject({ ok: false, errors: { form: expect.any(String) } });
    expect((await latestNotes(store, back.template))?.notes).toBe("Prices are hard to read in dark mode.");
    // Fixed and sent again: a second version.
    await write(d.app, "Hello again");
    const again = await sendForReview(deps(at(1)), (await store.getMarketTemplate(template.id))!, d.app, { rights: true, note: "" }, null);
    expect(again).toMatchObject({ ok: true, template: { status: "in_review" } });
    if (!again.ok) return;
    const approved = await decideReview(store, again.template, { decision: "approved", notes: "", teamNote: "", checks: ["rtl", "readable"] }, { email: "deniz@yallapp.test", name: "Deniz" }, at(2));
    expect(approved).toMatchObject({ ok: true, template: { status: "published", publishedAt: at(2), reviewVersionId: null } });
    if (!approved.ok) return;
    expect((await store.getMarketTemplateVersion(approved.template.currentVersionId!))?.number).toBe(2);
    // An update of a published template: live at once, no review.
    await write(d.app, "Hello v3");
    const update = await publishUpdate(deps(at(3)), approved.template, d.app, null);
    expect(update).toMatchObject({ ok: true, template: { status: "published" } });
    expect(await reviewQueue(store)).toEqual([]);
    const live = (await store.getMarketTemplate(template.id))!;
    expect((await store.getMarketTemplateVersion(live.currentVersionId!))?.number).toBe(3);
    // A draft's update isn't one.
    expect(await publishUpdate(deps(), { ...live, status: "draft" }, d.app, null)).toMatchObject({ ok: false });
  });

  it("orders the pictures as chosen, the cover first", () => {
    const page = (slug: string) => ({ slug, title: slug, show_title: false, updated_at: "", blocks: [], studio: { body: { id: slug, type: "column" } } }) as never;
    expect(orderedPages([page("home"), page("menu"), page("cart")], ["cart", "home"]).map((p: { slug: string }) => p.slug)).toEqual(["cart", "home", "menu"]);
  });
});

describe("106.1 applying a template, going back, moving it, updating it", () => {
  it("applies it to the owner's own app of a kind it fits, keeping the app's design to go back to", async () => {
    const d = await designer();
    const template = await published(d);
    const buyer = await account("Tulip");
    const tulip = await project(buyer, "Tulip Flowers");
    await write(tulip, "Tulip's own home");
    const before = await loadLayout(store, tulip, NOW);
    const apps = await store.listAppsByClient(buyer);
    const base = { clientId: buyer, apps, template, by: "tulip@market.test", plan: null };

    // Not the designer's own; not someone else's app; only a kind it fits.
    expect(await applyTemplate(deps(), { ...base, clientId: d.designer.clientId, apps: [d.app], appId: d.app.id })).toMatchObject({ ok: false, message: expect.stringContaining("your own template") });
    expect(await applyTemplate(deps(), { ...base, appId: d.app.id })).toMatchObject({ ok: false });
    const cafe = await project(buyer, "Tulip Café", "food");
    expect(templateFits(template, cafe)).toBe(false);
    expect(await applyTemplate(deps(), { ...base, apps: await store.listAppsByClient(buyer), appId: cafe.id })).toMatchObject({ ok: false, message: expect.stringContaining("kind") });

    const done = await applyTemplate(deps(at(1)), { ...base, appId: tulip.id });
    expect(done).toMatchObject({ ok: true, live: false, licence: { plan: "free", status: "active", appId: tulip.id, endsAt: null }, application: { appId: tulip.id, endedAt: null } });
    if (!done.ok) return;
    expect(await homeTexts(tulip)).toContain("Hello from Nur");
    expect((await store.getAppById(tulip.id))?.primaryColor).toBe("#1F5A3E");
    const previous = (await readPrevious(blobs, done.application.previousKey))!;
    expect(JSON.stringify(previous.draft.pages)).toEqual(JSON.stringify(before.draft.pages));
    // On it already.
    expect(await applyTemplate(deps(), { ...base, appId: tulip.id })).toMatchObject({ ok: false, message: expect.stringContaining("already") });
    // The buyer's list.
    const rows = await buyerLicences(store, buyer, await store.listAppsByClient(buyer), "en", at(1));
    expect(rows.map((r) => [r.state, r.app?.id, r.update])).toEqual([["active", tulip.id, false]]);

    // Back to the design it had.
    const back = await restorePrevious(deps(at(2)), { clientId: buyer, apps, applicationId: done.application.id, by: "tulip@market.test", plan: null });
    expect(back).toEqual({ ok: true });
    expect(await homeTexts(tulip)).toContain("Tulip's own home");
    expect(await homeTexts(tulip)).not.toContain("Hello from Nur");
    expect((await store.getAppById(tulip.id))?.primaryColor).toBe(tulip.primaryColor);
    expect(await store.getTemplateLicence(done.licence.id)).toMatchObject({ appId: null, status: "active" });
    expect((await store.getTemplateApplication(done.application.id))?.endReason).toBe("restored");
    // Its licence goes on again (the same one, free).
    const again = await applyTemplate(deps(at(3)), { ...base, appId: tulip.id });
    expect(again).toMatchObject({ ok: true, licence: { id: done.licence.id } });
  });

  it("publishes the design at once on an app that is live", async () => {
    const d = await designer();
    const template = await published(d);
    const buyer = await account("Tulip");
    const tulip = await project(buyer, "Tulip Flowers");
    const record = await loadLayout(store, tulip, NOW);
    await store.saveAppLayout({ ...record, published: { version: "v", ...record.draft }, publishedAt: NOW, publishCount: 1 });
    const done = await applyTemplate(deps(at(1)), { clientId: buyer, apps: [tulip], appId: tulip.id, template, by: "tulip@market.test", plan: null });
    expect(done).toMatchObject({ ok: true, live: true });
    expect(JSON.stringify((await loadLayout(store, tulip, NOW)).published)).toContain("Hello from Nur");
    if (!done.ok) return;
    await restorePrevious(deps(at(2)), { clientId: buyer, apps: [tulip], applicationId: done.application.id, by: "tulip@market.test", plan: null });
    expect(JSON.stringify((await loadLayout(store, tulip, NOW)).published)).not.toContain("Hello from Nur");
  });

  it("replaces another template on the app, which comes back when the app goes back", async () => {
    const nur = await designer("Studio Nūr");
    const lale = await designer("Lale & Co.");
    const rose = await published(nur, "Rosé home");
    const bloom = await published(lale, "Bloom home");
    const buyer = await account("Tulip");
    const tulip = await project(buyer, "Tulip Flowers");
    const base = { clientId: buyer, apps: [tulip], by: "tulip@market.test", plan: null };
    const first = await applyTemplate(deps(at(1)), { ...base, template: rose, appId: tulip.id });
    const second = await applyTemplate(deps(at(2)), { ...base, template: bloom, appId: tulip.id });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(await homeTexts(tulip)).toContain("Bloom home");
    expect(await store.getTemplateApplication(first.application.id)).toMatchObject({ endReason: "replaced" });
    expect(await store.getTemplateLicence(first.licence.id)).toMatchObject({ appId: null });
    const rows = await buyerLicences(store, buyer, [tulip], "en", at(2));
    expect(rows.find((r) => r.template.id === rose.id)).toMatchObject({ state: "replaced", replacedBy: { title: "Rosé Atelier" } });
    // Back from Bloom: Rosé's design, and Rosé on the app again.
    expect(await restorePrevious(deps(at(3)), { ...base, applicationId: second.application.id })).toEqual({ ok: true });
    expect(await homeTexts(tulip)).toContain("Rosé home");
    expect(await store.getTemplateLicence(first.licence.id)).toMatchObject({ appId: tulip.id });
    expect((await store.listTemplateApplications({ appId: tulip.id, open: true })).map((a) => a.licenceId)).toEqual([first.licence.id]);
  });

  it("moves to another app of the same kind once every 30 days, keeping its end date", async () => {
    const d = await designer();
    const template = await published(d);
    const buyer = await account("Tulip");
    const flowers = await project(buyer, "Tulip Flowers");
    const gifts = await project(buyer, "Tulip Gifts");
    const cafe = await project(buyer, "Tulip Café", "food");
    await write(flowers, "Flowers' own");
    await write(gifts, "Gifts' own");
    const apps = await store.listAppsByClient(buyer);
    const done = await applyTemplate(deps(at(1)), { clientId: buyer, apps, appId: flowers.id, template, by: "tulip@market.test", plan: null });
    if (!done.ok) throw new Error(done.message);
    const base = { clientId: buyer, apps, template, by: "tulip@market.test", plan: null, licenceId: done.licence.id };
    expect(appKindId(cafe)).not.toBe(appKindId(flowers));
    expect(await moveTemplate(deps(at(2)), { ...base, toAppId: cafe.id })).toMatchObject({ ok: false, message: expect.stringContaining("kind") });
    expect(await moveTemplate(deps(at(2)), { ...base, toAppId: flowers.id })).toMatchObject({ ok: false });
    // Someone else's licence: not theirs.
    expect(await moveTemplate(deps(at(2)), { ...base, clientId: await account("Other"), toAppId: gifts.id })).toMatchObject({ ok: false });

    const moved = await moveTemplate(deps(at(2)), { ...base, toAppId: gifts.id });
    expect(moved).toMatchObject({ ok: true, application: { appId: gifts.id } });
    expect(await homeTexts(flowers)).toContain("Flowers' own");
    expect(await homeTexts(flowers)).not.toContain("Hello from Nur");
    expect(await homeTexts(gifts)).toContain("Hello from Nur");
    expect(await store.getTemplateLicence(done.licence.id)).toMatchObject({ appId: gifts.id, movedAt: at(2), endsAt: null });
    // Not again for 30 days.
    const licence = (await store.getTemplateLicence(done.licence.id))!;
    expect(mayMove(licence, at(20))).toBe(false);
    expect(await moveTemplate(deps(at(20)), { ...base, toAppId: flowers.id })).toMatchObject({ ok: false, message: expect.stringContaining("30 days") });
    expect(mayMove(licence, at(32))).toBe(true);
    expect(await moveTemplate(deps(at(32)), { ...base, toAppId: flowers.id })).toMatchObject({ ok: true });
    expect(await homeTexts(gifts)).toContain("Gifts' own");
    expect(await homeTexts(flowers)).toContain("Hello from Nur");
  });

  it("takes the newest version while the buyer gets updates; a plan that ended stays on its version", async () => {
    const d = await designer();
    const template = await published(d);
    const buyer = await account("Tulip");
    const tulip = await project(buyer, "Tulip Flowers");
    const done = await applyTemplate(deps(at(1)), { clientId: buyer, apps: [tulip], appId: tulip.id, template, by: "tulip@market.test", plan: null });
    if (!done.ok) throw new Error(done.message);
    const base = { clientId: buyer, apps: [tulip], by: "tulip@market.test", plan: null, applicationId: done.application.id };
    expect(await updateToLatest(deps(at(2)), { ...base, template })).toMatchObject({ ok: false, message: expect.stringContaining("newest") });
    await write(d.app, "Hello v2", [{ id: "btn-new", type: "button", text: "Shop the bouquets" } as StudioNode]);
    const update = await publishUpdate(deps(at(3)), template, d.app, null);
    if (!update.ok) throw new Error(update.message);
    expect((await buyerLicences(store, buyer, [tulip], "en", at(3)))[0]).toMatchObject({ update: true });
    const updated = await updateToLatest(deps(at(4)), { ...base, template: update.template });
    expect(updated).toMatchObject({ ok: true });
    expect(await homeTexts(tulip)).toContain("Shop the bouquets");
    expect((await store.getTemplateApplication(done.application.id))?.versionId).toBe(update.template.currentVersionId);
    // A plan that ended: no more updates (stage 2 brings plans that end).
    expect(getsUpdates({ status: "active", plan: "1m", endsAt: at(-1) }, NOW)).toBe(false);
    expect(getsUpdates({ status: "active", plan: "free", endsAt: null }, NOW)).toBe(true);
    expect(getsUpdates({ status: "active", plan: "life", endsAt: null }, NOW)).toBe(true);
    expect(getsUpdates({ status: "ended", plan: "1y", endsAt: at(-1) }, NOW)).toBe(false);
  });

  it("refuses a design the buyer's app can't take (the page checker), changing nothing", async () => {
    const d = await designer();
    const template = await published(d);
    const version = (await store.getMarketTemplateVersion(template.currentVersionId!))!;
    const file = (await versionDesign(blobs, version))!;
    // A broken page in the stored design.
    const broken = { ...file, pages: [{ ...file.pages[0]!, studio: { ...file.pages[0]!.studio, body: { id: "x", type: "image", image_url: "javascript:alert(1)" } as StudioNode } }] };
    await blobs.put(version.blobKey, Buffer.from(JSON.stringify(broken)), "application/json");
    const buyer = await account("Tulip");
    const tulip = await project(buyer, "Tulip Flowers");
    const before = JSON.stringify((await loadLayout(store, tulip, NOW)).draft);
    const done = await applyTemplate(deps(at(1)), { clientId: buyer, apps: [tulip], appId: tulip.id, template, by: "tulip@market.test", plan: null });
    expect(done).toMatchObject({ ok: false });
    expect(JSON.stringify((await loadLayout(store, tulip, NOW)).draft)).toBe(before);
    expect(await store.listTemplateLicences({ clientId: buyer })).toEqual([]);
  });
});

describe("106.1 the market and who may do what", () => {
  it("lists only published templates, searched by words, kind and price", async () => {
    const d = await designer();
    const template = await published(d);
    const draft = await startTemplate(store, d.designer, d.app, NOW);
    const catalog = await marketCatalog(store, "en", NOW);
    expect(catalog.cards.map((c) => c.id)).toEqual([template.id]);
    expect(catalog.cards.map((c) => c.id)).not.toContain(draft.id);
    expect(catalog.designers.map((x) => x.name)).toEqual(["Studio Nūr"]);
    const card = catalog.cards[0]!;
    expect(card).toMatchObject({ title: "Rosé Atelier", free: true, isNew: true, kinds: [{ id: "store" }] });
    expect(card.cover?.look.brand).toBe("#1F5A3E");
    expect(filterCards(catalog.cards, readMarketQuery({ q: "rosé" }))).toHaveLength(1);
    expect(filterCards(catalog.cards, readMarketQuery({ q: "nūr" }))).toHaveLength(1);
    expect(filterCards(catalog.cards, readMarketQuery({ kind: "food" }))).toHaveLength(0);
    expect(filterCards(catalog.cards, readMarketQuery({ price: "paid" }))).toHaveLength(0);
    expect(filterCards(catalog.cards, readMarketQuery({ price: "free", kind: "store" }))).toHaveLength(1);
    expect(readMarketQuery({ sort: "nonsense", kind: "nope" })).toEqual({ q: "", kind: null, price: "all", sort: "popular" });
    expect(templateText({ texts: { en: { title: "Rosé Atelier", short: "s", description: "d" }, ar: { title: "روزيه", short: "", description: "" } }, slug: "x" }, "ar")).toEqual({ title: "روزيه", short: "s", description: "d" });
  });

  it("gives browsing to whoever sets up apps, the account's templates and selling to the owner, and the review to the team's permission", () => {
    expect(pathPermission("/dashboard/studio-market")).toBe("settings");
    expect(pathPermission("/dashboard/studio-market/t/rose-atelier")).toBe("settings");
    expect(pathPermission("/dashboard/studio-market/mine")).toBe("billing");
    const owner = { role: "owner" as const, areas: [], appIds: null };
    const manager = { role: "manager" as const, areas: [], appIds: null };
    const staff = { role: "staff" as const, areas: ["orders" as const], appIds: null };
    expect([owner, manager, staff].map((a) => teamCan(a, "settings"))).toEqual([true, true, false]);
    // Applying, moving and going back: the owner only.
    expect([owner, manager, staff].map((a) => teamCan(a, "billing"))).toEqual([true, false, false]);
    expect((["owner", "admin", "support", "viewer"] as const).map((role) => can(role, "market.review"))).toEqual([true, true, true, false]);
    // Templates go on Studio projects: the market's pages stay in the dashboard for them.
    expect(studioPathFor("/dashboard/studio-market")).toBeNull();
    expect(studioPathFor("/dashboard/studio-market/mine")).toBeNull();
    expect(isStudioProject({ section: "studio" })).toBe(true);
  });
});
