import "server-only";
import { headers } from "next/headers";
import type { Client } from "../data/types";
import type { DataStore } from "../data/store";
import { getCurrentUser } from "../auth/session";
import { visitorCountry } from "../geo";
import type { PriceView } from "../plans";
import { yallappBilling } from "../settings/platform";
import { displayCurrencyFor } from "./prices";

/**
 * 52 How this request shows Yallapp's prices: pounds for Egypt, dollars
 * elsewhere. A signed-in client's account country comes first; otherwise
 * the request's (the host's geo header, then the browser's language
 * region). Pages that call this read the request headers, so they are
 * rendered per request; next.config.ts adds `Vary` for the caches in front.
 */
export async function priceView(
  store: DataStore,
  client?: Pick<Client, "country"> | null,
  /** Payments read the rate from the database: never a stale copy. */
  options: { fresh?: boolean } = {},
): Promise<PriceView & { country: string | null }> {
  const billing = await yallappBilling(store, options);
  const country = client?.country || visitorCountry(await headers());
  return { display: displayCurrencyFor(country), egpPerUsd: billing.egpPerUsd, country: country ?? null };
}

/** 52 The public pages' view: a signed-in client's account country first, then the request's. */
export async function visitorPriceView(store: DataStore): Promise<PriceView & { country: string | null }> {
  const user = await getCurrentUser();
  const client = user ? await store.getClientByUserId(user.id) : null;
  return priceView(store, client);
}
