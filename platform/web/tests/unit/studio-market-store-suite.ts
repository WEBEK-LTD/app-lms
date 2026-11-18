import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, DesignerLedgerEntry, DesignerPayout, DesignerPayoutDetails, MarketTemplate, MarketTemplateVersion, TemplateApplication, TemplateDesigner, TemplateLicence, TemplateOrder } from "@/lib/data/types";
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

  // ——— 106.11 The designer's money ———

  const saleOf = (designer: TemplateDesigner, templateId: string, buyerId: string, gross: number, designerCents: number, at: Date): DesignerLedgerEntry => ({
    id: randomUUID(),
    designerId: designer.id,
    templateId,
    clientId: buyerId,
    kind: "buy",
    plan: "3m",
    grossCents: gross,
    designerCents,
    yallappCents: gross - designerCents,
    earnedAt: at,
    createdAt: at,
  });
  const payoutOf = (designer: TemplateDesigner, period: string, amountCents: number, at: Date): DesignerPayout => ({
    id: randomUUID(),
    designerId: designer.id,
    period,
    status: "processing",
    amountCents,
    currency: "USD",
    payeeName: "Nur Yılmaz",
    payeeCountry: "TR",
    payeeAddress: "Moda Cd. 12, Kadıköy, 34710 İstanbul",
    accountKind: "iban",
    accountEncrypted: "v2.test.sealed",
    accountHint: "TR33 •••• 1326",
    swift: "TCZBTR2A",
    bankCode: null,
    bankName: "Ziraat Bankası",
    bankCountry: "TR",
    preparedAt: at,
    preparedBy: "deniz@yallapp.test",
    bankReference: null,
    sentOn: null,
    sentAt: null,
    sentBy: null,
    emailedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancelNote: null,
  });

  it("106.11 keeps the designer's ledger: one entry per paid order, its own amounts, and each designer's earnings", async () => {
    const s = store();
    const seller = await account(s, "Nur");
    const other = await account(s, "Lale");
    const buyer = await account(s, "Tulip");
    const nur = (await s.createTemplateDesigner(designerOf(seller.client.id, `nur-money-${seller.suffix}`)))!;
    const lale = (await s.createTemplateDesigner(designerOf(other.client.id, `lale-money-${other.suffix}`)))!;
    const first = saleOf(nur, randomUUID(), buyer.client.id, 2400, 1800, days(1));
    // Up to a million dollars of cents stays whole on every store (bigint).
    const big = saleOf(nur, first.templateId, buyer.client.id, 1_000_000, 750_000, days(2));
    expect(await s.recordDesignerSale(first)).toBe(true);
    expect(await s.recordDesignerSale({ ...first, grossCents: 9_999 })).toBe(false);
    expect(await s.recordDesignerSale(big)).toBe(true);
    expect(await s.recordDesignerSale(saleOf(lale, randomUUID(), buyer.client.id, 101, 76, days(3)))).toBe(true);
    expect((await s.listDesignerLedger({ designerId: nur.id })).map((e) => [e.id, e.grossCents, e.designerCents, e.yallappCents])).toEqual([
      [big.id, 1_000_000, 750_000, 250_000],
      [first.id, 2400, 1800, 600],
    ]);
    expect(await s.listDesignerLedger({ designerId: nur.id })).toContainEqual(first);
    const earnings = await s.designerEarnings();
    expect(earnings[nur.id]).toEqual({ cents: 751_800, sales: 2 });
    expect(earnings[lale.id]).toEqual({ cents: 76, sales: 1 });
  });

  it("106.11 keeps the checks before the first payout; the team's answer goes only on the checks it looked at", async () => {
    const s = store();
    const seller = await account(s, "Nur");
    const nur = (await s.createTemplateDesigner(designerOf(seller.client.id, `nur-checks-${seller.suffix}`)))!;
    const details: DesignerPayoutDetails = {
      designerId: nur.id,
      legalName: "Nur Yılmaz",
      country: "TR",
      idType: "national_id",
      idNumberEncrypted: "v2.k.id.sealed",
      idDocumentAssetId: null,
      holderName: "Nur Yılmaz",
      accountKind: "iban",
      accountEncrypted: "v2.k.iban.sealed",
      swift: "TCZBTR2A",
      bankCode: null,
      bankName: "Ziraat Bankası",
      bankCountry: "TR",
      address: "Moda Cd. 12, Kadıköy, 34710 İstanbul",
      status: "submitted",
      reviewNote: null,
      submittedAt: days(1),
      reviewedAt: null,
      reviewedBy: null,
      createdAt: days(1),
      updatedAt: days(1),
    };
    await s.saveDesignerPayoutDetails(details);
    expect(await s.getDesignerPayoutDetails(nur.id)).toEqual(details);
    expect((await s.listDesignerPayoutDetails(["submitted"])).map((d) => d.designerId)).toContain(nur.id);
    // Asked for a fix on what was sent on day 1.
    expect(await s.reviewDesignerPayoutDetails(nur.id, days(1), { status: "changes_requested", reviewNote: "The bank's name is missing a word.", reviewedAt: days(2), reviewedBy: "deniz@yallapp.test" })).toBe(true);
    expect(await s.getDesignerPayoutDetails(nur.id)).toMatchObject({ status: "changes_requested", reviewNote: "The bank's name is missing a word.", reviewedAt: days(2) });
    // Not waiting any more: a second answer to the same checks is refused.
    expect(await s.reviewDesignerPayoutDetails(nur.id, days(1), { status: "approved", reviewNote: null, reviewedAt: days(2), reviewedBy: "deniz@yallapp.test" })).toBe(false);
    // Sent again on day 3 (replaced): approving the day-1 checks doesn't touch them, approving the day-3 ones does.
    await s.saveDesignerPayoutDetails({ ...details, bankName: "T.C. Ziraat Bankası", status: "submitted", submittedAt: days(3), updatedAt: days(3) });
    expect(await s.reviewDesignerPayoutDetails(nur.id, days(1), { status: "approved", reviewNote: null, reviewedAt: days(4), reviewedBy: "deniz@yallapp.test" })).toBe(false);
    expect(await s.reviewDesignerPayoutDetails(nur.id, days(3), { status: "approved", reviewNote: null, reviewedAt: days(4), reviewedBy: "deniz@yallapp.test" })).toBe(true);
    expect(await s.getDesignerPayoutDetails(nur.id)).toMatchObject({ bankName: "T.C. Ziraat Bankası", status: "approved", reviewNote: null, reviewedBy: "deniz@yallapp.test", createdAt: days(1), submittedAt: days(3) });
    expect((await s.listDesignerPayoutDetails(["submitted"])).map((d) => d.designerId)).not.toContain(nur.id);
    expect((await s.listDesignerPayoutDetails(["approved"])).map((d) => d.designerId)).toContain(nur.id);
    expect(await s.listDesignerPayoutDetails([])).toEqual([]);
  });

  it("106.11 keeps payouts: one a month per designer, only at the balance expected, sent or cancelled once", async () => {
    const s = store();
    const seller = await account(s, "Nur");
    const buyer = await account(s, "Tulip");
    const nur = (await s.createTemplateDesigner(designerOf(seller.client.id, `nur-payouts-${seller.suffix}`)))!;
    const templateId = randomUUID();
    await s.recordDesignerSale(saleOf(nur, templateId, buyer.client.id, 40_000, 30_000, days(1)));
    const december = payoutOf(nur, "2026-12", 30_000, days(2));
    // The balance is $300: a payout at another amount is refused, at $300 it's made.
    expect(await s.createDesignerPayout({ ...december, id: randomUUID(), amountCents: 29_999 }, 29_999)).toBe("changed");
    expect(await s.createDesignerPayout(december, 30_000)).toBe("created");
    // One a month: another for December is refused, whatever the balance.
    await s.recordDesignerSale(saleOf(nur, templateId, buyer.client.id, 40_000, 30_000, days(3)));
    expect(await s.createDesignerPayout({ ...payoutOf(nur, "2026-12", 30_000, days(3)) }, 30_000)).toBe("exists");
    expect(await s.getDesignerPayout(december.id)).toEqual(december);
    // Sent once, with the bank's reference.
    const sent = { bankReference: "SWIFT-20261203-0042", sentOn: "2026-12-03", sentAt: days(4), sentBy: "deniz@yallapp.test" };
    expect(await s.markDesignerPayoutSent(december.id, sent)).toBe(true);
    expect(await s.markDesignerPayoutSent(december.id, { ...sent, bankReference: "AGAIN" })).toBe(false);
    expect(await s.cancelDesignerPayout(december.id, { cancelledAt: days(5), cancelledBy: "deniz@yallapp.test", cancelNote: "Too late." })).toBe(false);
    await s.markDesignerPayoutEmailed(december.id, days(4));
    expect(await s.getDesignerPayout(december.id)).toMatchObject({ status: "sent", ...sent, emailedAt: days(4) });
    // January: the balance left ($300) is paid; a cancelled one frees its month for another.
    const january = payoutOf(nur, "2027-01", 30_000, days(30));
    expect(await s.createDesignerPayout(january, 30_000)).toBe("created");
    expect(await s.cancelDesignerPayout(january.id, { cancelledAt: days(31), cancelledBy: "deniz@yallapp.test", cancelNote: "The bank returned it: wrong IBAN." })).toBe(true);
    expect(await s.cancelDesignerPayout(january.id, { cancelledAt: days(31), cancelledBy: "deniz@yallapp.test", cancelNote: "Again." })).toBe(false);
    expect(await s.markDesignerPayoutSent(january.id, sent)).toBe(false);
    expect(await s.getDesignerPayout(january.id)).toMatchObject({ status: "cancelled", cancelNote: "The bank returned it: wrong IBAN.", cancelledAt: days(31) });
    // Two team members preparing January at once: one payout.
    const again = payoutOf(nur, "2027-01", 30_000, days(32));
    const twin = payoutOf(nur, "2027-01", 30_000, days(32));
    expect((await Promise.all([s.createDesignerPayout(again, 30_000), s.createDesignerPayout(twin, 30_000)])).sort()).toEqual(["created", "exists"]);
    const made = (await s.getDesignerPayout(again.id)) ? again : twin;
    expect(await s.getDesignerPayout(made === again ? twin.id : again.id)).toBeNull();
    expect((await s.listDesignerPayouts({ designerId: nur.id })).map((p) => p.id)).toEqual([made.id, january.id, december.id]);
    expect((await s.listDesignerPayouts({ designerId: nur.id, period: "2027-01", statuses: ["processing"] })).map((p) => p.id)).toEqual([made.id]);
    expect((await s.listDesignerPayouts({ designerId: nur.id, statuses: ["sent", "cancelled"] })).map((p) => p.id)).toEqual([january.id, december.id]);
    expect(await s.listDesignerPayouts({ designerId: nur.id, statuses: [] })).toEqual([]);
  });
}
