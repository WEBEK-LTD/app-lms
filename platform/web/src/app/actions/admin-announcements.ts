"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audienceRecipients, readAnnouncementForm, sendInBatches } from "@/lib/announcements";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { markdownToHtml } from "@/lib/content/markdown";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { Announcement } from "@/lib/data/types";
import { sendTemplate } from "@/lib/email/send";
import { appUrl } from "@/lib/env";
import { formValues, type FormState } from "@/lib/forms";

function readForm(formData: FormData, now: Date) {
  return readAnnouncementForm(
    {
      values: formValues(formData),
      plans: formData.getAll("plans").map(String),
      appTypes: formData.getAll("appTypes").map(String),
      states: formData.getAll("states").map(String),
    },
    now,
  );
}

function echo(formData: FormData): Record<string, string> {
  return {
    ...formValues(formData),
    plans: formData.getAll("plans").join(","),
    appTypes: formData.getAll("appTypes").join(","),
    states: formData.getAll("states").join(","),
  };
}

function refresh() {
  revalidatePath("/admin/announcements", "layout");
  revalidatePath("/dashboard", "layout");
}

/** Emails an announcement to its audience now, in batches, with the "Announcement" template. */
async function emailAudience(announcement: Announcement, now: Date): Promise<{ sent: number; failed: number }> {
  const store = await getStore();
  const recipients = await audienceRecipients(store, announcement.audience, now);
  const link = announcement.linkUrl ? (announcement.linkUrl.startsWith("/") ? `${appUrl()}${announcement.linkUrl}` : announcement.linkUrl) : null;
  const result = await sendInBatches(recipients, async (r) => {
    await sendTemplate("announcement", r.email, {
      name: r.name,
      title: announcement.title,
      message: { text: announcement.body, html: markdownToHtml(announcement.body, appUrl()) },
      link_line: link ? `${announcement.linkLabel ?? "More"}: ${link}\n\n` : "",
      dashboard_url: `${appUrl()}/dashboard`,
    });
  });
  await store.updateAnnouncement(announcement.id, { emailedAt: now, emailedCount: announcement.emailedCount + result.sent }, now);
  return result;
}

export async function createAnnouncementAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const now = new Date();
  const read = readForm(formData, now);
  if (!read.ok) return { errors: read.errors, values: echo(formData) };
  const announcement: Announcement = { id: newId(), ...read.announcement, emailedAt: null, emailedCount: 0, createdAt: now, updatedAt: now, createdBy: admin.email };
  await (await getStore()).createAnnouncement(announcement);
  await recordAudit({ actor: admin, action: "announcement.create", target: { type: "announcement", id: announcement.id }, summary: `Created the announcement “${announcement.title}”` });
  let done = "created";
  if (formData.get("email") === "on") {
    const result = await emailAudience(announcement, now);
    await recordAudit({ actor: admin, action: "announcement.email", target: { type: "announcement", id: announcement.id }, summary: `Emailed “${announcement.title}” to ${result.sent} clients` });
    done = `created-emailed-${result.sent}`;
  }
  refresh();
  redirect(`/admin/announcements/${announcement.id}?done=${done}`);
}

export async function updateAnnouncementAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const store = await getStore();
  const id = String(formData.get("id") ?? "");
  const saved = await store.getAnnouncement(id);
  if (!saved) return { message: "This announcement no longer exists." };
  const now = new Date();
  const read = readForm(formData, now);
  if (!read.ok) return { errors: read.errors, values: echo(formData) };
  await store.updateAnnouncement(id, read.announcement, now);
  await recordAudit({ actor: admin, action: "announcement.update", target: { type: "announcement", id }, summary: `Saved the announcement “${read.announcement.title}”`, before: saved, after: { ...saved, ...read.announcement } });
  refresh();
  return { ok: true, message: "Announcement saved.", values: echo(formData) };
}

/** Emails a saved announcement to its audience (again, if it was already sent). */
export async function emailAnnouncementAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("settings.edit");
  const store = await getStore();
  const announcement = await store.getAnnouncement(String(formData.get("id") ?? ""));
  if (!announcement) redirect("/admin/announcements");
  const result = await emailAudience(announcement, new Date());
  await recordAudit({ actor: admin, action: "announcement.email", target: { type: "announcement", id: announcement.id }, summary: `Emailed “${announcement.title}” to ${result.sent} clients` });
  refresh();
  redirect(`/admin/announcements/${announcement.id}?done=emailed-${result.sent}${result.failed ? `-failed-${result.failed}` : ""}`);
}

/** Ends an announcement now: it leaves every dashboard and stays in the list. */
export async function endAnnouncementAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("settings.edit");
  const store = await getStore();
  const id = String(formData.get("id") ?? "");
  const saved = await store.getAnnouncement(id);
  if (!saved) redirect("/admin/announcements");
  const now = new Date();
  await store.updateAnnouncement(id, { endsAt: now }, now);
  await recordAudit({ actor: admin, action: "announcement.end", target: { type: "announcement", id }, summary: `Ended the announcement “${saved.title}”` });
  refresh();
  redirect(`/admin/announcements/${id}?done=ended`);
}

export async function deleteAnnouncementAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("settings.edit");
  const id = String(formData.get("id") ?? "");
  const store = await getStore();
  const saved = await store.getAnnouncement(id);
  await store.deleteAnnouncement(id);
  if (saved) await recordAudit({ actor: admin, action: "announcement.delete", target: { type: "announcement", id }, summary: `Deleted the announcement “${saved.title}”` });
  refresh();
  redirect("/admin/announcements?done=deleted");
}
