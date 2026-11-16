import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { appLabel } from "@/lib/app/label";
import { appTypeName } from "@/lib/app/kinds";
import { getStore } from "@/lib/data";
import type { ClientRow } from "@/lib/data/store";
import type { App, Client, User } from "@/lib/data/types";

/**
 * 132.112–132.115 The parts the move, copy and plan pages share: the
 * client and app they're for, the box they look like a dialog in, the app
 * row, and the search for the other account.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The client and their app named in the address, or 404. */
export async function clientAndApp(id: string, appId: unknown): Promise<{ client: Client; user: User; app: App }> {
  if (!UUID.test(id) || typeof appId !== "string" || !UUID.test(appId)) notFound();
  const store = await getStore();
  const [client, app] = await Promise.all([store.getClientById(id), store.getAppById(appId)]);
  const user = client ? await store.getUserById(client.userId) : null;
  if (!client || !user || !app || app.clientId !== client.id) notFound();
  return { client, user, app };
}

/** An account by its ID, with its owner. */
export async function accountOf(id: unknown): Promise<{ client: Client; user: User } | null> {
  if (typeof id !== "string" || !UUID.test(id)) return null;
  const store = await getStore();
  const client = await store.getClientById(id);
  const user = client ? await store.getUserById(client.userId) : null;
  return client && user ? { client, user } : null;
}

export function DialogBox({ id, title, back, children }: { id: string; title: string; back: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <Link href={back.href} className="flex items-center gap-1 self-start text-sm font-semibold no-underline">
        <Icon name="arrow_back" size={18} />
        {back.label}
      </Link>
      <section role="dialog" aria-labelledby={id} aria-modal="false" className="mx-auto flex w-full max-w-[760px] flex-col gap-5 rounded-[22px] border border-line bg-white p-5 shadow-[0_24px_60px_-30px_rgba(14,13,36,0.35)] sm:p-7">
        <h1 id={id} className="m-0 text-[24px] font-extrabold">
          {title}
        </h1>
        {children}
      </section>
    </div>
  );
}

export function AppLine({ app, owner }: { app: App; owner?: User }) {
  return (
    <div className="flex items-center gap-3">
      {app.iconAssetId ? (
        // eslint-disable-next-line @next/next/no-img-element -- the app's own icon, from its asset.
        <img src={`/api/v1/assets/${app.iconAssetId}`} alt="" width={48} height={48} className="h-12 w-12 rounded-xl border border-line object-cover" />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-extrabold text-white" style={{ background: /^#[0-9a-f]{6}$/i.test(app.primaryColor) ? app.primaryColor : "#0E0D24" }} aria-hidden="true">
          {Array.from(appLabel(app))[0]?.toUpperCase()}
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="font-bold">{appLabel(app)}</span>
        <span className="text-sm text-muted">
          {appTypeName(app)}
          {app.section === "studio" ? " · Yallapp Studio" : ""}
          {owner ? ` · ${owner.name} (${owner.email})` : ""}
        </span>
      </span>
    </div>
  );
}

/** The search for the account it goes to: by email or name, each result a link that chooses it. */
export async function AccountSearch({ q, exclude, href, label, hidden }: { q: string; exclude: string | null; href: (clientId: string) => string; label: string; hidden: Record<string, string> }) {
  const rows: ClientRow[] = q.trim().length >= 2 ? (await (await getStore()).listClients({ filter: "all", query: q.trim().slice(0, 100), now: new Date() })).filter((r) => r.client.id !== exclude).slice(0, 10) : [];
  return (
    <div className="flex flex-col gap-3">
      <form method="get" className="flex flex-wrap items-end gap-2" role="search">
        {/* The page's own address keeps the app it's for. */}
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
          <label htmlFor="f-account-q" className="text-sm font-semibold">
            {label}
          </label>
          <input id="f-account-q" name="q" type="search" defaultValue={q} placeholder="Email or name" className="input input-sm" dir="auto" />
        </div>
        <button type="submit" className="h-10 cursor-pointer rounded-[10px] border border-line-strong bg-white px-4 text-sm font-semibold">
          Search
        </button>
      </form>
      {q.trim().length >= 2 ? (
        rows.length ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Accounts found">
            {rows.map((r) => (
              <li key={r.client.id}>
                <Link href={href(r.client.id)} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 no-underline hover:border-midnight">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold text-midnight">{r.user.name}</span>
                    <span className="text-sm break-all text-muted">{r.user.email}</span>
                  </span>
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {r.apps.filter((a) => a.app).length} apps · Choose
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-muted">No account matches “{q}”.</p>
        )
      ) : null}
    </div>
  );
}
