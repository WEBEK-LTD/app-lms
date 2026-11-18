"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { currencyDecimals, formatMinor, toMinor } from "@/lib/market/currency";
import { marketCurrency } from "@/lib/market/settings";
import { changeWallet } from "@/lib/market/wallet";
import { recordTeamActivity } from "@/lib/team/activity";

/**
 * 115.63 The owner's Wallets page: credit added to a customer's wallet or
 * taken back, each with the reason the customer reads, in the team's
 * activity (and the admin's audit when Yallapp's team does it). D5: the
 * wallet is credit only; nothing here pays money out.
 */

async function requireMarketApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("orders");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "restaurants") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function back(userId: number, query: string): never {
  revalidatePath("/dashboard/market/wallets", "layout");
  revalidatePath("/studio/project/market/wallets", "layout");
  redirect(`/dashboard/market/wallets/${userId}?${query}`);
}

export async function changeWalletAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const store = await getStore();
  const userId = Number(formData.get("user_id"));
  if (!Number.isInteger(userId) || userId <= 0) redirect("/dashboard/market/wallets");
  const customer = await store.getHostedUser(context.app.id, userId);
  if (!customer) redirect("/dashboard/market/wallets");
  const direction = formData.get("direction") === "take_back" ? "take_back" : "credit";
  const currency = marketCurrency(deliverySettingsOf(await store.getDeliverySettings(context.app.id)));
  const amount = toMinor(String(formData.get("amount") ?? ""), currencyDecimals(currency)) ?? 0;
  const now = new Date();
  const done = await changeWallet(store, { appId: context.app.id, userId, amount, reason: String(formData.get("reason") ?? ""), direction, key: String(formData.get("key") ?? "") }, now);
  if (!done.ok) back(userId, `error=${encodeURIComponent(done.error)}`);
  const words = `${direction === "credit" ? "Added" : "Took back"} ${formatMinor(amount, currency)} ${direction === "credit" ? "to" : "from"} ${customer.name || `customer ${userId}`}'s wallet: ${done.entry.label}`;
  const actor = context.member ?? context.staff ?? context.user;
  await recordTeamActivity(store, { clientId: context.client.id, appId: context.app.id, actor, action: direction === "credit" ? "wallet.credit" : "wallet.take_back", target: { type: "wallet", id: userId }, summary: words }, now);
  await recordStaffChange(context, words);
  back(userId, `done=${direction}`);
}
