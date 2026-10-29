import type { DataStore } from "../data/store";
import type { Item } from "../hosted/pages/items";
import type { ItemsQuery } from "../pages/types";

const MAX_ITEMS = 50;

/**
 * 105.4 A school's news to the whole school, newest first, for list blocks
 * (`school_news`): each card opens the school's news in the app. News to a
 * class or a student stays inside the School screen, for those it is for.
 */
export async function schoolNewsPageItems(appId: string, query: ItemsQuery, deps: { store: DataStore }): Promise<Item[]> {
  const limit = Math.max(0, Math.min(MAX_ITEMS, Math.floor(query.limit)));
  const all = (await deps.store.listSchoolAnnouncements(appId)).filter((a) => a.audience === "school");
  const byId = new Map(all.map((a) => [String(a.id), a]));
  const list = query.ids.length > 0 ? query.ids.map((id) => byId.get(id)).filter((a) => a !== undefined) : all;
  return list.slice(0, limit).map((a) => ({
    source: "school_news",
    id: String(a.id),
    title: a.title,
    subtitle: a.body.length > 140 ? `${a.body.slice(0, 139)}…` : a.body,
    image_url: null,
    price_label: null,
    badge: a.createdAt.toISOString().slice(0, 10),
    action: { type: "screen", screen: "school" },
  }));
}
