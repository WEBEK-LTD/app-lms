import { assetUrl as publicAssetUrl } from "../assets";
import { formatCents } from "../catalog/money";
import type { DataStore } from "../data/store";
import type { Campaign, CatalogCurrency } from "../data/types";
import type { Item } from "../hosted/pages/items";
import type { ItemsQuery } from "../pages/types";
import { campaignOpen, campaignsInOrder, donationSettingsOf, progressOf } from "./service";

const MAX_ITEMS = 30;

/** "₺12,450.00 of ₺50,000.00", or what was raised for a campaign without a goal. */
export function raisedLine(c: Pick<Campaign, "raisedCents" | "goalCents">, currency: CatalogCurrency): string {
  const raised = formatCents(c.raisedCents, currency);
  return c.goalCents ? `${raised} of ${formatCents(c.goalCents, currency)}` : `${raised} raised`;
}

/** "62%", "Goal reached" or "Ended". */
export function progressBadge(c: Campaign, now: Date): string | null {
  if (!campaignOpen(c, now)) return "Ended";
  const progress = progressOf(c);
  if (progress === null) return null;
  return progress >= 1 ? "Goal reached" : `${Math.floor(progress * 100)}%`;
}

/**
 * 29 The campaigns a list block shows on a page of a Charity & donations
 * app, as `Item` cards: what was raised under the title and the progress as
 * the badge. Open campaigns only, unless picked by hand.
 */
export async function campaignPageItems(
  appId: string,
  query: ItemsQuery,
  deps: { store: DataStore; assetUrl?: (assetId: string) => string; now?: Date },
): Promise<Item[]> {
  const now = deps.now ?? new Date();
  const assetUrl = deps.assetUrl ?? publicAssetUrl;
  const [all, saved] = await Promise.all([deps.store.listCampaigns(appId), deps.store.getDonationSettings(appId)]);
  const { currency } = donationSettingsOf(saved);
  const listed = campaignsInOrder(all, now);
  const limit = Math.max(0, Math.min(MAX_ITEMS, Math.floor(query.limit)));
  let list: Campaign[];
  if (query.ids.length > 0) {
    const byId = new Map(listed.map((c) => [String(c.id), c]));
    list = query.ids.map((id) => byId.get(id)).filter((c): c is Campaign => c !== undefined);
  } else {
    list = listed.filter((c) => campaignOpen(c, now) && (!query.featured || c.featured));
  }
  return list.slice(0, limit).map((c) => {
    const id = String(c.id);
    return {
      source: "campaigns",
      id,
      title: c.title,
      subtitle: raisedLine(c, currency),
      image_url: c.imageAssetIds[0] ? assetUrl(c.imageAssetIds[0]) : null,
      price_label: null,
      badge: progressBadge(c, now),
      action: { type: "item", item: { source: "campaigns", id } },
    };
  });
}
