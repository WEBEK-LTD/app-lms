import type { Metadata } from "next";
import Link from "next/link";
import { Badge, formatDateTime, Notice } from "@/components/ui";
import { DELETION_DAYS } from "@/lib/account/deletion";
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
 * ones oldest first. Deleting is done by hand (docs/ARCHITECTURE.md,
 * "Deleting a Yallapp account"): each open request lists what belongs to the
 * account, then "Mark done" emails the person who asked.
 */
export default async function AccountDeletionPage({ searchParams }: PageProps<"/admin/account-deletion">) {
  await requireAdmin();
  const query = await searchParams;
  const tab = TABS.find((t) => t.id === query.show)?.id ?? "pending";
  const store = await getStore();
  const [listed, mayClose] = await Promise.all([store.listAccountDeletionRequests(tab === "all" ? [] : [tab], 200), adminCan("clients.suspend")]);
  const requests = tab === "pending" ? [...listed].reverse() : listed;
  const rows = await Promise.all(requests.map(async (request) => ({ request, account: request.status === "pending" ? await accountOf(request) : null })));
  const now = new Date();

  async function accountOf(request: AccountDeletionRequest) {
    const client = await store.getClientById(request.clientId);
    if (!client) return null;
    const [apps, payments, team] = await Promise.all([
      store.listAppsByClient(client.id),
      store.listPlanPayments({ clientId: client.id, limit: 500 }),
      store.listTeamMembers(client.id),
    ]);
    const builds = (await Promise.all(apps.map((app) => store.listBuildsByApp(app.id, 500)))).flat();
    return { client, apps, builds, paid: payments.filter((p) => p.status === "paid").length, team: team.length };
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Account deletion</h1>
        <span className="max-w-[860px] text-[15px] text-muted">
          Clients who asked to delete their Yallapp account from their dashboard (confirmed with their password), oldest first. We promise to delete within{" "}
          {DELETION_DAYS} days. Requests by email must come from the account&apos;s own address. Deleting is done by hand, in this order:
        </span>
      </div>
      <ol className="m-0 flex max-w-[860px] flex-col gap-1.5 rounded-2xl border border-line bg-white py-4 ps-9 pe-5 text-sm leading-relaxed">
        <li>Keep the billing records the law requires: the client&apos;s payments and receipts (their page › Payments) go into our accounting records.</li>
        <li>Note the build folders listed below: the files host keeps each build in <code>builds/&lt;build id&gt;/</code>.</li>
        <li>
          Delete the owner&apos;s row in <code>users</code> (<code>DELETE FROM users WHERE id = &apos;…&apos;</code>): the client, its apps, licenses, builds, payments,
          team, content, app users and the rest go with it (foreign keys on delete cascade). Team members keep their own sign-ins.
        </li>
        <li>
          Delete the files: <code>assets/&lt;client id&gt;/</code> in Netlify Blobs (<code>yallapp-files</code>) and the build folders on files.yallapp.com.tr. Media
          files on the media server are removed by the daily job 7 days after their app is gone.
        </li>
        <li>Mark the request done here: the person who asked is emailed, in their language, that it was deleted.</li>
      </ol>
      {query.closed === "done" ? (
        <Notice tone="success" icon="check_circle" role="status">
          Marked done. The person who asked was emailed that their account was deleted.
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
      {rows.map(({ request, account }) => {
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
                  {request.status === "pending" ? ` · delete by ${formatDateTime(new Date(due))}` : ""}
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
                    {account.paid} paid ·{" "}
                    <Link href={`/admin/clients/${request.clientId}#h-payments`}>keep their records first</Link>
                  </dd>
                  <dt className="text-muted">Team</dt>
                  <dd className="m-0">{account.team ? `${account.team} members (they keep their own sign-ins)` : "None"}</dd>
                </dl>
              ) : (
                <p className="m-0 text-sm text-ink-3">The account is no longer in the database. Check its files are gone, then mark the request done.</p>
              )
            ) : null}
            {request.status === "pending" && mayClose ? <CloseDeletionForm id={request.id} /> : null}
          </section>
        );
      })}
    </>
  );
}
