import type { Metadata } from "next";
import Link from "next/link";
import { purgeDeletedAppAction, restoreDeletedAppAction } from "@/app/actions/admin-deleted-apps";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, formatDateTime, Notice } from "@/components/ui";
import { APP_RESTORE_DAYS } from "@/lib/apps/deletion";
import { adminCan, requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { AppDeletionStatus } from "@/lib/data/types";

export const metadata: Metadata = { title: "Deleted apps" };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "waiting", label: "Waiting" },
  { id: "purged", label: "Deleted for good" },
  { id: "restored", label: "Restored" },
  { id: "all", label: "All" },
] as const;

const STATUS_LABEL: Record<AppDeletionStatus, string> = { waiting: "Waiting", purged: "Deleted for good", restored: "Restored" };
const STATUS_TONE = { waiting: "warn", purged: "neutral", restored: "success" } as const;

const DONE: Record<string, { tone: "success" | "warn"; text: string }> = {
  restored: { tone: "success", text: "The app is back, as it was: its owner sees it in their dashboard, and its API and license work again." },
  purged: { tone: "success", text: "The app was deleted for good: its rows, its Media files, its build folders and the images only it used." },
  not_waiting: { tone: "warn", text: "That app isn't waiting any more: it was restored or deleted meanwhile." },
  failed: { tone: "warn", text: "Its files couldn't be deleted (the media server didn't answer), so nothing was deleted. Try again later; the daily job does too." },
  confirm: { tone: "warn", text: "Tick the box to confirm, then press Delete now." },
};

/**
 * 73 Apps their owners deleted from the dashboard (Setup › Delete this
 * app), newest first. Each waits `APP_RESTORE_DAYS` days: "Restore" brings
 * it back as it was, "Delete now" purges it at once; the daily job purges it
 * after that. Build folders the files host didn't confirm are listed here.
 */
export default async function DeletedAppsPage({ searchParams }: PageProps<"/admin/deleted-apps">) {
  await requireAdmin();
  const query = await searchParams;
  const tab = TABS.find((t) => t.id === query.show)?.id ?? "waiting";
  const store = await getStore();
  const [deletions, mayChange] = await Promise.all([store.listAppDeletions({ statuses: tab === "all" ? [] : [tab], limit: 200 }), adminCan("clients.suspend")]);
  const done = typeof query.done === "string" ? DONE[query.done] : undefined;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Deleted apps</h1>
        <span className="max-w-[860px] text-[15px] text-muted">
          Apps their owners deleted from the dashboard. A deleted app stops at once (its API answers not found, its WordPress license is refused) and is
          deleted for good {APP_RESTORE_DAYS} days later by the daily job: its rows, its Media files, its build folders on the files host and the images only it
          used. Until then &quot;Restore&quot; brings it back as it was. Its plan payments are kept for billing either way. Apps deleted with their account
          are listed under Deleted for good.
        </span>
      </div>
      {done ? (
        <Notice tone={done.tone} icon={done.tone === "success" ? "check_circle" : "warning"} role="status">
          {done.text}
        </Notice>
      ) : null}
      <nav aria-label="Show" className="flex flex-wrap gap-2.5">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/deleted-apps?show=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={`flex h-9 items-center rounded-[18px] px-3.5 text-sm no-underline ${
              tab === t.id ? "bg-midnight font-semibold text-white hover:text-white" : "border border-line bg-white text-midnight hover:border-midnight hover:text-midnight"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {deletions.length === 0 ? <p className="m-0 rounded-2xl border border-line bg-white p-6 text-[15px] text-muted">No apps here.</p> : null}
      {deletions.map((d) => (
        <section key={d.id} id={`d-${d.id}`} aria-label={d.appName} data-deletion={d.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="m-0 text-[19px] font-bold">{d.appName}</h2>
              <span className="text-sm break-all text-muted">
                {d.status === "purged" ? d.deletedBy : <Link href={`/admin/clients/${d.clientId}`}>{d.deletedBy}</Link>} ·{" "}
                {d.reason === "account" ? "with their account" : "by the owner"} · {formatDateTime(d.deletedAt)}
              </span>
              <span className="text-xs text-muted">
                {d.status === "waiting" ? `Deleted for good after ${formatDateTime(d.purgeAfter)}` : `${STATUS_LABEL[d.status]} ${formatDateTime(d.closedAt)} by ${d.closedBy ?? "unknown"}`}
                {` · app ${d.appId}`}
              </span>
            </div>
            <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
          </div>
          {d.pendingBuilds.length ? (
            <p className="m-0 text-sm break-all text-ink-3" data-pending-builds={d.pendingBuilds.length}>
              <strong>Left on the files host</strong> (the daily job tries again; or delete them there by hand):{" "}
              {d.pendingBuilds.map((id) => `builds/${id}/`).join(" ")}
            </p>
          ) : null}
          {d.status === "waiting" && mayChange ? (
            <div className="flex flex-wrap items-end gap-3 border-t border-line-soft pt-3">
              <form action={restoreDeletedAppAction}>
                <input type="hidden" name="id" value={d.id} />
                <SubmitButton className="h-10 px-4 text-sm">
                  <Icon name="restore_from_trash" size={18} />
                  Restore
                </SubmitButton>
              </form>
              <form action={purgeDeletedAppAction} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="id" value={d.id} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="confirm" />
                  Delete its rows and files now; this can&apos;t be undone
                </label>
                <SubmitButton variant="danger" className="h-10 px-4 text-sm">
                  <Icon name="delete_forever" size={18} />
                  Delete now
                </SubmitButton>
              </form>
            </div>
          ) : null}
        </section>
      ))}
    </>
  );
}
