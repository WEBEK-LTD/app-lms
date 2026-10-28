import type { Metadata } from "next";
import Link from "next/link";
import { Badge, formatDateTime, Notice } from "@/components/ui";
import { DELETION_DAYS, DELETION_WAIT_DAYS } from "@/lib/account/deletion";
import { deletionDueAt } from "@/lib/account/purge";
import { appLabel } from "@/lib/app/label";
import { adminCan, requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { AccountDeletionRequest, AccountDeletionStatus } from "@/lib/data/types";
import { CloseDeletionForm } from "./forms";

export const metadata: Metadata = { title: "Account deletion" };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "pending", label: "Open" },
  { id: "done", label: "Done" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
] as const;

const STATUS_LABEL: Record<AccountDeletionStatus, string> = { pending: "Open", done: "Done", cancelled: "Cancelled" };
const STATUS_TONE = { pending: "warn", done: "success", cancelled: "neutral" } as const;
const DAY = 86_400_000;

/**
 * 66 Requests to delete a Yallapp account (Dashboard › Your account), open
 * ones oldest first, with what belongs to each account. 73 The daily job
 * deletes an account `DELETION_WAIT_DAYS` after the request, keeping its
 * billing records (lib/account/purge.ts); "Delete now" does it at once.
 * Done requests list the billing records kept, with their receipts.
 */
export default async function AccountDeletionPage({ searchParams }: PageProps<"/admin/account-deletion">) {
  await requireAdmin();
  const query = await searchParams;
  const tab = TABS.find((t) => t.id === query.show)?.id ?? "pending";
  const store = await getStore();
  const [listed, mayClose] = await Promise.all([store.listAccountDeletionRequests(tab === "all" ? [] : [tab], 200), adminCan("clients.suspend")]);
  const requests = tab === "pending" ? [...listed].reverse() : listed;
  const rows = await Promise.all(
    requests.map(async (request) => ({
      request,
      account: request.status === "pending" ? await accountOf(request) : null,
      kept: request.status === "done" ? await store.listKeptBillingRecords({ clientId: request.clientId, limit: 200 }) : [],
    })),
  );
  const now = new Date();

  async function accountOf(request: AccountDeletionRequest) {
    const client = await store.getClientById(request.clientId);
    if (!client) return null;
    const [apps, payments, team] = await Promise.all([
      store.listAppsByClient(client.id),
      store.listPlanPayments({ clientId: client.id, limit: 500 }),
      store.listTeamMembers(client.id),
    ]);
    const builds = (await Promise.all(apps.map((app) => store.listBuildsByApp(app.id, 500, "all")))).flat();
    return { client, apps, builds, paid: payments.filter((p) => p.status === "paid").length, team: team.length };
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Account deletion</h1>
        <span className="max-w-[860px] text-[15px] text-muted">
          Clients who asked to delete their Yallapp account from their dashboard (confirmed with their password), oldest first. We promise to delete within{" "}
          {DELETION_DAYS} days. The daily job deletes each account {DELETION_WAIT_DAYS} days after the request (the client can cancel until then), or press
          Delete now. Requests by email must come from the account&apos;s own address: check that, then ask the client to confirm from their dashboard, or
          delete it here.
        </span>
      </div>
      <ol className="m-0 flex max-w-[860px] flex-col gap-1.5 rounded-2xl border border-line bg-white py-4 ps-9 pe-5 text-sm leading-relaxed">
        <li>The billing records the law requires are kept: every paid plan payment, who paid, its coupon and its receipt (listed under Done, with the PDF).</li>
        <li>
          The files go: each app&apos;s Media files, its build folders on the files host (any it doesn&apos;t confirm are listed in Deleted apps and tried
          again daily) and <code>assets/&lt;client id&gt;/</code> in Netlify Blobs.
        </li>
        <li>
          The owner&apos;s user is deleted, and with it the client, its apps, licenses, builds, payments, team, sessions, two-step sign-in, content and app
          users. Team members keep their own sign-ins.
        </li>
        <li>The request is marked done and the person who asked is emailed, in their language, that it was deleted.</li>
      </ol>
      {query.closed === "done" ? (
        <Notice tone="success" icon="check_circle" role="status">
          The account was deleted, its billing records kept, and the person who asked was emailed.
        </Notice>
      ) : null}
      {query.closed === "cancelled" ? (
        <Notice tone="success" icon="check_circle" role="status">
          The request was cancelled.
        </Notice>
      ) : null}
      <nav aria-label="Show" className="flex flex-wrap gap-2.5">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/account-deletion?show=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={`flex h-9 items-center rounded-[18px] px-3.5 text-sm no-underline ${
              tab === t.id ? "bg-midnight font-semibold text-white hover:text-white" : "border border-line bg-white text-midnight hover:border-midnight hover:text-midnight"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? <p className="m-0 rounded-2xl border border-line bg-white p-6 text-[15px] text-muted">No requests here.</p> : null}
      {rows.map(({ request, account, kept }) => {
        const due = request.requestedAt.getTime() + DELETION_DAYS * DAY;
        return (
          <section
            key={request.id}
            aria-label={`${request.name} (${request.email})`}
            data-request={request.id}
            className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="m-0 text-[19px] font-bold">{request.name}</h2>
                <span className="text-sm break-all text-muted">
                  {account ? <Link href={`/admin/clients/${request.clientId}`}>{request.email}</Link> : request.email}
                  {account ? ` · ${account.client.whatsapp}` : ""}
                </span>
                <span className="text-xs text-muted">
                  Asked {formatDateTime(request.requestedAt)}
                  {request.status === "pending" ? ` · deleted automatically after ${formatDateTime(deletionDueAt(request))} · promised by ${formatDateTime(new Date(due))}` : ""}
                  {request.closedAt ? ` · ${STATUS_LABEL[request.status]} ${formatDateTime(request.closedAt)} by ${request.closedBy ?? "unknown"}` : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={STATUS_TONE[request.status]}>{STATUS_LABEL[request.status]}</Badge>
                {request.status === "pending" && due < now.getTime() ? <Badge tone="danger">Overdue</Badge> : null}
              </div>
            </div>
            {request.reason ? (
              <p className="m-0 text-sm whitespace-pre-wrap text-ink-3">
                <strong>Reason:</strong> {request.reason}
              </p>
            ) : null}
            {request.teamNote ? (
              <p className="m-0 text-sm whitespace-pre-wrap text-ink-3">
                <strong>Our note:</strong> {request.teamNote}
              </p>
            ) : null}
            {request.status === "pending" ? (
              account ? (
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted">User ID</dt>
                  <dd className="m-0 break-all">
                    <code>{request.userId}</code>
                  </dd>
                  <dt className="text-muted">Client ID</dt>
                  <dd className="m-0 break-all">
                    <code>{request.clientId}</code> (Blobs: <code>assets/{request.clientId}/</code>)
                  </dd>
                  <dt className="text-muted">Apps</dt>
                  <dd className="m-0">{account.apps.length ? account.apps.map((app) => `${appLabel(app)} (${app.id})`).join(", ") : "None"}</dd>
                  <dt className="text-muted">Build folders</dt>
                  <dd className="m-0 break-all">{account.builds.length ? account.builds.map((b) => `builds/${b.id}/`).join(" ") : "None"}</dd>
                  <dt className="text-muted">Payments</dt>
                  <dd className="m-0">
                    {account.paid} paid (kept for billing) · <Link href={`/admin/clients/${request.clientId}#h-payments`}>see them</Link>
                  </dd>
                  <dt className="text-muted">Team</dt>
                  <dd className="m-0">{account.team ? `${account.team} members (they keep their own sign-ins)` : "None"}</dd>
                </dl>
              ) : (
                <p className="m-0 text-sm text-ink-3">The account is no longer in the database. Delete now closes the request and emails them.</p>
              )
            ) : null}
            {request.status === "pending" && mayClose ? <CloseDeletionForm id={request.id} /> : null}
            {kept.length ? (
              <div className="flex flex-col gap-1.5" data-kept={kept.length}>
                <h3 className="m-0 text-[15px] font-bold">Billing records kept</h3>
                <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
                  {kept.map((record) => (
                    <li key={record.id} className="flex flex-wrap gap-x-2">
                      <span>{record.receiptNumber}</span>
                      <span className="text-muted">
                        {formatDateTime(record.paidAt)} · {(record.amountCents / 100).toFixed(2)} {record.currency}
                        {record.details.appName ? ` · ${record.details.appName}` : ""}
                      </span>
                      {record.receipt ? <a href={`/admin/payments/kept/${record.id}/pdf`}>Receipt PDF</a> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        );
      })}
    </>
  );
}
