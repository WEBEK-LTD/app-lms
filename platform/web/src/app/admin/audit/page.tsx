import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { btn, formatDateTime } from "@/components/ui";
import { AUDIT_ACTIONS, AUDIT_TARGETS, auditActionLabel } from "@/lib/admin/audit-actions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { AuditEntry } from "@/lib/data/types";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

const PER_PAGE = 50;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const text = (value: string | string[] | undefined, max = 120) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** Every change made in the admin (roadmap 11.7): who, when, what, and the fields it changed. */
export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin();
  const params = await searchParams;
  const filters = {
    actor: text(params.actor),
    action: text(params.action, 64),
    target: text(params.target, 32),
    targetId: text(params.targetId, 64),
    client: /^[0-9a-f-]{36}$/i.test(text(params.client)) ? text(params.client) : "",
    from: DATE.test(text(params.from)) ? text(params.from) : "",
    to: DATE.test(text(params.to)) ? text(params.to) : "",
  };
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const store = await getStore();
  const to = filters.to ? new Date(`${filters.to}T00:00:00Z`) : undefined;
  if (to) to.setUTCDate(to.getUTCDate() + 1);
  const { items, total } = await store.listAuditEntries({
    actor: filters.actor || undefined,
    action: filters.action || undefined,
    targetType: filters.target || undefined,
    targetId: filters.targetId || undefined,
    clientId: filters.client || undefined,
    from: filters.from ? new Date(`${filters.from}T00:00:00Z`) : undefined,
    to,
    offset: (page - 1) * PER_PAGE,
    limit: PER_PAGE,
  });
  const client = filters.client ? await store.getClientById(filters.client) : null;
  const clientUser = client ? await store.getUserById(client.userId) : null;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageUrl = (n: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) search.set(key, value);
    if (n > 1) search.set("page", String(n));
    const query = search.toString();
    return query ? `/admin/audit?${query}` : "/admin/audit";
  };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Audit log</h1>
        <span className="text-[15px] text-muted">Every change made in the admin, newest first. Secret values are never logged.</span>
      </div>

      <form role="search" aria-label="Filter the log" action="/admin/audit" className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4">
        {filters.client ? <input type="hidden" name="client" value={filters.client} /> : null}
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm font-semibold">
          Who
          <input name="actor" type="search" defaultValue={filters.actor} placeholder="Email" className="input input-sm font-normal" />
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm font-semibold">
          Action
          <select name="action" defaultValue={filters.action} className="input input-sm font-normal">
            <option value="">Any</option>
            {Object.entries(AUDIT_ACTIONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-sm font-semibold">
          Target
          <select name="target" defaultValue={filters.target} className="input input-sm font-normal">
            <option value="">Any</option>
            {Object.entries(AUDIT_TARGETS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-sm font-semibold">
          Target ID
          <input name="targetId" defaultValue={filters.targetId} className="input input-sm font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          From
          <input name="from" type="date" defaultValue={filters.from} className="input input-sm font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          To
          <input name="to" type="date" defaultValue={filters.to} className="input input-sm font-normal" />
        </label>
        <button type="submit" className={`${btn.secondary} h-11 px-4`}>
          <Icon name="search" size={20} />
          Filter
        </button>
        <Link href="/admin/audit" className="h-11 content-center text-sm font-semibold">
          Clear
        </Link>
      </form>

      {client ? (
        <p className="m-0 text-sm">
          Changes for <Link href={`/admin/clients/${client.id}`}>{clientUser?.name ?? "this client"}</Link> only.
        </p>
      ) : null}

      <section aria-label="Log entries" className="relative overflow-x-auto rounded-2xl border border-line bg-white">
        {items.length === 0 ? (
          <p className="m-0 p-6 text-[15px] text-muted">No entries match.</p>
        ) : (
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">When</th>
                <th scope="col" className="px-4 py-3 font-semibold">Who</th>
                <th scope="col" className="px-4 py-3 font-semibold">What</th>
                <th scope="col" className="px-4 py-3 font-semibold">Target</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <Row key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <nav aria-label="Log pages" className="flex flex-wrap items-center gap-3 text-sm">
        {page > 1 ? <Link href={pageUrl(page - 1)}>Newer</Link> : null}
        <span className="text-muted">
          Page {Math.min(page, pages)} of {pages} · {total} {total === 1 ? "entry" : "entries"}
        </span>
        {page < pages ? <Link href={pageUrl(page + 1)}>Older</Link> : null}
      </nav>
    </>
  );
}

function Row({ entry }: { entry: AuditEntry }) {
  const changes = entry.changes;
  const keys = changes ? [...new Set([...Object.keys(changes.before ?? {}), ...Object.keys(changes.after ?? {})])] : [];
  const show = (value: unknown) => (value === undefined || value === null ? "—" : typeof value === "string" ? value : JSON.stringify(value));
  return (
    <tr className="border-t border-line-soft align-top">
      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(entry.at)}</td>
      <td className="px-4 py-3 break-all">{entry.actorEmail}</td>
      <td className="px-4 py-3">
        <span className="block font-semibold">{auditActionLabel(entry.action)}</span>
        <span className="block">{entry.summary}</span>
        {keys.length ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-[13px] text-muted">Changed fields</summary>
            <table className="mt-1 border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="pr-3 font-semibold">Field</th>
                  <th scope="col" className="pr-3 font-semibold">Before</th>
                  <th scope="col" className="font-semibold">After</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key}>
                    <th scope="row" className="pr-3 text-left font-normal text-muted">
                      {key}
                    </th>
                    <td className="max-w-[260px] pr-3 font-mono break-all">{show(changes?.before?.[key])}</td>
                    <td className="max-w-[260px] font-mono break-all">{show(changes?.after?.[key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ) : null}
      </td>
      <td className="px-4 py-3">
        {entry.clientId ? (
          <Link href={`/admin/clients/${entry.clientId}`}>{AUDIT_TARGETS[entry.targetType as keyof typeof AUDIT_TARGETS] ?? entry.targetType}</Link>
        ) : (
          <span>{AUDIT_TARGETS[entry.targetType as keyof typeof AUDIT_TARGETS] ?? entry.targetType}</span>
        )}
        {entry.targetId ? <span className="block font-mono text-[11px] break-all text-muted">{entry.targetId}</span> : null}
      </td>
    </tr>
  );
}
