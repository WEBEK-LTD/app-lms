import { listingPageItems } from "../listings/page-items";
import { registerItemSource } from "./items";

/** Lists filled from the platform's own data: listings of Real estate apps (10.7). */
export function registerPlatformItemSources(): void {
  registerItemSource("listings", (ctx, query) => listingPageItems(ctx.appId, ctx.userId, query, { store: ctx.store }));
}

registerPlatformItemSources();
