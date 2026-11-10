"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";
import { findClient, newEntry, readEntryForm } from "@/lib/live-activity/entries";
import { clearLiveFeedCache } from "@/lib/live-activity/feed";
import { maskedName } from "@/lib/live-activity/names";
import { readLiveSetting } from "@/lib/live-activity/settings";
import { clearPlatformSettingsCache, getPlans, platformSetting } from "@/lib/settings/platform";

/** Admin › Live activity: the website's live activity card, its settings and the customers the team adds by hand. */

function refresh() {
  clearLiveFeedCache();
  revalidatePath("/admin/live-activity");
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/** On or off, which kinds, which pages, and the card's timings. */
export async function saveLiveSettingAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("marketing.edit");
  const input = { on: field(formData, "on"), kinds: formData.getAll("kinds").map(String), pages: field(formData, "pages"), firstDelaySeconds: field(formData, "firstDelaySeconds"), gapSeconds: field(formData, "gapSeconds"), maxPerVisit: field(formData, "maxPerVisit") };
  const values = { ...input, kinds: input.kinds.join(",") };
  const read = readLiveSetting(input);
  if (!read.ok) return { errors: read.errors, values };
  const store = await getStore();
  const before = (await platformSetting(store, "liveActivity", { fresh: true }))?.value ?? null;
  await store.setPlatformSetting("liveActivity", read.setting, admin.email, new Date());
  clearPlatformSettingsCache();
  await recordAudit({
    actor: admin,
    action: "settings.save",
    target: { type: "setting", id: "liveActivity" },
    summary: read.setting.on ? `Saved the live activity card's settings (on, ${read.setting.kinds.length} kinds)` : "Switched the live activity card off",
    before,
    after: read.setting,
  });
  refresh();
  return { ok: true, message: read.setting.on ? "Saved. Visitors see the new settings within a minute or two." : "Saved. The card is off: visitors stop seeing it within a minute or two.", values };
}

/** A customer the team adds by hand; only with the box "This customer agreed to be shown on the website". */
export async function addLiveEntryAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("marketing.edit");
  const values: Record<string, string> = {};
  for (const name of ["firstName", "lastName", "plan", "city", "country", "agreedOn", "client", "consent"]) values[name] = field(formData, name);
  const store = await getStore();
  const now = new Date();
  const plans = await getPlans(store);
  const read = readEntryForm(values, plans, now);
  if (!read.ok) return { errors: read.errors, values };
  const client = read.form.client ? await findClient(store, read.form.client) : null;
  if (read.form.client && !client) return { errors: { client: "No client has this email or ID. Leave it empty to add the customer without one." }, values };
  const entry = newEntry(read.form, client?.id ?? null, admin.email, now);
  await store.saveLiveActivityEntry(entry);
  const name = maskedName(entry.firstName, entry.lastInitial) ?? entry.firstName;
  await recordAudit({
    actor: admin,
    action: "live.entry_add",
    target: { type: "live_entry", id: entry.id },
    clientId: entry.clientId,
    summary: `Added ${name} on ${plans[entry.plan].name} to the website's live activity, with their agreement`,
    after: { firstName: entry.firstName, lastInitial: entry.lastInitial, plan: entry.plan, city: entry.city, country: entry.country, agreedAt: entry.agreedAt, consent: entry.consent },
  });
  refresh();
  return { ok: true, message: `${name} added. The card shows them within a minute or two.`, values: {} };
}

/** Hides an entry from the website, or shows it again. */
export async function hideLiveEntryAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const entry = await store.getLiveActivityEntry(field(formData, "id"));
  if (!entry) return;
  const hidden = field(formData, "hidden") === "true";
  if (entry.hidden === hidden) return;
  await store.saveLiveActivityEntry({ ...entry, hidden });
  await recordAudit({
    actor: admin,
    action: "live.entry_hide",
    target: { type: "live_entry", id: entry.id },
    clientId: entry.clientId,
    summary: `${hidden ? "Hid" : "Showed again"} ${maskedName(entry.firstName, entry.lastInitial) ?? entry.firstName} on the website's live activity`,
    before: { hidden: entry.hidden },
    after: { hidden },
  });
  refresh();
}

/** Deletes an entry. */
export async function deleteLiveEntryAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const entry = await store.getLiveActivityEntry(field(formData, "id"));
  if (!entry || !(await store.deleteLiveActivityEntry(entry.id))) return;
  await recordAudit({
    actor: admin,
    action: "live.entry_delete",
    target: { type: "live_entry", id: entry.id },
    clientId: entry.clientId,
    summary: `Deleted ${maskedName(entry.firstName, entry.lastInitial) ?? entry.firstName} from the website's live activity`,
    before: { firstName: entry.firstName, lastInitial: entry.lastInitial, plan: entry.plan, agreedAt: entry.agreedAt },
  });
  refresh();
}
