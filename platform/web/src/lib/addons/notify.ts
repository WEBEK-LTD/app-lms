import "server-only";
import { formatDate } from "@/components/ui";
import { appLabel } from "../app/label";
import { paymentLine } from "../billing/plan-mail";
import { isLifetimeEnd } from "../billing/periods";
import { DEFAULT_CONTACT } from "../contact";
import type { DataStore } from "../data/store";
import type { App, Client, OwnerNotice, PlanPayment } from "../data/types";
import { emailLangOf, sendTemplate } from "../email/send";
import { mailOptions } from "../email/mail-lang";
import { appUrl } from "../env";
import { formatAmount } from "../billing/prices";
import { getDashT } from "@/i18n/dashboard";
import type { NoticeDeps } from "../notices";
import { pushNotice, pushPlanPayment } from "../owner/push";
import { pushOwnerSafely } from "../owner/push-env";
import { publishingTeamEmail } from "../publishing/service";
import { planReceiptPdf, receiptAttachment } from "../receipts/service";
import { platformSetting } from "../settings/platform";
import { billingLabel } from "./catalog";
import type { AppAddon } from "./types";

/**
 * 133 What follows an add-on: the client's email with the receipt and the
 * owner's phone; for a service, the team's email (its task is in Admin ›
 * Add-ons › Tasks); and, from the daily job, a reminder 7 days before one
 * ends. None of them ever fails the payment.
 */

const DAY = 86_400_000;

/** The app's Add-ons page, through the link that opens the dashboard on the app. */
export function addonsUrl(baseUrl: string, appId: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/dashboard/open?${new URLSearchParams({ app: appId, to: "addons" }).toString()}`;
}

/** Where a service's task goes: the publishing team for publishing, else Yallapp's contact email. */
async function teamEmailFor(store: DataStore, addon: Pick<AppAddon, "feature">): Promise<string> {
  if (addon.feature === "auto_publish") return publishingTeamEmail(store);
  return (await platformSetting(store, "contact"))?.value.email ?? DEFAULT_CONTACT.email;
}

/** Tells the team about a service to do (bought or given). Best effort. */
export async function notifyAddonTask(store: DataStore, client: Client, app: App, addon: AppAddon): Promise<void> {
  if (addon.kind !== "service") return;
  try {
    const user = await store.getUserById(client.userId);
    await sendTemplate("addon_task", await teamEmailFor(store, addon), {
      client_name: user?.name ?? "",
      app_name: appLabel(app),
      addon: addon.name,
      period: billingLabel(addon.billing),
      email: user?.email ?? "",
      whatsapp: client.whatsapp,
      admin_url: `${appUrl()}/admin/addons?tab=tasks`,
    });
  } catch (error) {
    console.error("[addons] the team's email wasn't sent:", error instanceof Error ? error.message : error);
  }
}

/** After an add-on payment (card or a coupon for the whole price): the client's email and phone, and the team's task. */
export async function afterAddonPaid(store: DataStore, client: Client, app: App, payment: PlanPayment, addon: AppAddon): Promise<void> {
  await pushOwnerSafely((d) => pushPlanPayment(d, client.id, app, formatAmount(payment.amountCents, payment.currency), payment.id));
  const user = await store.getUserById(client.userId);
  if (user) {
    const lang = emailLangOf(user);
    const t = getDashT(lang);
    const ends = addon.activeUntil !== null && !isLifetimeEnd(addon.activeUntil);
    const attachments = payment.amountCents > 0 ? await receiptAttachment(() => planReceiptPdf(store, payment, lang)) : undefined;
    await sendTemplate(
      "addon_added",
      user.email,
      {
        name: user.name,
        app_name: appLabel(app),
        addon: addon.name,
        period: t(EMAIL_BILLING[addon.billing]),
        until_line: ends ? `${t("addons.email.runsUntil", { date: formatDate(addon.activeUntil!, lang) })}\n\n` : "",
        payment_line: paymentLine(payment, appUrl(), lang),
        addons_url: addonsUrl(appUrl(), app.id),
      },
      { lang, ...(attachments ? { attachments } : {}) },
    ).catch((error: unknown) => console.error("[mail] add-on email failed", error));
  }
  // A renewal doesn't open a new task.
  if (!payment.addon?.renews) await notifyAddonTask(store, client, app, addon);
}

/** How an add-on is paid, in the email's words. */
export const EMAIL_BILLING = {
  once: "addons.email.once",
  "1": "addons.email.p1",
  "6": "addons.email.p6",
  "12": "addons.email.p12",
  "24": "addons.email.p24",
  "36": "addons.email.p36",
  lifetime: "addons.email.lifetime",
} as const;

/**
 * The daily job: a notice and an email 7 days before an add-on that ends
 * runs out (once per end date), for the owner to renew it. Returns the
 * notices made.
 */
export async function remindEndingAddons(deps: NoticeDeps): Promise<OwnerNotice[]> {
  const { store, now } = deps;
  const created: OwnerNotice[] = [];
  for (const addon of await store.listAppAddons({ endingBefore: new Date(now.getTime() + 8 * DAY), limit: 500 })) {
    if (!addon.activeUntil || addon.activeUntil.getTime() <= now.getTime() || isLifetimeEnd(addon.activeUntil)) continue;
    if (addon.billing === "once" || addon.billing === "lifetime") continue;
    if (addon.remindedFor && addon.remindedFor.getTime() === addon.activeUntil.getTime()) continue;
    await store.updateAppAddon(addon.id, { remindedFor: addon.activeUntil, updatedAt: now });
    const [app, client] = await Promise.all([store.getAppById(addon.appId), store.getClientById(addon.clientId)]);
    if (!app || !client || client.status !== "active" || app.demo) continue;
    const name = appLabel(app);
    const end = formatDate(addon.activeUntil);
    const link = addonsUrl(deps.baseUrl, app.id);
    const notice = await store.createOwnerNotice({
      clientId: client.id,
      appId: app.id,
      kind: "addon_ends_7",
      dedupeKey: `addon_ends_7:${addon.id}:${addon.activeUntil.toISOString()}`.slice(0, 100),
      title: `${name}: ${addon.name} ends on ${end}`.slice(0, 200),
      body: `To keep it, renew it on the Add-ons page.`,
      linkUrl: link,
      linkLabel: "Renew",
      tone: "info",
      createdAt: now,
      emailedAt: null,
      dismissedAt: null,
      resolvedAt: null,
    });
    if (!notice) continue;
    created.push(notice);
    await pushOwnerSafely((d) => pushNotice(d, notice), store);
    const owner = await store.getUserById(client.userId);
    if (owner) {
      try {
        await deps.mail("addon_ends_soon", owner.email, { name: owner.name, app_name: name, addon: addon.name, end_date: end, addons_url: link }, ...mailOptions(owner));
        await store.updateOwnerNotice(client.id, notice.id, { emailedAt: now });
      } catch (e) {
        console.error("[addons] reminder email failed", e);
      }
    }
  }
  return created;
}
