import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, formatDateTime } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { appTypeName } from "@/lib/app/kinds";
import { adminCan, requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { smtpConfigured } from "@/lib/mail";
import { publishingTeamEmail } from "@/lib/publishing/service";
import {
  checklistProgress,
  isLiveEverywhere,
  listingMissing,
  publishingEventLabel,
  PUBLISHING_STATUS_LABEL,
  PUBLISHING_STATUSES,
  PUBLISHING_STEPS,
  PUBLISHING_STORES,
  statusTone,
  stepDone,
  STORE_TITLE,
} from "@/lib/publishing/steps";
import { SmtpMissingNotice } from "../smtp-notice";
import { TeamNotesForm, TrackForm } from "./forms";

export const metadata: Metadata = { title: "Publishing" };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "open", label: "In progress" },
  { id: "live", label: "Live on both stores" },
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
      return { request, client, user, app, events };
    }),
  );
  const statuses = PUBLISHING_STATUSES.map((id) => ({ id, label: PUBLISHING_STATUS_LABEL[id] }));

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Publishing</h1>
        <span className="text-[15px] text-muted">
          Apps whose clients asked us to publish them, oldest request first. Clients invite {teamEmail} (Settings › Publishing service) to their own
          accounts; we never ask for their passwords. A new status emails the client.
        </span>
      </div>
      {/* 19 Without SMTP, new requests reach nobody: the team checks this page instead. */}
      {smtp ? null : <SmtpMissingNotice what="New requests aren't emailed to the publishing team" />}
      <nav aria-label="Show" className="flex flex-wrap gap-2.5">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/publishing?show=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={`flex h-9 items-center rounded-[18px] px-3.5 text-sm no-underline ${
              tab === t.id ? "bg-midnight font-semibold text-white hover:text-white" : "border border-line bg-white text-midnight hover:border-midnight hover:text-midnight"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="m-0 rounded-2xl border border-line bg-white p-6 text-[15px] text-muted">No apps here.</p>
      ) : null}
      {rows.map(({ request, user, client, app, events }) => {
        const progress = app ? checklistProgress(request, app) : { done: 0, total: 0, complete: false };
        const missing = app ? listingMissing(app, request.listing) : [];
        const name = appLabel(app);
        return (
          <section key={request.appId} aria-label={`${name} (${user?.name ?? "Unknown client"})`} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="m-0 text-[19px] font-bold">{name}</h2>
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
              <div className="flex flex-wrap gap-2">
                {request.teamEmailFailedAt ? (
                  <Badge tone="danger">Email to the team failed · {formatDateTime(request.teamEmailFailedAt)}</Badge>
                ) : null}
                {PUBLISHING_STORES.map((which) => (
                  <Badge key={which} tone={statusTone(request[which].status)}>
                    {STORE_TITLE[which]}: {PUBLISHING_STATUS_LABEL[request[which].status]}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
              <div className="flex flex-col gap-2">
                <h3 className="m-0 text-[15px] font-bold">Client&apos;s steps</h3>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
                  {PUBLISHING_STEPS.map((step) => {
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
                <h3 className="m-0 text-[15px] font-bold">Listing</h3>
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
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
                  <dt className="text-muted">Content rating</dt>
                  <dd className="m-0 whitespace-pre-line">{request.listing.contentRatingNotes ?? "Not given"}</dd>
                  <dt className="text-muted">For reviewers</dt>
                  <dd className="m-0 whitespace-pre-line">{request.listing.reviewNotes ?? "Nothing"}</dd>
                </dl>
              </div>
            </div>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
              {PUBLISHING_STORES.map((which) => (
                <div key={which} className="flex flex-col gap-2 rounded-xl border border-line p-4">
                  <span className="flex items-center gap-2 text-[15px] font-bold">
                    <Icon name={which === "android" ? "android" : "phone_iphone"} size={20} />
                    {STORE_TITLE[which]}
                    {request[which].updatedAt ? <span className="text-xs font-normal text-muted">since {formatDateTime(request[which].updatedAt)}</span> : null}
                  </span>
                  <TrackForm
                    appId={request.appId}
                    store={which}
                    storeTitle={STORE_TITLE[which]}
                    statuses={statuses}
                    disabled={!mayManage}
                    current={{ status: request[which].status, note: request[which].note ?? "", storeUrl: request[which].storeUrl ?? "" }}
                  />
                </div>
              ))}
            </div>

            <TeamNotesForm appId={request.appId} current={request.teamNotes ?? ""} disabled={!mayManage} />

            {events.length ? (
              <details>
                <summary className="cursor-pointer text-sm font-semibold">History ({events.length})</summary>
                <ul className="mt-2 flex list-none flex-col gap-1 p-0 text-sm">
                  {events.map((event) => (
                    <li key={event.id}>
                      <span className="text-muted">{formatDateTime(event.at)}</span> · {publishingEventLabel(event, "team")} · {event.actorEmail}
                      {event.note ? <span className="block text-ink-4">{event.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        );
      })}
    </>
  );
}
