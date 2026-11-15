import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, MarketTemplate, MarketTemplateVersion, TemplateApplication, TemplateDesigner, TemplateLicence } from "@/lib/data/types";
import { days, NOW } from "./helpers";

/** 106.1 Studio Market's data, the same on every store (the memory store and MySQL or MariaDB). */
export function studioMarketStoreSuite(store: () => DataStore) {
  async function account(s: DataStore, name: string) {
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(s, { name, email: `${name.toLowerCase().replace(/\W+/g, "-")}-${suffix}@market.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "store"), section: "studio", appName: `${name} app` };
    await s.createApp(app);
    return { client, app, suffix };
  }
  const designerOf = (clientId: string, slug: string): TemplateDesigner => ({ id: randomUUID(), clientId, name: "Studio Nūr", slug, country: "TR", bio: null, status: "active", termsAcceptedAt: NOW, createdAt: NOW, updatedAt: NOW });
  const templateOf = (designer: TemplateDesigner, appId: string, slug: string): MarketTemplate => ({
    id: randomUUID(),
    designerId: designer.id,
    clientId: designer.clientId,
    sourceAppId: appId,
    slug,
    status: "draft",
    texts: { en: { title: "Rosé Atelier", short: "A soft flower shop.", description: "Photos first." } },
    kinds: ["store"],
    tags: ["flowers"],
    free: true,
    plans: [],
    afterEnd: "keep",
    screens: [],
    rightsConfirmedAt: null,
    noteToTeam: null,
    currentVersionId: null,
    reviewVersionId: null,
    submittedAt: null,
    publishedAt: null,
    views: 0,
    createdAt: NOW,
    updatedAt: NOW,
  });
  const versionOf = (templateId: string, number: number): MarketTemplateVersion => ({
    id: randomUUID(),
    templateId,
    number,
    blobKey: `studio-market/${templateId}/v${number}.json`,
    sizeBytes: 1200,
    pages: 3,
    elements: 40,
    languages: ["en", "ar"],
    cover: { page: { body: { id: "root", type: "column" } }, lang: "en", font: "Cairo", brand: "#1F5A3E", accent: null, tabs: [] },
    createdAt: NOW,
    createdBy: "nur@market.test",
  });

  it("keeps one designer per account, each at its own address", async () => {
    const s = store();
    const { client, suffix } = await account(s, "Nur");
    const other = await account(s, "Lale");
    const slug = `studio-nur-${suffix}`;
    const nur = await s.createTemplateDesigner(designerOf(client.id, slug));
    expect(nur?.slug).toBe(slug);
    // The same address, or a second profile for the same account: refused.
    expect(await s.createTemplateDesigner(designerOf(other.client.id, slug))).toBeNull();
    expect(await s.createTemplateDesigner(designerOf(client.id, `${slug}-2`))).toBeNull();
    expect((await s.getTemplateDesignerByClient(client.id))?.id).toBe(nur!.id);
    expect((await s.getTemplateDesignerBySlug(slug.toUpperCase()))?.id).toBe(nur!.id);
    const lale = (await s.createTemplateDesigner(designerOf(other.client.id, `lale-${suffix}`)))!;
    expect(await s.updateTemplateDesigner(lale.id, { slug }, days(1))).toBe(false);
    expect(await s.updateTemplateDesigner(lale.id, { name: "Lale & Co.", bio: "Flowers and paper." }, days(1))).toBe(true);
    expect(await s.getTemplateDesigner(lale.id)).toMatchObject({ name: "Lale & Co.", bio: "Flowers and paper.", updatedAt: days(1) });
    expect((await s.listTemplateDesigners([nur!.id, lale.id])).map((d) => d.id)).toEqual([nur!.id, lale.id]);
    expect(await s.listTemplateDesigners([])).toEqual([]);
  });

  it("keeps templates with their versions and reviews; moves a status only from the one expected", async () => {
    const s = store();
    const { client, app, suffix } = await account(s, "Nur");
    const designer = (await s.createTemplateDesigner(designerOf(client.id, `nur-${suffix}`)))!;
    const template = (await s.createMarketTemplate(templateOf(designer, app.id, `rose-${suffix}`)))!;
    expect(await s.createMarketTemplate(templateOf(designer, app.id, `rose-${suffix}`))).toBeNull();
    expect(await s.getMarketTemplateBySlug(`rose-${suffix}`)).toMatchObject({ id: template.id, texts: template.texts, kinds: ["store"], afterEnd: "keep", free: true });

    expect(await s.lastMarketTemplateVersion(template.id)).toBe(0);
    const v1 = versionOf(template.id, 1);
    const v2 = versionOf(template.id, 2);
    await s.createMarketTemplateVersion(v1);
    await s.createMarketTemplateVersion(v2);
    expect(await s.lastMarketTemplateVersion(template.id)).toBe(2);
    expect((await s.listMarketTemplateVersions([v2.id, v1.id, "missing"])).map((v) => v.number)).toEqual([2, 1]);
    expect(await s.getMarketTemplateVersion(v1.id)).toMatchObject({ cover: v1.cover, languages: ["en", "ar"], pages: 3, elements: 40 });

    // Sent for review: only from a draft.
    expect(await s.moveMarketTemplate(template.id, "draft", { status: "in_review", reviewVersionId: v1.id, submittedAt: days(1) }, days(1))).toBe(true);
    expect(await s.moveMarketTemplate(template.id, "draft", { status: "in_review" }, days(1))).toBe(false);
    expect((await s.listMarketTemplates({ statuses: ["in_review"] })).map((t) => t.id)).toContain(template.id);
    // Two reviewers at once: the first one counts.
    expect(await s.moveMarketTemplate(template.id, "in_review", { status: "published", currentVersionId: v1.id, reviewVersionId: null, publishedAt: days(2) }, days(2))).toBe(true);
    expect(await s.moveMarketTemplate(template.id, "in_review", { status: "changes_requested" }, days(2))).toBe(false);
    expect(await s.getMarketTemplate(template.id)).toMatchObject({ status: "published", currentVersionId: v1.id, reviewVersionId: null, publishedAt: days(2) });
    // A published template stays.
    expect(await s.deleteMarketTemplate(template.id)).toBe(false);
    await s.addMarketTemplateView(template.id);
    await s.addMarketTemplateView(template.id);
    expect((await s.getMarketTemplate(template.id))?.views).toBe(2);
    expect(await s.updateMarketTemplate(template.id, { tags: ["roses", "gifts"], screens: ["home", "product"] }, days(3))).toBe(true);
    expect(await s.getMarketTemplate(template.id)).toMatchObject({ tags: ["roses", "gifts"], screens: ["home", "product"], updatedAt: days(3) });
    expect((await s.listMarketTemplates({ designerId: designer.id })).map((t) => t.id)).toEqual([template.id]);
    expect(await s.listMarketTemplates({ ids: [] })).toEqual([]);

    const first = await s.createMarketTemplateReview({ templateId: template.id, versionId: v1.id, decision: "changes_requested", notes: "The prices are hard to read.", teamNote: null, checks: ["rtl"], reviewerEmail: "deniz@yallapp.test", reviewerName: "Deniz", createdAt: days(1) });
    const second = await s.createMarketTemplateReview({ templateId: template.id, versionId: v1.id, decision: "approved", notes: null, teamNote: "Good.", checks: ["rtl", "readable"], reviewerEmail: "deniz@yallapp.test", reviewerName: null, createdAt: days(2) });
    expect(second.id).toBeGreaterThan(first.id);
    expect((await s.listMarketTemplateReviews(template.id)).map((r) => [r.decision, r.checks])).toEqual([
      ["approved", ["rtl", "readable"]],
      ["changes_requested", ["rtl"]],
    ]);

    // A draft never published can be deleted, with its versions.
    const draft = (await s.createMarketTemplate(templateOf(designer, app.id, `draft-${suffix}`)))!;
    expect(await s.deleteMarketTemplate(draft.id)).toBe(true);
    expect(await s.getMarketTemplate(draft.id)).toBeNull();
  });

  it("keeps the buyers' licences and the templates on their apps, and the move rule", async () => {
    const s = store();
    const seller = await account(s, "Nur");
    const buyer = await account(s, "Tulip");
    const second: App = { ...newApp(buyer.client.id, null, NOW, "store"), section: "studio", appName: "Tulip Gifts" };
    await s.createApp(second);
    const designer = (await s.createTemplateDesigner(designerOf(seller.client.id, `nur-${seller.suffix}`)))!;
    const template = (await s.createMarketTemplate(templateOf(designer, seller.app.id, `rose-${seller.suffix}`)))!;
    const licence: TemplateLicence = { id: randomUUID(), templateId: template.id, clientId: buyer.client.id, plan: "free", status: "active", appId: buyer.app.id, versionId: null, startsAt: NOW, endsAt: null, movedAt: null, createdAt: NOW, updatedAt: NOW };
    await s.createTemplateLicence(licence);
    expect(await s.getTemplateLicence(licence.id)).toMatchObject({ plan: "free", status: "active", appId: buyer.app.id, endsAt: null });
    expect((await s.listTemplateLicences({ clientId: buyer.client.id })).map((l) => l.id)).toEqual([licence.id]);
    expect((await s.listTemplateLicences({ appId: buyer.app.id })).map((l) => l.id)).toEqual([licence.id]);
    expect(await s.listTemplateLicences({ clientId: seller.client.id })).toEqual([]);
    expect((await s.countTemplateLicences())[template.id]).toBe(1);
    expect((await s.countTemplateLicences(days(1)))[template.id]).toBeUndefined();

    // The move rule: from the app it is on, then not again for 30 days.
    expect(await s.moveTemplateLicence(licence.id, second.id, buyer.app.id, days(-30), NOW)).toBe(false);
    expect(await s.moveTemplateLicence(licence.id, buyer.app.id, second.id, days(-30), NOW)).toBe(true);
    expect(await s.moveTemplateLicence(licence.id, second.id, buyer.app.id, days(10 - 30), days(10))).toBe(false);
    expect(await s.moveTemplateLicence(licence.id, second.id, buyer.app.id, days(31 - 30), days(31))).toBe(true);
    expect(await s.getTemplateLicence(licence.id)).toMatchObject({ appId: buyer.app.id, movedAt: days(31) });
    expect(await s.updateTemplateLicence(licence.id, { appId: null, versionId: "v-2" }, days(32))).toBe(true);
    expect(await s.getTemplateLicence(licence.id)).toMatchObject({ appId: null, versionId: "v-2", updatedAt: days(32) });

    const application: TemplateApplication = { id: randomUUID(), licenceId: licence.id, templateId: template.id, appId: second.id, versionId: "v-1", previousKey: "studio-market/previous/x.json", replacedId: null, appliedAt: NOW, endedAt: null, endReason: null, appliedBy: "tulip@market.test" };
    await s.createTemplateApplication(application);
    expect((await s.listTemplateApplications({ appId: second.id, open: true })).map((a) => a.id)).toEqual([application.id]);
    expect(await s.updateTemplateApplication(application.id, { versionId: "v-2" })).toBe(true);
    expect(await s.updateTemplateApplication(application.id, { endedAt: days(1), endReason: "restored" })).toBe(true);
    // Ended: it stays as it ended.
    expect(await s.updateTemplateApplication(application.id, { endedAt: days(2), endReason: "moved" })).toBe(false);
    expect(await s.getTemplateApplication(application.id)).toMatchObject({ versionId: "v-2", endedAt: days(1), endReason: "restored" });
    expect(await s.listTemplateApplications({ appId: second.id, open: true })).toEqual([]);
    expect((await s.listTemplateApplications({ licenceId: licence.id, open: false })).map((a) => a.id)).toEqual([application.id]);
  });
}
