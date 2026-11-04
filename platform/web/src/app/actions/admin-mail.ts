"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl, signingSecret } from "@/lib/env";
import { openMailer } from "@/lib/mail";
import { audienceIsEveryone, cleanAudience, resolveAudience } from "@/lib/mailing/audience";
import {
  buildTestMail,
  campaignProblems,
  cancelMailCampaign,
  clampPerMinute,
  cleanContents,
  duplicateCampaign,
  runMailCampaigns,
  startMailCampaign,
  type CampaignProblem,
} from "@/lib/mailing/campaigns";
import { DEFAULT_MAIL_PER_MINUTE, MAIL_LANGS, type MailAudience, type MailCampaign, type MailLang } from "@/lib/mailing/types";
import { getPlans } from "@/lib/settings/platform";

/**
 * 114 Admin › Email campaigns. Writing campaigns, templates and audiences
 * and sending tests needs "marketing.edit"; sending, scheduling, pausing,
 * cancelling and the list of addresses never mailed need "marketing.send".
 * Every change is in the audit log.
 */

export type MailActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; problems?: CampaignProblem[] };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function refresh(id?: string) {
  revalidatePath("/admin/email-campaigns", "layout");
  if (id) revalidatePath(`/admin/email-campaigns/${id}`, "layout");
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\r\n]+/g, " ").trim().slice(0, max) : "";
}

function lang(value: unknown): MailLang {
  return MAIL_LANGS.includes(value as MailLang) ? (value as MailLang) : "en";
}

export interface CampaignInput {
  id?: string | null;
  name: string;
  audience: MailAudience;
  segmentId?: string | null;
  fromName?: string | null;
  replyTo?: string | null;
  contents: unknown;
  defaultLang: MailLang;
  track: boolean;
  perMinute: number;
}

/** Saves a draft (or a scheduled campaign, which stays scheduled). A campaign that started can't change. */
export async function saveMailCampaignAction(input: CampaignInput): Promise<MailActionResult<{ id: string }>> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const now = new Date();
  const existing = input.id ? await store.getMailCampaign(input.id) : null;
  if (input.id && !existing) return { ok: false, error: "This campaign no longer exists." };
  if (existing && existing.status !== "draft" && existing.status !== "scheduled") return { ok: false, error: "This campaign has started: duplicate it to change it." };
  const replyTo = text(input.replyTo, 191);
  if (replyTo && !EMAIL.test(replyTo)) return { ok: false, error: "The reply-to address isn't an email address." };
  const campaign: MailCampaign = {
    id: existing?.id ?? randomUUID(),
    name: text(input.name, 200) || "Untitled campaign",
    status: existing?.status ?? "draft",
    archived: existing?.archived ?? false,
    audience: cleanAudience(input.audience),
    segmentId: typeof input.segmentId === "string" && input.segmentId ? input.segmentId.slice(0, 36) : null,
    fromName: text(input.fromName, 120) || null,
    replyTo: replyTo || null,
    contents: cleanContents(input.contents),
    defaultLang: lang(input.defaultLang),
    track: input.track !== false,
    perMinute: clampPerMinute(input.perMinute, DEFAULT_MAIL_PER_MINUTE),
    scheduledAt: existing?.scheduledAt ?? null,
    timeZone: existing?.timeZone ?? null,
    recipients: 0,
    createdBy: existing?.createdBy ?? admin.email,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };
  await store.saveMailCampaign(campaign);
  await recordAudit({ actor: admin, action: "mail.campaign_save", target: { type: "mail_campaign", id: campaign.id }, summary: `Saved the email campaign “${campaign.name}”` });
  refresh(campaign.id);
  return { ok: true, id: campaign.id };
}

/** How many people the audience reaches now (the live count), and how many of them said no to marketing emails. */
export async function countMailAudienceAction(audience: MailAudience): Promise<{ count: number; suppressed: number; team: number; everyone: boolean }> {
  await requireAdmin("view");
  const store = await getStore();
  const clean = cleanAudience(audience);
  const { people, suppressed } = await resolveAudience(store, clean, { now: new Date(), baseUrl: appUrl() });
  return { count: people.length, suppressed, team: people.filter((p) => p.team).length, everyone: audienceIsEveryone(clean) };
}

/** The problems that stop it from going, for the review step. */
export async function mailCampaignProblemsAction(id: string): Promise<CampaignProblem[]> {
  await requireAdmin("view");
  const campaign = await (await getStore()).getMailCampaign(id);
  return campaign ? campaignProblems(campaign, appUrl()) : [{ lang: null, message: "This campaign no longer exists." }];
}

/** A test to up to five addresses, in one language, marked [Test]; it isn't counted anywhere. */
export async function sendMailTestAction(id: string, testLang: MailLang, emails: string[]): Promise<MailActionResult<{ sent: number }>> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const campaign = await store.getMailCampaign(id);
  if (!campaign) return { ok: false, error: "Save the campaign first." };
  const to = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => EMAIL.test(e)))].slice(0, 5);
  if (!to.length) return { ok: false, error: "Write at least one email address." };
  const mailer = await openMailer(store);
  let sent = 0;
  try {
    for (const address of to) {
      const built = buildTestMail(campaign, lang(testLang), address, { baseUrl: appUrl() });
      if (!built) return { ok: false, error: "Write a subject and the email first." };
      await mailer.send(built.mail, { fromName: built.fromName });
      sent += 1;
    }
  } catch (error) {
    return { ok: false, error: `The test didn't go: ${error instanceof Error ? error.message.slice(0, 200) : "sending failed"}` };
  } finally {
    mailer.close();
  }
  await recordAudit({ actor: admin, action: "mail.test", target: { type: "mail_campaign", id }, summary: `Sent a test of “${campaign.name}” to ${to.join(", ")}` });
  return { ok: true, sent };
}

async function ready(id: string): Promise<MailActionResult<{ campaign: MailCampaign }>> {
  const campaign = await (await getStore()).getMailCampaign(id);
  if (!campaign) return { ok: false, error: "This campaign no longer exists." };
  const problems = campaignProblems(campaign, appUrl());
  if (problems.length) return { ok: false, error: "Fix these before sending.", problems };
  return { ok: true, campaign };
}

/** Sends it now: the first emails go at once, the rest at its rate (the minute job). */
export async function sendMailCampaignAction(id: string): Promise<MailActionResult> {
  const admin = await requireAdmin("marketing.send");
  const check = await ready(id);
  if (!check.ok) return check;
  const store = await getStore();
  const now = new Date();
  if (!(await startMailCampaign(store, check.campaign, now))) return { ok: false, error: "This campaign has already started." };
  await recordAudit({ actor: admin, action: "mail.send", target: { type: "mail_campaign", id }, summary: `Started sending “${check.campaign.name}”` });
  try {
    await runMailCampaigns({ store, now: () => new Date(), baseUrl: appUrl(), secret: signingSecret(), mailer: () => openMailer(store), plans: await getPlans(store), budgetMs: 4000 });
  } catch (error) {
    // The job goes on within the minute.
    console.error("[mail send]", error instanceof Error ? error.message : String(error));
  }
  refresh(id);
  return { ok: true };
}

/** Schedules it for a time (an ISO time; `timeZone` is the zone it was picked in, shown back). */
export async function scheduleMailCampaignAction(id: string, at: string, timeZone: string): Promise<MailActionResult> {
  const admin = await requireAdmin("marketing.send");
  const when = new Date(at);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) return { ok: false, error: "Pick a time at least a minute from now." };
  if (when.getTime() > Date.now() + 366 * 86_400_000) return { ok: false, error: "Pick a time within the next year." };
  const zone = text(timeZone, 64);
  try {
    if (zone) new Intl.DateTimeFormat("en", { timeZone: zone });
  } catch {
    return { ok: false, error: "That time zone isn't known." };
  }
  const check = await ready(id);
  if (!check.ok) return check;
  const store = await getStore();
  const moved = await store.setMailCampaignStatus(id, ["draft", "scheduled"], { status: "scheduled", scheduledAt: when, timeZone: zone || null, updatedAt: new Date() });
  if (!moved) return { ok: false, error: "This campaign has already started." };
  await recordAudit({ actor: admin, action: "mail.schedule", target: { type: "mail_campaign", id }, summary: `Scheduled “${check.campaign.name}” for ${when.toISOString()}${zone ? ` (${zone})` : ""}` });
  refresh(id);
  return { ok: true };
}

export async function unscheduleMailCampaignAction(id: string): Promise<MailActionResult> {
  const admin = await requireAdmin("marketing.send");
  const store = await getStore();
  if (!(await store.setMailCampaignStatus(id, ["scheduled"], { status: "draft", scheduledAt: null, updatedAt: new Date() }))) return { ok: false, error: "It isn't scheduled any more." };
  await recordAudit({ actor: admin, action: "mail.unschedule", target: { type: "mail_campaign", id }, summary: "Took the campaign off its schedule" });
  refresh(id);
  return { ok: true };
}

export async function pauseMailCampaignAction(id: string): Promise<MailActionResult> {
  const admin = await requireAdmin("marketing.send");
  if (!(await (await getStore()).setMailCampaignStatus(id, ["sending"], { status: "paused", updatedAt: new Date() }))) return { ok: false, error: "It isn't sending." };
  await recordAudit({ actor: admin, action: "mail.pause", target: { type: "mail_campaign", id }, summary: "Paused the campaign" });
  refresh(id);
  return { ok: true };
}

export async function resumeMailCampaignAction(id: string): Promise<MailActionResult> {
  const admin = await requireAdmin("marketing.send");
  if (!(await (await getStore()).setMailCampaignStatus(id, ["paused"], { status: "sending", updatedAt: new Date() }))) return { ok: false, error: "It isn't paused." };
  await recordAudit({ actor: admin, action: "mail.resume", target: { type: "mail_campaign", id }, summary: "Resumed the campaign" });
  refresh(id);
  return { ok: true };
}

export async function cancelMailCampaignAction(id: string): Promise<MailActionResult> {
  const admin = await requireAdmin("marketing.send");
  if (!(await cancelMailCampaign(await getStore(), id, new Date()))) return { ok: false, error: "It has already finished." };
  await recordAudit({ actor: admin, action: "mail.cancel", target: { type: "mail_campaign", id }, summary: "Cancelled the campaign; nobody else gets it" });
  refresh(id);
  return { ok: true };
}

export async function duplicateMailCampaignAction(id: string): Promise<MailActionResult<{ id: string }>> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const campaign = await store.getMailCampaign(id);
  if (!campaign) return { ok: false, error: "This campaign no longer exists." };
  const copy = duplicateCampaign(campaign, admin.email, new Date());
  await store.saveMailCampaign(copy);
  await recordAudit({ actor: admin, action: "mail.campaign_duplicate", target: { type: "mail_campaign", id: copy.id }, summary: `Duplicated “${campaign.name}”` });
  refresh();
  return { ok: true, id: copy.id };
}

export async function archiveMailCampaignAction(id: string, archived: boolean): Promise<MailActionResult> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const campaign = await store.getMailCampaign(id);
  if (!campaign) return { ok: false, error: "This campaign no longer exists." };
  if (campaign.status === "sending" || campaign.status === "scheduled" || campaign.status === "paused") return { ok: false, error: "Cancel or finish it first." };
  await store.saveMailCampaign({ ...campaign, archived, updatedAt: new Date() });
  await recordAudit({ actor: admin, action: "mail.campaign_archive", target: { type: "mail_campaign", id }, summary: `${archived ? "Archived" : "Restored"} “${campaign.name}”` });
  refresh(id);
  return { ok: true };
}

/** Only a draft can be deleted; a campaign that went out keeps its report (archive it instead). */
export async function deleteMailCampaignAction(id: string): Promise<MailActionResult> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const campaign = await store.getMailCampaign(id);
  if (!campaign) return { ok: true };
  if (campaign.status !== "draft") return { ok: false, error: "Only drafts can be deleted. Archive it instead." };
  await store.deleteMailCampaign(id);
  await recordAudit({ actor: admin, action: "mail.campaign_delete", target: { type: "mail_campaign", id }, summary: `Deleted the draft “${campaign.name}”` });
  refresh();
  return { ok: true };
}

export async function saveMailTemplateAction(input: { id?: string | null; name: string; category?: string; contents: unknown }): Promise<MailActionResult<{ id: string }>> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const now = new Date();
  const existing = input.id ? await store.getMailTemplate(input.id) : null;
  const contents = cleanContents(input.contents);
  if (!Object.keys(contents).length) return { ok: false, error: "The template has no email." };
  const template = {
    id: existing?.id ?? randomUUID(),
    name: text(input.name, 120) || "My template",
    category: text(input.category, 40) || "Saved",
    contents,
    createdBy: existing?.createdBy ?? admin.email,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await store.saveMailTemplate(template);
  await recordAudit({ actor: admin, action: "mail.template_save", target: { type: "mail_template", id: template.id }, summary: `Saved the template “${template.name}”` });
  refresh();
  return { ok: true, id: template.id };
}

export async function deleteMailTemplateAction(id: string): Promise<MailActionResult> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const template = await store.getMailTemplate(id);
  if (!template) return { ok: true };
  await store.deleteMailTemplate(id);
  await recordAudit({ actor: admin, action: "mail.template_delete", target: { type: "mail_template", id }, summary: `Deleted the template “${template.name}”` });
  refresh();
  return { ok: true };
}

export async function saveMailSegmentAction(input: { id?: string | null; name: string; audience: MailAudience }): Promise<MailActionResult<{ id: string }>> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const now = new Date();
  const existing = input.id ? (await store.listMailSegments()).find((s) => s.id === input.id) ?? null : null;
  const segment = { id: existing?.id ?? randomUUID(), name: text(input.name, 120) || "My audience", audience: cleanAudience(input.audience), createdAt: existing?.createdAt ?? now, updatedAt: now };
  await store.saveMailSegment(segment);
  await recordAudit({ actor: admin, action: "mail.segment_save", target: { type: "mail_segment", id: segment.id }, summary: `Saved the audience “${segment.name}”` });
  refresh();
  return { ok: true, id: segment.id };
}

export async function deleteMailSegmentAction(id: string): Promise<MailActionResult> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  await store.deleteMailSegment(id);
  await recordAudit({ actor: admin, action: "mail.segment_delete", target: { type: "mail_segment", id }, summary: "Deleted an audience" });
  refresh();
  return { ok: true };
}

/** Keeps an address from every campaign (someone asked by phone, say). */
export async function suppressMailAddressAction(email: string): Promise<MailActionResult> {
  const admin = await requireAdmin("marketing.send");
  const address = email.trim().toLowerCase();
  if (!EMAIL.test(address) || address.length > 191) return { ok: false, error: "That isn't an email address." };
  await (await getStore()).suppressMail({ email: address, reason: "admin", campaignId: null, createdAt: new Date() });
  await recordAudit({ actor: admin, action: "mail.suppress", target: { type: "mail_address", id: null }, summary: `Kept ${address} from email campaigns` });
  refresh();
  return { ok: true };
}

/** Allows an address again: one the team kept out; a bounce or a complaint needs `force` (the address may not exist, or its owner said it's spam). */
export async function unsuppressMailAddressAction(email: string, force = false): Promise<MailActionResult> {
  const admin = await requireAdmin("marketing.send");
  const store = await getStore();
  const found = await store.getMailSuppression(email);
  if (!found) return { ok: true };
  // Their own "no" is theirs to undo: the email's page or their account's settings.
  if (found.reason === "unsubscribed") return { ok: false, error: "This person unsubscribed. Only they can subscribe again, from the email's link or their account's settings." };
  if ((found.reason === "bounced" || found.reason === "complained") && !force) return { ok: false, error: `This address ${found.reason === "bounced" ? "bounced" : "marked an email as spam"}. Allow it only if you're sure.` };
  await store.unsuppressMail(found.email);
  await recordAudit({ actor: admin, action: "mail.unsuppress", target: { type: "mail_address", id: null }, summary: `Allowed ${found.email} in email campaigns again (was ${found.reason})` });
  refresh();
  return { ok: true };
}

/**
 * A new draft from a ready-made template (`ready:<id>`), one of the admin's
 * own (`saved:<id>`) or nothing (`blank`); its id, for the editor.
 */
export async function createMailCampaignAction(source: string): Promise<MailActionResult<{ id: string }>> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const now = new Date();
  const { MAIL_TEMPLATES, templateContent } = await import("@/lib/mailing/templates");
  const { emptyContent } = await import("@/lib/mailing/blocks");
  let name = "Untitled campaign";
  let contents: MailCampaign["contents"] = { en: emptyContent("en") };
  let defaultLang: MailLang = "en";
  if (source.startsWith("ready:")) {
    const def = MAIL_TEMPLATES.find((t) => t.id === source.slice(6));
    if (!def) return { ok: false, error: "That template isn't there." };
    name = def.name;
    contents = { en: templateContent(def, appUrl()) };
  } else if (source.startsWith("saved:")) {
    const template = await store.getMailTemplate(source.slice(6));
    if (!template) return { ok: false, error: "That template isn't there." };
    name = template.name;
    contents = structuredClone(template.contents);
    defaultLang = (MAIL_LANGS.find((l) => contents[l]) ?? "en") as MailLang;
  } else if (source !== "blank") {
    return { ok: false, error: "Choose a template." };
  }
  const campaign: MailCampaign = {
    id: randomUUID(),
    name,
    status: "draft",
    archived: false,
    audience: {},
    segmentId: null,
    fromName: null,
    replyTo: null,
    contents,
    defaultLang,
    track: true,
    perMinute: DEFAULT_MAIL_PER_MINUTE,
    scheduledAt: null,
    timeZone: null,
    recipients: 0,
    createdBy: admin.email,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };
  await store.saveMailCampaign(campaign);
  await recordAudit({ actor: admin, action: "mail.campaign_save", target: { type: "mail_campaign", id: campaign.id }, summary: `Started the email campaign “${campaign.name}”` });
  refresh();
  return { ok: true, id: campaign.id };
}

const IMAGE_BYTES = 5 * 1024 * 1024;

function imageType(data: Buffer): { contentType: string; extension: string } | null {
  if (data.length < 12) return null;
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { contentType: "image/png", extension: "png" };
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { contentType: "image/jpeg", extension: "jpg" };
  if (data.toString("latin1", 0, 6) === "GIF87a" || data.toString("latin1", 0, 6) === "GIF89a") return { contentType: "image/gif", extension: "gif" };
  return null;
}

/** A picture for an email (PNG, JPEG or GIF, up to 5 MB, the formats inboxes show), kept in the files store; its public address. */
export async function uploadMailImageAction(formData: FormData): Promise<MailActionResult<{ url: string }>> {
  await requireAdmin("marketing.edit");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a picture." };
  if (file.size > IMAGE_BYTES) return { ok: false, error: "The picture is over 5 MB. Make it smaller." };
  const data = Buffer.from(await file.arrayBuffer());
  const type = imageType(data);
  if (!type) return { ok: false, error: "Use a PNG, JPEG or GIF picture (inboxes don't all show the others)." };
  const name = `${randomUUID()}.${type.extension}`;
  const { getBlobStore } = await import("@/lib/blobs");
  await getBlobStore().put(`mail-images/${name}`, data, type.contentType);
  return { ok: true, url: `${appUrl()}/api/mail/image/${name}` };
}
