import type { Metadata } from "next";
import { platformDefinition } from "@/lib/hosted/connectors/registry";
import Link from "next/link";
import {
  manageClientAction,
  regenerateKeyAction,
  reinstateClientAction,
  releaseClientSiteAction,
  setHostedApiAction,
  suspendClientAction,
} from "@/app/actions/admin";
import { BuildStatusText } from "@/components/build-status";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, Notice, btn, formatDate, formatDateTime } from "@/components/ui";
import { revealLicenseKey } from "@/lib/admin/clients";
import { can, type AdminPermission } from "@/lib/admin/permissions";
import { APP_TYPE_NAMES, SETUP_STEPS, stepStatus } from "@/lib/app/setup";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { ClientAppRow, ClientFilter, ClientRow } from "@/lib/data/store";
import type { AppBackend } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { ACCOUNT_STATE_LABEL, appState, clientAccountState, type AccountState } from "@/lib/license/status";
import { appLabel } from "@/lib/app/label";
import { planName, planNamesOf } from "@/lib/plans";
import { ActivateForm, AddClientForm, ClientDetailsForm } from "../forms";
import { getPlans } from "@/lib/settings/platform";
import { PAYMENT_STATUS, PAYMENT_TONE } from "../payments/labels";
import { formatCents } from "@/lib/catalog/money";

export const metadata: Metadata = { title: "Clients" };

const FILTERS: { id: ClientFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending activation" },
  { id: "active", label: "Active" },
  { id: "expired", label: "Expired" },
];

const DONE: Record<string, string> = {
  activated: "Activated. The license key was emailed to the client.",
  renewed: "Saved. The client was emailed the new date.",
  suspended: "Suspended. The plugin now reports the license as suspended.",
  reinstated: "Reinstated.",
  regenerated: "New license key created. The old key no longer works.",
  released: "The license was released from its website.",
  added: "Client added. They were emailed a link to set their password.",
  hosted: "The app now uses the hosted API. Its next build signs customers in through Yallapp.",
  unhosted: "The app no longer uses the hosted API. The client chooses a website on their Website step.",
};

const BACKEND_NAMES: Record<AppBackend, string> = {
  wordpress: "Their WordPress site",
  custom_api: "Their own API",
  setup_requested: "Asked us to set up WordPress",
  hosted: "Yallapp hosted API",
};

function stateTone(state: AccountState) {
  return state === "active" ? "success" : state === "pending" ? "warn" : "danger";
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The account's state, from every app's license. */
function rowState(row: ClientRow, now: Date): AccountState {
  return clientAccountState(row.client, row.apps.flatMap((e) => (e.license ? [e.license] : [])), now);
}

/** The newest build of any of the client's apps. */
function latestBuildOf(row: ClientRow) {
  return row.apps.reduce<ClientAppRow["latestBuild"]>((latest, e) => (e.latestBuild && (!latest || e.latestBuild.createdAt > latest.createdAt) ? e.latestBuild : latest), null);
}

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `/admin/clients?${text}` : "/admin/clients";
}

export default async function ClientsPage({ searchParams }: PageProps<"/admin/clients">) {
  const { adminRole } = await requireAdmin();
  const may = (permission: AdminPermission) => can(adminRole, permission);
  const params = await searchParams;
  const filter = (FILTERS.find((f) => f.id === params.filter)?.id ?? "all") as ClientFilter;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const selectedId = typeof params.client === "string" ? params.client : null;
  const adding = params.add === "1" && may("clients.edit");
  const done = typeof params.done === "string" ? DONE[params.done] : undefined;

  const store = await getStore();
  const plans = await getPlans(store);
  const now = new Date();
  const [rows, counts, setupRequests] = await Promise.all([
    store.listClients({ filter, query: q, now }),
    store.countClients(now),
    store.listSetupRequests(),
  ]);
  let selected: ClientRow | null = rows.find((row) => row.client.id === selectedId) ?? null;
  if (!selected && selectedId) {
    const all = await store.listClients({ filter: "all", now });
    selected = all.find((row) => row.client.id === selectedId) ?? null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 text-[28px] font-extrabold">Clients</h1>
        {may("clients.edit") ? (
          <Link href={query({ filter, q, add: "1" })} className={`${btn.primary} h-11`}>
            <Icon name="add" size={20} />
            Add client
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <nav aria-label="Filter clients" className="flex flex-wrap gap-2.5">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={query({ filter: f.id === "all" ? undefined : f.id, q })}
              aria-current={filter === f.id ? "page" : undefined}
              className={`flex h-9 items-center rounded-[18px] px-3.5 text-sm no-underline ${
                filter === f.id
                  ? "bg-midnight font-semibold text-white hover:text-white"
                  : "border border-line bg-white text-midnight hover:border-midnight hover:text-midnight"
              }`}
            >
              {f.label} <span className="ml-1.5 opacity-70">{counts[f.id]}</span>
            </Link>
          ))}
        </nav>
        <form role="search" action="/admin/clients" className="ml-auto flex w-full max-w-[320px] flex-[1_1_240px] gap-2">
          {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
          <label className="flex-1">
            <span className="sr-only">Search clients</span>
            <input name="q" type="search" defaultValue={q} placeholder="Search by name, phone or website" className="input input-sm" />
          </label>
          <button type="submit" className={`${btn.secondary} h-11 px-3`} aria-label="Search">
            <Icon name="search" size={20} />
          </button>
        </form>
      </div>

      {setupRequests.length ? (
        <section aria-labelledby="h-setup-requests" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
          <h2 id="h-setup-requests" className="m-0 text-[17px] font-bold">
            WordPress set-up requests <span className="font-normal text-muted">{setupRequests.length}</span>
          </h2>
          <p className="m-0 text-sm text-muted">
            These clients asked us to set up WordPress for their app. Message them on WhatsApp; when their site is ready, they choose
            &ldquo;My WordPress site&rdquo; on their Website step.
          </p>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {setupRequests.map(({ client, user, app }) => (
              <li key={app.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line pt-2.5 text-sm">
                <Link href={`/admin/clients/${client.id}`} className="font-semibold">
                  {user.name}
                </Link>
                <span>{client.whatsapp}</span>
                <span className="text-muted">{app.siteUrl ? hostOf(app.siteUrl) : hostOf(client.siteUrl)}</span>
                <span className="text-muted">{APP_TYPE_NAMES[app.appType]}</span>
                <span className="text-muted">Asked {formatDate(app.setupRequestedAt)}</span>
                {app.setupNote ? <span className="basis-full text-ink-4">{app.setupNote}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {done ? (
        <Notice tone="success" icon="check_circle" role="status">
          {done}
        </Notice>
      ) : null}

      <div className="flex flex-wrap items-start gap-5">
        <section aria-label="Client list" className="relative min-w-0 flex-[999_1_560px] overflow-x-auto rounded-2xl border border-line bg-white">
          {rows.length === 0 ? (
            <p className="m-0 p-6 text-[15px] text-muted">{q ? `No clients match “${q}”.` : "No clients here yet."}</p>
          ) : (
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-sand text-left text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">Client</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Website</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Apps</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Latest build</th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const state = rowState(row, now);
                  const isSelected = selected?.client.id === row.client.id;
                  const appRows = row.apps.filter((e) => e.app);
                  const planNames = [...new Set(row.apps.flatMap((e) => (e.license ? [planName(e.license.plan, plans)] : [])))];
                  const latestBuild = latestBuildOf(row);
                  return (
                    <tr key={row.client.id} className={`border-t border-line-soft ${state === "pending" || isSelected ? "bg-peach-soft" : ""}`}>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <Link href={`/admin/clients/${row.client.id}`} className="font-bold">
                            {row.user.name}
                          </Link>
                          <span className="text-xs text-muted">{row.client.whatsapp}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 break-all">{hostOf(row.client.siteUrl)}</td>
                      <td className="px-4 py-3.5">
                        {appRows.length === 0 ? (
                          <span className="text-muted">None yet</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {appRows.length > 1 ? <span className="font-semibold">{appRows.length} apps</span> : null}
                            {appRows.map((e) => (
                              <span key={e.app!.id} className="text-xs text-muted">
                                {appLabel(e.app)} · {ACCOUNT_STATE_LABEL[appState(row.client, e.license, now)]}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-3.5 ${planNames.length ? "" : "text-muted"}`}>{planNames.length ? planNames.join(", ") : planName(null, plans)}</td>
                      <td className="px-4 py-3.5">
                        <Badge tone={stateTone(state)}>{ACCOUNT_STATE_LABEL[state]}</Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        {latestBuild ? (
                          <>
                            <BuildStatusText status={latestBuild.status} /> · {latestBuild.versionName}
                          </>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={query({ filter: filter === "all" ? undefined : filter, q, client: row.client.id })}
                          aria-label={`${state === "pending" ? "Activate" : state === "expired" ? "Renew" : "Manage"} ${row.user.name}`}
                          className={`inline-flex h-[34px] items-center rounded-lg px-3.5 text-[13px] no-underline ${
                            state === "pending"
                              ? "bg-midnight font-bold text-white hover:text-white"
                              : "border border-line-strong bg-white font-semibold text-midnight hover:border-midnight hover:text-midnight"
                          }`}
                        >
                          {state === "pending" ? "Activate" : state === "expired" ? "Renew" : "Manage"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <aside aria-labelledby="h-panel" className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 rounded-2xl border border-line bg-white p-5">
          {adding ? (
            <>
              <h2 id="h-panel" className="m-0 text-[17px] font-bold">
                Add a client
              </h2>
              <AddClientForm />
            </>
          ) : selected ? (
            <ClientPanel
              row={selected}
              now={now}
              may={{ license: may("clients.license"), suspend: may("clients.suspend"), edit: may("clients.edit") }}
            />
          ) : (
            <>
              <h2 id="h-panel" className="m-0 text-[17px] font-bold">
                Activate or manage
              </h2>
              <p className="m-0 text-sm leading-relaxed text-muted">
                Choose a client in the list. Pending clients show up here after they sign up and message us on WhatsApp.
              </p>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

async function ClientPanel({ row, now, may }: { row: ClientRow; now: Date; may: { license: boolean; suspend: boolean; edit: boolean } }) {
  const { client, user } = row;
  // With one app (or none yet) the panel handles its plan; several apps are each handled on the client's page.
  const several = row.apps.filter((e) => e.app).length > 1;
  const only = several ? null : (row.apps[0] ?? null);
  const app = only?.app ?? null;
  const license = only?.license ?? null;
  const activation = only?.activation ?? null;
  const state = several ? rowState(row, now) : appState(client, license, now);
  const store = await getStore();
  const plans = await getPlans(store);
  const payments = await store.listPlanPayments({ clientId: client.id, limit: 5 });
  const steps = stepStatus(app, license?.plan ?? null);
  const stepsDone = SETUP_STEPS.filter((s) => steps[s]).length;
  const base = license && license.expiresAt > now ? license.expiresAt : now;
  const nextYear = new Date(base);
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
  const key = license ? revealLicenseKey(license, encryptionKey()) : null;
  const accountWide = rowState(row, now);
  const title = accountWide === "pending" ? "Activate" : accountWide === "expired" ? "Renew" : "Manage";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="h-panel" className="m-0 text-[17px] font-bold">
          {title} {user.name}
        </h2>
        <Badge tone={stateTone(state)}>{ACCOUNT_STATE_LABEL[state]}</Badge>
      </div>
      <Link href={`/admin/clients/${client.id}`} className="text-sm font-semibold">
        Open {user.name}&apos;s page
      </Link>
      {may.edit ? (
        <form action={manageClientAction} className="flex flex-col gap-1.5">
          <input type="hidden" name="clientId" value={client.id} />
          <SubmitButton className="h-11">
            <Icon name="key" size={20} />
            Manage their app
          </SubmitButton>
          <span className="text-xs leading-normal text-muted">
            Opens {user.name}&apos;s dashboard: app type, website, branding, store listing, publishing, products, payments, app sign-in and
            notifications.
          </span>
        </form>
      ) : null}
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted">Email</dt>
        <dd className="m-0 break-all">
          <a href={`mailto:${user.email}`}>{user.email}</a>
        </dd>
        <dt className="text-muted">WhatsApp</dt>
        <dd className="m-0">
          <a href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}`}>{client.whatsapp}</a>
        </dd>
        <dt className="text-muted">Website</dt>
        <dd className="m-0 break-all">{client.siteUrl}</dd>
        <dt className="text-muted">Signed up</dt>
        <dd className="m-0">{formatDate(client.createdAt)}</dd>
        {several ? (
          <>
            <dt className="text-muted">Apps</dt>
            <dd className="m-0">
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {row.apps
                  .filter((e) => e.app)
                  .map((e) => {
                    const appStateNow = appState(client, e.license, now);
                    return (
                      <li key={e.app!.id} className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold">{appLabel(e.app)}</span>
                        <Badge tone={stateTone(appStateNow)}>{ACCOUNT_STATE_LABEL[appStateNow]}</Badge>
                        <span className="text-muted">{e.license ? `${planName(e.license.plan, plans)} until ${formatDate(e.license.expiresAt)}` : "No plan yet"}</span>
                      </li>
                    );
                  })}
              </ul>
            </dd>
          </>
        ) : app ? (
          <>
            <dt className="text-muted">App</dt>
            <dd className="m-0">{appLabel(app)}</dd>
          </>
        ) : null}
        {license ? (
          <>
            <dt className="text-muted">Plan</dt>
            <dd className="m-0">
              {planName(license.plan, plans)} until {formatDate(license.expiresAt)}
            </dd>
            <dt className="text-muted">License</dt>
            <dd className="m-0 font-mono text-[13px] break-all">{key}</dd>
            <dt className="text-muted">Site</dt>
            <dd className="m-0 break-all">
              {activation ? `${activation.siteUrl} · plugin ${activation.pluginVersion} · checked ${formatDateTime(activation.lastCheckedAt)}` : "Not activated"}
            </dd>
          </>
        ) : null}
        {app ? (
          <>
            <dt className="text-muted">Content from</dt>
            <dd className="m-0">
              {app.connector?.kind === "shopify"
                ? `Their Shopify store (${app.connector.shopDomain})`
                : app.connector?.kind === "platform"
                  ? `Their ${platformDefinition(app.connector.platform)?.name ?? app.connector.platform} account${
                      Object.values(app.connector.settings).find(Boolean) ? ` (${Object.values(app.connector.settings).find(Boolean)})` : ""
                    }`
                : app.connector?.kind === "listings"
                  ? "Real estate: listings in the dashboard"
                : app.connector?.kind === "courses"
                  ? "No website: courses in the dashboard"
                  : app.connector?.kind === "bookings"
                  ? "No website: services and hours in the dashboard"
                  : app.connector?.kind === "catalog"
                  ? `No website: products in the dashboard${app.catalogSettings?.payment?.provider === "yallapp" ? ", sells through Yallapp" : ""}`
                  : BACKEND_NAMES[app.backend]}
            </dd>
          </>
        ) : null}
        {several ? null : (
          <>
            <dt className="text-muted">App setup</dt>
            <dd className="m-0">
              {stepsDone} of {SETUP_STEPS.length} steps
            </dd>
          </>
        )}
      </dl>

      {several ? (
        <p className="m-0 border-t border-line-soft pt-3.5 text-sm leading-relaxed text-muted">
          Each app has its own plan and license. Activate, renew or change them on{" "}
          <Link href={`/admin/clients/${client.id}`} className="font-semibold">
            {user.name}&apos;s page
          </Link>
          .
        </p>
      ) : state !== "suspended" && may.license ? (
        <div className="flex flex-col gap-3.5 border-t border-line-soft pt-3.5">
          <ActivateForm
            clientId={client.id}
            appId={app?.id ?? null}
            plan={license?.plan ?? "pro"}
            activeUntil={isoDate(nextYear)}
            pending={!license}
            planNames={planNamesOf(plans)}
          />
        </div>
      ) : null}

      {may.edit ? (
        <details className="border-t border-line-soft pt-3.5">
          <summary className="cursor-pointer text-sm font-semibold">Edit details</summary>
          <div className="pt-3">
            <ClientDetailsForm clientId={client.id} name={user.name} whatsapp={client.whatsapp} siteUrl={client.siteUrl} />
          </div>
        </details>
      ) : null}

      {payments.length ? (
        <div className="flex flex-col gap-1.5 border-t border-line-soft pt-3.5">
          <span className="text-sm font-semibold">Card payments</span>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge tone={PAYMENT_TONE[p.status]}>{PAYMENT_STATUS[p.status]}</Badge>
                <span>
                  {formatCents(p.amountCents, p.currency)} · {planName(p.plan, plans)} · {formatDateTime(p.paidAt ?? p.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {client.paymentNote ? (
        <div className="flex flex-col gap-1 border-t border-line-soft pt-3.5">
          <span className="text-sm font-semibold">Payment notes</span>
          <p className="m-0 text-[13px] leading-relaxed whitespace-pre-wrap text-ink-4">{client.paymentNote}</p>
        </div>
      ) : null}

      {accountWide !== "pending" && (may.license || may.suspend || may.edit) ? (
        <div className="flex flex-col gap-2 border-t border-line-soft pt-3.5">
          <span className="text-sm font-semibold">More actions</span>
          <div className="flex flex-wrap gap-2">
            {!may.suspend ? null : client.status === "suspended" ? (
              <form action={reinstateClientAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <SubmitButton variant="secondary" className="h-9 px-3 text-sm">Reinstate</SubmitButton>
              </form>
            ) : (
              <form action={suspendClientAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <SubmitButton variant="danger" className="h-9 px-3 text-sm">Suspend</SubmitButton>
              </form>
            )}
            {app && may.edit ? (
              <form action={setHostedApiAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <input type="hidden" name="appId" value={app.id} />
                <input type="hidden" name="hosted" value={app.backend === "hosted" ? "0" : "1"} />
                <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                  {app.backend === "hosted" ? "Stop the hosted API" : "Use the hosted API"}
                </SubmitButton>
              </form>
            ) : null}
            {activation && may.license ? (
              <form action={releaseClientSiteAction}>
                <input type="hidden" name="clientId" value={client.id} />
                {app ? <input type="hidden" name="appId" value={app.id} /> : null}
                <SubmitButton variant="secondary" className="h-9 px-3 text-sm">Release website</SubmitButton>
              </form>
            ) : null}
            {license && may.license ? (
              <form action={regenerateKeyAction}>
                <input type="hidden" name="clientId" value={client.id} />
                {app ? <input type="hidden" name="appId" value={app.id} /> : null}
                <SubmitButton variant="secondary" className="h-9 px-3 text-sm">New license key</SubmitButton>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
