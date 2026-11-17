import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { formatDate } from "@/components/ui";
import { KitCallout, KitEmpty, KitHeader, KitHero, KitList, KitMore, KitPage, KitRow, KitSection, KitStat, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { encryptionKey } from "@/lib/env";
import { appPlan } from "@/lib/entitlements";
import { formatStorage } from "@/lib/plans";
import { addonTotals } from "@/lib/addons/effects";
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
  // 132.175 The app's limits as they are now (its plan with its add-ons), with what the add-ons add to each.
  const running = owned.filter((o) => addonRunning(o, now));
  const extra = addonTotals(owned, now);
  const limitTiles = plan
    ? (
        [
          app?.backend === "hosted" ? { key: "appUsers", icon: "group", label: t("license.usageAppUsers"), value: plan.limits.appUsers, size: false } : null,
          { key: "storageGb", icon: "photo_library", label: t("license.usageStorage"), value: plan.limits.storageGb, size: true },
          { key: "languages", icon: "translate", label: t("license.usageLanguages"), value: plan.limits.languages, size: false },
          family === "studio" && plan.limits.studioPages != null ? { key: "pages", icon: "description", label: t("license.usagePages"), value: plan.limits.studioPages, size: false } : null,
        ] as const
      )
        .filter((tile) => tile !== null)
        .slice(0, 3)
    : [];
  const limitValue = (value: number | null, size: boolean) => (value === null ? <span className="text-[0.6em] tracking-[-0.3px]">{t("license.unlimited")}</span> : size ? <bdi dir="ltr">{formatStorage(value)}</bdi> : text.num(value));
  // 132.144 The premium kit: what is being paid for first, then the app's add-ons and the ones offered as rows (a name, its prices,
  // one pill or one action), the long explanation behind "?". 132.175 The console's look: the plan in the "⋯" menu, the add-ons
  // and the limits they raise as tiles.
  return (
    <KitPage>
      <KitHeader
        icon="widgets"
        title={t("addons.title")}
        description={t("addons.planLink")}
        help={t("addons.intro")}
        helpLabel={t("studioPage.help")}
        actions={
          <KitMore label={t("studioPage.more")}>
            <Link href={licensePath(app)} className={kit.menuItem}>
              <Icon name="workspace_premium" size={18} />
              {t("addons.plan")}
            </Link>
          </KitMore>
        }
      />
      {license && plan ? (
        <KitHero
          label={t("addons.title")}
          stats={
            <>
              <KitStat icon="widgets" label={t("addons.yours")} value={text.num(running.length)} hint={t("addons.offeredCount", { count: offered.length })} href={owned.length ? "#h-my-addons" : "#h-offered"} />
              {limitTiles.map((tile) => {
                const more = extra.get(tile.key) ?? 0;
                return (
                  <KitStat
                    key={tile.key}
                    icon={tile.icon as IconName}
                    tone={more ? "success" : "neutral"}
                    label={tile.label}
                    value={limitValue(tile.value, tile.size)}
                    // The sign with the amount, left to right inside an Arabic line.
                    hint={more ? t("addons.withAddons", { amount: `\u2066+${tile.size ? formatStorage(more) : text.num(more)}\u2069` }) : undefined}
                  />
                );
              })}
            </>
          }
        />
      ) : null}
      {payment === "paid" ? (
        <KitCallout tone="success" icon="check_circle" role="status">
          {t("addons.paid")}
        </KitCallout>
      ) : null}
      {payment === "failed" ? (
        <KitCallout tone="danger" icon="error" role="alert">
          {t("license.failed")}
        </KitCallout>
      ) : null}
      {payment === "pending" ? (
        <KitCallout icon="schedule" role="status">
          {t("license.pendingPayment")}
        </KitCallout>
      ) : null}
      {!license ? (
        <KitCallout
          tone="warn"
          icon="hourglass_top"
          title={t("addons.needPlan")}
          action={
            <Link href={licensePath(app)} className={kit.quiet}>
              {t("addons.choosePlan")}
            </Link>
          }
        />
      ) : null}

      {checkout ? (
        <KitSection
          id="buy"
          titleId="h-buy"
          title={renewing ? t("addons.renewTitle", { addon: name(checkout.addon, renewing.name) }) : t("addons.buyTitle", { addon: name(checkout.addon, checkout.addon.en.name) })}
          description={renewing && renewing.activeUntil ? t("addons.renewText", { date: formatDate(renewing.activeUntil, lang) }) : t("addons.buyText")}
        >
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
            <p className="m-0 text-sm text-(--sp-muted)">{t("addons.noPrice")}</p>
          )}
        </KitSection>
      ) : null}

      {owned.length ? (
        <KitSection titleId="h-my-addons" title={t("addons.yours")} flush>
          <KitList>
            {owned.map((o) => (
              <OwnedRow key={o.id} owned={o} def={defOf(o.addonId)} now={now} t={t} lang={lang} name={name(defOf(o.addonId), o.name)} billing={billingWord(o.billing)} renewHref={addonsPath(app, `?renew=${o.id}#buy`)} />
            ))}
          </KitList>
        </KitSection>
      ) : null}

      <KitSection titleId="h-offered" title={t("addons.offered")} description={license ? t("addons.offeredText") : undefined} flush>
        {offered.length || ownedDefs.length ? (
          <KitList>
            {[...offered, ...ownedDefs].map((d) => {
              const words = addonText(d, lang);
              const choices = choicesOf(d);
              const has = !offered.includes(d);
              return (
                <KitRow
                  key={d.id}
                  data-addon={d.id}
                  media={<KitThumb icon={d.icon as IconName} />}
                  // The team's words may be in another script than the page's.
                  title={<bdi dir="auto">{words.name}</bdi>}
                  meta={
                    <>
                      {words.description ? <span className="block">{words.description}</span> : null}
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {choices.map((c) => (
                          <span key={c.key} className={`rounded-lg px-2 py-0.5 text-[12px] font-semibold ${c.key === "lifetime" ? "on-dark bg-midnight text-white" : "bg-(--sp-soft) text-(--sp-ink)"}`}>
                            <bdi dir="ltr">{c.price}</bdi> <span className="font-normal">· {billingWord(c.key)}</span>
                          </span>
                        ))}
                      </span>
                    </>
                  }
                  actions={
                    has ? (
                      <KitStatus tone="success">{t("addons.youHaveIt")}</KitStatus>
                    ) : account ? (
                      <Link href={addonsPath(app, `?addon=${d.id}#buy`)} className={kit.row}>
                        {t("addons.choose")}
                      </Link>
                    ) : (
                      <a href={contact.whatsappUrl} className={kit.row}>
                        {t("license.askWhatsapp")}
                      </a>
                    )
                  }
                />
              );
            })}
          </KitList>
        ) : (
          <KitEmpty icon="widgets" title={t("addons.none")}>
            {t("addons.noneText")}
          </KitEmpty>
        )}
      </KitSection>
    </KitPage>
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
    <KitRow
      data-owned-addon={owned.addonId}
      media={<KitThumb icon={(def?.icon ?? "widgets") as IconName} />}
      title={<bdi>{name}</bdi>}
      meta={[billing, until, owned.grantedBy ? t("addons.given") : null].filter(Boolean).join(" · ")}
      aside={
        <>
          <KitStatus tone={running ? "success" : "neutral"}>{running ? t("addons.active") : t("addons.inactive")}</KitStatus>
          {owned.taskStatus ? <KitStatus tone={owned.taskStatus === "done" ? "success" : "warn"}>{t(TASK_KEY[owned.taskStatus])}</KitStatus> : null}
          {/* 138 Publishing: in every plan now, never renewed. */}
          {addonRetired(owned) ? <KitStatus tone="info">{t("addons.includedNow")}</KitStatus> : null}
        </>
      }
      actions={
        addonRenewable(owned) ? (
          <Link href={renewHref} className={kit.row}>
            <Icon name="history" size={16} />
            {t("addons.renew")}
          </Link>
        ) : null
      }
    />
  );
}
