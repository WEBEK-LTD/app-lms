import { eventPageItems } from "../../events/page-items";
import { listingPageItems } from "../listings/page-items";
import { registerItemSource } from "./items";

/** Lists filled from the platform's own data: listings of Real estate apps (10.7), events of Events & tickets apps (28). */
export function registerPlatformItemSources(): void {
  registerItemSource("listings", (ctx, query) => listingPageItems(ctx.appId, ctx.userId, query, { store: ctx.store }));
  registerItemSource("events", (ctx, query) => eventPageItems(ctx.appId, query, { store: ctx.store }));
}

registerPlatformItemSources();
