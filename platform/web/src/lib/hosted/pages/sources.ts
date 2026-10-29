import { campaignPageItems } from "../../donations/page-items";
import { deliveryServicePageItems } from "../../delivery/page-items";
import { eventPageItems } from "../../events/page-items";
import { restaurantPageItems } from "../../food/page-items";
import { listingPageItems } from "../listings/page-items";
import { vehicleTypePageItems } from "../../rides/page-items";
import { schoolNewsPageItems } from "../../school/page-items";
import { registerItemSource } from "./items";

/**
 * Lists filled from the platform's own data: listings of Real estate apps
 * (10.7), events of Events & tickets apps (28), campaigns of Charity &
 * donations apps (29), 104 delivery services, 105 restaurants, vehicle types
 * and a school's news.
 */
export function registerPlatformItemSources(): void {
  // 38 In the language the app asked for.
  registerItemSource("listings", (ctx, query) => listingPageItems(ctx.appId, ctx.userId, query, { store: ctx.store, lang: ctx.lang }));
  registerItemSource("events", (ctx, query) => eventPageItems(ctx.appId, query, { store: ctx.store, lang: ctx.lang }));
  registerItemSource("campaigns", (ctx, query) => campaignPageItems(ctx.appId, query, { store: ctx.store, lang: ctx.lang }));
  // 104 A delivery company's services.
  registerItemSource("delivery_services", (ctx, query) => deliveryServicePageItems(ctx.appId, query, { store: ctx.store }));
  // 110 A food company's restaurants and a ride company's vehicle types (the food and ride designs list them).
  registerItemSource("restaurants", (ctx, query) => restaurantPageItems(ctx.appId, query, { store: ctx.store, now: ctx.now ?? new Date() }));
  registerItemSource("vehicle_types", (ctx, query) => vehicleTypePageItems(ctx.appId, query, { store: ctx.store }));
  // 105.4 A school's news to the whole school.
  registerItemSource("school_news", (ctx, query) => schoolNewsPageItems(ctx.appId, query, { store: ctx.store }));
}

registerPlatformItemSources();
