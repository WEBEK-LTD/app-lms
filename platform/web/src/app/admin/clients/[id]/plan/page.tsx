import type { Metadata } from "next";
import Link from "next/link";
import { ReadOnly } from "@/components/read-only";
import { formatDate, Notice } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { moveWaiting, MOVE_MAX_ATTEMPTS, MOVE_REFUSALS, planMoveRefusal } from "@/lib/apps/move";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { getPlans } from "@/lib/settings/platform";
import { accountOf, AccountSearch, AppLine, clientAndApp, DialogBox } from "../app-parts";
import { MoveCodeForm, PlanMoveForm } from "../app-forms";

export const metadata: Metadata = { title: "Move a plan · Clients" };
export const dynamic = "force-dynamic";

const CLOSED: Record<string, string> = {
  cancelled: "The request was cancelled: the code no longer works.",
  expired: "The code expired after 15 minutes. Send a new one.",
  attempts: `The request was closed after ${MOVE_MAX_ATTEMPTS} wrong codes. Send a new one.`,
  closed: "This request isn't waiting any more (approved, declined, cancelled or expired).",
};

/**
 * 132.115 Moving only an app's plan to another app, of this account or
 * another one: the plan, its end and its renewal, the app it goes to, then
 * the owner's code. The app it leaves goes back to no plan; invoices stay.
 */
export default async function MovePlanPage({ params, searchParams }: PageProps<"/admin/clients/[id]/plan">) {
  const { adminRole } = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const { client, user, app } = await clientAndApp(id, query.app);
  const store = await getStore();
  const license = await store.getLicenseForApp(client.id, app.id);
  const plans = (await getPlans(store)) as Record<string, { name: string } | undefined>;
  const name = (p: string) => plans[p]?.name ?? p;
  const account = (await accountOf(query.to)) ?? { client, user };
  const apps = (await store.listAppsByClient(account.client.id)).filter((a) => a.id !== app.id && !a.movedAt);
  const licensed = new Set((await store.listLicensesByClient(account.client.id)).map((l) => l.appId));
  const toApp = typeof query.toApp === "string" ? (apps.find((a) => a.id === query.toApp) ?? null) : null;
  const refusal = toApp ? await planMoveRefusal(store, app, toApp) : null;
  const open = await store.getOpenAppMoveRequest(app.id);
  const waiting = open && open.kind === "plan" && moveWaiting(open, new Date()) ? open : null;
  const waitingTo = waiting?.toAppId ? await store.getAppById(waiting.toAppId) : null;
  const q = typeof query.q === "string" ? query.q : "";
  const closed = typeof query.closed === "string" ? CLOSED[query.closed] : undefined;
  const here = (extra: string) => `/admin/clients/${client.id}/plan?app=${app.id}${account.client.id !== client.id ? `&to=${account.client.id}` : ""}${extra}`;
  return (
    <ReadOnly when={!can(adminRole, "apps.transfer")} what="move clients' plans">
      <DialogBox id="h-plan" title={`Move the plan of ${appLabel(app)} to another app`} back={{ href: `/admin/clients/${client.id}`, label: user.name }}>
        <AppLine app={app} owner={user} />
        {closed ? (
          <Notice tone="warn" icon="warning" role="status">
            {closed}
          </Notice>
        ) : null}
        {license ? (
          <div className="flex flex-col gap-1 rounded-2xl border border-line bg-sand p-4 text-[15px]" data-plan-summary="">
            <span className="text-xs font-bold tracking-[0.08em] text-muted uppercase">The plan</span>
            <span className="font-bold">
              {name(license.plan)}, active until {formatDate(license.expiresAt)}
            </span>
            <span className="text-sm text-muted">
              {license.nextPlan && license.nextPlanAt ? `Renewal: moves to ${name(license.nextPlan)} on ${formatDate(license.nextPlanAt)}.` : "Renewal: as now, by card or by the team; nothing renews by itself."}{" "}
              {appLabel(app)} goes back to having no plan, like a new app; the app it goes to gets the same end date and renewal, with the storage packs bought with it. Past invoices stay where they are. A website that had activated the license is released, and the license key is replaced.
            </span>
          </div>
        ) : (
          <Notice tone="warn" icon="info" role="status">
            {MOVE_REFUSALS.no_plan}
          </Notice>
        )}
        {!license ? null : waiting && waitingTo ? (
          <>
            <Notice tone="info" icon="mail" role="status">
              {query.sent === "1" ? "Sent. " : ""}Waiting for {user.name}&apos;s approval to move the plan to {appLabel(waitingTo)}. The code went to {user.email}; {MOVE_MAX_ATTEMPTS - waiting.attempts} tries left.
            </Notice>
            <MoveCodeForm requestId={waiting.id} label="Move the plan now" />
          </>
        ) : toApp ? (
          <>
            <div className="flex flex-col gap-1.5 rounded-2xl border border-line p-4">
              <span className="text-xs font-bold tracking-[0.08em] text-muted uppercase">To</span>
              <AppLine app={toApp} owner={account.user} />
            </div>
            {refusal ? (
              <Notice tone="danger" icon="block" role="alert">
                {MOVE_REFUSALS[refusal]}
              </Notice>
            ) : (
              <PlanMoveForm clientId={client.id} appId={app.id} toAppId={toApp.id} />
            )}
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">
                The app it goes to, in {account.client.id === client.id ? "this account" : `${account.user.name}'s account`}
              </span>
              {apps.length ? (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {apps.map((a) => (
                    <li key={a.id}>
                      <Link href={here(`&toApp=${a.id}`)} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 no-underline hover:border-midnight">
                        <AppLine app={a} />
                        <span className="text-sm font-semibold whitespace-nowrap">{licensed.has(a.id) ? "Has a plan" : "Choose"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-sm text-muted">This account has no other app.</p>
              )}
            </div>
            <AccountSearch q={q} exclude={null} label="Or an app of another account" href={(to) => `/admin/clients/${client.id}/plan?app=${app.id}&to=${to}`} hidden={{ app: app.id }} />
          </>
        )}
      </DialogBox>
    </ReadOnly>
  );
}
