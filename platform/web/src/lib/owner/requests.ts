import { parsePrice } from "../catalog/money";
import { STORE_REQUEST_STATUSES, type StoreRequest, type StoreRequestStatus } from "../data/types";
import { answerStoreRequest, isRequestStatus, REQUEST_REPLY_MAX, storeRequestJson } from "../selling/requests";
import { bodyObject, intParam, invalid, notFound, pageJson, paging, type OwnerContext, type OwnerResult } from "./http";
import { appScope, money } from "./sales";
import { recordStudio } from "./studio";

/**
 * 210 The shop's custom-order requests in Yallapp Business (the dashboard's
 * Store › Custom orders): new ones first, then the newest; one request with
 * its answers and who sent it; the shop's answer (where it is, the price
 * quoted and a reply).
 */

function requestJson(r: StoreRequest) {
  return { ...storeRequestJson(r), quote: r.quoteCents !== null ? money(r.quoteCents, r.currency) : null };
}

export async function listRequests(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "orders");
  const page = paging(ctx.req.query);
  const status = ctx.req.query.get("status") || "all";
  if (status !== "all" && status !== "open" && !isRequestStatus(status)) throw invalid({ status: "The request isn't valid." });
  const statuses: StoreRequestStatus[] | undefined = status === "all" ? undefined : status === "open" ? ["new", "quoted", "accepted"] : [status as StoreRequestStatus];
  const all = await ctx.deps.store.listStoreRequests(app.id, statuses ? { statuses } : {});
  const ordered = [...all.filter((r) => r.status === "new"), ...all.filter((r) => r.status !== "new")];
  return { status: 200, body: { ...pageJson(page, ordered.length), items: ordered.slice(page.offset, page.offset + page.perPage).map(requestJson) } };
}

async function ownRequest(ctx: OwnerContext, params: Record<string, string>) {
  const { app } = appScope(ctx, params.app_id, "orders");
  const request = await ctx.deps.store.getStoreRequest(app.id, intParam(params.request_id));
  if (!request) throw notFound();
  return { app, request };
}

export async function getRequest(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { request } = await ownRequest(ctx, params);
  return { status: 200, body: requestJson(request) };
}

/** The dashboard's answer (app/actions/requests.ts `answerRequestAction`). */
export async function answerRequest(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, request } = await ownRequest(ctx, params);
  const body = bodyObject(ctx.req.body);
  if (!isRequestStatus(body.status)) throw invalid({ status: `Choose one of: ${STORE_REQUEST_STATUSES.join(", ")}.` });
  const reply = typeof body.reply === "string" ? body.reply.trim() : "";
  if (reply.length > REQUEST_REPLY_MAX) throw invalid({ reply: `Keep it under ${REQUEST_REPLY_MAX} characters.` });
  let quoteCents: number | null = null;
  if (body.quote !== undefined && body.quote !== null && body.quote !== "") {
    quoteCents = typeof body.quote === "number" ? Math.round(body.quote * 100) : parsePrice(String(body.quote), request.currency);
    if (quoteCents === null || quoteCents <= 0) throw invalid({ quote: "Enter a price, like 450 or 450.50." });
  }
  await answerStoreRequest(ctx.deps.store, app.id, request.id, { status: body.status, reply: reply || null, quoteCents }, ctx.deps.now);
  await recordStudio(ctx, app, "shop.request", { type: "store_request", id: request.id }, `Answered the custom-order request #${request.id} (${body.status})`);
  return { status: 200, body: requestJson((await ctx.deps.store.getStoreRequest(app.id, request.id))!) };
}
