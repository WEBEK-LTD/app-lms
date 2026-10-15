import { assetUrl as publicAssetUrl } from "../assets";
import { formatCents } from "../catalog/money";
import type { DataStore } from "../data/store";
import type { Campaign, CatalogCurrency } from "../data/types";
import { itemWords, type ItemWords } from "../hosted/pages/item-words";
import type { Item } from "../hosted/pages/items";
import type { ItemsQuery } from "../pages/types";
import { campaignOpen, campaignsInOrder, donationSettingsOf, progressOf } from "./service";

const MAX_ITEMS = 30;

/** "₺12,450.00 of ₺50,000.00", or what was raised for a campaign without a goal (38: in [words]' language). */
export function raisedLine(c: Pick<Campaign, "raisedCents" | "goalCents">, currency: CatalogCurrency, words: ItemWords = itemWords("en")): string {
  const raised = formatCents(c.raisedCents, currency);
  return c.goalCents ? words.raisedOf(raised, formatCents(c.goalCents, currency)) : words.raised(raised);
}

/** "62%", "Goal reached" or "Ended". */
export function progressBadge(c: Campaign, now: Date, words: ItemWords = itemWords("en")): string | null {
  if (!campaignOpen(c, now)) return words.ended;
  const progress = progressOf(c);
  if (progress === null) return null;
  return progress >= 1 ? words.goalReached : `${Math.floor(progress * 100)}%`;
}

/**
 * 29 The campaigns a list block shows on a page of a Charity & donations
 * app, as `Item` cards: what was raised under the title and the progress as
 * the badge. Open campaigns only, unless picked by hand.
 */
export async function campaignPageItems(
  appId: string,
  query: ItemsQuery,
  deps: { store: DataStore; assetUrl?: (assetId: string) => string; now?: Date; lang?: string },
): Promise<Item[]> {
  const words = itemWords(deps.lang);
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
      subtitle: raisedLine(c, currency, words),
      image_url: c.imageAssetIds[0] ? assetUrl(c.imageAssetIds[0]) : null,
      price_label: null,
      badge: progressBadge(c, now, words),
      action: { type: "item", item: { source: "campaigns", id } },
    };
  });
}
