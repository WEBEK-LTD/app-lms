import type { Metadata } from "next";
import { ReadOnly } from "@/components/read-only";
import { RatesAttribution } from "@/components/rates-attribution";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { PlatformSetting } from "@/lib/data/types";
import { currencyDigits, currencyOptions, ISO_CURRENCIES } from "@/lib/money/currencies";
import { RATES_SOURCE, ratesOf } from "@/lib/money/rates";
import { platformSettings } from "@/lib/settings/platform";
import { Section } from "../parts";
import { RateOverrideForm, RefreshRatesForm } from "./forms";

export const metadata: Metadata = { title: "Currencies · Settings" };
export const dynamic = "force-dynamic";

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";

/**
 * 133.6 Settings › Currencies: the day's exchange rates the apps show
 * customers' prices with (read by the daily job, lib/money/rates.ts), their
 * date and source, "Refresh now", and the team's own rate for a currency
 * until removed. Apps sell in any ISO 4217 currency; customers see prices
 * in theirs where it has a rate.
 */
export default async function CurrenciesSettingsPage() {
  const { adminRole } = await requireAdmin();
  const settings = await platformSettings(await getStore(), { fresh: true });
  const table = (settings.get("exchangeRates") as PlatformSetting<"exchangeRates"> | undefined)?.value ?? null;
  const overrides = (settings.get("rateOverrides") as PlatformSetting<"rateOverrides"> | undefined)?.value ?? null;
  const rates = ratesOf(table, overrides);
  const options = currencyOptions("en");
  const withRate = options.filter((o) => rates.perDollar[o.code]);
  const without = options.filter((o) => !rates.perDollar[o.code]);
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change platform settings">
      <Section
        id="h-rates"
        title="The day's rates"
        text={`Apps sell in any of the ${ISO_CURRENCIES.length} ISO 4217 currencies. Customers see prices in their own currency at these rates (the app asks with its region or the customer's choice), and pay in the shop's unless the shop charges in theirs. The daily job reads the rates once a day from ${RATES_SOURCE}'s open access endpoint (no key; caching and commercial conversion allowed with the attribution below, and the table itself isn't passed on). When a read fails, the last good rates stay.`}
      >
        <dl className="m-0 grid gap-2 text-sm sm:grid-cols-[180px_1fr]" data-rates-summary="">
          <dt className="font-semibold">Rates of</dt>
          <dd className="m-0" data-rates-date="">
            {table ? table.date : "None yet: run Refresh now, or wait for the daily job."}
          </dd>
          <dt className="font-semibold">Read</dt>
          <dd className="m-0">{table ? `${when(table.fetchedAt)} from ${table.source}` : "Never"}</dd>
          <dt className="font-semibold">Currencies with a rate</dt>
          <dd className="m-0">
            {withRate.length} of {options.length}
          </dd>
          {table?.failedAt ? (
            <>
              <dt className="font-semibold text-danger">Last failed read</dt>
              <dd className="m-0 text-danger">
                {when(table.failedAt)}: {table.failure}
              </dd>
            </>
          ) : null}
        </dl>
        <RefreshRatesForm />
        <RatesAttribution />
      </Section>
      <Section id="h-overrides" title="The team's rates" text="A rate set here replaces the day's for that currency in every app until it's removed (save it empty). Units of the currency for one US dollar.">
        {rates.overridden.length ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0" data-rate-overrides="">
            {rates.overridden.map((code) => (
              <li key={code} className="rounded-full border border-line bg-white px-3 py-1 text-sm">
                1 USD = {rates.perDollar[code]} {code}
                {table?.rates[code] ? <span className="text-muted"> (the day&apos;s: {table.rates[code]})</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-muted">None: every currency uses the day&apos;s rate.</p>
        )}
        <RateOverrideForm />
      </Section>
      <Section id="h-all-rates" title="Every currency" text="Each currency's rate for one US dollar, and its digits after the point. A currency without a rate is shown to customers in the shop's own.">
        <div className="max-h-[480px] overflow-auto rounded-xl border border-line-soft">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-sand text-start">
              <tr>
                <th className="px-3 py-2 text-start">Currency</th>
                <th className="px-3 py-2 text-start">Code</th>
                <th className="px-3 py-2 text-start">Digits</th>
                <th className="px-3 py-2 text-end">1 USD =</th>
              </tr>
            </thead>
            <tbody>
              {[...withRate, ...without].map((o) => (
                <tr key={o.code} className="border-t border-line-soft">
                  <td className="px-3 py-1.5">{o.name}</td>
                  <td className="px-3 py-1.5 font-mono">{o.code}</td>
                  <td className="px-3 py-1.5">{currencyDigits(o.code)}</td>
                  <td className="px-3 py-1.5 text-end font-mono" dir="ltr">
                    {rates.perDollar[o.code] ? `${rates.perDollar[o.code]}${rates.overridden.includes(o.code) ? " (team)" : ""}` : "no rate"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </ReadOnly>
  );
}
