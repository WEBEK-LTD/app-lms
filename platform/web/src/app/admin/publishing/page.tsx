import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, formatDate, formatDateTime } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { appTypeName } from "@/lib/app/kinds";
import { adminCan, requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { smtpConfigured } from "@/lib/mail";
import { reviewNotesFor } from "@/lib/publishing/review-notes";
import { reviewSignIn } from "@/lib/publishing/review-account";
import { reviewNotes } from "@/lib/delivery/review";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { encryptionKey } from "@/lib/env";
import { REJECTION_GUIDELINE } from "@/lib/publishing/review";
import { REJECTION_REASONS, type PublishingStore, type App, type Client, type PublishingEvent, type PublishingRequest, type User } from "@/lib/data/types";
import { publishingTeamEmail } from "@/lib/publishing/service";
import {
  checklistProgress,
  isLiveEverywhere,
  listingMissing,
  publishingEventLabel,
  PUBLISHING_STATUS_LABEL,
  PUBLISHING_STATUSES,
  requestStores,
  statusTone,
  stepDone,
  stepsFor,
  STORE_ICON,
  STORE_TITLE,
  trackOf,
} from "@/lib/publishing/steps";
import { SmtpMissingNotice } from "../smtp-notice";
import { TeamNotesForm, TrackForm } from "./forms";

export const metadata: Metadata = { title: "Publishing" };
export const dynamic = "force-dynamic";

/** Store names short enough for the table. */
const STORE_SHORT: Record<PublishingStore, string> = { android: "Play", ios: "App Store", galaxy: "Galaxy", huawei: "Huawei", xiaomi: "Xiaomi" };

const TABS = [
  { id: "open", label: "In progress" },
  { id: "live", label: "Live everywhere" },
  { id: "all", label: "All" },
] as const;

/** 14.1 We publish for you: the apps whose clients asked us to publish them, with each store's status. */
export default async function PublishingQueuePage({ searchParams }: PageProps<"/admin/publishing">) {
  await requireAdmin();
  const query = await searchParams;
  const tab = TABS.find((t) => t.id === query.show)?.id ?? "open";
  const store = await getStore();
  const [all, mayManage, teamEmail, smtp] = await Promise.all([
    store.listManagedPublishingRequests(),
    adminCan("publishing.manage"),
    publishingTeamEmail(store),
    smtpConfigured(store),
  ]);
  const requests = all.filter((r) => (tab === "all" ? true : tab === "live" ? isLiveEverywhere(r) : !isLiveEverywhere(r)));
  const rows = await Promise.all(
    requests.map(async (request) => {
      const [client, app, events] = await Promise.all([
        store.getClientById(request.clientId),
        store.getAppById(request.appId),
        store.listPublishingEvents(request.appId),
      ]);
      const user = client ? await store.getUserById(client.userId) : null;
      // 104.7 A delivery app's notes for the reviewers of both apps.
      const deliveryNotes = app?.appType === "delivery" ? reviewNotes(app, deliverySettingsOf(await store.getDeliverySettings(app.id))) : null;
      return { request, client, user, app, events, deliveryNotes };
    }),
  );
  const statuses = PUBLISHING_STATUSES.map((id) => ({ id, label: PUBLISHING_STATUS_LABEL[id] }));
  const selected = rows.find((r) => r.request.appId === query.app) ?? null;
  const href = (params: { show?: string; app?: string }) => {
    const search = new URLSearchParams();
    if (params.show && params.show !== "open") search.set("show", params.show);
    if (params.app) search.set("app", params.app);
    const text = search.toString();
    return text ? `/admin/publishing?${text}` : "/admin/publishing";
  };
  const counts = { open: all.filter((r) => !isLiveEverywhere(r)).length, live: all.filter(isLiveEverywhere).length, all: all.length };
  // Where the open requests' stores stand, at a glance.
  const tracks = all.filter((r) => !isLiveEverywhere(r)).flatMap((r) => requestStores(r).map((which) => trackOf(r, which).status));
  const glance = PUBLISHING_STATUSES.map((id) => ({ id, label: PUBLISHING_STATUS_LABEL[id], count: tracks.filter((t) => t === id).length }));

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Publishing</h1>
        <span className="text-[15px] text-muted">
          Apps we publish for clients, oldest request first. Clients invite {teamEmail} to their store accounts; a new status emails them.
        </span>
      </div>
      {/* 19 Without SMTP, new requests reach nobody: the team checks this page instead. */}
      {smtp ? null : <SmtpMissingNotice what="New requests aren't emailed to the publishing team" />}

      <ul aria-label="Open requests by store status" className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3 lg:grid-cols-6">
        {glance.map((g) => (
          <li key={g.id} className="flex flex-col gap-1 rounded-xl border border-line bg-white px-4 py-3">
            <span className="text-xs font-semibold text-muted">{g.label}</span>
            <span className={`text-[22px] font-extrabold ${g.count ? "" : "text-faint"}`}>{g.count}</span>
          </li>
        ))}
      </ul>

      <nav aria-label="Show" className="flex flex-wrap gap-2.5">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={href({ show: t.id })}
            aria-current={tab === t.id ? "page" : undefined}
            className={`flex h-9 items-center rounded-[18px] px-3.5 text-sm no-underline ${
              tab === t.id ? "bg-midnight font-semibold text-white hover:text-white" : "border border-line bg-white text-midnight hover:border-midnight hover:text-midnight"
            }`}
          >
            {t.label} <span className="ml-1.5 opacity-70">{counts[t.id]}</span>
          </Link>
        ))}
      </nav>

      <section aria-label="Publishing requests" className="relative overflow-x-auto rounded-2xl border border-line bg-white">
        {rows.length === 0 ? (
          <p className="m-0 p-6 text-[15px] text-muted">No apps here.</p>
        ) : (
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">App</th>
                <th scope="col" className="px-4 py-3 font-semibold">Stores</th>
                <th scope="col" className="px-4 py-3 font-semibold">Client&apos;s checklist</th>
                <th scope="col" className="px-4 py-3 font-semibold">Asked</th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ request, user, app }) => {
                const progress = app ? checklistProgress(request, app) : { done: 0, total: 0, complete: false };
                const name = appLabel(app);
                const isSelected = selected?.request.appId === request.appId;
                return (
                  <tr key={request.appId} className={`border-t border-line-soft align-top ${isSelected ? "bg-peach-soft" : ""}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold">{name}</span>
                        <span className="text-xs text-muted">
                          {user?.name ?? "Unknown client"}
                          {app ? ` · ${appTypeName(app)}` : ""}
                        </span>
                        {request.teamEmailFailedAt ? <Badge tone="danger">Email to the team failed</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {requestStores(request).map((which) => (
                          <span key={which} title={STORE_TITLE[which]}>
                            <Badge tone={statusTone(trackOf(request, which).status)}>
                              <span aria-hidden="true">{STORE_SHORT[which]}</span>
                              <span className="sr-only">{STORE_TITLE[which]}</span>: {PUBLISHING_STATUS_LABEL[trackOf(request, which).status]}
                            </Badge>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {request.readyAt ? (
                        <Badge tone="success">Ready</Badge>
                      ) : (
                        <div className="flex min-w-[120px] flex-col gap-1">
                          <span className="text-xs text-muted">
                            {progress.done} of {progress.total}
                          </span>
                          <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-sand">
                            <span className="block h-full rounded-full bg-midnight" style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }} />
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-muted">{formatDate(request.requestedAt)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={href({ show: tab, app: isSelected ? undefined : request.appId })}
                        aria-label={`${isSelected ? "Close" : "Open"} ${name}`}
                        className={`inline-flex h-[34px] items-center rounded-lg px-3.5 text-[13px] no-underline ${
                          isSelected ? "border border-line-strong bg-white font-semibold text-midnight hover:border-midnight hover:text-midnight" : "bg-midnight font-bold text-white hover:text-white"
                        }`}
                      >
                        {isSelected ? "Close" : "Open"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {selected ? <RequestDetail row={selected} statuses={statuses} mayManage={mayManage} /> : null}
    </>
  );
}

type Row = { request: PublishingRequest; client: Client | null; user: User | null; app: App | null; events: PublishingEvent[]; deliveryNotes: { customer: string; courier: string | null } | null };

/** One request: what the client did and gave, each store's status, the team's notes and the history. */
function RequestDetail({ row, statuses, mayManage }: { row: Row; statuses: { id: string; label: string }[]; mayManage: boolean }) {
  const { request, client, user, app, events, deliveryNotes } = row;
  const progress = app ? checklistProgress(request, app) : { done: 0, total: 0, complete: false };
  const missing = app ? listingMissing(app, request.listing) : [];
  const name = appLabel(app);
  return (
    <section aria-label={`${name} (${user?.name ?? "Unknown client"})`} className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft pb-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 text-[21px] font-extrabold">{name}</h2>
          <span className="text-sm text-muted">
            <Link href={`/admin/clients/${request.clientId}#app-${request.appId}`}>{user?.name ?? "Unknown client"}</Link>
            {user ? ` · ${user.email}` : ""}
            {client ? ` · ${client.whatsapp}` : ""}
            {app ? ` · ${appTypeName(app)}` : ""}
          </span>
          <span className="text-xs text-muted">
            Asked {formatDateTime(request.requestedAt)} · {request.readyAt ? `Client ready ${formatDateTime(request.readyAt)}` : `Checklist ${progress.done} of ${progress.total}`}
          </span>
        </div>
        {request.teamEmailFailedAt ? <Badge tone="danger">Email to the team failed · {formatDateTime(request.teamEmailFailedAt)}</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-xs font-bold tracking-wide text-muted uppercase">Client&apos;s steps</h3>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
              {stepsFor(request).map((step) => {
                const done = stepDone(request, step.id);
                return (
                  <li key={step.id} className="flex items-start gap-2">
                    <Icon name={done ? "check_circle" : "radio_button_unchecked"} size={18} filled={done} className={done ? "text-success" : "text-faint"} />
                    <span>
                      {step.id === "firebase" && request.firebaseBy === "team" ? "Firebase project: we create it" : step.title}
                      <span className="sr-only">{done ? " (done)" : " (not yet)"}</span>
                    </span>
                  </li>
                );
              })}
              <li className="flex items-start gap-2">
                <Icon name={missing.length ? "radio_button_unchecked" : "check_circle"} size={18} filled={!missing.length} className={missing.length ? "text-faint" : "text-success"} />
                <span>{missing.length ? `Listing: missing ${missing.join(", ")}` : "Listing details complete"}</span>
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-xs font-bold tracking-wide text-muted uppercase">Listing</h3>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted">Name</dt>
              <dd className="m-0">{app?.storeTitle ?? "Missing"}</dd>
              <dt className="text-muted">Package</dt>
              <dd className="m-0 break-all">{app?.androidPackage ?? "Missing"}</dd>
              <dt className="text-muted">Bundle ID</dt>
              <dd className="m-0 break-all">{app?.iosBundleId ?? "Missing"}</dd>
              <dt className="text-muted">Categories</dt>
              <dd className="m-0">
                {request.listing.playCategory ?? "Not chosen"} (Google Play) · {request.listing.appStoreCategory ?? "Not chosen"} (App Store)
              </dd>
              <dt className="text-muted">Screenshots</dt>
              <dd className="m-0">
                {app?.phoneScreenshotIds.length ?? 0} Google Play · {app?.iphoneScreenshotIds.length ?? 0} App Store
              </dd>
            </dl>
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold">Content rating and notes for reviewers</summary>
              <dl className="mt-2 mb-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <dt className="text-muted">Content rating</dt>
                <dd className="m-0 whitespace-pre-line">{request.listing.contentRatingNotes ?? "Not given"}</dd>
                <dt className="text-muted">For reviewers</dt>
                <dd className="m-0 whitespace-pre-line">{(app && reviewNotesFor(app, request.listing.reviewNotes)) || "Nothing"}</dd>
              </dl>
            </details>
            {/* 102 The sign-in the team enters in Play Console (App access) and App Store Connect (App Review Information). */}
            <ReviewSignIn app={app} delivery={deliveryNotes} />
          </div>
          <TeamNotesForm appId={request.appId} current={request.teamNotes ?? ""} disabled={!mayManage} />
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="m-0 text-xs font-bold tracking-wide text-muted uppercase">Stores</h3>
          <p className="m-0 text-xs text-muted">A note goes to the client on their Publishing page and in the status email.</p>
          {requestStores(request).map((which) => {
            const track = trackOf(request, which);
            return (
              <div key={which} className="flex flex-col gap-3 rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[15px] font-bold">
                    <Icon name={STORE_ICON[which]} size={20} />
                    {STORE_TITLE[which]}
                  </span>
                  <span className="flex items-center gap-2">
                    {track.updatedAt ? <span className="text-xs text-muted">since {formatDateTime(track.updatedAt)}</span> : null}
                    <Badge tone={statusTone(track.status)}>{PUBLISHING_STATUS_LABEL[track.status]}</Badge>
                  </span>
                </div>
                <TrackForm
                  appId={request.appId}
                  store={which}
                  storeTitle={STORE_TITLE[which]}
                  statuses={statuses}
                  reasons={REJECTION_REASONS.map((id) => ({ id, label: REJECTION_GUIDELINE[id] }))}
                  disabled={!mayManage}
                  current={{ status: track.status, note: track.note ?? "", storeUrl: track.storeUrl ?? "", rejection: track.rejection ?? "" }}
                />
                {track.checkedAt && track.storeState ? (
                  <p className="m-0 text-xs text-muted">
                    App Store Connect: {track.storeState} · read {formatDateTime(track.checkedAt)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {events.length ? (
        <details className="border-t border-line-soft pt-4">
          <summary className="cursor-pointer text-sm font-semibold">History ({events.length})</summary>
          <ol className="mt-3 flex list-none flex-col gap-2 border-l-2 border-line p-0 pl-4 text-sm">
            {events.map((event) => (
              <li key={event.id}>
                <span className="text-muted">{formatDateTime(event.at)}</span> · {publishingEventLabel(event, "team")} · {event.actorEmail}
                {event.note ? <span className="block text-ink-4">{event.note}</span> : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}

/** 102 The reviewers' sign-in, the password or code shown only when opened. */
function ReviewSignIn({ app, delivery }: { app: App | null; delivery: { customer: string; courier: string | null } | null }) {
  const signIn = app ? reviewSignIn(app, encryptionKey()) : null;
  if (!signIn) return <p className="m-0 text-sm font-semibold text-danger">Store review account: missing</p>;
  return (
    <details className="text-sm" data-review-sign-in="">
      <summary className="cursor-pointer font-semibold">Store review account</summary>
      <dl className="mt-2 mb-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        <dt className="text-muted">User name</dt>
        <dd className="m-0 break-all">{signIn.who}</dd>
        <dt className="text-muted">{signIn.kind === "code" ? "Fixed code" : "Password"}</dt>
        <dd className="m-0 break-all">
          <code>{signIn.secret}</code>
        </dd>
        {signIn.notes ? (
          <>
            <dt className="text-muted">Notes</dt>
            <dd className="m-0 whitespace-pre-line">{signIn.notes}</dd>
          </>
        ) : null}
        {delivery ? (
          <>
            <dt className="text-muted">Notes (customers&apos; app)</dt>
            <dd className="m-0 whitespace-pre-line">{delivery.customer}</dd>
          </>
        ) : null}
        {delivery?.courier ? (
          <>
            <dt className="text-muted">Notes (courier app)</dt>
            <dd className="m-0 whitespace-pre-line">{delivery.courier}</dd>
          </>
        ) : null}
      </dl>
    </details>
  );
}
