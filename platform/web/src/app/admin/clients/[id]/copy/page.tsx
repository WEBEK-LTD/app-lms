import type { Metadata } from "next";
import Link from "next/link";
import { ReadOnly } from "@/components/read-only";
import { appLabel } from "@/lib/app/label";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { accountOf, AccountSearch, AppLine, clientAndApp, DialogBox } from "../app-parts";
import { CopyAppForm } from "../app-forms";

export const metadata: Metadata = { title: "Copy an app · Clients" };
export const dynamic = "force-dynamic";

/** 132.114 What a copy takes and what it never takes, as the dialog lists them. */
const COPIED = [
  "The design, the Studio project, its pages and screens",
  "Products, categories, options and add-ons",
  "Courses with their sections, lessons, quizzes and certificates' settings",
  "Services, events and their tickets' definitions, listings, articles",
  "Food menus and restaurants' menus, delivery zones and slots, card messages",
  "Coupons' definitions (counts start at zero)",
  "Media, fonts, languages and settings",
];
const NOT_COPIED = [
  "Secrets: payment gateway keys, signing keys, push credentials, API tokens",
  "Customers and users, members, students and their progress",
  "Orders, bookings, payments and messages",
  "Builds and store listings",
  "The plan or license: the copy starts the way a new app starts",
];

/**
 * 132.114 Copying a client's app: into this account (the default) or
 * another one found by email or name, with its name; what's copied and
 * what isn't, before confirming.
 */
export default async function CopyAppPage({ params, searchParams }: PageProps<"/admin/clients/[id]/copy">) {
  const { adminRole } = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const { client, user, app } = await clientAndApp(id, query.app);
  const target = (await accountOf(query.to)) ?? { client, user };
  const other = target.client.id !== client.id;
  const q = typeof query.q === "string" ? query.q : "";
  return (
    <ReadOnly when={!can(adminRole, "apps.copy")} what="copy clients' apps">
      <DialogBox id="h-copy" title={`Copy ${appLabel(app)}`} back={{ href: `/admin/clients/${client.id}`, label: user.name }}>
        <AppLine app={app} owner={user} />
        <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-sand p-4">
          <span className="text-xs font-bold tracking-[0.08em] text-muted uppercase">Into</span>
          <span className="font-bold">
            {target.user.name} ({target.user.email}){other ? "" : " · the same account"}
          </span>
          {other ? (
            <Link href={`/admin/clients/${client.id}/copy?app=${app.id}`} className="self-start text-sm font-semibold">
              Copy into the same account instead
            </Link>
          ) : null}
        </div>
        {other ? null : <AccountSearch q={q} exclude={client.id} label="Or into another account" href={(to) => `/admin/clients/${client.id}/copy?app=${app.id}&to=${to}`} hidden={{ app: app.id }} />}
        <div className="grid gap-3 sm:grid-cols-2" data-copy-summary="">
          <div className="flex flex-col gap-1.5 rounded-xl bg-sand p-3.5">
            <span className="text-sm font-bold">Copied</span>
            <ul className="m-0 flex flex-col gap-1 ps-5 text-sm">
              {COPIED.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-1.5 rounded-xl bg-sand p-3.5">
            <span className="text-sm font-bold">Never copied</span>
            <ul className="m-0 flex flex-col gap-1 ps-5 text-sm">
              {NOT_COPIED.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
        <CopyAppForm clientId={client.id} appId={app.id} toClientId={target.client.id} defaultName={`${appLabel(app)} (copy)`.slice(0, 60)} />
      </DialogBox>
    </ReadOnly>
  );
}
