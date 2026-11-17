import { cancelAddonAction, grantAddonAction } from "@/app/actions/admin-addons";
import { SubmitButton } from "@/components/form";
import { Badge, formatDate } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import type { DataStore } from "@/lib/data/store";
import type { App } from "@/lib/data/types";
import { isLifetimeEnd } from "@/lib/billing/periods";
import { addonsOf, billingLabel } from "@/lib/addons/catalog";
import { addonRetired, addonRunning } from "@/lib/addons/rules";
import { ADDON_BILLINGS } from "@/lib/addons/types";
import { platformSetting } from "@/lib/settings/platform";

/**
 * 133 Admin › Clients › a client: the add-ons of each of their apps (bought
 * or given, until when, a service's task), and giving one by hand with no
 * charge (audited), or ending one.
 */
export async function ClientAddons({ store, clientId, apps, canGrant, notice }: { store: DataStore; clientId: string; apps: App[]; canGrant: boolean; notice: string | null }) {
  const [owned, setting] = await Promise.all([store.listAppAddons({ clientId }), platformSetting(store, "addons")]);
  // 138 Not what every plan includes now (publishing).
  const defs = addonsOf(setting?.value).filter((d) => !addonRetired(d));
  const now = new Date();
  const appName = (id: string) => {
    const app = apps.find((a) => a.id === id);
    return app ? appLabel(app) : "Deleted app";
  };
  return (
    <section id="addons" aria-labelledby="h-client-addons" className="flex min-w-0 scroll-mt-6 flex-col gap-3.5 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="h-client-addons" className="m-0 text-lg font-bold">
        Add-ons
      </h2>
      {notice === "given" ? <p role="status" className="m-0 text-sm font-semibold text-success">Add-on given, with no charge. It&apos;s in the audit log.</p> : null}
      {notice === "ended" ? <p role="status" className="m-0 text-sm font-semibold text-success">Add-on ended.</p> : null}
      {notice === "invalid" ? <p role="alert" className="m-0 text-sm font-semibold text-danger">Choose an app, an add-on and how long.</p> : null}
      {owned.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13px]">
          {owned.map((o) => {
            const running = addonRunning(o, now);
            return (
              <li key={o.id} data-client-addon={o.addonId} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge tone={running ? "success" : "neutral"}>{running ? "On" : o.status === "cancelled" ? "Ended by the team" : "Ended"}</Badge>
                <span>
                  {o.name} · {billingLabel(o.billing)} · {o.activeUntil === null ? "no end" : isLifetimeEnd(o.activeUntil) ? "for life" : `until ${formatDate(o.activeUntil)}`}
                  {apps.length > 1 ? ` · ${appName(o.appId)}` : ""}
                  {o.grantedBy ? ` · given by ${o.grantedBy}` : o.paymentId ? " · paid" : ""}
                  {o.taskStatus ? ` · task: ${o.taskStatus === "in_progress" ? "in progress" : o.taskStatus}` : ""}
                </span>
                {canGrant && running ? (
                  <form action={cancelAddonAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <SubmitButton variant="secondary" className="h-7 px-2 text-[12px]" pendingText="Ending…">
                      End now
                    </SubmitButton>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 text-sm text-muted">No add-ons.</p>
      )}
      {canGrant && apps.length && defs.length ? (
        <form action={grantAddonAction} className="flex flex-wrap items-end gap-3 border-t border-line-soft pt-3" aria-label="Give an add-on">
          <input type="hidden" name="clientId" value={clientId} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="grant-app" className="text-sm font-semibold">
              App
            </label>
            <select id="grant-app" name="appId" className="input input-sm">
              {apps.map((a) => (
                <option key={a.id} value={a.id}>
                  {appLabel(a)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="grant-addon" className="text-sm font-semibold">
              Add-on
            </label>
            <select id="grant-addon" name="addon" className="input input-sm">
              {defs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.en.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="grant-billing" className="text-sm font-semibold">
              For
            </label>
            <select id="grant-billing" name="billing" defaultValue="12" className="input input-sm">
              {ADDON_BILLINGS.map((b) => (
                <option key={b} value={b}>
                  {billingLabel(b)}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton variant="secondary" className="h-10 px-4 text-sm" pendingText="Giving…">
            Give with no charge
          </SubmitButton>
        </form>
      ) : null}
    </section>
  );
}
