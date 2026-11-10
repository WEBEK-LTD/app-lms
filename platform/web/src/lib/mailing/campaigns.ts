/**
 * 114 Email campaigns: checking one before it goes, starting it, and the job
 * that sends it in batches.
 *
 * Sending is safe to run twice at once and across restarts: a campaign
 * starts once (its status moves only from draft or scheduled), its list
 * never holds an address twice (a unique key), each row is taken by one run
 * (claim), and a row a lost run took is never sent again (it may have gone):
 * it's marked failed as "interrupted". So nobody gets a campaign twice.
 * Each campaign keeps to its rate (emails a minute). A failure is tried
 * again twice, 5 and 10 minutes later; a rejected address is not, and it's
 * kept from every later campaign (a bounce).
 */

import { randomUUID } from "node:crypto";
import type { DataStore } from "../data/store";
import type { Mail, Mailer } from "../mail";
import { closeAlerts, raiseAlert, type TeamMail } from "../watch/alerts";
import type { Plan, PlanInfo } from "../plans";
import { resolveAudience } from "./audience";
import { validDoc } from "./blocks";
import { applyMergeTags, exampleMergeValues, firstNameOf, unknownMergeTags, type MergeValues } from "./merge";
import { htmlSizeKb, renderContent } from "./render";
import { htmlToText } from "./sanitize";
import { addOpenPixel, mailLinks, recipientToken, trackLinks } from "./tokens";
import {
  DEFAULT_MAIL_FROM_NAME,
  MAIL_LANGS,
  MAX_MAIL_PER_MINUTE,
  type MailCampaign,
  type MailContent,
  type MailContents,
  type MailLang,
  type MailRecipient,
  type MailRun,
} from "./types";

export const MAIL_MAX_ATTEMPTS = 3;
/** Emails sent at once through the pooled SMTP connections (lib/mail.ts openMailer). */
export const MAIL_PARALLEL = 3;
/** Rows a run takes at a time. */
export const MAIL_BATCH = 30;
/** The owner's floor: never fewer than this many emails a minute while a campaign has emails due. */
export const MAIL_MIN_PER_MINUTE = 45;
export const MAIL_PACE_WINDOW_MS = 5 * 60_000;
export const MAIL_RETRY_MINUTES = 5;
/** How long a run may hold the rows it took before they're taken as lost. */
export const MAIL_LEASE_MS = 3 * 60_000;
const MAX_HTML = 400_000;

/** Cleans one language of an email read from the admin's request; null when it isn't one. */
export function cleanContent(input: unknown, lang: MailLang): MailContent | null {
  if (!input || typeof input !== "object") return null;
  const c = input as Record<string, unknown>;
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/[\r\n]+/g, " ").trim().slice(0, max) : "");
  const mode = c.mode === "html" ? "html" : "blocks";
  const dir = c.dir === "rtl" || c.dir === "ltr" ? c.dir : lang === "ar" ? "rtl" : "ltr";
  const doc = mode === "blocks" ? (validDoc(c.doc) ? (c.doc as MailContent["doc"]) : null) : validDoc(c.doc) ? (c.doc as MailContent["doc"]) : null;
  const html = typeof c.html === "string" && c.html.length <= MAX_HTML ? c.html : null;
  if (mode === "blocks" && !doc) return null;
  if (mode === "html" && html === null) return null;
  return { subject: text(c.subject, 200), preview: text(c.preview, 250), mode, dir, doc, html };
}

export function cleanContents(input: unknown): MailContents {
  const out: MailContents = {};
  if (!input || typeof input !== "object") return out;
  for (const lang of MAIL_LANGS) {
    const content = cleanContent((input as Record<string, unknown>)[lang], lang);
    if (content) out[lang] = content;
  }
  return out;
}

export function clampPerMinute(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_MAIL_PER_MINUTE ? value : fallback;
}

/** The version a person gets: their language's when the email has one, else the campaign's main language. */
export function contentFor(campaign: Pick<MailCampaign, "contents" | "defaultLang">, lang: MailLang): { lang: MailLang; content: MailContent } | null {
  const own = campaign.contents[lang];
  if (own?.subject.trim()) return { lang, content: own };
  const main = campaign.contents[campaign.defaultLang];
  return main?.subject.trim() ? { lang: campaign.defaultLang, content: main } : null;
}

export interface CampaignProblem {
  lang: MailLang | null;
  message: string;
}

/** What stops the campaign from going (the review step lists them; sending refuses while there are any). */
export function campaignProblems(campaign: MailCampaign, assetBase: string): CampaignProblem[] {
  const problems: CampaignProblem[] = [];
  if (!campaign.name.trim()) problems.push({ lang: null, message: "Give the campaign a name." });
  const main = campaign.contents[campaign.defaultLang];
  if (!main) problems.push({ lang: campaign.defaultLang, message: "The main language has no email yet." });
  for (const lang of MAIL_LANGS) {
    const content = campaign.contents[lang];
    if (!content) continue;
    if (!content.subject.trim()) {
      if (lang === campaign.defaultLang) problems.push({ lang, message: "Write a subject." });
      continue;
    }
    if (content.mode === "blocks" && !content.doc?.blocks.length) problems.push({ lang, message: "The email has no blocks." });
    if (content.mode === "html" && !content.html?.trim()) problems.push({ lang, message: "The email's HTML is empty." });
    const rendered = renderContent(content, { lang, assetBase });
    const unknown = unknownMergeTags(`${content.subject} ${content.preview} ${rendered.html}`);
    if (unknown.length) problems.push({ lang, message: `Replace ${unknown.map((t) => `{{${t}}}`).join(", ")}: Yallapp can't fill ${unknown.length === 1 ? "it" : "them"} in.` });
    if (htmlSizeKb(rendered.html) > 100) problems.push({ lang, message: `The email is ${htmlSizeKb(rendered.html)} KB; Gmail cuts emails past about 100 KB. Make it shorter.` });
  }
  if (campaign.replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campaign.replyTo)) problems.push({ lang: null, message: "The reply-to address isn't an email address." });
  return problems;
}

export interface BuiltMail {
  mail: Mail;
  fromName: string;
}

interface BuildDeps {
  baseUrl: string;
  secret: string;
}

/** One person's email: their language, their merge tags, their unsubscribe link and, when on, the tracked links and the open pixel. */
export function buildRecipientMail(campaign: MailCampaign, recipient: Pick<MailRecipient, "id" | "email" | "lang">, values: MergeValues, deps: BuildDeps, cache = new Map<MailLang, ReturnType<typeof renderContent>>()): BuiltMail | null {
  const chosen = contentFor(campaign, recipient.lang);
  if (!chosen) return null;
  const token = recipientToken(recipient.id, deps.secret);
  const links = mailLinks(deps.baseUrl, token, deps.secret);
  let rendered = cache.get(chosen.lang);
  if (!rendered) {
    rendered = renderContent(chosen.content, { lang: chosen.lang, assetBase: deps.baseUrl });
    cache.set(chosen.lang, rendered);
  }
  const all: MergeValues = { ...values, email: recipient.email, unsubscribe_link: links.unsubscribePage };
  let html = applyMergeTags(rendered.html, all, { html: true });
  const text = htmlToText(html);
  if (campaign.track) html = addOpenPixel(trackLinks(html, links), links);
  return {
    fromName: campaign.fromName?.trim() || DEFAULT_MAIL_FROM_NAME,
    mail: {
      to: recipient.email,
      subject: applyMergeTags(chosen.content.subject, all, { html: false }),
      text,
      html,
      replyTo: campaign.replyTo ?? undefined,
      headers: {
        // RFC 8058: inboxes show their own unsubscribe button, which POSTs here.
        "List-Unsubscribe": `<${links.oneClick}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "Feedback-ID": `${campaign.id.slice(0, 8)}:campaign:yallapp`,
        Precedence: "bulk",
      },
    },
  };
}

/** A test email to the admin: the example person's values, marked as a test, never counted. */
export function buildTestMail(campaign: MailCampaign, lang: MailLang, to: string, deps: Pick<BuildDeps, "baseUrl">): BuiltMail | null {
  const chosen = contentFor(campaign, lang);
  if (!chosen) return null;
  const unsubscribe = `${deps.baseUrl.replace(/\/+$/, "")}/unsubscribe/test`;
  const rendered = renderContent(chosen.content, { lang: chosen.lang, assetBase: deps.baseUrl });
  const values: MergeValues = { ...exampleMergeValues(), email: to, unsubscribe_link: unsubscribe };
  const html = applyMergeTags(rendered.html, values, { html: true });
  return {
    fromName: campaign.fromName?.trim() || DEFAULT_MAIL_FROM_NAME,
    mail: {
      to,
      subject: `[Test] ${applyMergeTags(chosen.content.subject, values, { html: false })}`,
      text: htmlToText(html),
      html,
      replyTo: campaign.replyTo ?? undefined,
    },
  };
}

export interface MailRunDeps {
  store: DataStore;
  now: () => Date;
  baseUrl: string;
  secret: string;
  mailer: () => Promise<Mailer>;
  plans?: Record<Plan, PlanInfo>;
  /** Stop taking more after this long. */
  budgetMs: number;
  /** Emails sent at once (MAIL_PARALLEL). */
  parallel?: number;
  /** Emails the team about a new slow-sending alert (lib/watch/env.ts teamMail). */
  alertMail?: TeamMail | null;
}

export interface MailRunReport {
  started: number;
  sent: number;
  failed: number;
  retried: number;
  skipped: number;
  finished: number;
  /** The run stopped for time while a campaign could send more now (the job can call again). */
  more: boolean;
}

/** Lists the campaign's people (again, after a lost run: the list never repeats an address); a campaign nobody matches is sent. */
async function listRecipients(deps: MailRunDeps, campaign: MailCampaign): Promise<number> {
  const now = deps.now();
  const { people } = await resolveAudience(deps.store, campaign.audience, { now, baseUrl: deps.baseUrl, plans: deps.plans });
  await deps.store.addMailRecipients(
    people.map((p) => ({
      campaignId: campaign.id,
      email: p.email,
      userId: p.userId,
      clientId: p.clientId,
      name: p.name.slice(0, 120),
      lang: p.lang,
      status: "queued",
      attempts: 0,
      error: null,
      nextAttemptAt: null,
      claim: null,
      leaseUntil: null,
      sentAt: null,
      team: p.team,
      contactId: p.contactId,
    })),
  );
  const counts = await deps.store.countMailRecipients(campaign.id);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  await deps.store.setMailCampaignStatus(campaign.id, ["sending", "paused"], { status: campaign.status === "paused" ? "paused" : "sending", recipients: total, updatedAt: now });
  return total;
}

/** Moves a draft or a scheduled campaign to sending; false when it had moved already (another run, another admin). */
export async function startMailCampaign(store: DataStore, campaign: Pick<MailCampaign, "id">, now: Date): Promise<boolean> {
  return store.setMailCampaignStatus(campaign.id, ["draft", "scheduled"], { status: "sending", startedAt: now, recipients: 0, updatedAt: now });
}

function smtpCode(error: unknown): number | null {
  const code = (error as { responseCode?: unknown })?.responseCode;
  return typeof code === "number" ? code : null;
}

/** The address itself was refused (it doesn't exist): no retry, and no later campaign mails it. */
function rejectedAddress(error: unknown): boolean {
  const code = smtpCode(error);
  const text = error instanceof Error ? error.message : "";
  return (code === 550 || code === 551 || code === 553 || code === 501) && /(recipient|mailbox|user|address|5\.1\.[0-9])/i.test(text);
}

function reason(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/\s+/g, " ").slice(0, 280) || "Sending failed";
}

export async function runMailCampaigns(deps: MailRunDeps): Promise<MailRunReport> {
  const report: MailRunReport = { started: 0, sent: 0, failed: 0, retried: 0, skipped: 0, finished: 0, more: false };
  const began = Date.now();
  const left = () => deps.budgetMs - (Date.now() - began);
  const { store } = deps;
  const campaigns = await store.listMailCampaigns();
  // The scheduled ones whose time came.
  for (const c of campaigns) {
    if (c.status === "scheduled" && c.scheduledAt && c.scheduledAt.getTime() <= deps.now().getTime()) {
      if (await startMailCampaign(store, c, deps.now())) {
        report.started += 1;
        c.status = "sending";
        c.recipients = 0;
      }
    }
  }
  let mailer: Mailer | null = null;
  try {
    for (const campaign of campaigns) {
      if (campaign.status !== "sending") continue;
      if (left() <= 0) {
        report.more = true;
        break;
      }
      if (campaign.recipients === 0) await listRecipients(deps, campaign);
      await store.expireMailRecipientClaims(campaign.id, deps.now());
      const cache = new Map<MailLang, ReturnType<typeof renderContent>>();
      const values = new Map<string, MergeValues>();
      let valuesLoaded = false;
      const run = { startedAt: deps.now(), sent: 0, failed: 0, attempted: 0 };
      // Nothing was due when the run stopped (all sent, or only retries waiting): not slow.
      let nothingDue = false;
      let stillSending = true;
      while (left() > 0) {
        const now = deps.now();
        const room = campaign.perMinute - (await store.countMailSentSince(campaign.id, new Date(now.getTime() - 60_000)));
        // Its minute's emails went: the next run (a minute later) goes on.
        if (room <= 0) break;
        const claim = randomUUID();
        const rows = await store.claimMailRecipients(campaign.id, claim, Math.min(room, MAIL_BATCH), now, new Date(now.getTime() + MAIL_LEASE_MS));
        if (rows.length === 0) {
          nothingDue = true;
          break;
        }
        // Paused or cancelled meanwhile: what this run took goes back (or stays skipped).
        const fresh = await store.getMailCampaign(campaign.id);
        if (!fresh || fresh.status !== "sending") {
          stillSending = false;
          for (const row of rows) await store.finishMailRecipient(row.id, claim, { status: fresh?.status === "cancelled" ? "skipped" : "queued", error: fresh?.status === "cancelled" ? "cancelled" : null, nextAttemptAt: null, sentAt: null, attempts: row.attempts });
          break;
        }
        if (!valuesLoaded) {
          const { people } = await resolveAudience(store, { ...fresh.audience, emails: undefined }, { now, baseUrl: deps.baseUrl, plans: deps.plans, dropSuppressed: false });
          for (const p of people) values.set(p.email, p.values);
          valuesLoaded = true;
        }
        const suppressed = new Set(await store.listMailSuppressed(rows.map((r) => r.email)));
        mailer ??= await deps.mailer();
        const send = mailer;
        // One row: sent, tried again later, failed or skipped. Each row is this run's alone (its claim), so sending
        // several at once never sends one twice.
        const one = async (row: MailRecipient) => {
          if (suppressed.has(row.email)) {
            await store.finishMailRecipient(row.id, claim, { status: "skipped", error: "unsubscribed", nextAttemptAt: null, sentAt: null, attempts: row.attempts });
            report.skipped += 1;
            return;
          }
          const built = buildRecipientMail(fresh, row, values.get(row.email) ?? { name: row.name, first_name: firstNameOf(row.name) }, deps, cache);
          if (!built) {
            await store.finishMailRecipient(row.id, claim, { status: "failed", error: "No email in a language for this person", nextAttemptAt: null, sentAt: null, attempts: row.attempts });
            report.failed += 1;
            run.failed += 1;
            return;
          }
          const attempts = row.attempts + 1;
          run.attempted += 1;
          try {
            await send.send(built.mail, { fromName: built.fromName });
            await store.finishMailRecipient(row.id, claim, { status: "sent", error: null, nextAttemptAt: null, sentAt: deps.now(), attempts });
            report.sent += 1;
            run.sent += 1;
          } catch (error) {
            if (rejectedAddress(error)) {
              await store.finishMailRecipient(row.id, claim, { status: "failed", error: `Bounced: ${reason(error)}`, nextAttemptAt: null, sentAt: null, attempts });
              await store.suppressMail({ email: row.email, reason: "bounced", campaignId: campaign.id, createdAt: deps.now() });
              await store.addMailEvent({ campaignId: campaign.id, email: row.email, kind: "bounce", url: null, at: deps.now() });
              report.failed += 1;
              run.failed += 1;
            } else if (attempts < MAIL_MAX_ATTEMPTS) {
              await store.finishMailRecipient(row.id, claim, { status: "queued", error: reason(error), nextAttemptAt: new Date(deps.now().getTime() + attempts * MAIL_RETRY_MINUTES * 60_000), sentAt: null, attempts });
              report.retried += 1;
            } else {
              await store.finishMailRecipient(row.id, claim, { status: "failed", error: reason(error), nextAttemptAt: null, sentAt: null, attempts });
              report.failed += 1;
              run.failed += 1;
            }
          }
        };
        await inParallel(rows, deps.parallel ?? MAIL_PARALLEL, one);
      }
      if (left() <= 0) report.more = true;
      const finishedAt = deps.now();
      if (run.attempted > 0) await store.addMailRun({ campaignId: campaign.id, startedAt: run.startedAt, finishedAt, sent: run.sent, failed: run.failed, attempted: run.attempted });
      const counts = await store.countMailRecipients(campaign.id);
      if (counts.queued === 0 && counts.sending === 0) {
        if (await store.setMailCampaignStatus(campaign.id, ["sending"], { status: "sent", finishedAt, updatedAt: finishedAt })) report.finished += 1;
        await closeAlerts(store, [slowKey(campaign.id)], finishedAt);
      } else if (stillSending) {
        await checkMailPace(deps, campaign, nothingDue);
      }
    }
  } finally {
    mailer?.close();
  }
  return report;
}

/** Runs `work` on every item, at most `limit` at a time. */
async function inParallel<T>(items: T[], limit: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++]!;
      await work(item);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
}

function slowKey(campaignId: string): string {
  return `mail_slow:${campaignId}`;
}

/**
 * The owner's floor: a campaign that has been sending for 5 minutes and still
 * has emails due sends at least 45 a minute (or its own rate, when the admin
 * set it lower). Below that, the team gets an alert (Admin › Watching); it
 * closes by itself once the pace is back or the campaign ends.
 */
export async function checkMailPace(deps: Pick<MailRunDeps, "store" | "now" | "alertMail">, campaign: Pick<MailCampaign, "id" | "name" | "perMinute" | "startedAt">, nothingDue: boolean): Promise<"slow" | "ok" | "early"> {
  const now = deps.now();
  const since = new Date(now.getTime() - MAIL_PACE_WINDOW_MS);
  if (!campaign.startedAt || campaign.startedAt.getTime() > since.getTime()) return "early";
  const target = Math.min(MAIL_MIN_PER_MINUTE, campaign.perMinute);
  const perMinute = (await deps.store.countMailSentSince(campaign.id, since)) / (MAIL_PACE_WINDOW_MS / 60_000);
  if (nothingDue || perMinute >= target) {
    await closeAlerts(deps.store, [slowKey(campaign.id)], now);
    return "ok";
  }
  await raiseAlert(
    deps.store,
    {
      kind: "mail_slow",
      key: slowKey(campaign.id),
      title: `Email campaign “${campaign.name}” is sending slowly`,
      detail: `${Math.round(perMinute * 10) / 10} emails a minute over the last 5 minutes, below ${target}. Check the email server in Admin › Settings, and that netlify/functions/mail-campaigns runs every minute.`,
      link: `/admin/email-campaigns/${campaign.id}/report`,
    },
    now,
    deps.alertMail ?? null,
  );
  return "slow";
}

/** A run's emails a minute: what it sent over the time it took (the report shows the latest runs). */
export function runPerMinute(run: Pick<MailRun, "sent" | "startedAt" | "finishedAt">): number {
  const minutes = Math.max(1, run.finishedAt.getTime() - run.startedAt.getTime()) / 60_000;
  return Math.round((run.sent / minutes) * 10) / 10;
}

/** Stops a campaign for good: whoever wasn't mailed yet is skipped. */
export async function cancelMailCampaign(store: DataStore, id: string, now: Date): Promise<boolean> {
  const moved = await store.setMailCampaignStatus(id, ["draft", "scheduled", "sending", "paused"], { status: "cancelled", finishedAt: now, updatedAt: now });
  if (moved) await store.skipMailRecipients(id, ["queued"], "cancelled");
  return moved;
}

/** A copy to change and send again: a draft with the same audience and email. */
export function duplicateCampaign(campaign: MailCampaign, by: string, now: Date): MailCampaign {
  return {
    ...structuredClone(campaign),
    id: randomUUID(),
    name: `${campaign.name} (copy)`.slice(0, 200),
    status: "draft",
    archived: false,
    scheduledAt: null,
    timeZone: campaign.timeZone,
    recipients: 0,
    createdBy: by,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };
}
