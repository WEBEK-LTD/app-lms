import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { ReadOnly } from "@/components/read-only";
import { Notice, formatDate, formatDateTime } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { appLabel } from "@/lib/app/label";
import { requireAdmin } from "@/lib/auth/session";
import { formatAmount } from "@/lib/billing/prices";
import { paidWith, paymentWhat, receiptNumber } from "@/lib/billing/receipt";
import { CATALOG_CURRENCIES, centsToDecimal } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { PlanPayment } from "@/lib/data/types";
import { planName, planPriceOf, plansInList } from "@/lib/plans";
import { getPlans, platformSetting } from "@/lib/settings/platform";
import { BankTransferForm } from "./bank-transfer-form";

export const metadata: Metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "card", label: "Card" },
  { id: "bank", label: "Bank transfer" },
  { id: "coupon", label: "Coupon" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

function methodOf(p: PlanPayment): Exclude<Filter, "all"> {
  if (p.method === "bank_transfer") return "bank";
  return p.amountCents === 0 ? "coupon" : "card";
}

/**
 * 95.2 Every invoice of Yallapp's plans and storage packs (paid by card,
 * covered by a coupon, or a bank transfer the team recorded), with the PDF
 * the client got; and a new invoice for a client who paid by bank transfer.
 */
export default async function InvoicesPage({ searchParams }: PageProps<"/admin/invoices">) {
  const { adminRole } = await requireAdmin();
  const query = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.id === query.method) ? (query.method as Filter) : "all";
  const email = typeof query.client === "string" ? query.client.trim().toLowerCase() : "";
  const recordedId = typeof query.recorded === "string" ? query.recorded : "";
  const store = await getStore();
  const plans = await getPlans(store);
  const all = await store.listPlanPayments({ status: "paid", limit: 500 });
  const invoices = filter === "all" ? all : all.filter((p) => methodOf(p) === filter);

  // Who each invoice is for.
  const clients = new Map<string, { name: string; email: string }>();
  const apps = new Map<string, string>();
  for (const p of invoices) {
    if (!clients.has(p.clientId)) {
      const client = await store.getClientById(p.clientId);
      const user = client ? await store.getUserById(client.userId) : null;
      clients.set(p.clientId, { name: user?.name ?? "Deleted client", email: user?.email ?? "" });
    }
    if (p.appId && !apps.has(p.appId)) {
      const app = await store.getAppById(p.appId);
      apps.set(p.appId, app ? appLabel(app) : "Deleted app");
    }
  }

  // The invoice just recorded.
  const recorded = recordedId ? all.find((p) => p.id === recordedId && p.method === "bank_transfer") : undefined;
  const recordedLicense = recorded ? await store.getLicenseForApp(recorded.clientId, recorded.appId ?? null) : null;

  // A new bank-transfer invoice: the client, found by their email.
  const found = email ? await store.getUserByEmail(email) : null;
  const client = found ? await store.getClientByUserId(found.id) : null;
  const clientApps = client ? await store.listAppsByClient(client.id) : [];
  const firstLicense = client ? await store.getLicenseForApp(client.id, clientApps[0]?.id ?? null) : null;
  const defaultPlan = firstLicense?.plan ?? "growth";
  const defaultPrice = planPriceOf(plans[defaultPlan]);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Invoices</h1>
        <span className="text-[15px] text-muted">
          Every invoice of Yallapp&apos;s plans and storage packs: paid by card, covered by a coupon, or a bank transfer the team recorded. Each is the PDF the client got by email and finds on their Plan page.
        </span>
      </div>

      {recorded ? (
        <Notice tone="success" icon="check_circle" role="status">
          Invoice {receiptNumber(recorded)} recorded: {formatAmount(recorded.amountCents, recorded.currency)} for {recorded.appId ? (apps.get(recorded.appId) ?? "the app") : "the account's first app"}.{" "}
          {recordedLicense?.expiresAt ? `It's on ${planName(recordedLicense.plan, plans)} until ${formatDate(recordedLicense.expiresAt)}. ` : ""}
          The client got the invoice by email.{" "}
          <a href={`/admin/payments/${recorded.id}/pdf`} download>
            Download the PDF
          </a>
        </Notice>
      ) : null}

      <section aria-labelledby="h-bank" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-bank" className="m-0 text-[19px] font-bold">
            New invoice for a bank transfer
          </h2>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">
            For a client who paid into Yallapp&apos;s bank account. Record it once the money has arrived: the invoice is made as paid.
          </p>
        </div>
        <ReadOnly when={!can(adminRole, "payments.manage")} what="record payments">
          <form method="get" className="flex flex-wrap items-end gap-2.5">
            <div className="flex min-w-[260px] flex-1 flex-col gap-1.5">
              <label htmlFor="f-client" className="text-sm font-semibold">
                Client&apos;s email
              </label>
              <input id="f-client" name="client" type="email" className="input input-sm" defaultValue={email} required />
            </div>
            <button type="submit" className="inline-flex h-10 cursor-pointer items-center rounded-[10px] border border-line-strong bg-white px-4 text-sm font-semibold text-midnight hover:border-midnight">
              Find the client
            </button>
          </form>
          {email && !client ? <p className="m-0 text-sm text-ember">No client signed up with {email}.</p> : null}
          {client ? (
            <div className="flex flex-col gap-3 border-t border-line-soft pt-4">
              <p className="m-0 text-sm">
                <Link href={`/admin/clients/${client.id}`} className="font-semibold">
                  {found?.name}
                </Link>{" "}
                <span className="text-muted">({found?.email})</span>
              </p>
              <BankTransferForm
                clientId={client.id}
                // Before the first app, the transfer pays for the app they make first (as a card payment would).
                apps={clientApps.length ? clientApps.map((a) => ({ id: a.id, label: appLabel(a) })) : [{ id: "", label: "Their first app (not made yet)" }]}
                plans={plansInList((await platformSetting(store, "plans"))?.value).map((id) => ({ id, name: plans[id].name }))}
                currencies={CATALOG_CURRENCIES}
                defaults={{
                  appId: clientApps[0]?.id ?? "",
                  plan: defaultPlan,
                  months: plans[defaultPlan].billingMonths === 1 ? "1" : "12",
                  amount: defaultPrice ? centsToDecimal(defaultPrice.egpCents) : "",
                  currency: "EGP",
                }}
              />
            </div>
          ) : null}
        </ReadOnly>
      </section>

      <section aria-labelledby="h-invoices" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-invoices" className="m-0 text-[19px] font-bold">
            All invoices
          </h2>
          <nav aria-label="Show invoices" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Link
                key={f.id}
                href={f.id === "all" ? "/admin/invoices" : `/admin/invoices?method=${f.id}`}
                aria-current={filter === f.id ? "page" : undefined}
                className={`flex h-8 items-center rounded-full border px-3 text-sm no-underline ${filter === f.id ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-ink-3 hover:border-midnight"}`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          {invoices.length === 0 ? (
            <p className="m-0 p-6 text-[15px] text-muted">No invoices{filter === "all" ? "" : " of this kind"} yet.</p>
          ) : (
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="bg-sand text-left text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">Invoice</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Client</th>
                  <th scope="col" className="px-4 py-3 font-semibold">App</th>
                  <th scope="col" className="px-4 py-3 font-semibold">For</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Amount</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Paid with</th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    <span className="sr-only">PDF</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((p) => (
                  <tr key={p.id} data-invoice={methodOf(p)} className="border-t border-line-soft">
                    <td className="px-4 py-3 font-mono">{receiptNumber(p)}</td>
                    <td className="px-4 py-3">{formatDateTime(p.paidAt ?? p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/clients/${p.clientId}`}>{clients.get(p.clientId)?.name}</Link>
                    </td>
                    <td className="px-4 py-3">{p.appId ? apps.get(p.appId) : <span className="text-muted">Before the first app</span>}</td>
                    <td className="px-4 py-3">{paymentWhat(p, planName(p.plan, plans))}</td>
                    <td className="px-4 py-3 font-semibold">{formatAmount(p.amountCents, p.currency)}</td>
                    <td className="px-4 py-3 text-[13px]">
                      {paidWith(p)}
                      {p.recordedBy ? <span className="block text-xs text-muted">Recorded by {p.recordedBy}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/admin/payments/${p.id}/pdf`} download className="flex items-center gap-1 font-semibold whitespace-nowrap">
                        <Icon name="download" size={16} />
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
