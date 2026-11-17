import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { Badge, EmptyState, Notice, PageHeader, Section, btn, formatDate } from "@/components/ui";
import { ItemList, ItemRow } from "@/components/page-kit";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { encryptionKey } from "@/lib/env";
import { appPlan } from "@/lib/entitlements";
import { getPlans, platformSetting, yallappPlanAccount } from "@/lib/settings/platform";
import { priceView } from "@/lib/billing/display";
import { formatMoney, offerFor, shownPrice } from "@/lib/billing/prices";
import { isLifetimeEnd, shownPeriods, type PeriodKey } from "@/lib/billing/periods";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { addonBillings, addonsOf, addonText } from "@/lib/addons/catalog";
import { addonRefusal, addonRenewable, addonRetired, addonRunning } from "@/lib/addons/rules";
import type { AddonBilling, AddonDef, AppAddon } from "@/lib/addons/types";
import { addonsPath, licensePath } from "@/lib/studio/section";
import { getVisitorContact } from "@/lib/contact";
import { AddonBuyForm, type AddonChoice } from "./buy-form";

export async function generateMetadata(): Promise<Metadata> {
  await requireClient("billing");
  return { title: (await dashboardText()).t("addons.title") };
}

const BILLING_KEY = { once: "license.periodOnce", "1": "license.period1", "6": "license.period6", "12": "license.period12", "24": "license.period24", "36": "license.period36", lifetime: "license.periodLifetime" } as const;
const TASK_KEY = { new: "addons.taskNew", in_progress: "addons.taskInProgress", done: "addons.taskDone" } as const;

/**
 * 133 Dashboard › Add-ons (and in Studio's frame, /studio/project/addons):
 * what the team offers this app on top of its plan (services, more of a
 * limit, a feature), bought by card with the same period choice and
 * checkout as the plans; what the app has, until when, and Renew.
 */
export default async function AddonsPage({ searchParams }: PageProps<"/dashboard/addons">) {
  const contact = await getVisitorContact();
  const { app, client, license } = await requireClient("billing");
  const text = await dashboardText();
  const { t, lang } = text;
  const query = await searchParams;
  const store = await getStore();
  const now = new Date();
  const setting = (await platformSetting(store, "addons"))?.value;
  const defs = addonsOf(setting);
  const owned = app ? await store.listAppAddons({ appId: app.id }) : [];
  const plan = license ? await appPlan(store, license, now) : null;
  const plans = await getPlans(store);
  const family = app?.section === "studio" ? "studio" : "regular";
  const account = await yallappPlanAccount(store, encryptionKey());
  const view = await priceView(store, client);
  const defOf = (id: string) => defs.find((d) => d.id === id) ?? null;
  // The ways to pay each add-on, in the client's currency, with per month and the saving.
  const choicesOf = (addon: AddonDef, onlyPeriods = false): AddonChoice[] => {
    const billings = addonBillings(addon).filter((b) => !onlyPeriods || (b.billing !== "once" && b.billing !== "lifetime"));
    const priced = billings.flatMap((b) => {
      const offer = account ? offerFor(b.price, view.display, account.provider, view.egpPerUsd) : null;
      if (account && !offer) return [];
      return [{ billing: b.billing, shown: offer?.shown ?? shownPrice(b.price, view.display, view.egpPerUsd), charge: offer?.line ?? null }];
    });
    const periods = shownPeriods(priced.filter((p) => p.billing !== "once").map((p) => ({ key: p.billing as PeriodKey, shown: p.shown })));
    return priced.map((p) => {
      const period = periods.find((x) => x.key === p.billing);
      return { key: p.billing, price: period?.price ?? formatMoney(p.shown), perMonth: period?.perMonth ?? null, saving: period?.saving ?? null, charge: p.charge ? text.k(p.charge) : null };
    });
  };
  const offered = defs.filter((d) => addonRefusal(d, { plans, plan, family, owned, setting, now }) === null);
  const ownedDefs = defs.filter((d) => !offered.includes(d) && d.active && owned.some((o) => o.addonId === d.id && addonRunning(o, now)));
  // What the checkout is for: a new add-on (?addon=) or one to renew (?renew=).
  const renewing = typeof query.renew === "string" ? (owned.find((o) => o.id === query.renew && addonRenewable(o)) ?? null) : null;
  const buying = renewing ? defOf(renewing.addonId) : typeof query.addon === "string" ? (offered.find((d) => d.id === query.addon) ?? null) : null;
  const checkout = buying && account ? { addon: buying, renews: renewing, choices: choicesOf(buying, Boolean(renewing)) } : null;
  const name = (a: Pick<AddonDef, "en" | "ar" | "tr"> | null, fallback: string) => (a ? addonText(a, lang).name : fallback);
  const billingWord = (b: AddonBilling) => t(BILLING_KEY[b]);
  const { payment } = query;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("addons.title")}
        description={t("addons.intro")}
        actions={
          <Link href={licensePath(app)} className={`${btn.secondary} h-11`}>
            <Icon name="workspace_premium" size={20} />
            {t("addons.plan")}
          </Link>
        }
      />
      {payment === "paid" ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("addons.paid")}
        </Notice>
      ) : null}
      {payment === "failed" ? (
        <Notice tone="danger" icon="error" role="alert">
          {t("license.failed")}
        </Notice>
      ) : null}
      {payment === "pending" ? (
        <Notice icon="schedule" role="status">
          {t("license.pendingPayment")}
        </Notice>
      ) : null}
      {!license ? (
        <Notice tone="warn" icon="hourglass_top">
          {t("addons.needPlan")}{" "}
          <Link href={licensePath(app)}>{t("addons.choosePlan")}</Link>
        </Notice>
      ) : null}

      {owned.length ? (
        <Section titleId="h-my-addons" title={t("addons.yours")} flush>
          <ItemList>
            {owned.map((o) => (
              <OwnedRow key={o.id} owned={o} def={defOf(o.addonId)} now={now} t={t} lang={lang} name={name(defOf(o.addonId), o.name)} billing={billingWord(o.billing)} renewHref={addonsPath(app, `?renew=${o.id}#buy`)} />
            ))}
          </ItemList>
        </Section>
      ) : null}

      <Section titleId="h-offered" title={t("addons.offered")} description={license ? t("addons.offeredText") : undefined}>
        {offered.length || ownedDefs.length ? (
          <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr))]">
            {[...offered, ...ownedDefs].map((d) => {
              const words = addonText(d, lang);
              const choices = choicesOf(d);
              const has = !offered.includes(d);
              return (
                <li key={d.id} data-addon={d.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-peach text-accent">
                    <Icon name={d.icon as IconName} size={24} />
                  </span>
                  <div className="flex flex-col gap-1">
                    {/* The team's words may be in another script than the page's. */}
                    <h3 dir="auto" className="m-0 text-base font-bold">
                      {words.name}
                    </h3>
                    {words.description ? (
                      <p dir="auto" className="m-0 text-sm leading-relaxed text-muted">
                        {words.description}
                      </p>
                    ) : null}
                  </div>
                  <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0 text-[13px]">
                    {choices.map((c) => (
                      <li key={c.key} className={`rounded-lg px-2 py-1 font-semibold ${c.key === "lifetime" ? "on-dark bg-midnight text-white" : "bg-sand text-ink-2"}`}>
                        <bdi dir="ltr">{c.price}</bdi> <span className="font-normal">· {billingWord(c.key)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-1">
                    {has ? (
                      <Badge tone="success">{t("addons.youHaveIt")}</Badge>
                    ) : account ? (
                      <Link href={addonsPath(app, `?addon=${d.id}#buy`)} className={`${btn.primary} h-10 w-full`}>
                        {t("addons.choose")}
                      </Link>
                    ) : (
                      <a href={contact.whatsappUrl} className={`${btn.secondary} h-10 w-full`}>
                        {t("license.askWhatsapp")}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon="widgets" title={t("addons.none")}>
            {t("addons.noneText")}
          </EmptyState>
        )}
      </Section>

      {checkout ? (
        <section id="buy" aria-labelledby="h-buy" className="flex scroll-mt-6 flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="h-buy" className="m-0 text-lg font-bold">
              {renewing ? t("addons.renewTitle", { addon: name(checkout.addon, renewing.name) }) : t("addons.buyTitle", { addon: name(checkout.addon, checkout.addon.en.name) })}
            </h2>
            <p className="m-0 text-sm text-muted">{renewing && renewing.activeUntil ? t("addons.renewText", { date: formatDate(renewing.activeUntil, lang) }) : t("addons.buyText")}</p>
          </div>
          {checkout.choices.length ? (
            <AddonBuyForm
              key={`${checkout.addon.id}:${renewing?.id ?? ""}`}
              appId={app?.id ?? null}
              addon={checkout.addon.id}
              renews={renewing?.id ?? null}
              choices={checkout.choices}
              provider={account ? PROVIDER_NAME[account.provider] : "Kashier"}
            />
          ) : (
            <p className="m-0 text-sm text-muted">{t("addons.noPrice")}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

function OwnedRow({
  owned,
  def,
  now,
  t,
  lang,
  name,
  billing,
  renewHref,
}: {
  owned: AppAddon;
  def: AddonDef | null;
  now: Date;
  t: Awaited<ReturnType<typeof dashboardText>>["t"];
  lang: Awaited<ReturnType<typeof dashboardText>>["lang"];
  name: string;
  billing: string;
  renewHref: string;
}) {
  const running = addonRunning(owned, now);
  const until = owned.activeUntil === null ? t("addons.noEnd") : isLifetimeEnd(owned.activeUntil) ? t("license.forLife") : running ? t("addons.until", { date: formatDate(owned.activeUntil, lang) }) : t("addons.ended", { date: formatDate(owned.activeUntil, lang) });
  return (
    <ItemRow
      data-owned-addon={owned.addonId}
      media={
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-peach text-accent">
          <Icon name={(def?.icon ?? "widgets") as IconName} size={22} />
        </span>
      }
      title={<bdi>{name}</bdi>}
      badges={
        <>
          <Badge tone={running ? "success" : "neutral"}>{running ? t("addons.active") : t("addons.inactive")}</Badge>
          {owned.taskStatus ? <Badge tone={owned.taskStatus === "done" ? "success" : "warn"}>{t(TASK_KEY[owned.taskStatus])}</Badge> : null}
          {/* 138 Publishing: in every plan now, never renewed. */}
          {addonRetired(owned) ? <Badge tone="info">{t("addons.includedNow")}</Badge> : null}
        </>
      }
      meta={[billing, until, owned.grantedBy ? t("addons.given") : null].filter(Boolean).join(" · ")}
      actions={
        addonRenewable(owned) ? (
          <Link href={renewHref} className={`${btn.secondary} h-9 px-3 text-sm`}>
            <Icon name="history" size={18} />
            {t("addons.renew")}
          </Link>
        ) : null
      }
    />
  );
}
