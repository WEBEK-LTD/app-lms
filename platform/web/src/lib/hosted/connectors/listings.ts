import type { DataStore } from "../../data/store";
import type { App, HostedUser, Listing, ListingInquiry, ListingSettings } from "../../data/types";
import { inquiryJson, listingDetailJson, listingSummaryJson, type ListingJsonContext } from "../../listings/json";
import { listingFilters, parseListingQuery, searchListings, similarListings } from "../../listings/search";
import { listingSettingsFor, listingsConfig } from "../../listings/types";
import { hitRateLimit, type RateLimitRule } from "../../rate-limit";
import { error, intParam } from "./common";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";

export interface ListingsDeps {
  store: DataStore;
  app: App;
  assetUrl: (assetId: string) => string;
  platformUrl: string;
  /** Tells the office about a new message from the app (an email); failures are ignored. */
  onInquiry?: (input: { inquiry: ListingInquiry; listing: Listing; user: HostedUser; text: string }) => Promise<void>;
}

/** Messages a user can send to the office, as in the other hosted write routes. */
export const INQUIRY_LIMIT = { name: "hosted-inquiry:user", limit: 20, windowSeconds: 60 * 60 } satisfies RateLimitRule;
export const INQUIRY_MESSAGE_MAX = 2000;

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const noListing = () => error(404, "not_found", "Listing not found.");
const noInquiry = () => error(404, "not_found", "Conversation not found.");
const messagesOff = () => error(403, "feature_disabled", "Messages to the office are turned off. Please call or write to the office instead.");

function idParam(value: string | undefined): number | null {
  if (!value || !/^\d{1,15}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const paged = <T>(all: T[], page: number, perPage: number) => ({
  page,
  per_page: perPage,
  total: all.length,
  total_pages: Math.max(1, Math.ceil(all.length / perPage)),
  items: all.slice((page - 1) * perPage, page * perPage),
});

/**
 * Real estate apps: the office's listings, managed in the dashboard and
 * served with search and filters, favorites and conversations with the
 * office (tag Listings in docs/api/openapi.yaml). Only published listings
 * are visible; texts come as the office wrote them.
 */
export class ListingsConnector implements Connector {
  constructor(private readonly deps: ListingsDeps) {}

  private async settings(): Promise<ListingSettings> {
    return listingSettingsFor(this.deps.app, await this.deps.store.getListingSettings(this.deps.app.id));
  }

  async config() {
    return { listings: listingsConfig(await this.settings()) };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const route = `${request.method} /${request.path.join("/")}`;
    switch (route) {
      case "GET /listings/filters":
        return { status: 200, body: listingFilters(await this.published()) };
      case "GET /listings":
        return this.search(request);
      case "GET /me/favorites":
        return this.favorites(request);
      case "GET /me/inquiries":
        return this.inquiries(request);
    }
    const [first, second, third, fourth] = request.path;
    if (first === "listings" && second) {
      const id = idParam(second);
      if (request.method === "GET" && request.path.length === 2) return this.detail(request, id);
      if (request.method === "POST" && third === "inquiries" && request.path.length === 3) return this.sendInquiry(request, id);
    }
    if (first === "me" && second === "favorites" && third && request.path.length === 3) {
      if (request.method === "PUT") return this.addFavorite(request, idParam(third));
      if (request.method === "DELETE") return this.removeFavorite(request, idParam(third));
    }
    if (first === "me" && second === "inquiries" && third) {
      if (request.method === "GET" && request.path.length === 3) return this.inquiry(request, idParam(third));
      if (request.method === "POST" && fourth === "messages" && request.path.length === 4) return this.reply(request, idParam(third));
    }
    return null;
  }

  // Data

  private async published(): Promise<Listing[]> {
    return (await this.deps.store.listListings(this.deps.app.id)).filter((l) => l.status === "published");
  }

  private async listing(id: number | null): Promise<Listing | null> {
    if (id === null) return null;
    const listing = await this.deps.store.getListing(this.deps.app.id, id);
    return listing?.status === "published" ? listing : null;
  }

  private async json(request: ConnectorRequest): Promise<ListingJsonContext> {
    const favorites = request.user ? await this.deps.store.listListingFavorites(this.deps.app.id, request.user.id) : [];
    return { assetUrl: this.deps.assetUrl, favorites: new Set(favorites.map((f) => f.listingId)) };
  }

  // Listings

  private async search(request: ConnectorRequest): Promise<ConnectorResult> {
    const query = parseListingQuery(request.query);
    if ("error" in query) return error(400, "invalid_request", query.error);
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const [all, ctx] = await Promise.all([this.published(), this.json(request)]);
    const result = paged(searchListings(all, query), page, perPage);
    return { status: 200, body: { ...result, items: result.items.map((l) => listingSummaryJson(l, ctx)) } };
  }

  private async detail(request: ConnectorRequest, id: number | null): Promise<ConnectorResult> {
    const listing = await this.listing(id);
    if (!listing) return noListing();
    const [all, ctx] = await Promise.all([this.published(), this.json(request)]);
    return { status: 200, body: listingDetailJson(listing, similarListings(listing, all), ctx) };
  }

  // Favorites

  private async favorites(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const [all, ctx] = await Promise.all([this.published(), this.json(request)]);
    const byId = new Map(all.map((l) => [l.id, l]));
    const favorites = (await this.deps.store.listListingFavorites(this.deps.app.id, request.user.id))
      .map((f) => byId.get(f.listingId))
      .filter((l): l is Listing => l !== undefined);
    const result = paged(favorites, page, perPage);
    return { status: 200, body: { ...result, items: result.items.map((l) => listingSummaryJson(l, ctx)) } };
  }

  private async addFavorite(request: ConnectorRequest, id: number | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const listing = await this.listing(id);
    if (!listing) return noListing();
    await this.deps.store.addListingFavorite({ appId: this.deps.app.id, userId: request.user.id, listingId: listing.id, createdAt: request.now });
    return { status: 204 };
  }

  private async removeFavorite(request: ConnectorRequest, id: number | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (id !== null) await this.deps.store.removeListingFavorite(this.deps.app.id, request.user.id, id);
    return { status: 204 };
  }

  // Conversations with the office

  private message(body: unknown): string | null {
    const value = (body as { message?: unknown } | null)?.message;
    if (typeof value !== "string") return null;
    const text = value.trim();
    return text.length >= 1 && text.length <= INQUIRY_MESSAGE_MAX ? text : null;
  }

  private async limited(user: HostedUser, now: Date): Promise<ConnectorResult | null> {
    const result = await hitRateLimit(this.deps.store, INQUIRY_LIMIT, `${this.deps.app.id}:${user.id}`, now);
    if (result.allowed) return null;
    return {
      status: 429,
      body: { code: "rate_limited", message: "You've sent many messages in a short time. Please try again later.", retry_after_seconds: result.retryAfter },
    };
  }

  /** The conversation with every message, as the user sees it. */
  private async full(inquiry: ListingInquiry): Promise<Record<string, unknown>> {
    const { store, app, assetUrl } = this.deps;
    const [listing, messages] = await Promise.all([store.getListing(app.id, inquiry.listingId), store.listListingInquiryMessages(app.id, inquiry.id)]);
    const unread = messages.filter((m) => m.from === "office" && !m.readAt).length;
    return inquiryJson(inquiry, listing, messages, unread, assetUrl);
  }

  private async sendInquiry(request: ConnectorRequest, id: number | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const listing = await this.listing(id);
    if (!listing) return noListing();
    if (!(await this.settings()).messages) return messagesOff();
    const text = this.message(request.body);
    if (text === null) return error(400, "invalid_request", `Write a message of up to ${INQUIRY_MESSAGE_MAX} characters.`);
    const wait = await this.limited(request.user, request.now);
    if (wait) return wait;
    const { store, app } = this.deps;
    const inquiry =
      (await store.findOpenListingInquiry(app.id, request.user.id, listing.id)) ??
      (await store.createListingInquiry({
        appId: app.id,
        listingId: listing.id,
        userId: request.user.id,
        status: "open",
        createdAt: request.now,
        updatedAt: request.now,
      }));
    await store.addListingInquiryMessage({ appId: app.id, inquiryId: inquiry.id, from: "user", text, createdAt: request.now });
    await this.tellOffice({ inquiry, listing, user: request.user, text });
    return { status: 201, body: await this.full({ ...inquiry, updatedAt: request.now }) };
  }

  private async tellOffice(input: { inquiry: ListingInquiry; listing: Listing; user: HostedUser; text: string }): Promise<void> {
    try {
      await this.deps.onInquiry?.(input);
    } catch {
      // The message is saved; the office sees it in the dashboard.
    }
  }

  private async own(request: ConnectorRequest, id: number | null): Promise<ListingInquiry | null> {
    if (id === null || !request.user) return null;
    const inquiry = await this.deps.store.getListingInquiry(this.deps.app.id, id);
    return inquiry && inquiry.userId === request.user.id ? inquiry : null;
  }

  private async inquiries(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const { store, app, assetUrl } = this.deps;
    const { items, total } = await store.listListingInquiries({ appId: app.id, userId: request.user.id, offset: (page - 1) * perPage, limit: perPage });
    const listings = new Map((await store.listListings(app.id)).map((l) => [l.id, l]));
    return {
      status: 200,
      body: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.max(1, Math.ceil(total / perPage)),
        items: items.map((row) => inquiryJson(row, listings.get(row.listingId) ?? null, row.lastMessage ? [row.lastMessage] : [], row.unreadByUser, assetUrl)),
      },
    };
  }

  private async inquiry(request: ConnectorRequest, id: number | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const inquiry = await this.own(request, id);
    if (!inquiry) return noInquiry();
    await this.deps.store.markListingInquiryRead(this.deps.app.id, inquiry.id, "office", request.now);
    return { status: 200, body: await this.full(inquiry) };
  }

  private async reply(request: ConnectorRequest, id: number | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const inquiry = await this.own(request, id);
    if (!inquiry) return noInquiry();
    if (!(await this.settings()).messages) return messagesOff();
    const text = this.message(request.body);
    if (text === null) return error(400, "invalid_request", `Write a message of up to ${INQUIRY_MESSAGE_MAX} characters.`);
    const wait = await this.limited(request.user, request.now);
    if (wait) return wait;
    const { store, app } = this.deps;
    // Writing again reopens a conversation the office closed.
    if (inquiry.status === "closed") await store.updateListingInquiry(app.id, inquiry.id, { status: "open" });
    await store.addListingInquiryMessage({ appId: app.id, inquiryId: inquiry.id, from: "user", text, createdAt: request.now });
    const listing = await store.getListing(app.id, inquiry.listingId);
    if (listing) await this.tellOffice({ inquiry, listing, user: request.user, text });
    return { status: 201, body: await this.full({ ...inquiry, status: "open", updatedAt: request.now }) };
  }
}
