import type { Metadata } from "next";
import { Notice } from "@/components/ui";
import { ReadOnly } from "@/components/read-only";
import { appLabel } from "@/lib/app/label";
import { moveWaiting, MOVE_MAX_ATTEMPTS } from "@/lib/apps/move";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { accountOf, AccountSearch, AppLine, clientAndApp, DialogBox } from "../app-parts";
import { MoveCodeForm, MoveRequestForm } from "../app-forms";

export const metadata: Metadata = { title: "Move an app · Clients" };
export const dynamic = "force-dynamic";

const CLOSED: Record<string, string> = {
  cancelled: "The request was cancelled: the code no longer works.",
  expired: "The code expired after 15 minutes. Send a new one.",
  attempts: `The request was closed after ${MOVE_MAX_ATTEMPTS} wrong codes. Send a new one.`,
  closed: "This request isn't waiting any more (approved, declined, cancelled or expired).",
};

/**
 * 132.112 Moving a client's app to another account: the account it goes to
 * (searched by email or name), the two choices and what moves and what
 * stays, then the owner's code. Nothing moves before the owner approves.
 */
export default async function MoveAppPage({ params, searchParams }: PageProps<"/admin/clients/[id]/move">) {
  const { adminRole } = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const { client, user, app } = await clientAndApp(id, query.app);
  const store = await getStore();
  const target = await accountOf(query.to);
  const open = await store.getOpenAppMoveRequest(app.id);
  const waiting = open && open.kind === "app" && moveWaiting(open, new Date()) ? open : null;
  const waitingTo = waiting ? await accountOf(waiting.toClientId) : null;
  const q = typeof query.q === "string" ? query.q : "";
  const closed = typeof query.closed === "string" ? CLOSED[query.closed] : undefined;
  const back = { href: `/admin/clients/${client.id}`, label: user.name };
  return (
    <ReadOnly when={!can(adminRole, "apps.transfer")} what="move clients' apps">
      <DialogBox id="h-move" title={`Move ${appLabel(app)} to another account`} back={back}>
        <AppLine app={app} owner={user} />
        {closed ? (
          <Notice tone="warn" icon="warning" role="status">
            {closed}
          </Notice>
        ) : null}
        {app.movedAt ? (
          <Notice tone="warn" icon="lock" role="status">
            This app has moved to another account already. What stayed here is kept to read.
          </Notice>
        ) : waiting && waitingTo ? (
          <>
            <Notice tone="info" icon="mail" role="status">
              {query.sent === "1" ? "Sent. " : ""}
              Waiting for {user.name}&apos;s approval to move it to {waitingTo.user.name}&apos;s account ({waiting.moveData ? "data moves" : "data stays"}, {waiting.moveSubscription ? "subscription moves" : "subscription stays"}). The code went to {user.email}; it works until{" "}
              {waiting.expiresAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })} (Istanbul time), {MOVE_MAX_ATTEMPTS - waiting.attempts} tries left.
            </Notice>
            <p className="m-0 text-sm">The owner can approve on their own page from the email, or give you the code to type here.</p>
            <MoveCodeForm requestId={waiting.id} label="Move it now" />
          </>
        ) : target && target.client.id !== client.id ? (
          <>
            <div className="grid gap-3 rounded-2xl border border-line bg-sand p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <div className="flex min-w-0 flex-col">
                <span className="text-xs font-bold tracking-[0.08em] text-muted uppercase">From</span>
                <span className="font-bold">{user.name}</span>
                <span className="text-sm break-all text-muted">{user.email}</span>
              </div>
              <span className="hidden text-2xl font-bold text-accent sm:block" aria-hidden="true">
                →
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="text-xs font-bold tracking-[0.08em] text-muted uppercase">To</span>
                <span className="font-bold">{target.user.name}</span>
                <span className="text-sm break-all text-muted">{target.user.email}</span>
              </div>
            </div>
            <MoveRequestForm clientId={client.id} appId={app.id} toClientId={target.client.id} toName={target.user.name} ownerEmail={user.email} />
          </>
        ) : (
          <AccountSearch q={q} exclude={client.id} label="The account it goes to" href={(to) => `/admin/clients/${client.id}/move?app=${app.id}&to=${to}`} hidden={{ app: app.id }} />
        )}
      </DialogBox>
    </ReadOnly>
  );
}
