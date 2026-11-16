import { formatDate } from "@/components/ui";
import { appLabel } from "../app/label";
import type { BlobStore } from "../blobs";
import type { DataStore } from "../data/store";
import type { TemplateLicence } from "../data/types";
import type { EmailTemplateKey } from "../email/templates";
import type { PlanInfo } from "../plans";
import type { Lang } from "@/i18n/config";
import { takeOffAtEnd } from "./apply";
import { marketMailLines } from "./mail";
import { templateText } from "./templates";

/**
 * 106.2 Studio Market's part of the daily job. Plans for a time don't renew
 * by themselves (the gateway takes one-time payments only), so:
 *
 * - 14 days before a plan ends, and on its last day, the buyer is reminded,
 *   with a link to renew; once each for an end date (a renewal moves it,
 *   and its own reminders go out in time).
 * - When it ends: the template's choice when it was bought. "keep": the
 *   design stays on the app, frozen at the version the buyer has (no more
 *   updates); "restore": the app goes back to the design it had before. Each
 *   end is done once (the licence ends only while it still has that end
 *   date: a renewal paid meanwhile wins), written to the audit log, and the
 *   owner is emailed. Free and lifetime licences have no end date.
 *
 * Safe to run again: what was done for an end date isn't done twice.
 */

export const REMINDER_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

export interface MarketDailyDeps {
  store: DataStore;
  blobs: BlobStore;
  now: Date;
  /** The platform's address, for the links. */
  baseUrl: string;
  mail: (key: EmailTemplateKey, to: string, values: Record<string, string>, options: { lang: Lang }) => Promise<unknown>;
  /** The plan of a buyer's app (its published design keeps to it). */
  planOf: (clientId: string, appId: string) => Promise<PlanInfo | null>;
}

export interface MarketDailyReport {
  reminded: number;
  lastDay: number;
  ended: number;
  restored: number;
  /** Ends whose app couldn't go back to its previous design (the design stayed; the team sees it in the audit log). */
  restoreFailed: number;
}

export async function runStudioMarketDaily(deps: MarketDailyDeps): Promise<MarketDailyReport> {
  const { store, now } = deps;
  const report: MarketDailyReport = { reminded: 0, lastDay: 0, ended: 0, restored: 0, restoreFailed: 0 };
  for (const licence of await store.listTemplateLicencesEndingBy(new Date(now.getTime() + REMINDER_DAYS * DAY))) {
    const endsAt = licence.endsAt!;
    try {
      if (endsAt.getTime() <= now.getTime()) {
        const outcome = await endLicence(deps, licence, endsAt);
        if (outcome === null) continue;
        report.ended++;
        if (outcome === "restore") report.restored++;
        if (outcome === "restore_failed") report.restoreFailed++;
      } else if (endsAt.getTime() - now.getTime() <= DAY) {
        if (await store.markTemplateLicenceReminder(licence.id, "last", endsAt, now)) {
          report.lastDay++;
          await remind(deps, licence, "last");
        }
      } else if (await store.markTemplateLicenceReminder(licence.id, "early", endsAt, now)) {
        report.reminded++;
        await remind(deps, licence, "early");
      }
    } catch (e) {
      console.error(`[daily] studio market licence ${licence.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return report;
}

async function people(store: DataStore, licence: TemplateLicence) {
  const client = await store.getClientById(licence.clientId);
  const user = client ? await store.getUserById(client.userId) : null;
  const template = await store.getMarketTemplate(licence.templateId);
  const app = licence.appId ? await store.getAppById(licence.appId) : null;
  return { client, user, template, app };
}

async function remind(deps: MarketDailyDeps, licence: TemplateLicence, which: "early" | "last"): Promise<void> {
  const { user, template, app } = await people(deps.store, licence);
  if (!user || !template) return;
  const lang = (["en", "ar", "tr"].includes(user.language ?? "") ? user.language : "en") as Lang;
  const lines = marketMailLines(lang);
  const title = templateText(template, lang).title;
  await deps
    .mail(
      "market_template_reminder",
      user.email,
      {
        name: user.name,
        template_name: title,
        end_date: formatDate(licence.endsAt, lang),
        intro_line: lines.reminder(which, title, app ? appLabel(app) : null, formatDate(licence.endsAt, lang), Math.max(1, Math.ceil((licence.endsAt!.getTime() - deps.now.getTime()) / DAY))),
        after_line: lines.ifNotRenewed(licence.afterEnd, Boolean(app)),
        renew_url: `${deps.baseUrl}/dashboard/studio-market/checkout/${template.slug}?renew=${licence.id}`,
      },
      { lang },
    )
    .catch((e: unknown) => console.error("[mail] Studio Market reminder failed", e));
}

/** Ends the licence's plan once; what happened to its app, or null when it was renewed (or ended) meanwhile. */
async function endLicence(deps: MarketDailyDeps, licence: TemplateLicence, endsAt: Date): Promise<"keep" | "restore" | "restore_failed" | "none" | null> {
  const { store, now } = deps;
  if (!(await store.endTemplateLicence(licence.id, endsAt, now))) return null;
  const { user, template, app } = await people(store, licence);
  const open = licence.appId ? (await store.listTemplateApplications({ licenceId: licence.id, appId: licence.appId, open: true }))[0] : undefined;
  let outcome: "keep" | "restore" | "restore_failed" | "none" = "none";
  if (open && app) {
    if (licence.afterEnd === "restore") {
      const done = await takeOffAtEnd({ store, blobs: deps.blobs, now }, licence, open, app, await deps.planOf(licence.clientId, app.id));
      outcome = done.ok ? "restore" : "restore_failed";
    } else outcome = "keep";
  }
  const title = template ? templateText(template, "en").title : licence.templateId;
  const where = app ? ` on ${appLabel(app)}` : "";
  const summary: Record<typeof outcome, string> = {
    keep: `Plan for “${title}”${where} ended: the design stays, without updates`,
    restore: `Plan for “${title}”${where} ended: the app went back to its previous design`,
    restore_failed: `Plan for “${title}”${where} ended: the app couldn't go back to its previous design, so the design stays`,
    none: `Plan for “${title}” ended (it wasn't on an app)`,
  };
  await store
    .createAuditEntry({
      at: now,
      actorId: null,
      actorEmail: "Daily job",
      action: "market.licence_ended",
      targetType: "market_licence",
      targetId: licence.id,
      clientId: licence.clientId,
      summary: summary[outcome],
      changes: { before: { status: "active", endsAt: endsAt.toISOString() }, after: { status: "ended", afterEnd: licence.afterEnd, outcome } },
    })
    .catch((e: unknown) => console.error("[audit] Studio Market end", e));
  if (user && template) {
    const lang = (["en", "ar", "tr"].includes(user.language ?? "") ? user.language : "en") as Lang;
    const lines = marketMailLines(lang);
    const local = templateText(template, lang).title;
    await deps
      .mail(
        "market_template_ended",
        user.email,
        {
          name: user.name,
          template_name: local,
          end_date: formatDate(endsAt, lang),
          intro_line: lines.ended(local, formatDate(endsAt, lang)),
          after_line: lines.afterEnded(outcome === "restore" ? "restore" : outcome === "none" ? "none" : "keep", app ? appLabel(app) : ""),
          renew_url: `${deps.baseUrl}/dashboard/studio-market/checkout/${template.slug}?renew=${licence.id}`,
        },
        { lang },
      )
      .catch((e: unknown) => console.error("[mail] Studio Market end failed", e));
  }
  return outcome;
}
