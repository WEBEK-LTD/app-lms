import { campaignPageItems } from "../../donations/page-items";
import { eventPageItems } from "../../events/page-items";
import { listingPageItems } from "../listings/page-items";
import { registerItemSource } from "./items";

/**
 * Lists filled from the platform's own data: listings of Real estate apps
 * (10.7), events of Events & tickets apps (28), campaigns of Charity &
 * donations apps (29).
 */
export function registerPlatformItemSources(): void {
  // 38 In the language the app asked for.
  registerItemSource("listings", (ctx, query) => listingPageItems(ctx.appId, ctx.userId, query, { store: ctx.store, lang: ctx.lang }));
  registerItemSource("events", (ctx, query) => eventPageItems(ctx.appId, query, { store: ctx.store, lang: ctx.lang }));
  registerItemSource("campaigns", (ctx, query) => campaignPageItems(ctx.appId, query, { store: ctx.store, lang: ctx.lang }));
}

registerPlatformItemSources();
