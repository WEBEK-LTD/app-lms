import type { Metadata } from "next";
import Link from "next/link";
import { deleteLiveEntryAction, hideLiveEntryAction } from "@/app/actions/admin-live";
import { ReadOnly } from "@/components/read-only";
import { Badge, btn, formatDate } from "@/components/ui";
import { countryName, countryOptions } from "@/lib/account/country";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { collectLiveEvents, liveItems } from "@/lib/live-activity/feed";
import { maskedName } from "@/lib/live-activity/names";
import { liveSetting } from "@/lib/live-activity/settings";
import { LIVE_FEED_DAYS, LIVE_SHOW_SECONDS } from "@/lib/live-activity/types";
import { PLANS } from "@/lib/plans";
import { getPlans } from "@/lib/settings/platform";
import { Card } from "../bot/shared";
import { LiveEntryForm, LiveSettingForm } from "./forms";

export const metadata: Metadata = { title: "Live activity" };
export const dynamic = "force-dynamic";

/**
 * Admin › Live activity: the small card in the bottom corner of the
 * website's marketing pages. Its settings, the customers the team adds by
 * hand (with their agreement), and what the card shows now. Every card is
 * something that happened: nothing here can be made up.
 */
export default async function LiveActivityPage() {
  const { adminRole } = await requireAdmin();
  const edit = can(adminRole, "marketing.edit");
  const store = await getStore();
  const now = new Date();
  const [setting, entries, plans, payments] = await Promise.all([
    liveSetting(store, { fresh: true }),
    store.listLiveActivityEntries(),
    getPlans(store),
    store.listPaidPlanPaymentsSince(new Date(now.getTime() - LIVE_FEED_DAYS * 86_400_000)),
  ]);
  const preview = liveItems(await collectLiveEvents(store, setting, now), "en");
  const allowed = new Set(payments.filter((p) => p.showOnSite === true).map((p) => p.clientId)).size;
  const planOptions = PLANS.filter((p) => plans[p]).map((p) => ({ value: p, label: plans[p].name }));
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Live activity</h1>
        <span className="max-w-[860px] text-[15px] text-muted">
          A small card in the bottom corner of the website&apos;s marketing pages (bottom left in English and Turkish, bottom right in Arabic) shows what really
          happened lately, one card at a time for {LIVE_SHOW_SECONDS} seconds: plans paid by clients who ticked &ldquo;Show my first name and plan on
          Yallapp&apos;s website&rdquo;, the customers you add below, demos being tried (a city or country, never a name), apps going live on a store (the kind
          and the store only) and new accounts (the country only). With none of these, it states a count from the code. Never add anyone who didn&apos;t agree,
          and nothing that didn&apos;t happen.
        </span>
      </div>

      <ReadOnly when={!edit} what="change the live activity card">
        <Card id="h-live-settings" title="Settings">
          <LiveSettingForm setting={setting} />
        </Card>

        <Card id="h-live-add" title="Add a customer">
          <p className="m-0 text-sm text-ink-4">
            A real customer who signed up offline, after a meeting for example, and pays later. They show like any subscription: their first name and the
            initial of their last name, the plan, the city or country if you give one, and how long ago. Entries older than {LIVE_FEED_DAYS} days stop
            showing.
          </p>
          <LiveEntryForm plans={planOptions} countries={countryOptions("en").map((c) => ({ value: c.code, label: c.name }))} today={now.toISOString().slice(0, 10)} />
        </Card>

        <Card id="h-live-entries" title={`Customers added by hand (${entries.length})`}>
          {entries.length === 0 ? (
            <p className="m-0 text-[15px] text-muted">None yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="bg-sand text-left text-muted">
                    <th scope="col" className="px-3 py-2.5 font-semibold">Shown as</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Plan</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Place</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Agreed</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Client</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const name = maskedName(entry.firstName, entry.lastInitial) ?? entry.firstName;
                    const old = entry.agreedAt.getTime() < now.getTime() - LIVE_FEED_DAYS * 86_400_000;
                    return (
                      <tr key={entry.id} className="border-t border-line-soft" data-live-entry={entry.id}>
                        <th scope="row" className="px-3 py-2.5 text-left font-semibold">
                          <span className="flex flex-wrap items-center gap-2">
                            <bdi>{name}</bdi>
                            <Badge tone="info">Manual</Badge>
                          </span>
                        </th>
                        <td className="px-3 py-2.5">{plans[entry.plan]?.name ?? entry.plan}</td>
                        <td className="px-3 py-2.5">{[entry.city, entry.country ? countryName(entry.country, "en") : null].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-3 py-2.5">
                          {formatDate(entry.agreedAt)}
                          <span className="block text-xs text-muted">by {entry.createdBy}</span>
                        </td>
                        <td className="px-3 py-2.5">{entry.clientId ? <Link href={`/admin/clients/${entry.clientId}`}>Open</Link> : "—"}</td>
                        <td className="px-3 py-2.5">
                          {entry.hidden ? <Badge tone="neutral">Hidden</Badge> : old ? <Badge tone="neutral">Older than {LIVE_FEED_DAYS} days</Badge> : <Badge tone="success">Shown</Badge>}
                        </td>
                        <td className="px-3 py-2.5">
                          {edit ? (
                            <span className="flex flex-wrap justify-end gap-2">
                              <form action={hideLiveEntryAction}>
                                <input type="hidden" name="id" value={entry.id} />
                                <input type="hidden" name="hidden" value={entry.hidden ? "false" : "true"} />
                                <button type="submit" className={`${btn.secondary} h-8 px-3 text-[13px]`}>
                                  {entry.hidden ? "Show" : "Hide"}
                                  <span className="sr-only"> {name}</span>
                                </button>
                              </form>
                              <form action={deleteLiveEntryAction}>
                                <input type="hidden" name="id" value={entry.id} />
                                <button type="submit" className={`${btn.secondary} h-8 px-3 text-[13px] text-danger hover:text-danger`}>
                                  Delete<span className="sr-only"> {name}</span>
                                </button>
                              </form>
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </ReadOnly>

      <Card id="h-live-preview" title="What the card shows now (in English)">
        <p className="m-0 text-sm text-ink-4">
          {setting.on ? "On." : "Off: visitors see nothing."} {allowed} {allowed === 1 ? "client" : "clients"} who paid in the last {LIVE_FEED_DAYS} days allowed their
          first name and plan on the website. The website reads this at most once a minute.
        </p>
        {preview.length ? (
          <ol className="m-0 flex list-decimal flex-col gap-1.5 ps-5 text-[15px]" aria-label="Cards now">
            {preview.map((item) => (
              <li key={item.key}>
                {item.text.map((part, i) => (
                  <span key={i} className={part.em ? "font-semibold text-accent" : undefined}>
                    {part.text}
                  </span>
                ))}
                {item.detail || item.at ? (
                  <span className="text-muted"> · {[item.detail, item.at ? formatDate(new Date(item.at)) : null].filter(Boolean).join(" · ")}</span>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 text-[15px] text-muted">No cards: the card stays hidden.</p>
        )}
      </Card>
    </>
  );
}
