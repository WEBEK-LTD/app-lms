import type { Metadata } from "next";
import { setLicenceEndAction } from "@/app/actions/admin-market";
import { MarketHeader } from "@/components/studio-market/header";
import { formatDateTime } from "@/components/ui";
import { adminCan, requireAdmin } from "@/lib/auth/session";
import { formatAmount } from "@/lib/billing/prices";
import { getStore } from "@/lib/data";
import type { TemplateLicence } from "@/lib/data/types";
import { formatUsd } from "@/lib/studio-market/plans";
import { templateText } from "@/lib/studio-market/templates";

export const metadata: Metadata = { title: "Studio Market sales" };
export const dynamic = "force-dynamic";

const PLAN: Record<string, string> = { "1m": "1 month", "3m": "3 months", "6m": "6 months", "1y": "1 year", "2y": "2 years", life: "Lifetime" };

/**
 * 106.2 Admin › Studio Market › Sales: every payment for a template (a
 * purchase or a renewal), with the sale's split (the designer's 75%,
 * Yallapp's 25%) and what the gateway charged; the buyer's licence and its
 * end, which the team can move (`clients.license`). Stage 3's payouts read
 * the same sales. 106.12 A sale bought with a discount is the price paid,
 * with the discount (a code, a flash sale or a price drop) under it.
 */
export default async function MarketSalesPage({ searchParams }: PageProps<"/admin/market/sales">) {
  await requireAdmin("view");
  const mayEnd = await adminCan("clients.license");
  const store = await getStore();
  const params = await searchParams;
  const orders = (await store.listTemplateOrders({})).slice(0, 200);
  const paid = orders.filter((o) => o.status === "paid");
  const templates = new Map((await store.listMarketTemplates({ ids: [...new Set(orders.map((o) => o.templateId))] })).map((t) => [t.id, t]));
  const designers = new Map((await store.listTemplateDesigners([...new Set(orders.map((o) => o.designerId))])).map((d) => [d.id, d]));
  const buyers = new Map(
    await Promise.all(
      [...new Set(orders.map((o) => o.clientId))].map(async (id) => {
        const client = await store.getClientById(id);
        const user = client ? await store.getUserById(client.userId) : null;
        return [id, user ? `${user.name} · ${user.email}` : null] as const;
      }),
    ),
  );
  const licences = new Map<string, TemplateLicence | null>();
  for (const id of new Set(orders.map((o) => o.licenceId).filter((x): x is string => Boolean(x)))) licences.set(id, await store.getTemplateLicence(id));
  const sum = (pick: (o: (typeof paid)[number]) => number) => paid.reduce((n, o) => n + pick(o), 0);
  const notice = params.done === "end" ? "The end date was changed." : params.error === "date" ? "Enter the date and time the plan ends, in UTC." : params.error === "licence" ? "That licence has no end to change." : null;

  return (
    <div className="mk mk-page flex flex-col gap-6">
      <MarketHeader
        eyebrow="Studio Market"
        title="Sales"
        lead="Payments for templates, through Yallapp's own account. Each sale is split: 75% the designer's, 25% Yallapp's (taxes and the gateway's and transfers' fees included). Payouts come with stage 3."
      />
      {notice ? (
        <p role={params.error ? "alert" : "status"} className={`m-0 rounded-xl px-4 py-3 text-[15px] font-semibold ${params.error ? "bg-danger-bg text-danger" : "bg-success-bg text-success"}`}>
          {notice}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        {(
          [
            ["Paid sales", String(paid.length)],
            ["Sales", formatUsd(sum((o) => o.grossCents))],
            ["Designers' 75%", formatUsd(sum((o) => o.designerCents))],
            ["Yallapp's 25%", formatUsd(sum((o) => o.yallappCents))],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="mk-panel flex flex-col gap-1.5 px-[18px] py-4">
            <span className="text-[13px] font-semibold text-muted">{label}</span>
            <span className="mk-kpi text-[28px]">{value}</span>
          </div>
        ))}
      </div>
      {orders.length ? (
        <section aria-label="Sales" className="mk-panel overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["When", "Template", "Buyer", "Plan", "Sale", "Designer 75%", "Yallapp 25%", "Charged", "Status", "Licence"].map((h) => (
                  <th key={h} className="border-b border-[var(--mk-hair2)] bg-[var(--mk-mat)] px-3.5 py-3 text-start text-[13px] font-semibold whitespace-nowrap text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const template = templates.get(o.templateId);
                const licence = o.licenceId ? licences.get(o.licenceId) : null;
                return (
                  <tr key={o.id} data-order={o.id} className="border-t border-[var(--mk-hair2)] align-top">
                    <td className="px-3.5 py-3 whitespace-nowrap">{formatDateTime(o.paidAt ?? o.createdAt)}</td>
                    <td className="px-3.5 py-3">
                      <b dir="auto">{template ? templateText(template, "en").title : "—"}</b>
                      <span className="block text-xs text-muted">{designers.get(o.designerId)?.name ?? ""}</span>
                    </td>
                    <td className="px-3.5 py-3">{buyers.get(o.clientId) ?? "—"}</td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {PLAN[o.plan] ?? o.plan}
                      <span className="block text-xs text-muted">{o.kind === "renew" ? "Renewal" : "Purchase"}</span>
                    </td>
                    <td className="px-3.5 py-3 font-semibold">
                      {formatUsd(o.grossCents)}
                      {/* 106.12 The discount it was bought with: the sale (and its split) is the price paid. */}
                      {o.discount ? (
                        <span data-discount className="block text-xs font-normal whitespace-nowrap text-muted">
                          {o.discount.kind === "coupon" ? `Code ${o.discount.code}` : o.discount.kind === "flash" ? "Flash sale" : "Price drop"} · {formatUsd(o.discount.listCents)} − {formatUsd(o.discount.offCents)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3.5 py-3">{formatUsd(o.designerCents)}</td>
                    <td className="px-3.5 py-3">{formatUsd(o.yallappCents)}</td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {formatAmount(o.amountCents, o.currency)}
                      <span className="block text-xs text-muted">{o.egpPerUsd ? `At ${o.egpPerUsd} EGP/USD` : o.paymentProvider}</span>
                    </td>
                    <td className="px-3.5 py-3 capitalize">{o.status}</td>
                    <td className="px-3.5 py-3">
                      {licence ? (
                        <span className="flex flex-col gap-1.5">
                          <span className="text-xs text-muted">{licence.status === "ended" ? "Ended" : licence.endsAt ? `Ends ${formatDateTime(licence.endsAt)}` : "Never ends"}</span>
                          {mayEnd && licence.status === "active" && licence.endsAt ? (
                            <form action={setLicenceEndAction} className="flex items-center gap-1.5">
                              <input type="hidden" name="licence" value={licence.id} />
                              <label className="sr-only" htmlFor={`ends-${o.id}`}>
                                End (UTC)
                              </label>
                              <input id={`ends-${o.id}`} name="ends" type="datetime-local" defaultValue={licence.endsAt.toISOString().slice(0, 16)} className="input h-9 px-2 text-xs" />
                              <button type="submit" className="mk-btn mk-btn-ghost mk-btn-sm h-9 px-3 text-xs">
                                Change end
                              </button>
                            </form>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <div className="mk-panel px-5 py-10 text-center text-muted">No sales yet.</div>
      )}
    </div>
  );
}
