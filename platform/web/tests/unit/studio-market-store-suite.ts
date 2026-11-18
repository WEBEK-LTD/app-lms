import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, MarketDiscount, MarketTemplate, MarketTemplateVersion, TemplateApplication, TemplateDesigner, TemplateLicence, TemplateOrder } from "@/lib/data/types";
import { days, NOW } from "./helpers";

/**
 * 106.1 Studio Market's data, the same on every store (the memory store and
 * MySQL or MariaDB). `elsewhere`: the same data from another server (on
 * MySQL another pool, so two servers' requests really meet in the database).
 */
export function studioMarketStoreSuite(store: () => DataStore, elsewhere: (s: DataStore) => DataStore = (s) => s) {
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
    // A day later: the list is oldest first.
    const lale = (await s.createTemplateDesigner({ ...designerOf(other.client.id, `lale-${suffix}`), createdAt: days(1), updatedAt: days(1) }))!;
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
    const licence: TemplateLicence = { id: randomUUID(), templateId: template.id, clientId: buyer.client.id, plan: "free", status: "active", appId: buyer.app.id, versionId: null, startsAt: NOW, endsAt: null, movedAt: null, afterEnd: null, remindedEarlyFor: null, remindedLastFor: null, endedAt: null, createdAt: NOW, updatedAt: NOW };
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

  it("106.2 keeps the template orders, each paid once, with the sale's split, and the licences' paid periods, reminders and end", async () => {
    const s = store();
    const seller = await account(s, "Nur");
    const buyer = await account(s, "Tulip");
    const designer = (await s.createTemplateDesigner(designerOf(seller.client.id, `nur-${seller.suffix}`)))!;
    const template = (await s.createMarketTemplate({ ...templateOf(designer, seller.app.id, `rose-${seller.suffix}`), free: false, plans: [{ period: "3m", cents: 2400 }] }))!;
    expect((await s.getMarketTemplate(template.id))?.plans).toEqual([{ period: "3m", cents: 2400 }]);
    const order: TemplateOrder = {
      id: randomUUID(),
      templateId: template.id,
      designerId: designer.id,
      clientId: buyer.client.id,
      kind: "buy",
      licenceId: null,
      plan: "3m",
      appId: buyer.app.id,
      grossCents: 2400,
      designerCents: 1800,
      yallappCents: 600,
      amountCents: 120000,
      currency: "EGP",
      egpPerUsd: 50,
      status: "pending",
      tokenHash: randomUUID().replace(/-/g, "").padEnd(64, "0"),
      paymentProvider: "kashier",
      providerRef: "66f00001aa",
      paymentId: null,
      consentAt: NOW,
      startsAt: null,
      endsAt: null,
      appliedAt: null,
      applyError: null,
      createdAt: NOW,
      paidAt: null,
    };
    await s.createTemplateOrder(order);
    expect(await s.getTemplateOrderByToken(order.tokenHash)).toMatchObject({ id: order.id, grossCents: 2400, designerCents: 1800, yallappCents: 600, egpPerUsd: 50, status: "pending" });
    // Paid once: the webhook and the buyer's return together.
    expect(await s.payTemplateOrder(order.id, "TX-1", days(1))).toBe(true);
    expect(await s.payTemplateOrder(order.id, "TX-2", days(1))).toBe(false);
    expect(await s.failTemplateOrder(order.id)).toBe(false);
    expect(await s.getTemplateOrder(order.id)).toMatchObject({ status: "paid", paymentId: "TX-1", paidAt: days(1) });
    expect(await s.markTemplateOrderDelivered(order.id, days(1), days(91))).toBe(true);
    expect(await s.markTemplateOrderDelivered(order.id, days(2), days(92))).toBe(false);
    expect(await s.updateTemplateOrder(order.id, { licenceId: order.id, appliedAt: days(1) })).toBe(true);
    expect(await s.getTemplateOrder(order.id)).toMatchObject({ licenceId: order.id, startsAt: days(1), endsAt: days(91), appliedAt: days(1) });
    expect((await s.listTemplateOrders({ designerId: designer.id, status: "paid" })).map((o) => o.id)).toEqual([order.id]);
    expect(await s.listTemplateOrders({ clientId: seller.client.id })).toEqual([]);

    const licence: TemplateLicence = {
      id: order.id,
      templateId: template.id,
      clientId: buyer.client.id,
      plan: "3m",
      status: "active",
      appId: buyer.app.id,
      versionId: null,
      startsAt: days(1),
      endsAt: days(91),
      movedAt: null,
      afterEnd: "restore",
      remindedEarlyFor: null,
      remindedLastFor: null,
      endedAt: null,
      createdAt: days(1),
      updatedAt: days(1),
    };
    await s.createTemplateLicence(licence);
    await s.createTemplateLicencePeriod({ id: order.id, licenceId: licence.id, orderId: order.id, plan: "3m", startsAt: days(1), endsAt: days(91), createdAt: days(1) });
    // Recorded once.
    await s.createTemplateLicencePeriod({ id: order.id, licenceId: licence.id, orderId: order.id, plan: "3m", startsAt: days(1), endsAt: days(91), createdAt: days(1) });
    expect((await s.listTemplateLicencePeriods(licence.id)).map((p) => p.orderId)).toEqual([order.id]);
    expect(await s.getTemplateLicence(licence.id)).toMatchObject({ afterEnd: "restore", endsAt: days(91) });

    // The daily job's list, its reminders once per end date, and a renewal winning over an end.
    expect((await s.listTemplateLicencesEndingBy(days(90))).map((l) => l.id)).toEqual([]);
    expect((await s.listTemplateLicencesEndingBy(days(91))).map((l) => l.id)).toEqual([licence.id]);
    expect(await s.markTemplateLicenceReminder(licence.id, "early", days(91), days(77))).toBe(true);
    expect(await s.markTemplateLicenceReminder(licence.id, "early", days(91), days(78))).toBe(false);
    expect(await s.markTemplateLicenceReminder(licence.id, "last", days(90), days(90))).toBe(false);
    expect(await s.markTemplateLicenceReminder(licence.id, "last", days(91), days(90))).toBe(true);
    expect(await s.extendTemplateLicence(licence.id, days(90), { plan: "1y", endsAt: days(456), afterEnd: "keep" }, days(90))).toBe(false);
    expect(await s.extendTemplateLicence(licence.id, days(91), { plan: "1y", endsAt: days(456), afterEnd: "keep" }, days(90))).toBe(true);
    expect(await s.endTemplateLicence(licence.id, days(91), days(91))).toBe(false);
    expect(await s.getTemplateLicence(licence.id)).toMatchObject({ plan: "1y", endsAt: days(456), afterEnd: "keep", remindedEarlyFor: days(91), status: "active" });
    // A new end date: its own reminders.
    expect(await s.markTemplateLicenceReminder(licence.id, "early", days(456), days(442))).toBe(true);
    expect(await s.endTemplateLicence(licence.id, days(456), days(456))).toBe(true);
    expect(await s.endTemplateLicence(licence.id, days(456), days(457))).toBe(false);
    expect(await s.getTemplateLicence(licence.id)).toMatchObject({ status: "ended", endedAt: days(456) });
    expect(await s.listTemplateLicencesEndingBy(days(500))).toEqual([]);
    // Bought again after it ended: active again from the new period.
    expect(await s.extendTemplateLicence(licence.id, days(456), { plan: "3m", endsAt: days(550), afterEnd: "keep" }, days(460))).toBe(true);
    expect(await s.getTemplateLicence(licence.id)).toMatchObject({ status: "active", endedAt: null, endsAt: days(550) });
  });

  it("106.12 keeps the discounts, a coupon's code once per template, the orders' discounts, and a coupon's last use for one buyer", async () => {
    const s = store();
    const seller = await account(s, "Lale");
    const designer = (await s.createTemplateDesigner(designerOf(seller.client.id, `lale-${seller.suffix}`)))!;
    const template = (await s.createMarketTemplate({ ...templateOf(designer, seller.app.id, `peony-${seller.suffix}`), free: false, plans: [{ period: "3m", cents: 2400 }, { period: "life", cents: 14900 }] }))!;
    const other = (await s.createMarketTemplate({ ...templateOf(designer, seller.app.id, `tulip-${seller.suffix}`), free: false, plans: [{ period: "1m", cents: 900 }] }))!;
    const discountOf = (over: Partial<MarketDiscount>): MarketDiscount => ({
      id: randomUUID(),
      templateId: template.id,
      designerId: designer.id,
      kind: "drop",
      code: null,
      offType: "percent",
      offValue: 20,
      plans: null,
      startsAt: null,
      endsAt: null,
      usageLimit: null,
      createdAt: NOW,
      updatedAt: NOW,
      ...over,
    });
    const drop = discountOf({ offType: "amount", offValue: 400, plans: ["3m"] });
    const flash = discountOf({ kind: "flash", startsAt: NOW, endsAt: days(1), createdAt: days(0.1) });
    const coupon = discountOf({ kind: "coupon", code: "LALE30", offValue: 30, plans: ["3m", "life"], usageLimit: 2, endsAt: days(30), createdAt: days(0.2) });
    expect(await s.createMarketDiscount(drop)).toEqual(drop);
    expect(await s.createMarketDiscount(flash)).toEqual(flash);
    expect(await s.createMarketDiscount(coupon)).toEqual(coupon);
    // Drops have no code: two of them are fine. A code twice on one template isn't; on another template it is.
    const second = discountOf({ offValue: 5, createdAt: days(0.3) });
    expect(await s.createMarketDiscount(second)).toEqual(second);
    expect(await s.createMarketDiscount(discountOf({ kind: "coupon", code: "LALE30" }))).toBeNull();
    const elsewhereCode = discountOf({ templateId: other.id, kind: "coupon", code: "LALE30", createdAt: days(0.4) });
    expect(await s.createMarketDiscount(elsewhereCode)).toEqual(elsewhereCode);
    expect(await s.getMarketDiscount(coupon.id)).toEqual(coupon);
    expect(await s.getMarketDiscount(drop.id)).toMatchObject({ plans: ["3m"], offType: "amount", offValue: 400, startsAt: null, endsAt: null });
    expect((await s.getMarketDiscount(flash.id))?.plans).toBeNull();
    expect((await s.listMarketDiscounts({ templateIds: [template.id] })).map((d) => d.id)).toEqual([drop.id, flash.id, coupon.id, second.id]);
    expect((await s.listMarketDiscounts({ templateIds: [template.id], kinds: ["drop", "flash"] })).map((d) => d.id)).toEqual([drop.id, flash.id, second.id]);
    expect((await s.listMarketDiscounts({ designerId: designer.id, kinds: ["coupon"] })).map((d) => d.id)).toEqual([coupon.id, elsewhereCode.id]);
    // Not ended at an instant: an end exactly then has ended.
    expect((await s.listMarketDiscounts({ templateIds: [template.id], notEndedAt: days(1) })).map((d) => d.id)).toEqual([drop.id, coupon.id, second.id]);
    expect((await s.listMarketDiscounts({ templateIds: [template.id], notEndedAt: days(0.999) })).map((d) => d.id)).toEqual([drop.id, flash.id, coupon.id, second.id]);
    expect(await s.listMarketDiscounts({ templateIds: [] })).toEqual([]);
    expect((await s.findMarketCoupon(template.id, "LALE30"))?.id).toBe(coupon.id);
    expect((await s.findMarketCoupon(other.id, "LALE30"))?.id).toBe(elsewhereCode.id);
    expect(await s.findMarketCoupon(template.id, "lale30")).toBeNull();
    expect(await s.findMarketCoupon(template.id, "NOPE")).toBeNull();

    // Ended now, once; a start still to come moves to now.
    const scheduled = discountOf({ startsAt: days(5), createdAt: days(0.5) });
    await s.createMarketDiscount(scheduled);
    expect(await s.endMarketDiscount(scheduled.id, days(1))).toBe(true);
    expect(await s.getMarketDiscount(scheduled.id)).toMatchObject({ startsAt: days(1), endsAt: days(1), updatedAt: days(1) });
    expect(await s.endMarketDiscount(scheduled.id, days(2))).toBe(false);
    expect(await s.endMarketDiscount(second.id, days(1))).toBe(true);
    expect(await s.getMarketDiscount(second.id)).toMatchObject({ startsAt: null, endsAt: days(1) });
    expect(await s.endMarketDiscount(flash.id, days(2))).toBe(false);
    expect(await s.deleteMarketDiscount(second.id)).toBe(true);
    expect(await s.deleteMarketDiscount(second.id)).toBe(false);

    // An order keeps its discount; one without has none.
    const buyers = await Promise.all(["A", "B", "C", "D", "E"].map((x) => account(s, `Buyer ${x}`)));
    const orderOf = (clientId: string, over: Partial<TemplateOrder> = {}): TemplateOrder => ({
      id: randomUUID(),
      templateId: template.id,
      designerId: designer.id,
      clientId,
      kind: "buy",
      licenceId: null,
      plan: "3m",
      appId: null,
      grossCents: 1680,
      designerCents: 1260,
      yallappCents: 420,
      amountCents: 84000,
      currency: "EGP",
      egpPerUsd: 50,
      status: "pending",
      tokenHash: randomUUID().replace(/-/g, "").padEnd(64, "0"),
      paymentProvider: "kashier",
      providerRef: null,
      paymentId: null,
      consentAt: NOW,
      startsAt: null,
      endsAt: null,
      appliedAt: null,
      applyError: null,
      createdAt: NOW,
      paidAt: null,
      discount: { id: coupon.id, kind: "coupon", code: "LALE30", listCents: 2400, offCents: 720 },
      ...over,
    });
    const plain = orderOf(buyers[0]!.client.id, { grossCents: 2400, designerCents: 1800, yallappCents: 600, discount: null });
    await s.createTemplateOrder(plain);
    expect((await s.getTemplateOrder(plain.id))?.discount).toBeNull();
    const flashOrder = orderOf(buyers[0]!.client.id, { grossCents: 1920, discount: { id: flash.id, kind: "flash", code: null, listCents: 2400, offCents: 480 } });
    await s.createTemplateOrder(flashOrder);
    expect((await s.getTemplateOrder(flashOrder.id))?.discount).toEqual({ id: flash.id, kind: "flash", code: null, listCents: 2400, offCents: 480 });
    expect(await s.updateTemplateOrder(flashOrder.id, { providerRef: "66f00009aa" })).toBe(true);
    expect((await s.getTemplateOrderByToken(flashOrder.tokenHash))?.providerRef).toBe("66f00009aa");

    // A coupon with 2 uses and 5 buyers at once, from two servers: two get it.
    const hold = days(-1 / 12);
    const tries = buyers.map((b) => orderOf(b.client.id));
    const results = await Promise.all(tries.map((o, i) => (i % 2 ? elsewhere(s) : s).createTemplateOrderWithCoupon(o, 2, hold)));
    expect(results.filter((r) => r === "ok")).toHaveLength(2);
    expect(results.filter((r) => r === "held")).toHaveLength(3);
    const taken = tries.filter((_, i) => results[i] === "ok");
    const waiting = tries.filter((_, i) => results[i] !== "ok");
    expect((await s.getTemplateOrder(taken[0]!.id))?.discount).toEqual({ id: coupon.id, kind: "coupon", code: "LALE30", listCents: 2400, offCents: 720 });
    expect(await s.getTemplateOrder(waiting[0]!.id)).toBeNull();
    // Only paid orders are uses.
    expect(await s.countMarketDiscountUses([coupon.id])).toEqual({});
    // A buyer trying again isn't held up by their own page.
    const retry = orderOf(taken[0]!.clientId);
    expect(await s.createTemplateOrderWithCoupon(retry, 2, hold)).toBe("ok");
    await s.failTemplateOrder(retry.id);
    // One fails: its use is free for the next.
    expect(await s.failTemplateOrder(taken[1]!.id)).toBe(true);
    const next = orderOf(waiting[0]!.clientId);
    expect(await s.createTemplateOrderWithCoupon(next, 2, hold)).toBe("ok");
    expect(await s.payTemplateOrder(taken[0]!.id, "TX-1", NOW)).toBe(true);
    expect(await s.countMarketDiscountUses([coupon.id, flash.id, "none"])).toEqual({ [coupon.id]: 1 });
    // One paid, one being paid.
    expect(await s.createTemplateOrderWithCoupon(orderOf(waiting[1]!.clientId), 2, hold)).toBe("held");
    // A page older than the hold holds nothing.
    expect(await s.createTemplateOrderWithCoupon(orderOf(waiting[1]!.clientId), 2, days(1))).toBe("ok");
    expect(await s.payTemplateOrder(next.id, "TX-2", NOW)).toBe(true);
    expect(await s.countMarketDiscountUses([coupon.id])).toEqual({ [coupon.id]: 2 });
    expect(await s.createTemplateOrderWithCoupon(orderOf(waiting[2]!.clientId), 2, days(1))).toBe("used_up");
    // The flash sale's paid order is its own.
    await s.payTemplateOrder(flashOrder.id, "TX-3", NOW);
    expect(await s.countMarketDiscountUses([flash.id])).toEqual({ [flash.id]: 1 });
    // A coupon deleted meanwhile.
    await s.deleteMarketDiscount(coupon.id);
    expect(await s.createTemplateOrderWithCoupon(orderOf(waiting[2]!.clientId), 2, hold)).toBe("gone");
    // The orders keep what they got.
    expect((await s.getTemplateOrder(next.id))?.discount).toMatchObject({ id: coupon.id, code: "LALE30" });

    // A draft deleted takes its discounts with it.
    const draft = (await s.createMarketTemplate({ ...templateOf(designer, seller.app.id, `draft-${seller.suffix}`), free: false, plans: [{ period: "1m", cents: 900 }] }))!;
    const onDraft = discountOf({ templateId: draft.id });
    await s.createMarketDiscount(onDraft);
    expect(await s.deleteMarketTemplate(draft.id)).toBe(true);
    expect(await s.getMarketDiscount(onDraft.id)).toBeNull();
  });
}
