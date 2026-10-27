import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, Notice, PageHeader, Section } from "@/components/ui";
import { UpgradeHint } from "@/components/upgrade";
import { appLabel } from "@/lib/app/label";
import { contextCan, requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { StoreProduct, StoreProductSync } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { appPlan, effectivePlans } from "@/lib/entitlements";
import { plansIn } from "@/lib/marketing-lang";
import { hasFeature, lowestPlanWith } from "@/lib/plans";
import { planHasStoreBilling, storeBillingSource } from "@/lib/store-billing/access";
import { storesOf } from "@/lib/store-billing/products";
import { reconcileHostedCourses } from "@/lib/store-billing/sync";
import { CheckStoresForm, StoreBillingForm, StorePriceForm, SyncStoresForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("inapp.title") };
}
export const dynamic = "force-dynamic";

type State = "waiting" | "synced" | "failed" | "stopped" | "no_key";
const TONE: Record<State, "success" | "warn" | "danger" | "neutral" | "info"> = { waiting: "info", synced: "success", failed: "danger", stopped: "neutral", no_key: "neutral" };

/**
 * 100.2 Dashboard › In-app purchases: selling paid courses and memberships
 * through Google Play and the App Store; the store keys (from the
 * Publishing step) and their check; each product with the site's price, the
 * owner's own price and its state in each store.
 */
export default async function InAppPurchasesPage() {
  const context = await requireClient("settings");
  const { app, license } = context;
  if (!app) redirect("/dashboard/app-type");
  const { t, k, lang, date, num } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const name = appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app);
  const plan = await appPlan(store, license, now);
  const header = <PageHeader title={t("inapp.title")} description={t("inapp.description", { app: name })} />;
  const source = storeBillingSource(app);
  if (!source) {
    return (
      <>
        {header}
        <Notice icon="info">{t("inapp.notForApp")}</Notice>
      </>
    );
  }
  if (!planHasStoreBilling(plan)) {
    const plans = plansIn(lang, await effectivePlans(store));
    const to = lowestPlanWith(plans, (p) => hasFeature(p, "store_billing"), plan?.id ?? null);
    return (
      <>
        {header}
        {to ? (
          <UpgradeHint title={t("inapp.title")} to={{ id: to.id, name: to.name }} cta={t("overview.upgradeTo", { plan: to.name })}>
            {t("inapp.upgrade")}
          </UpgradeHint>
        ) : (
          <Notice icon="info">{t("inapp.upgrade")}</Notice>
        )}
      </>
    );
  }
  // The dashboard's courses are read as they are now (a WordPress site sends its own).
  await reconcileHostedCourses(store, app, now);
  const products = await store.listStoreProducts(app.id);
  const keys = storesOf(app);
  const settings = app.storeBilling ?? { enabled: false };
  const canEdit = contextCan(context, "settings");
  const price = (value: string, currency: string) => {
    try {
      // As the Courses page shows prices: "₺450.00".
      return num(Number(value), { style: "currency", currency, currencyDisplay: "narrowSymbol" });
    } catch {
      return `${value} ${currency}`;
    }
  };
  const stateOf = (product: StoreProduct, sync: StoreProductSync | null, hasKey: boolean): State => {
    if (!hasKey) return "no_key";
    if (!product.active) return sync?.status === "stopped" || !sync ? "stopped" : "waiting";
    if (!sync) return "waiting";
    if (sync.status === "failed") return "failed";
    return product.updatedAt.getTime() > Date.parse(sync.at) ? "waiting" : "synced";
  };
  const cell = (product: StoreProduct, which: "google" | "apple") => {
    const sync = product[which];
    const state = stateOf(product, sync, which === "google" ? keys.google : keys.apple);
    return (
      <div className="flex flex-col items-start gap-1" data-store={which} data-state={state}>
        <Badge tone={TONE[state]}>{t(`inapp.states.${state}`)}</Badge>
        {sync?.price && state !== "no_key" ? <span className="text-xs text-muted">{t("inapp.storePrice", { price: price(sync.price, product.currency) })}</span> : null}
        {state === "failed" && sync?.error ? <span className="text-xs text-danger">{t(errorKey(sync.error, which))}</span> : null}
      </div>
    );
  };
  const kindText = (product: StoreProduct) => (product.kind === "course" ? t("inapp.course") : product.period === "year" ? t("inapp.yearly") : t("inapp.monthly"));
  const storeCard = (which: "google" | "apple") => {
    const hasKey = which === "google" ? keys.google : keys.apple;
    const check = which === "google" ? settings.googleCheck : settings.appleCheck;
    const subject = which === "google" ? (app.googlePlayClientEmail ?? app.androidPackage ?? "") : (app.ascKeyId ?? "");
    return (
      <section aria-labelledby={`h-inapp-${which}`} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5" data-store-key={which} data-state={hasKey ? "saved" : "missing"}>
        <h3 id={`h-inapp-${which}`} className="m-0 text-base font-bold">
          {t(which === "google" ? "inapp.google" : "inapp.apple")}
        </h3>
        {hasKey ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
            <Icon name="check_circle" size={18} />
            {t("inapp.keySaved", { subject })}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Icon name="radio_button_unchecked" size={18} />
            {t("inapp.noKey")}
          </span>
        )}
        {check ? (
          <p className={`m-0 text-sm ${check.error ? "text-danger" : "text-success"}`} data-check={check.error ? "failed" : "ok"}>
            {t("inapp.lastCheck", { date: date(new Date(check.at)) })} · {check.error ? t(errorKey(check.error, which)) : t("inapp.checkOk")}
          </p>
        ) : null}
        <p className="m-0 text-sm text-ink-4">{t(which === "google" ? "inapp.googleHint" : "inapp.appleHint")}</p>
        <Link href="/dashboard/publishing" className="text-sm font-semibold text-midnight underline underline-offset-2">
          {t("inapp.openPublishing")}
        </Link>
      </section>
    );
  };

  return (
    <>
      {header}
      <Section id="selling" title={t("inapp.onTitle")} titleId="h-inapp-on" description={t(source === "courses" ? "inapp.sourceCourses" : "inapp.sourceSite")}>
        {canEdit ? <StoreBillingForm enabled={settings.enabled} /> : null}
      </Section>
      <Section id="stores" title={t("inapp.storesTitle")} titleId="h-inapp-stores" description={t("inapp.storesHint")} actions={canEdit && (keys.google || keys.apple) ? <CheckStoresForm /> : null}>
        <div className="grid gap-3 lg:grid-cols-2">
          {storeCard("google")}
          {storeCard("apple")}
        </div>
      </Section>
      <Section
        id="products"
        title={t("inapp.productsTitle")}
        titleId="h-inapp-products"
        description={t("inapp.productsHint")}
        actions={canEdit && settings.enabled && (keys.google || keys.apple) && products.length > 0 ? <SyncStoresForm /> : null}
        flush
      >
        {products.length === 0 ? (
          <div className="p-5">
            <EmptyState icon="shopping_bag" title={t("inapp.productsEmpty")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm" data-store-products="">
              <thead>
                <tr className="border-b border-line-soft text-muted">
                  <th scope="col" className="px-5 py-3 text-start font-semibold">{t("inapp.colProduct")}</th>
                  <th scope="col" className="px-3 py-3 text-start font-semibold">{t("inapp.colSitePrice")}</th>
                  <th scope="col" className="px-3 py-3 text-start font-semibold">{t("inapp.colPrice")}</th>
                  <th scope="col" className="px-3 py-3 text-start font-semibold">{t("inapp.colGoogle")}</th>
                  <th scope="col" className="px-5 py-3 text-start font-semibold">{t("inapp.colApple")}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-line-soft align-top last:border-0" data-product={product.productId} data-active={product.active ? "yes" : "no"}>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold" dir="auto">
                          {product.title}
                        </span>
                        <span className="text-xs text-muted">
                          {kindText(product)} · <span dir="ltr">{product.productId}</span>
                        </span>
                        {!product.active ? <span className="text-xs text-muted">{t("inapp.stopped")}</span> : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{price(product.sitePrice, product.currency)}</td>
                    <td className="px-3 py-3">
                      {canEdit && product.active ? (
                        <StorePriceForm productId={product.productId} ownPrice={product.ownPrice} sitePrice={product.sitePrice} label={product.title} />
                      ) : (
                        price(product.ownPrice ?? product.sitePrice, product.currency)
                      )}
                    </td>
                    <td className="px-3 py-3">{cell(product, "google")}</td>
                    <td className="px-5 py-3">{cell(product, "apple")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      {products.length > 0 && keys.apple ? <Notice icon="info">{t("inapp.appleReview")}</Notice> : null}
    </>
  );
}

const ERROR_CODES = ["google_key", "google_refused", "google_not_found", "google_failed", "google_invalid", "apple_refused", "apple_not_found", "apple_no_app", "apple_failed", "apple_invalid", "unreadable"] as const;

/** A store error code as a key of its text; an unknown one reads as the store not answering. */
function errorKey(code: string, which: "google" | "apple") {
  const known = (ERROR_CODES as readonly string[]).includes(code) ? (code as (typeof ERROR_CODES)[number]) : which === "google" ? "google_failed" : "apple_failed";
  return `inapp.known.errors.${known}` as const;
}
