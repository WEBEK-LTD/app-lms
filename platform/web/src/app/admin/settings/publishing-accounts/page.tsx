import type { Metadata } from "next";
import { ReadOnly } from "@/components/read-only";
import { Badge } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { accountCounts, DEFAULT_ACCOUNT_LIMIT, pickAccount, readAccounts } from "@/lib/publishing/accounts";
import { publishingTeamEmail } from "@/lib/publishing/service";
import { Section } from "../parts";
import { AccountForm, AddAccountForm } from "./forms";

export const metadata: Metadata = { title: "Publishing accounts · Settings" };
export const dynamic = "force-dynamic";

/**
 * 138 Settings › Publishing accounts: the Google and Apple sign-ins clients
 * invite as admin to Play Console and App Store Connect. Each app gets one
 * the first time it's needed (the active account with the fewest apps under
 * its limit) and keeps it; Admin › Publishing moves an app. Full: new apps
 * show the publishing team email, and the team gets one alert.
 */
export default async function PublishingAccountsPage() {
  const { adminRole } = await requireAdmin();
  const store = await getStore();
  const [accounts, apps, teamEmail] = await Promise.all([readAccounts(store, true), store.listApps(), publishingTeamEmail(store)]);
  const counts = accountCounts(apps);
  const next = pickAccount(accounts, counts);
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change the publishing accounts">
      <Section
        id="h-publishing-accounts"
        title="Publishing accounts"
        text="Each app's owner sees one of these emails on their Publishing page and invites it as admin to Google Play Console and App Store Connect. A new app goes to the active account with the fewest apps, under its limit, and stays on it; move an app on the Publishing page. Every notice about an app's publishing goes to its account and to the publishing team email."
      >
        <p className="m-0 text-sm text-muted" data-next-account="">
          {accounts.length === 0
            ? `No accounts yet: every app shows the publishing team email, ${teamEmail}.`
            : next
              ? `The next new app goes to ${next.email}.`
              : `Every account is full: new apps show the publishing team email, ${teamEmail}, until one has room.`}
        </p>
        {accounts.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {accounts.map((a) => {
              const used = counts.get(a.id) ?? 0;
              return (
                <li key={a.id} className="flex flex-col gap-3 rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span dir="ltr" className="font-bold break-all">
                      {a.email}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={used >= a.limit ? "warn" : "neutral"}>
                        {used} of {a.limit} apps
                      </Badge>
                      {a.active ? null : <Badge tone="neutral">Takes no new apps</Badge>}
                    </span>
                  </div>
                  <AccountForm account={{ id: a.id, email: a.email, limit: a.limit, active: a.active, apps: used }} />
                </li>
              );
            })}
          </ul>
        ) : null}
        <AddAccountForm defaultLimit={DEFAULT_ACCOUNT_LIMIT} />
      </Section>
    </ReadOnly>
  );
}
