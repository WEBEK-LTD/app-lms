"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";

/**
 * 58 Dashboard › Your phones: signing out a phone signed in to Yallapp
 * Business (the owners' own app), or all of them. Our team member managing a
 * dashboard signs out the client's phones, and it is in the audit log.
 */

async function requireOwner() {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  return context;
}

export async function signOutPhoneAction(formData: FormData): Promise<void> {
  const context = await requireOwner();
  const store = await getStore();
  const id = String(formData.get("id") ?? "");
  const device = (await store.listOwnerDevices(context.user.id)).find((d) => d.id === id);
  if (device && (await store.deleteOwnerDevice(context.user.id, device.id))) {
    await recordStaffChange(context, `Signed out the phone "${device.name}" from Yallapp Business`);
  }
  revalidatePath("/dashboard/phones");
  redirect(device ? `/dashboard/phones?signed-out=${encodeURIComponent(device.name)}` : "/dashboard/phones");
}

export async function signOutAllPhonesAction(): Promise<void> {
  const context = await requireOwner();
  const count = await (await getStore()).deleteOwnerDevices(context.user.id);
  if (count) await recordStaffChange(context, `Signed out ${count} phones from Yallapp Business`);
  revalidatePath("/dashboard/phones");
  redirect("/dashboard/phones?signed-out=all");
}
