import { purgeAppFiles, type PurgeDeps } from "../apps/deletion";
import { appLabel } from "../app/label";
import { receiptNumber } from "../billing/receipt";
import { newId } from "../crypto/tokens";
import type { AccountDeletionRequest, AppDeletion, KeptBillingRecord, PlanPayment } from "../data/types";
import type { ReceiptDocument } from "../receipts/pdf";
import { DELETION_WAIT_DAYS, type DeletionMailKey } from "./deletion";
import type { Lang } from "@/i18n/config";

/**
 * 73 Carrying out a request to delete a Yallapp account (roadmap 66.7): the
 * daily job does it `DELETION_WAIT_DAYS` after the owner asked (they can
 * cancel until then), or our team at once with "Delete now" (Admin ›
 * Account deletion). In this order, so nothing the law needs is lost:
 *
 * 1. The billing records are kept: every paid plan payment, with who paid,
 *    its coupon and its receipt as it was made (to make the PDF again), in
 *    `kept_billing_records`, which has no foreign keys.
 * 2. Each app's files go (lib/apps/deletion.ts › purgeAppFiles): Media on
 *    the media server, build folders on the files host (those the host
 *    doesn't confirm are kept on the app's deletion record and tried again
 *    daily), and every upload of the account in Netlify Blobs
 *    (`assets/<client id>/`). A media server that can't be reached stops it
 *    here: nothing is deleted and the daily job tries again.
 * 3. The owner's user row is deleted: the client, its apps, licenses,
 *    builds, payments, team, content, app users, sessions, two-step sign-in
 *    and phones go with it (on delete cascade). Team members keep their own
 *    sign-ins.
 * 4. The request is marked done and the owner is emailed in the language
 *    they asked in, as when our team marked it done by hand.
 */

export interface AccountPurgeDeps extends PurgeDeps {
  /** Sends the "Account deleted" email (best effort). */
  mail: (key: DeletionMailKey, to: string, values: Record<string, string>, lang: Lang) => Promise<void>;
  /** The receipt of a paid plan payment in the client's language (lib/receipts/service.ts › planReceiptDocument). */
  receipt: (payment: PlanPayment) => Promise<ReceiptDocument | null>;
}

export type AccountPurgeOutcome = { ok: true; kept: number; apps: number; pendingBuilds: number } | { ok: false; message: string };

const DAY = 86_400_000;

/** When an open request is carried out by the daily job. */
export function deletionDueAt(request: Pick<AccountDeletionRequest, "requestedAt">): Date {
  return new Date(request.requestedAt.getTime() + DELETION_WAIT_DAYS * DAY);
}

export async function carryOutAccountDeletion(deps: AccountPurgeDeps, requestId: string, by: string): Promise<AccountPurgeOutcome> {
  const { store, now } = deps;
  const request = await store.getAccountDeletionRequest(requestId);
  if (!request || request.status !== "pending") return { ok: false, message: "This request isn't open any more." };
  const client = await store.getClientById(request.clientId);
  const user = client ? await store.getUserById(client.userId) : null;
  let kept = 0;
  let pendingBuilds = 0;
  let appCount = 0;
  if (client && user) {
    // 1. What the law needs, before anything is deleted.
    const [payments, redemptions, apps] = await Promise.all([
      store.listPlanPayments({ clientId: client.id, limit: 10_000 }),
      store.listCouponRedemptions({ clientId: client.id }),
      store.listAppsByClientIncludingDeleted(client.id),
    ]);
    const records: KeptBillingRecord[] = [];
    for (const payment of payments.filter((p) => p.status === "paid")) {
      const coupon = redemptions.find((r) => r.paymentId === payment.id && r.status === "redeemed") ?? null;
      const app = apps.find((a) => a.id === payment.appId) ?? null;
      let receipt: ReceiptDocument | null = null;
      try {
        receipt = await deps.receipt(payment);
      } catch (e) {
        console.error(`[account-deletion] receipt of ${payment.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
      records.push({
        id: payment.id,
        clientId: client.id,
        userId: user.id,
        appId: payment.appId,
        receiptNumber: receiptNumber(payment),
        buyerName: user.name,
        buyerEmail: user.email,
        buyerWhatsapp: client.whatsapp,
        buyerCountry: client.country ?? null,
        amountCents: payment.amountCents,
        currency: payment.currency,
        status: payment.status,
        paidAt: payment.paidAt,
        details: { payment: asJson(payment), coupon: coupon ? asJson(coupon) : null, appName: app ? appLabel(app) : null },
        receipt: receipt ? asJson(receipt) : null,
        keptAt: now,
      });
    }
    await store.keepBillingRecords(records);
    kept = records.length;

    // 2. The files, app by app, then everything the account uploaded.
    const waiting = await store.listAppDeletions({ statuses: ["waiting"], clientId: client.id, limit: 100 });
    const purged: AppDeletion[] = [];
    for (const app of apps) {
      let files: { pendingBuilds: string[] };
      try {
        files = await purgeAppFiles(deps, app);
      } catch (e) {
        const message = `The files of ${appLabel(app)} couldn't be deleted (${e instanceof Error ? e.message : String(e)}). Nothing else was deleted; try again later.`;
        console.error(`[account-deletion] ${message}`);
        return { ok: false, message };
      }
      pendingBuilds += files.pendingBuilds.length;
      const open = waiting.find((d) => d.appId === app.id);
      purged.push({
        id: open?.id ?? newId(),
        appId: app.id,
        clientId: client.id,
        appName: open?.appName ?? appLabel(app),
        reason: open?.reason ?? "account",
        deletedBy: open?.deletedBy ?? by,
        deletedAt: open?.deletedAt ?? now,
        purgeAfter: open?.purgeAfter ?? now,
        status: "purged",
        closedAt: now,
        closedBy: by,
        pendingBuilds: files.pendingBuilds,
      });
    }
    for (const asset of await store.listAssetsByClient(client.id)) await deps.blobs.delete(asset.blobKey);

    // 3. The rows: the user, and everything that goes with them.
    for (const deletion of purged) {
      // An app already waiting to be purged is marked purged with the account; the others get their record.
      if (waiting.some((d) => d.id === deletion.id)) await store.purgeDeletedApp(deletion.id, by, now, deletion.pendingBuilds);
      else await store.createAppDeletionRecord(deletion);
    }
    await store.deleteUserAccount(user.id);
    appCount = apps.length;
  }

  // 4. Done, and the owner hears it.
  const closed = await store.closeAccountDeletionRequest(request.id, {
    status: "done",
    closedAt: now,
    closedBy: by,
    teamNote: pendingBuilds ? `${pendingBuilds} build folders are left on the files host; the daily job tries again (Admin › Deleted apps).` : null,
  });
  if (closed) {
    try {
      await deps.mail("account_deletion_done", request.email, { name: request.name }, request.lang === "ar" || request.lang === "tr" ? request.lang : "en");
    } catch (error) {
      console.error("[account-deletion] the account_deletion_done email wasn't sent:", error instanceof Error ? error.message : error);
    }
  }
  return { ok: true, kept, apps: appCount, pendingBuilds };
}

export interface AccountPurgeReport {
  deleted: number;
  failed: number;
}

/** The daily job: carries out the open requests whose waiting period is over, oldest first. */
export async function runAccountDeletions(deps: AccountPurgeDeps, limit = 10): Promise<AccountPurgeReport> {
  const report: AccountPurgeReport = { deleted: 0, failed: 0 };
  const open = await deps.store.listAccountDeletionRequests(["pending"], 500);
  const due = open.filter((r) => deletionDueAt(r).getTime() <= deps.now.getTime()).reverse().slice(0, limit);
  for (const request of due) {
    const outcome = await carryOutAccountDeletion(deps, request.id, "daily job");
    if (outcome.ok) report.deleted += 1;
    else report.failed += 1;
  }
  return report;
}

/** A value as JSON keeps it (dates as ISO text). */
function asJson(value: object): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
