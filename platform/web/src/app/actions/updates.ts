"use server";

import { getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { bellWords, dashboardText } from "@/lib/dashboard-lang";
import { loadUpdates, markRead } from "@/lib/updates";
import { bellData, readerOf, type BellData } from "@/lib/updates-view";

/**
 * 57 Marks what the bell showed (or, with `all`, everything listed) as read
 * for the signed-in person, and returns the bell as it is now. Nothing is
 * revalidated: the bell updates itself from the answer. 56 In the
 * dashboard's language.
 */
export async function markUpdatesReadAction(input: { keys?: string[]; all?: boolean }): Promise<BellData | null> {
  const context = await getClientContext();
  if (!context || !mayUseDashboard(context)) return null;
  const store = await getStore();
  const text = await dashboardText();
  const reader = readerOf(context, text.lang);
  const now = new Date();
  const keys = input?.all ? (await loadUpdates(store, reader, now)).all.map((item) => item.key) : Array.isArray(input?.keys) ? input.keys : [];
  await markRead(store, reader.userId, keys, now);
  return bellData(await loadUpdates(store, reader, now), bellWords(text));
}

/** 57 The bell again, when the window comes back into focus. */
export async function loadBellAction(): Promise<BellData | null> {
  const context = await getClientContext();
  if (!context || !mayUseDashboard(context)) return null;
  const text = await dashboardText();
  return bellData(await loadUpdates(await getStore(), readerOf(context, text.lang), new Date()), bellWords(text));
}
