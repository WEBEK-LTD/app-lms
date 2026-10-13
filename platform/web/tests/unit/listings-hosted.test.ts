import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App, ListingInput } from "@/lib/data/types";
import { INQUIRY_LIMIT, ListingsConnector } from "@/lib/hosted/connectors/listings";
import { listingPageItems } from "@/lib/hosted/listings/page-items";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { cleanDescription, listingDescriptionHtml } from "@/lib/listings/html";
import { parseListingForm, parseOfficeForm, parseOfficePhone } from "@/lib/listings/forms";
import { formatListingPrice } from "@/lib/listings/json";
import { newInquiryMail, notifyInquiryReply } from "@/lib/listings/notify";
import { fold } from "@/lib/listings/search";
import { expectContract } from "./contract";
import { NOW, days, setupClient } from "./helpers";

const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

function listing(appId: string, overrides: Partial<ListingInput>): ListingInput {
  return {
    appId,
    reference: null,
    title: "Listing",
    description: "",
    purpose: "sale",
    type: "apartment",
    priceCents: 100_000_00,
    currency: "EGP",
    pricePeriod: null,
    negotiable: false,
    city: "Cairo",
    district: null,
    address: null,
    latitude: null,
    longitude: null,
    area: null,
    bedrooms: null,
    bathrooms: null,
    floor: null,
    yearBuilt: null,
    furnished: null,
    features: [],
    imageAssetIds: [],
    videoUrl: null,
    featured: false,
    status: "published",
    publishedAt: NOW,
    ...overrides,
  };
}

describe("listings on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let ids: Record<string, number>;
  let mails: { to: string; title: string }[];

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "real_estate"),
      backend: "hosted",
      appName: "Nile Homes",
      websiteDoneAt: NOW,
      connector: { kind: "listings" },
    };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    mails = [];
    const add = async (key: string, input: Partial<ListingInput>) => (ids[key] = (await store.createListing(listing(app.id, input), NOW)).id);
    ids = {};
    await add("nile", {
      reference: "NH-1042",
      title: "Bright apartment with a Nile view",
      description: "Sunny and quiet.\n\nTen minutes from the metro.",
      priceCents: 4_250_000_00,
      negotiable: true,
      district: "Maadi",
      address: "Road 9, Maadi",
      latitude: 29.9602,
      longitude: 31.2569,
      area: 185,
      bedrooms: 3,
      bathrooms: 2,
      floor: 7,
      yearBuilt: 2015,
      furnished: false,
      features: ["Elevator", "Nile view"],
      imageAssetIds: ["img-a", "img-b"],
      featured: true,
      publishedAt: days(-3),
    });
    await add("villa", {
      title: "Garden villa",
      type: "villa",
      priceCents: 12_000_000_00,
      city: "Giza",
      district: "Sheikh Zayed",
      area: 420,
      bedrooms: 5,
      bathrooms: 4,
      publishedAt: days(-1),
    });
    await add("studio", {
      title: "Studio near the university",
      type: "studio",
      purpose: "rent",
      priceCents: 9_000_00,
      pricePeriod: "month",
      city: "cairo",
      district: "Dokki",
      area: 45,
      bedrooms: 0,
      bathrooms: 1,
      publishedAt: days(-2),
    });
    await add("draft", { title: "Draft penthouse", type: "penthouse", status: "draft", publishedAt: null });
    await add("archived", { title: "Old shop", type: "shop", status: "archived" });
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: ASSETS,
    platformUrl: "https://yallapp.test",
    connector: new ListingsConnector({
      store,
      app,
      assetUrl: ASSETS,
      platformUrl: "https://yallapp.test",
      onInquiry: async ({ user, listing: l }) => {
        mails.push({ to: user.name, title: l.title });
      },
    }),
  });

  async function call(
    method: string,
    route: string,
    options: { body?: unknown; token?: string | null; query?: Record<string, string>; params?: string[] } = {},
  ): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
    });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone = "5321234567", name = "Mona Adel") {
    now = new Date(now.getTime() + 61_000);
    const device = { id: `install-${phone}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device } });
    return registered.body as { access_token: string; user: { id: number } };
  }

  const titles = (result: HostedResult) => (result.body as { items: { title: string }[] }).items.map((i) => i.title);

  it("sends the office's settings in the config", async () => {
    const config = await call("GET", "/config", { query: { platform: "ios", app_version: "1.0.0" } });
    expect((config.body as { listings: unknown }).listings).toEqual({
      currency: "TRY",
      area_unit: "m2",
      contact: { name: "Nile Homes", phone: null, whatsapp: null, email: null },
      messages: true,
    });
    await store.saveListingSettings(
      app.id,
      { currency: "EGP", areaUnit: "ft2", contactName: "Nile Homes Maadi", contactPhone: "+201001234567", contactWhatsapp: "+201001234567", contactEmail: "office@nile.test", messages: false },
      NOW,
    );
    const saved = await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } });
    expect((saved.body as { listings: unknown }).listings).toEqual({
      currency: "EGP",
      area_unit: "ft2",
      contact: { name: "Nile Homes Maadi", phone: "+201001234567", whatsapp: "+201001234567", email: "office@nile.test" },
      messages: false,
    });
  });

  it("offers filters from the published listings only", async () => {
    const filters = await call("GET", "/listings/filters");
    expect(filters.body).toEqual({
      purposes: ["sale", "rent"],
      types: [
        { key: "apartment", label: "Apartment", count: 1 },
        { key: "villa", label: "Villa", count: 1 },
        { key: "studio", label: "Studio", count: 1 },
      ],
      cities: [
        { name: "Cairo", count: 2, districts: ["Dokki", "Maadi"] },
        { name: "Giza", count: 1, districts: ["Sheikh Zayed"] },
      ],
      price: { min: 9000, max: 12000000 },
      area: { min: 45, max: 420 },
      bedrooms_max: 5,
    });
  });

  it("searches, filters, sorts and pages published listings", async () => {
    expect(titles(await call("GET", "/listings"))).toEqual(["Garden villa", "Studio near the university", "Bright apartment with a Nile view"]);
    expect(titles(await call("GET", "/listings", { query: { purpose: "rent" } }))).toEqual(["Studio near the university"]);
    expect(titles(await call("GET", "/listings", { query: { type: "villa" } }))).toEqual(["Garden villa"]);
    expect(titles(await call("GET", "/listings", { query: { city: "CAIRO", sort: "price_asc" } }))).toEqual(["Studio near the university", "Bright apartment with a Nile view"]);
    expect(titles(await call("GET", "/listings", { query: { city: "Cairo", district: "maadi" } }))).toEqual(["Bright apartment with a Nile view"]);
    expect(titles(await call("GET", "/listings", { query: { min_price: "10000", max_price: "5000000" } }))).toEqual(["Bright apartment with a Nile view"]);
    expect(titles(await call("GET", "/listings", { query: { min_area: "100", max_area: "200" } }))).toEqual(["Bright apartment with a Nile view"]);
    expect(titles(await call("GET", "/listings", { query: { bedrooms: "3", sort: "price_desc" } }))).toEqual(["Garden villa", "Bright apartment with a Nile view"]);
    expect(titles(await call("GET", "/listings", { query: { bathrooms: "4" } }))).toEqual(["Garden villa"]);
    expect(titles(await call("GET", "/listings", { query: { featured: "true" } }))).toEqual(["Bright apartment with a Nile view"]);
    expect(titles(await call("GET", "/listings", { query: { sort: "area_desc" } }))).toEqual(["Garden villa", "Bright apartment with a Nile view", "Studio near the university"]);
    // Every word, in the title, description, place or reference; drafts and archived listings never show.
    expect(titles(await call("GET", "/listings", { query: { search: "nile METRO" } }))).toEqual(["Bright apartment with a Nile view"]);
    expect(titles(await call("GET", "/listings", { query: { search: "nh-1042" } }))).toEqual(["Bright apartment with a Nile view"]);
    expect(titles(await call("GET", "/listings", { query: { search: "zayed" } }))).toEqual(["Garden villa"]);
    expect(titles(await call("GET", "/listings", { query: { search: "penthouse" } }))).toEqual([]);
    expect(titles(await call("GET", "/listings", { query: { search: "shop" } }))).toEqual([]);

    const page = await call("GET", "/listings", { query: { per_page: "2", page: "2" } });
    expect(page.body).toMatchObject({ page: 2, per_page: 2, total: 3, total_pages: 2, items: [{ title: "Bright apartment with a Nile view" }] });
    const nile = (page.body as { items: Record<string, unknown>[] }).items[0];
    expect(nile).toEqual({
      id: ids.nile,
      reference: "NH-1042",
      title: "Bright apartment with a Nile view",
      purpose: "sale",
      type: "apartment",
      type_label: "Apartment",
      price: { amount: "4250000.00", currency: "EGP", formatted: "EGP 4,250,000", period: null, negotiable: true },
      image_url: ASSETS("img-a"),
      city: "Cairo",
      district: "Maadi",
      area: 185,
      bedrooms: 3,
      bathrooms: 2,
      featured: true,
      favorited: false,
    });
    const rent = await call("GET", "/listings", { query: { purpose: "rent" } });
    expect(rent.body).toMatchObject({ items: [{ price: { formatted: "EGP 9,000", period: "month" } }] });

    const wrong: Record<string, string>[] = [{ purpose: "lease" }, { sort: "cheapest" }, { min_price: "-1" }, { bedrooms: "2.5" }, { featured: "maybe" }, { search: "x".repeat(101) }];
    for (const query of wrong) {
      expect((await call("GET", "/listings", { query })).body).toMatchObject({ code: "invalid_request" });
    }
  });

  it("shows a published listing with its details and similar ones", async () => {
    const detail = await call("GET", "/listings/{listing_id}", { params: [String(ids.nile)] });
    expect(detail.body).toMatchObject({
      id: ids.nile,
      description_html: "<p>Sunny and quiet.</p><p>Ten minutes from the metro.</p>",
      images: [
        { url: ASSETS("img-a"), alt: "Bright apartment with a Nile view" },
        { url: ASSETS("img-b"), alt: "Bright apartment with a Nile view" },
      ],
      video_url: null,
      features: ["Elevator", "Nile view"],
      floor: 7,
      year_built: 2015,
      furnished: false,
      location: { address: "Road 9, Maadi", latitude: 29.9602, longitude: 31.2569 },
      created_at: days(-3).toISOString(),
    });
    // The other Cairo listing; not the villa in Giza, nor drafts.
    expect((detail.body as { similar: { title: string }[] }).similar.map((s) => s.title)).toEqual(["Studio near the university"]);
    for (const id of [String(ids.draft), String(ids.archived), "999", "abc", "0"]) {
      expect((await call("GET", "/listings/{listing_id}", { params: [id] })).status).toBe(404);
    }
  });

  it("keeps a user's favorites", async () => {
    expect((await call("GET", "/me/favorites")).status).toBe(401);
    expect((await call("PUT", "/me/favorites/{listing_id}", { params: [String(ids.nile)] })).status).toBe(401);
    const { access_token: token } = await signUp();
    expect((await call("PUT", "/me/favorites/{listing_id}", { params: [String(ids.draft)], token })).status).toBe(404);
    now = new Date(now.getTime() + 1000);
    expect((await call("PUT", "/me/favorites/{listing_id}", { params: [String(ids.villa)], token })).status).toBe(204);
    now = new Date(now.getTime() + 1000);
    expect((await call("PUT", "/me/favorites/{listing_id}", { params: [String(ids.nile)], token })).status).toBe(204);
    // Adding again changes nothing.
    expect((await call("PUT", "/me/favorites/{listing_id}", { params: [String(ids.villa)], token })).status).toBe(204);
    expect(titles(await call("GET", "/me/favorites", { token }))).toEqual(["Bright apartment with a Nile view", "Garden villa"]);
    expect((await call("GET", "/listings/{listing_id}", { params: [String(ids.nile)], token })).body).toMatchObject({ favorited: true });
    const all = (await call("GET", "/listings", { token })).body as { items: { title: string; favorited: boolean }[] };
    expect(all.items.filter((i) => i.favorited).map((i) => i.title)).toEqual(["Garden villa", "Bright apartment with a Nile view"]);
    // Signed out, nothing is a favorite.
    expect(((await call("GET", "/listings")).body as { items: { favorited: boolean }[] }).items.every((i) => !i.favorited)).toBe(true);

    expect((await call("DELETE", "/me/favorites/{listing_id}", { params: [String(ids.villa)], token })).status).toBe(204);
    expect((await call("DELETE", "/me/favorites/{listing_id}", { params: ["999"], token })).status).toBe(204);
    // A favorite that's no longer published drops out of the list.
    await store.updateListing(app.id, ids.nile!, { status: "archived" }, NOW);
    expect((await call("GET", "/me/favorites", { token })).body).toMatchObject({ total: 0, items: [] });
  });

  it("runs a conversation between a user and the office", async () => {
    expect((await call("POST", "/listings/{listing_id}/inquiries", { params: [String(ids.nile)], body: { message: "Hi" } })).status).toBe(401);
    expect((await call("GET", "/me/inquiries")).status).toBe(401);
    const { access_token: token, user } = await signUp();
    const send = (id: number, message: unknown) => call("POST", "/listings/{listing_id}/inquiries", { params: [String(id)], token, body: { message } });
    expect((await send(ids.draft!, "Hello")).status).toBe(404);
    expect((await send(ids.nile!, "   ")).body).toMatchObject({ code: "invalid_request" });
    expect((await send(ids.nile!, "x".repeat(2001))).status).toBe(400);
    expect((await call("POST", "/listings/{listing_id}/inquiries", { params: [String(ids.nile)], token })).status).toBe(400);

    const first = await send(ids.nile!, "Is it still available?");
    expect(first.status).toBe(201);
    const inquiry = first.body as { id: number };
    expect(first.body).toMatchObject({
      listing: { id: ids.nile, title: "Bright apartment with a Nile view", image_url: ASSETS("img-a") },
      status: "open",
      unread: 0,
      messages: [{ from: "user", text: "Is it still available?" }],
    });
    expect(mails).toEqual([{ to: "Mona Adel", title: "Bright apartment with a Nile view" }]);
    now = new Date(now.getTime() + 1000);
    // A second message about the same listing joins the open conversation.
    const second = await send(ids.nile!, "Can I visit on Saturday?");
    expect(second.body).toMatchObject({ id: inquiry.id, messages: [{ text: "Is it still available?" }, { text: "Can I visit on Saturday?" }] });
    now = new Date(now.getTime() + 1000);
    await send(ids.villa!, "What's the garden size?");

    // The office sees two conversations, one with two unread messages.
    const office = await store.listListingInquiries({ appId: app.id, offset: 0, limit: 10 });
    expect(office.items.map((i) => [i.listingId, i.unreadByOffice])).toEqual([
      [ids.villa, 1],
      [ids.nile, 2],
    ]);
    expect(await store.countUnreadListingInquiries(app.id)).toBe(2);

    // The office replies from the dashboard; the user gets an inbox notification.
    now = new Date(now.getTime() + 1000);
    await store.markListingInquiryRead(app.id, inquiry.id, "user", now);
    await store.addListingInquiryMessage({ appId: app.id, inquiryId: inquiry.id, from: "office", text: "Yes, Saturday at 11 works.", createdAt: now });
    const saved = (await store.getListingInquiry(app.id, inquiry.id))!;
    const nile = (await store.getListing(app.id, ids.nile!))!;
    await notifyInquiryReply({ store, app, inquiry: saved, listing: nile, officeName: "Nile Homes", text: "Yes, Saturday at 11 works.", account: null, now });
    expect(await store.countUnreadListingInquiries(app.id)).toBe(1);

    const list = await call("GET", "/me/inquiries", { token });
    expect(list.body).toMatchObject({
      total: 2,
      items: [
        { id: inquiry.id, unread: 1, messages: [{ from: "office", text: "Yes, Saturday at 11 works." }] },
        { listing: { title: "Garden villa" }, unread: 0, messages: [{ from: "user" }] },
      ],
    });
    expect((list.body as { items: { messages: unknown[] }[] }).items[0]!.messages).toHaveLength(1);
    const inbox = await call("GET", "/me/notifications", { token });
    expect(inbox.body).toMatchObject({ unread_count: 1, items: [{ title: "Nile Homes replied", body: "Bright apartment with a Nile view: Yes, Saturday at 11 works." }] });

    // Opening the conversation marks the office's messages read.
    const opened = await call("GET", "/me/inquiries/{inquiry_id}", { params: [String(inquiry.id)], token });
    expect(opened.body).toMatchObject({ unread: 0 });
    expect((opened.body as { messages: { from: string }[] }).messages.map((m) => m.from)).toEqual(["user", "user", "office"]);
    expect((await call("GET", "/me/inquiries", { token })).body).toMatchObject({ items: [{ unread: 0 }, { unread: 0 }] });

    // The office closes it; writing again reopens it.
    await store.updateListingInquiry(app.id, inquiry.id, { status: "closed" });
    now = new Date(now.getTime() + 1000);
    const reply = await call("POST", "/me/inquiries/{inquiry_id}/messages", { params: [String(inquiry.id)], token, body: { message: "Thanks, see you then." } });
    expect(reply.status).toBe(201);
    expect(reply.body).toMatchObject({ status: "open", updated_at: now.toISOString() });
    expect((reply.body as { messages: unknown[] }).messages).toHaveLength(4);
    expect((await call("POST", "/me/inquiries/{inquiry_id}/messages", { params: [String(inquiry.id)], token, body: { message: "" } })).status).toBe(400);

    // Someone else's conversation is not found.
    const other = await signUp("5321234568", "Omar Said");
    expect((await call("GET", "/me/inquiries/{inquiry_id}", { params: [String(inquiry.id)], token: other.access_token })).status).toBe(404);
    expect((await call("POST", "/me/inquiries/{inquiry_id}/messages", { params: [String(inquiry.id)], token: other.access_token, body: { message: "Hi" } })).status).toBe(404);
    expect((await call("GET", "/me/inquiries", { token: other.access_token })).body).toMatchObject({ total: 0, items: [] });

    // Deleting the account removes the user's favorites and conversations.
    await call("PUT", "/me/favorites/{listing_id}", { params: [String(ids.villa)], token });
    expect((await call("DELETE", "/me", { token })).status).toBe(204);
    expect(await store.listListingFavorites(app.id, user.id)).toEqual([]);
    expect((await store.listListingInquiries({ appId: app.id, offset: 0, limit: 10 })).total).toBe(0);
  });

  it("refuses messages when the office turned them off", async () => {
    const { access_token: token } = await signUp();
    const started = await call("POST", "/listings/{listing_id}/inquiries", { params: [String(ids.nile)], token, body: { message: "Hello" } });
    await store.saveListingSettings(
      app.id,
      { currency: "EGP", areaUnit: "m2", contactName: "Nile Homes", contactPhone: null, contactWhatsapp: null, contactEmail: null, messages: false },
      NOW,
    );
    expect((await call("POST", "/listings/{listing_id}/inquiries", { params: [String(ids.nile)], token, body: { message: "Hello" } })).body).toMatchObject({
      code: "feature_disabled",
    });
    const reply = await call("POST", "/me/inquiries/{inquiry_id}/messages", { params: [String((started.body as { id: number }).id)], token, body: { message: "Hi" } });
    expect(reply.status).toBe(403);
    // Past conversations stay readable.
    expect((await call("GET", "/me/inquiries", { token })).body).toMatchObject({ total: 1 });
  });

  it("limits how many messages a user sends", async () => {
    const { access_token: token } = await signUp();
    for (let i = 0; i < INQUIRY_LIMIT.limit; i += 1) {
      const sent = await call("POST", "/listings/{listing_id}/inquiries", { params: [String(ids.nile)], token, body: { message: `Message ${i}` } });
      expect(sent.status).toBe(201);
    }
    const limited = await call("POST", "/listings/{listing_id}/inquiries", { params: [String(ids.villa)], token, body: { message: "One more" } });
    expect(limited).toMatchObject({ status: 429, body: { code: "rate_limited" } });
    expect((limited.body as { retry_after_seconds: number }).retry_after_seconds).toBeGreaterThan(0);
    const inquiry = (await store.listListingInquiries({ appId: app.id, offset: 0, limit: 1 })).items[0]!;
    expect((await call("POST", "/me/inquiries/{inquiry_id}/messages", { params: [String(inquiry.id)], token, body: { message: "And another" } })).status).toBe(429);
  });

  it("pushes the office's reply to the user's phones", async () => {
    const { access_token: token, user } = await signUp();
    await call("PUT", "/me/push-token", { token, body: { token: "fcm-mona", preferences: { announcements: false } } });
    const inquiry = await store.createListingInquiry({ appId: app.id, listingId: ids.nile!, userId: user.id, status: "open", createdAt: NOW, updatedAt: NOW });
    const pushed: { tokens: string[]; data: Record<string, string> }[] = [];
    const result = await notifyInquiryReply({
      store,
      app,
      inquiry,
      listing: null,
      officeName: "Nile Homes",
      text: "Yes.",
      account: { project_id: "nile", client_email: "push@nile.iam", private_key: "-----BEGIN PRIVATE KEY-----" },
      now,
      send: async (_account, tokens, message) => {
        pushed.push({ tokens, data: message.data });
        return { sent: tokens.length, invalidTokens: [] };
      },
    });
    // A personal reply goes even with announcements turned off.
    expect(result.pushed).toBe(1);
    expect(pushed).toEqual([
      { tokens: ["fcm-mona"], data: { type: "announcement", notification_id: String(result.notification.id), inquiry_id: String(inquiry.id), listing_id: String(ids.nile) } },
    ]);
    expect(result.notification).toMatchObject({ userId: user.id, title: "Nile Homes replied", body: "Yes." });
  });

  it("gives pages listing cards", async () => {
    const { user } = await signUp();
    await store.addListingFavorite({ appId: app.id, userId: user.id, listingId: ids.studio!, createdAt: NOW });
    await store.saveListingSettings(
      app.id,
      { currency: "EGP", areaUnit: "m2", contactName: "Nile Homes", contactPhone: null, contactWhatsapp: null, contactEmail: null, messages: true },
      NOW,
    );
    const deps = { store, assetUrl: ASSETS };
    const items = await listingPageItems(app.id, String(user.id), { limit: 10 }, deps);
    expect(items.map((i) => i.title)).toEqual(["Garden villa", "Studio near the university", "Bright apartment with a Nile view"]);
    expect(items[1]).toEqual({
      source: "listings",
      id: String(ids.studio),
      title: "Studio near the university",
      subtitle: "Dokki · 45 m²",
      image_url: null,
      price_label: "EGP 9,000 / month",
      badge: "For rent",
      favorited: true,
      action: { type: "item", item: { source: "listings", id: String(ids.studio) } },
    });
    expect(items[2]).toMatchObject({ subtitle: "Maadi · 185 m²", price_label: "EGP 4,250,000", badge: "Negotiable", image_url: ASSETS("img-a"), favorited: false });
    expect(items[0]).toMatchObject({ badge: "For sale" });
    expect((await listingPageItems(app.id, null, { category_id: "villa", limit: 10 }, deps)).map((i) => i.title)).toEqual(["Garden villa"]);
    expect((await listingPageItems(app.id, null, { featured: true, limit: 10 }, deps)).map((i) => i.id)).toEqual([String(ids.nile)]);
    expect((await listingPageItems(app.id, null, { sort: "price_asc", limit: 2 }, deps)).map((i) => i.title)).toEqual(["Studio near the university", "Bright apartment with a Nile view"]);
    expect((await listingPageItems(app.id, null, { ids: [String(ids.villa), String(ids.draft), "999", String(ids.nile)], limit: 10 }, deps)).map((i) => i.title)).toEqual([
      "Garden villa",
      "Bright apartment with a Nile view",
    ]);
    expect(await listingPageItems("00000000-0000-0000-0000-000000000000", null, { limit: 10 }, deps)).toEqual([]);
  });
});

describe("listing forms", () => {
  const valid = {
    title: "Bright apartment",
    purpose: "sale",
    type: "apartment",
    price: "4,250,000",
    currency: "EGP",
    city: "Cairo",
    features: "Elevator\nGarden, garden\n\nSea view",
    negotiable: "on",
  };

  it("reads a listing", () => {
    const parsed = parseListingForm(valid, NOW);
    expect(parsed).toEqual({
      ok: true,
      value: expect.objectContaining({
        title: "Bright apartment",
        priceCents: 4_250_000_00,
        pricePeriod: null,
        negotiable: true,
        features: ["Elevator", "Garden", "Sea view"],
        district: null,
        latitude: null,
        furnished: null,
      }),
    });
    const rent = parseListingForm({ ...valid, purpose: "rent", period: "year", furnished: "yes", latitude: "29.96", longitude: "31.25", area: "185.5", bedrooms: "3" }, NOW);
    expect(rent).toMatchObject({ ok: true, value: { pricePeriod: "year", furnished: true, latitude: 29.96, longitude: 31.25, area: 185.5, bedrooms: 3 } });
  });

  it("explains what's wrong", () => {
    const parsed = parseListingForm(
      {
        title: "",
        purpose: "rent",
        type: "castle",
        price: "free",
        currency: "XYZ",
        city: "",
        latitude: "29",
        bedrooms: "2.5",
        yearBuilt: "1700",
        videoUrl: "http://youtube.com/x",
        features: Array.from({ length: 31 }, (_, i) => `Feature ${i}`).join("\n"),
      },
      NOW,
    );
    expect(parsed.ok).toBe(false);
    expect(Object.keys((parsed as { errors: Record<string, string> }).errors).sort()).toEqual(
      ["bedrooms", "city", "currency", "features", "longitude", "period", "price", "title", "type", "videoUrl", "yearBuilt"].sort(),
    );
  });

  it("reads the office settings", () => {
    expect(parseOfficePhone("+20 100 123 4567")).toBe("+201001234567");
    expect(parseOfficePhone("0100 123 4567")).toBeNull();
    expect(
      parseOfficeForm({ currency: "EGP", areaUnit: "m2", contactName: "Nile Homes", contactPhone: "+20 100 123 4567", contactWhatsapp: "", contactEmail: "office@nile.test", messages: "on" }),
    ).toEqual({
      ok: true,
      value: { currency: "EGP", areaUnit: "m2", contactName: "Nile Homes", contactPhone: "+201001234567", contactWhatsapp: null, contactEmail: "office@nile.test", messages: true },
    });
    const wrong = parseOfficeForm({ currency: "", areaUnit: "acres", contactName: "", contactPhone: "123", contactEmail: "nope" });
    expect(Object.keys((wrong as { errors: Record<string, string> }).errors).sort()).toEqual(["areaUnit", "contactEmail", "contactName", "contactPhone", "currency"]);
  });
});

describe("listing texts", () => {
  it("keeps simple formatting and drops the rest", () => {
    expect(cleanDescription('<p onclick="x()">Hi <b>there</b><script>alert(1)</script></p><img src=x onerror=y><a href="javascript:alert(1)">bad</a>')).toBe(
      "<p>Hi <b>there</b></p>bad",
    );
    expect(cleanDescription('<ul><li>One<li>Two</ul><a href="https://nile.test/a?b=1&amp;c=2" target="_blank">Map</a> & more')).toBe(
      '<ul><li>One<li>Two</li></li></ul><a href="https://nile.test/a?b=1&amp;c=2">Map</a> &amp; more',
    );
    expect(cleanDescription("<div><h3>Title</h3><em>unclosed")).toBe("<h3>Title</h3><em>unclosed</em>");
    expect(listingDescriptionHtml("Line one\nline two\n\n3 < 4")).toBe("<p>Line one<br>line two</p><p>3 &lt; 4</p>");
    expect(listingDescriptionHtml("<p>Already <strong>HTML</strong></p>")).toBe("<p>Already <strong>HTML</strong></p>");
  });

  it("formats prices and folds searches", () => {
    expect(formatListingPrice(4_250_000_00, "EGP")).toBe("EGP 4,250,000");
    expect(formatListingPrice(1_250_50, "USD")).toBe("USD 1,250.5");
    expect(fold("Şişli İzmir Café")).toBe("sisli izmir cafe");
  });

  it("tells the office about a message", () => {
    const mail = newInquiryMail({
      listing: { ...listing("a", { title: "Garden villa", reference: "NH-7" }), id: 7, createdAt: NOW, updatedAt: NOW },
      user: { id: 1, appId: "a", phone: "+905321234567", name: "Mona Adel", email: null, city: null, notificationsReadAt: null, createdAt: NOW, updatedAt: NOW },
      text: "Is it available?",
      appName: "Nile Homes",
      url: "https://yallapp.test/dashboard/inquiries/3",
    });
    expect(mail.subject).toBe("New message about Garden villa");
    expect(mail.text).toContain("Mona Adel wrote about Garden villa (NH-7) in Nile Homes:");
    expect(mail.text).toContain("Phone: +905321234567");
    expect(mail.text).toContain("https://yallapp.test/dashboard/inquiries/3");
  });
});
