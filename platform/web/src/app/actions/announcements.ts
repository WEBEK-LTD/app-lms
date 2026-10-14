"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";

/** The client closes an announcement's banner; it stays on their Announcements page. */
export async function dismissAnnouncementAction(formData: FormData): Promise<void> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  const id = String(formData.get("id") ?? "");
  if (/^[0-9a-f-]{36}$/i.test(id)) await (await getStore()).dismissAnnouncement({ announcementId: id, clientId: context.client.id, now: new Date() });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/pending");
}
