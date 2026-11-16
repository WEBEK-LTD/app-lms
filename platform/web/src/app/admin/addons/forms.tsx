"use client";

import { useActionState, useState } from "react";
import { saveAddonAction, saveTopPlansAction } from "@/app/actions/admin-addons";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { initialFormState } from "@/lib/forms";

export interface AddonFormValues {
  /** Empty for a new add-on. */
  original: string;
  id: string;
  kind: string;
  icon: string;
  enName: string;
  enDescription: string;
  arName: string;
  arDescription: string;
  trName: string;
  trDescription: string;
  limit: string;
  amount: string;
  feature: string;
  family: string;
  belowTop: boolean;
  plans: string[];
  repeatable: boolean;
  active: boolean;
  order: string;
  /** By way to pay: on, and the prices as decimals. */
  prices: Record<string, { on: boolean; egp: string; usd: string }>;
}

const BILLINGS = [
  { key: "once", months: 0, name: "One-time" },
  { key: "1", months: 1, name: "1 month" },
  { key: "6", months: 6, name: "6 months" },
  { key: "12", months: 12, name: "1 year" },
  { key: "24", months: 24, name: "2 years" },
  { key: "36", months: 36, name: "3 years" },
  { key: "lifetime", months: 0, name: "Lifetime" },
] as const;

function cents(text: string): number | null {
  const v = text.trim().replace(/,/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(v)) return null;
  const n = Math.round(Number(v) * 100);
  return n > 0 ? n : null;
}
const pounds = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EGP", currencyDisplay: "code", maximumFractionDigits: c % 100 === 0 ? 0 : 2 }).format(c / 100);

/**
 * 133 One add-on in Admin › Add-ons: its names and descriptions (English,
 * and Arabic and Turkish if you like), icon, what it is (a service, more
 * of a limit, a feature), how it's paid (each way switched on and priced),
 * who may buy it, whether it can be bought twice, and whether it's offered.
 */
export function AddonForm({
  addon,
  iconNames,
  limits,
  features,
  plans,
}: {
  addon: AddonFormValues;
  /** The Material Symbols the site's font has. */
  iconNames: readonly string[];
  limits: { id: string; label: string }[];
  features: { id: string; label: string }[];
  plans: { id: string; name: string; family: string }[];
}) {
  const [state, action] = useActionState(saveAddonAction, initialFormState);
  const v = (name: keyof AddonFormValues & string, fallback: string) => state.values?.[name] ?? fallback;
  const [kind, setKind] = useState(v("kind", addon.kind) || "service");
  const [icon, setIcon] = useState(v("icon", addon.icon) || "widgets");
  const [prices, setPrices] = useState(() =>
    Object.fromEntries(
      BILLINGS.map((b) => [
        b.key,
        {
          on: state.values ? state.values[`price_${b.key}_on`] === "on" : (addon.prices[b.key]?.on ?? false),
          egp: state.values?.[`price_${b.key}_egp`] ?? addon.prices[b.key]?.egp ?? "",
          usd: state.values?.[`price_${b.key}_usd`] ?? addon.prices[b.key]?.usd ?? "",
        },
      ]),
    ) as Record<string, { on: boolean; egp: string; usd: string }>,
  );
  // Per month and the saving, worked out from the prices typed (never typed in).
  const priced = BILLINGS.filter((b) => b.months > 0 && prices[b.key]!.on && cents(prices[b.key]!.egp)).map((b) => ({ ...b, cents: cents(prices[b.key]!.egp)! }));
  const reference = [...priced].sort((a, b) => a.months - b.months)[0];
  const maths = (key: string) => {
    const p = priced.find((x) => x.key === key);
    if (!p) return null;
    const month = p.months > 1 ? `${pounds(Math.round(p.cents / p.months))} a month` : null;
    const full = reference && reference.key !== p.key ? (reference.cents * p.months) / reference.months : null;
    const saving = full && full > p.cents ? Math.floor(((full - p.cents) / full) * 100) : 0;
    return [month, saving >= 1 ? `saves ${saving}% against ${reference!.name.toLowerCase()}` : null].filter(Boolean).join(" · ") || null;
  };
  const checkedPlans = state.values ? (state.values.plans ?? "").split(",").filter(Boolean) : addon.plans;
  const panel = "flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6";
  return (
    <form action={action} noValidate className="flex flex-col gap-4" aria-label={addon.original ? `Add-on ${addon.enName}` : "New add-on"}>
      <input type="hidden" name="original" value={addon.original} />
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <div className={panel}>
          <h3 className="m-0 text-base font-bold">What it is</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Id"
              name="id"
              maxLength={40}
              defaultValue={v("id", addon.id)}
              disabled={Boolean(addon.original)}
              hint={addon.original ? "Kept as it is: it names the add-on on payments." : "Lower-case letters, digits or -, like pages-10."}
              error={state.errors?.id}
              small
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="addon-kind" className="text-sm font-semibold">
                Type
              </label>
              <select id="addon-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="input input-sm">
                <option value="service">A service our team does</option>
                <option value="quantity">More of a limit</option>
                <option value="feature">A feature switched on</option>
              </select>
              <FieldError id="addon-kind-error" error={state.errors?.kind} />
            </div>
          </div>
          {kind === "quantity" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="addon-limit" className="text-sm font-semibold">
                  Adds to
                </label>
                <select id="addon-limit" name="limit" defaultValue={v("limit", addon.limit)} className="input input-sm">
                  <option value="">Choose a limit</option>
                  {limits.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <FieldError id="addon-limit-error" error={state.errors?.limit} />
              </div>
              <Field label="How much one adds" name="amount" inputMode="decimal" defaultValue={v("amount", addon.amount)} hint="Like 10 pages, or 5 for 5 GB." error={state.errors?.amount} small />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="addon-feature" className="text-sm font-semibold">
                {kind === "feature" ? "Switches on" : "Also switches on (optional)"}
              </label>
              <select id="addon-feature" name="feature" defaultValue={v("feature", addon.feature)} className="input input-sm">
                <option value="">{kind === "feature" ? "Choose a feature" : "Nothing"}</option>
                {features.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted">
                {kind === "service" ? "A service opens a task in Tasks and emails the team. It can switch a feature on while it runs, like We publish for you." : "While it runs, the app has the feature as if its plan had it."}
              </span>
              <FieldError id="addon-feature-error" error={state.errors?.feature} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="addon-icon" className="text-sm font-semibold">
              Icon
            </label>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-peach text-accent">
                <Icon name={icon as IconName} size={22} />
              </span>
              <select id="addon-icon" name="icon" value={icon} onChange={(e) => setIcon(e.target.value)} className="input input-sm">
                {iconNames.map((name) => (
                  <option key={name} value={name}>
                    {name.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <FieldError id="addon-icon-error" error={state.errors?.icon} />
          </div>
        </div>
        <div className={panel}>
          <h3 className="m-0 text-base font-bold">Name and description</h3>
          <Field label="Name" name="enName" maxLength={60} defaultValue={v("enName", addon.enName)} error={state.errors?.enName} small />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="addon-en-description" className="text-sm font-semibold">
              Description
            </label>
            <textarea id="addon-en-description" name="enDescription" rows={3} maxLength={300} defaultValue={v("enDescription", addon.enDescription)} className="input min-h-20 py-3" />
            <FieldError id="addon-en-description-error" error={state.errors?.enDescription} />
          </div>
          {(
            [
              ["ar", "Arabic", "rtl"],
              ["tr", "Turkish", "ltr"],
            ] as const
          ).map(([lang, name, dir]) => (
            <details key={lang} className="rounded-xl border border-line-soft px-3.5 py-3" open={Boolean(addon[`${lang}Name`] || addon[`${lang}Description`])}>
              <summary className="cursor-pointer text-sm font-semibold">In {name} (optional)</summary>
              <div className="mt-3 flex flex-col gap-3" lang={lang} dir={dir}>
                <Field label="Name" name={`${lang}Name`} maxLength={60} defaultValue={v(`${lang}Name`, addon[`${lang}Name`])} error={state.errors?.[`${lang}Name`]} small />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`addon-${lang}-description`} className="text-sm font-semibold">
                    Description
                  </label>
                  <textarea id={`addon-${lang}-description`} name={`${lang}Description`} rows={3} maxLength={300} defaultValue={v(`${lang}Description`, addon[`${lang}Description`])} className="input min-h-20 py-3" />
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
      <fieldset className={`${panel} m-0`} data-addon-prices="">
        <legend className="sr-only">How it&apos;s paid</legend>
        <h3 className="m-0 text-base font-bold">How it&apos;s paid</h3>
        <p className="m-0 text-[13px] text-muted">
          Switch on each way to pay and give it a price in Egyptian pounds (charged to everyone; people outside Egypt see dollars). Without a price in EGP, it
          isn&apos;t offered. A period ends after its months; one-time and lifetime never end.
        </p>
        {BILLINGS.map((b) => {
          const row = prices[b.key]!;
          const set = (patch: Partial<typeof row>) => setPrices((all) => ({ ...all, [b.key]: { ...all[b.key]!, ...patch } }));
          const status = !row.on ? null : cents(row.egp) ? (maths(b.key) ?? (b.key === "lifetime" ? "Paid once, never ends." : b.key === "once" ? "Paid once." : null)) : "No price yet: not offered";
          return (
            <div key={b.key} data-addon-billing={b.key} className={`grid items-start gap-3 rounded-lg border px-3 py-2.5 sm:grid-cols-[150px_1fr_1fr] ${b.key === "lifetime" ? "border-ember/40 bg-peach-soft" : "border-line-soft"}`}>
              <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[15px] font-semibold">
                <input type="checkbox" name={`price_${b.key}_on`} checked={row.on} onChange={(e) => set({ on: e.target.checked })} className="h-4 w-4 accent-midnight" />
                {b.name}
              </label>
              <Field label={`EGP, ${b.name.toLowerCase()}`} name={`price_${b.key}_egp`} inputMode="decimal" value={row.egp} onChange={(e) => set({ egp: e.target.value })} error={state.errors?.[`price_${b.key}_egp`]} small />
              <Field label={`USD, ${b.name.toLowerCase()} (optional)`} name={`price_${b.key}_usd`} inputMode="decimal" value={row.usd} onChange={(e) => set({ usd: e.target.value })} error={state.errors?.[`price_${b.key}_usd`]} small />
              {status ? <span className="text-[13px] text-muted sm:col-span-3">{status}</span> : null}
            </div>
          );
        })}
      </fieldset>
      <div className={panel}>
        <h3 className="m-0 text-base font-bold">Who can buy it</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="addon-family" className="text-sm font-semibold">
              Apps
            </label>
            <select id="addon-family" name="family" defaultValue={v("family", addon.family)} className="input input-sm">
              <option value="both">Regular apps and Studio projects</option>
              <option value="regular">Regular apps only</option>
              <option value="studio">Studio projects only</option>
            </select>
          </div>
          <Field label="Order in the list" name="order" inputMode="numeric" defaultValue={v("order", addon.order)} hint="Lower first." error={state.errors?.order} small />
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-[15px]">
          <input type="checkbox" name="belowTop" defaultChecked={state.values ? state.values.belowTop === "on" : addon.belowTop} className="mt-1 h-4 w-4 accent-midnight" />
          <span className="flex flex-col gap-0.5">
            Only apps below the top plan
            <span className="text-[13px] text-muted">Apps on the family&apos;s top plan, or a higher one, don&apos;t see it (the top plans are below).</span>
          </span>
        </label>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold">Only these plans (none ticked: any plan)</legend>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(180px,100%),1fr))]">
            {plans.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" name="plans" value={p.id} defaultChecked={checkedPlans.includes(p.id)} className="h-4 w-4 accent-midnight" />
                {p.name}
                <span className="text-[12px] text-muted">{p.family === "studio" ? "Studio" : ""}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name="repeatable" defaultChecked={state.values ? state.values.repeatable === "on" : addon.repeatable} className="h-4 w-4 accent-midnight" />
          Can be bought more than once (each runs and renews on its own)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[15px] font-semibold">
          <input type="checkbox" name="active" defaultChecked={state.values ? state.values.active === "on" : addon.active} className="h-4 w-4 accent-midnight" />
          Offered to clients
        </label>
      </div>
      <div className="sticky bottom-0 z-10 flex justify-end rounded-2xl border border-line bg-white/95 px-5 py-3 backdrop-blur">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save add-on
        </SubmitButton>
      </div>
    </form>
  );
}

/** 133 The top plan of each family: "only below the top plan" counts from it. */
export function TopPlansForm({ families }: { families: { family: "regular" | "studio"; label: string; value: string; defaultName: string | null; plans: { id: string; name: string }[] }[] }) {
  const [state, action] = useActionState(saveTopPlansAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4" aria-label="Top plans">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-2">
        {families.map((f) => (
          <div key={f.family} className="flex flex-col gap-1.5">
            <label htmlFor={`top-${f.family}`} className="text-sm font-semibold">
              {f.label}
            </label>
            <select id={`top-${f.family}`} name={f.family} defaultValue={state.values?.[f.family] ?? f.value} className="input input-sm">
              <option value="">{f.defaultName ? `Default: ${f.defaultName}` : "Default"}</option>
              {f.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <FieldError id={`top-${f.family}-error`} error={state.errors?.[f.family]} />
          </div>
        ))}
      </div>
      <p className="m-0 text-[13px] text-muted">The default is the first plan, lower to higher, that already includes We publish for you; without one, the highest plan offered.</p>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save top plans
        </SubmitButton>
      </div>
    </form>
  );
}
