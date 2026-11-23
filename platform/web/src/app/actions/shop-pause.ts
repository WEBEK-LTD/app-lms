"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { reopen } from "@/lib/shop/pause";

/** 214 Reopens a shop paused from Yallapp Business, or one of its places (`place_id`), now. */
export async function reopenShopAction(formData: FormData): Promise<void> {
  const context = await clientFor("orders");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app) redirect("/dashboard");
  const raw = String(formData.get("place_id") ?? "");
  const placeId = raw === "" ? null : Number(raw);
  if (placeId !== null && !Number.isInteger(placeId)) return;
  const store = await getStore();
  if (placeId !== null && !(await store.getRestaurant(app.id, placeId))) return;
  await reopen(store, app, placeId, new Date());
  revalidatePath("/dashboard", "layout");
  revalidatePath("/studio", "layout");
}
