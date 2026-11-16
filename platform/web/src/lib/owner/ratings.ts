import { readCommunityText } from "../courses/community";
import type { FoodOrder, MarketOrder, Ride } from "../data/types";
import { serviceAccountOf } from "../hosted/notify";
import { recordTeamActivity } from "../team/activity";
import { findRated, ownerReplyJson, ratedAbout, ratedReference, removeRatingReply, replyToRating, type RatedSource } from "./rating-replies";
import { appScope } from "./sales";
import { bodyObject, intParam, invalid, notFound, type OwnerContext, type OwnerResult } from "./http";

/**
 * 132 The business's reply under a customer's rating (Owner API): `PUT` and
 * `DELETE /apps/{app_id}/ratings/{source}/{rating_id}/reply` for a food
 * order's, a marketplace order's or a ride's. The person needs the app's
 * area for it (food orders, the marketplace, rides).
 */

const AREA = { food: "foodOrders", market: "market", ride: "rides" } as const;

/** `rating` on a food order, a marketplace order or a ride: the stars, the comment and the business's reply. */
export function ownerRatingJson(rating: FoodOrder["rating"] | MarketOrder["rating"] | Ride["rating"]) {
  if (!rating) return null;
  const stars = "restaurant" in rating ? rating.restaurant : "vendor" in rating ? rating.vendor : rating.driver;
  return {
    stars,
    courier: "courier" in rating ? rating.courier : null,
    comment: rating.comment,
    at: rating.at,
    reply: ownerReplyJson(rating.reply),
  };
}

async function ownRated(ctx: OwnerContext, params: Record<string, string>) {
  const source = params.source as RatedSource;
  if (!(source in AREA)) throw notFound();
  const { app } = appScope(ctx, params.app_id, AREA[source]);
  const rated = await findRated(ctx.deps.store, app, source, intParam(params.rating_id));
  if (!rated) throw notFound();
  return { app, rated };
}

function ratedJson(rated: NonNullable<Awaited<ReturnType<typeof findRated>>>) {
  return {
    source: rated.source,
    id: rated.item.id,
    reference: ratedReference(rated),
    about: ratedAbout(rated),
    rating: ownerRatingJson(rated.rating)!,
  };
}

export async function replyRating(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, rated } = await ownRated(ctx, params);
  const { deps } = ctx;
  const text = bodyObject(ctx.req.body).text;
  const read = readCommunityText(text, "Write your reply.");
  if (!read.ok) throw invalid({ text: read.error });
  const done = await replyToRating(
    { store: deps.store, app, now: deps.now, account: serviceAccountOf(app, deps.encryptionKey), send: deps.sendPush },
    rated,
    text,
    ctx.user.name?.trim() || ctx.user.email,
  );
  if (!done.ok) throw invalid({ text: done.error });
  await recordTeamActivity(
    deps.store,
    { clientId: ctx.client.id, appId: app.id, actor: ctx.user, action: "rating.reply", target: { type: rated.source, id: rated.item.id }, summary: `Replied to the rating of ${ratedReference(rated)}` },
    deps.now,
  );
  return { status: 200, body: ratedJson((await findRated(deps.store, app, rated.source, rated.item.id))!) };
}

export async function deleteRatingReply(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, rated } = await ownRated(ctx, params);
  await removeRatingReply(ctx.deps.store, app, rated, ctx.deps.now);
  return { status: 200, body: ratedJson((await findRated(ctx.deps.store, app, rated.source, rated.item.id))!) };
}
