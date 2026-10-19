import { randomToken, sha256Hex } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import type { App, Campaign, DonationSettings } from "../../data/types";
import {
  amountProblem,
  campaignJson,
  campaignOpen,
  campaignsInOrder,
  campaignSummaryJson,
  DONATION_LINK_MINUTES,
  donationJson,
  donationSettingsOf,
  donationsConfig,
  donationsSetUp,
  giveUrl,
  publicStatus,
  readDonationRequest,
  RECENT_DONATIONS,
} from "../../donations/service";
import { error, intParam } from "./common";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";

export interface DonationsDeps {
  store: DataStore;
  app: App;
  assetUrl: (assetId: string) => string;
  /** The platform's address, for donation page and receipt links. */
  platformUrl: string;
  /** 13.1 Card payments are in the app's plan (default true). Without them campaigns show without a donate button. */
  cardPayments?: boolean;
}

/** The app's donation settings as saved, or the defaults. */
export async function donationSettingsFor(store: DataStore, appId: string): Promise<DonationSettings> {
  return donationSettingsOf(await store.getDonationSettings(appId));
}

/**
 * 29 Charity & donations apps: campaigns managed on the dashboard's
 * Campaigns page, donation links to our donation page and the donor's
 * history. The iPhone app always gets a link for the system browser (App
 * Store guideline 3.2.2); totals count confirmed payments only.
 */
export class DonationsConnector implements Connector {
  constructor(private readonly deps: DonationsDeps) {}

  private settings(): Promise<DonationSettings> {
    return donationSettingsFor(this.deps.store, this.deps.app.id);
  }

  async config() {
    // Campaign updates are sent from the dashboard with the app's Firebase account (the hosted API adds the plan's push).
    return { donations: donationsConfig(await this.settings(), this.deps.app.firebaseServiceAccountEncrypted !== null) };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const route = `${request.method} /${request.path.join("/")}`;
    switch (route) {
      case "GET /donations/campaigns":
        return this.campaigns(request);
      case "POST /donations/checkout-link":
        return this.checkoutLink(request);
      case "GET /me/donations":
        return this.myDonations(request);
    }
    if (request.method === "GET" && request.path.length === 3 && request.path[0] === "donations" && request.path[1] === "campaigns") {
      return this.campaign(request, request.path[2]!);
    }
    return null;
  }

  private async campaigns(request: ConnectorRequest): Promise<ConnectorResult> {
    const { store, app, assetUrl } = this.deps;
    const status = request.query.get("status");
    if (status !== null && status !== "open" && status !== "closed") return error(400, "invalid_request", "Unknown status.");
    const ids = (request.query.get("ids") ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (ids.length > 30) return error(400, "invalid_request", "Ask for up to 30 campaigns at a time.");
    const [all, settings] = await Promise.all([store.listCampaigns(app.id), this.settings()]);
    const listed = campaignsInOrder(all, request.now);
    let found: Campaign[];
    if (ids.length) {
      const byId = new Map(listed.map((c) => [String(c.id), c]));
      found = ids.map((id) => byId.get(id)).filter((c): c is Campaign => c !== undefined);
    } else {
      const featured = request.query.get("featured") === "true";
      found = listed.filter((c) => (!status || publicStatus(c, request.now) === status) && (!featured || c.featured));
    }
    const page = ids.length ? 1 : intParam(request.query, "page", 1, 10_000);
    const perPage = ids.length ? Math.max(found.length, 1) : intParam(request.query, "per_page", 20, 50);
    return {
      status: 200,
      body: {
        page,
        per_page: perPage,
        total: found.length,
        total_pages: Math.max(1, Math.ceil(found.length / perPage)),
        items: found.slice((page - 1) * perPage, page * perPage).map((c) => campaignSummaryJson(c, settings.currency, assetUrl, request.now)),
      },
    };
  }

  private async campaign(request: ConnectorRequest, idText: string): Promise<ConnectorResult> {
    const { store, app, assetUrl } = this.deps;
    const id = /^\d{1,15}$/.test(idText) ? Number(idText) : NaN;
    const campaign = Number.isSafeInteger(id) ? await store.getCampaign(app.id, id) : null;
    if (!campaign || publicStatus(campaign, request.now) === null) return error(404, "not_found", "Campaign not found.");
    const [settings, recent] = await Promise.all([
      this.settings(),
      store.listDonations({ appId: app.id, campaignId: campaign.id, statuses: ["paid"], offset: 0, limit: RECENT_DONATIONS }),
    ]);
    // 16 Demo donations aren't on a campaign: the demo's totals and its wall stay as they were made.
    const shown = app.demo ? [] : recent.items;
    return { status: 200, body: campaignJson(campaign, settings.currency, assetUrl, shown, request.now) };
  }

  private async checkoutLink(request: ConnectorRequest): Promise<ConnectorResult> {
    const { store, app } = this.deps;
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const read = readDonationRequest(request.body);
    if (!read.ok) return error(400, "invalid_request", read.error);
    const settings = await this.settings();
    if (platform === "ios" && settings.iosMode === "off") {
      return error(403, "purchase_not_allowed", "Donations can't be made from the iPhone app. Please give on our website.");
    }
    if (this.deps.cardPayments === false) return error(403, "feature_disabled", "Donations aren't available in this app.");
    // 16 A demo charity takes donations without a payment account: its donation page charges nothing.
    if (!donationsSetUp(app)) return error(503, "donations_unavailable", "This charity can't take donations yet. Please try again later.");
    const campaign = await store.getCampaign(app.id, read.value.campaignId);
    if (!campaign || publicStatus(campaign, request.now) === null) return error(404, "not_found", "Campaign not found.");
    if (!campaignOpen(campaign, request.now)) return error(409, "campaign_closed", "This campaign has ended. Thank you for your support.");
    const problem = amountProblem(campaign, read.value.amountCents, settings.currency);
    if (problem) return error(400, "invalid_request", problem);
    const token = randomToken(24);
    await store.createDonation({
      appId: app.id,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      tokenHash: sha256Hex(token),
      receiptCode: randomToken(24),
      userId: request.user?.id ?? null,
      amountCents: read.value.amountCents,
      currency: settings.currency,
      recurring: read.value.recurring,
      anonymous: read.value.anonymous,
      message: read.value.message,
      // The donor fills these in on the donation page; a signed-in user's are suggested there.
      donorName: null,
      donorEmail: null,
      donorPhone: null,
      status: "pending",
      paymentId: null,
      createdAt: request.now,
      paidAt: null,
      updatedAt: request.now,
    });
    return {
      status: 200,
      body: {
        url: giveUrl(this.deps.platformUrl, token),
        expires_at: new Date(request.now.getTime() + DONATION_LINK_MINUTES * 60_000).toISOString(),
        // App Store guideline 3.2.2: donations from an iPhone app happen in the browser, never in the app.
        open_in: openInFor(platform),
      },
    };
  }

  private async myDonations(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return error(401, "invalid_token", "Your session has ended. Please sign in again.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const { items, total } = await this.deps.store.listDonations({
      appId: this.deps.app.id,
      userId: request.user.id,
      // 47 Refunded ones stay, with what was refunded.
      statuses: ["paid", "refunded"],
      offset: (page - 1) * perPage,
      limit: perPage,
    });
    return {
      status: 200,
      body: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.max(1, Math.ceil(total / perPage)),
        items: items.map((d) => donationJson(d, this.deps.platformUrl)),
      },
    };
  }
}

/** Where the app opens the donation page: always the browser on iOS (App Store guideline 3.2.2), in the app on Android. */
export function openInFor(platform: "android" | "ios"): "browser" | "in_app" {
  return platform === "ios" ? "browser" : "in_app";
}
