import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, Notice, PageHeader, Section } from "@/components/ui";
import { UpgradeHint } from "@/components/upgrade";
import { appLabel } from "@/lib/app/label";
import { contextCan, requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, googlePubSubTopic } from "@/lib/env";
import type { ApiWebhook, StoreBillingItem, StoreProduct, StoreProductSync } from "@/lib/data/types";
import { REPLACED, webhookStateText, webhookUrl } from "@/lib/hosted/api-webhooks";
import { richText } from "@/i18n/rich";
import { localePath } from "@/i18n/paths";
import { dashboardText } from "@/lib/dashboard-lang";
import { appPlan, effectivePlans } from "@/lib/entitlements";
import { plansIn } from "@/lib/marketing-lang";
import { hasFeature, lowestPlanWith } from "@/lib/plans";
import { LISTED_SOURCES, needsYallappSignIn, planHasStoreBilling, storeBillingSource } from "@/lib/store-billing/access";
import { billingBaseUrl } from "@/lib/store-billing/config";
import { ITEM_CURRENCIES, schoolCourses, type PlatformCourse } from "@/lib/store-billing/items";
import { storesOf } from "@/lib/store-billing/products";
import { reconcileSource } from "@/lib/store-billing/sync";
import { CheckStoresForm, ResendNoticeForm, StoreBillingForm, StoreItemActiveForm, StoreItemForm, StorePriceForm, SyncStoresForm, type ItemValues } from "./forms";

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
        {/* 100.7 An academy on its own API sells once Yallapp signs people in. */}
        {needsYallappSignIn(app) ? (
          <Notice icon="info">{richText(t("inapp.needsSignIn"), { link: (chunk) => <Link href="/dashboard/app-sign-in">{chunk}</Link> })}</Notice>
        ) : (
          <Notice icon="info">{t("inapp.notForApp")}</Notice>
        )}
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
  // The dashboard's courses (100.7 or the owner's list and the school's courses) are read as they are now (a WordPress site sends its own).
  const listed = LISTED_SOURCES.includes(source);
  const school = source === "teachable" || source === "thinkific" ? await schoolCourses({ store, key: encryptionKey() }, app) : null;
  await reconcileSource({ store, key: encryptionKey() }, app, now);
  const products = await store.listStoreProducts(app.id);
  const items = listed ? await store.listStoreBillingItems(app.id) : [];
  const notices = source === "own_api" ? await store.listApiWebhooks(app.id, 20, ["purchase.completed", "purchase.revoked"]) : [];
  const platformName = source === "teachable" ? "Teachable" : "Thinkific"; // i18n-ok: brand
  const keys = storesOf(app);
  const settings = app.storeBilling ?? { enabled: false };
  const canEdit = contextCan(context, "settings");
  // 100.6 Yallapp's Pub/Sub topic, for Play Console's real-time notifications.
  const topic = googlePubSubTopic();
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
        {which === "google" && topic ? (
          <div className="flex flex-col gap-1 rounded-xl bg-sand px-3 py-2" data-pubsub-topic="">
            <span className="text-sm font-semibold">{t("inapp.realtime")}</span>
            <code className="text-xs break-all" dir="ltr">
              {topic}
            </code>
            <span className="text-xs text-muted">{t("inapp.realtimeHint")}</span>
          </div>
        ) : null}
        <Link href="/dashboard/publishing" className="text-sm font-semibold text-midnight underline underline-offset-2">
          {t("inapp.openPublishing")}
        </Link>
      </section>
    );
  };

  return (
    <>
      {header}
      <Section
        id="selling"
        title={t("inapp.onTitle")}
        titleId="h-inapp-on"
        description={
          source === "courses" ? t("inapp.sourceCourses") : source === "site" ? t("inapp.sourceSite") : source === "own_api" ? t("inapp.sourceOwnApi") : t("inapp.sourceSchool", { platform: platformName })
        }
      >
        {canEdit ? <StoreBillingForm enabled={settings.enabled} /> : null}
      </Section>
      <Section id="stores" title={t("inapp.storesTitle")} titleId="h-inapp-stores" description={t("inapp.storesHint")} actions={canEdit && (keys.google || keys.apple) ? <CheckStoresForm /> : null}>
        <div className="grid gap-3 lg:grid-cols-2">
          {storeCard("google")}
          {storeCard("apple")}
        </div>
      </Section>
      {listed ? (
        <ListedItems
          text={{ t, price }}
          source={source}
          platformName={platformName}
          school={school}
          items={items}
          canEdit={canEdit}
          defaultCurrency={items[0]?.currency ?? school?.find((c) => c.currency)?.currency ?? products[0]?.currency ?? "TRY"}
        />
      ) : null}
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
      {source === "own_api" ? <ForYourDeveloper text={{ t, k, date }} apiBaseUrl={app.apiBaseUrl ?? ""} billingUrl={billingBaseUrl(appUrl(), app.id)} guide={localePath(lang, "/docs/my-own-api") + "#sell-in-the-app"} notices={notices} /> : null}
    </>
  );
}

type T = Awaited<ReturnType<typeof dashboardText>>["t"];
type K = Awaited<ReturnType<typeof dashboardText>>["k"];
type DateText = Awaited<ReturnType<typeof dashboardText>>["date"];

/** 100.7 One line of the app's list: a school's course (with the owner's change, if any) or a course or plan the owner listed. */
interface ListedRow {
  values: ItemValues;
  /** The price on the site, null when the school gives none. */
  sitePrice: string | null;
  fromSchool: boolean;
  state: "sold" | "stopped" | "no_price";
  /** The owner listed it (a change of a school's course too). */
  listed: boolean;
}

const priced = (price: string | null | undefined) => Boolean(price && Number(price) > 0);

function listedRows(items: StoreBillingItem[], school: PlatformCourse[] | null, defaultCurrency: string): ListedRow[] {
  const valuesOf = (i: StoreBillingItem): ItemValues => ({ kind: i.kind, itemId: i.itemId, title: i.title, price: priced(i.price) ? i.price : "", currency: i.currency, period: i.period, courseIds: i.courseIds });
  const rows: ListedRow[] = [];
  const seen = new Set<string>();
  for (const course of school ?? []) {
    const item = items.find((i) => i.kind === "course" && i.itemId === String(course.id)) ?? null;
    seen.add(`course:${course.id}`);
    const own = item && priced(item.price) ? item : null;
    const sitePrice = own ? own.price : course.price;
    rows.push({
      values: own ? valuesOf(own) : { kind: "course", itemId: String(course.id), title: course.title, price: course.price ?? "", currency: course.currency ?? item?.currency ?? defaultCurrency, period: null, courseIds: [course.id] },
      sitePrice,
      fromSchool: true,
      state: item && !item.active ? "stopped" : priced(sitePrice) ? "sold" : "no_price",
      listed: Boolean(item),
    });
  }
  for (const item of items) {
    if (seen.has(`${item.kind}:${item.itemId}`)) continue;
    rows.push({ values: valuesOf(item), sitePrice: priced(item.price) ? item.price : null, fromSchool: false, state: item.active ? "sold" : "stopped", listed: true });
  }
  return rows;
}

/** 100.7 What the app sells: the school's courses and the owner's list, with adding, changing and stopping. */
function ListedItems({
  text,
  source,
  platformName,
  school,
  items,
  canEdit,
  defaultCurrency,
}: {
  text: { t: T; price: (value: string, currency: string) => string };
  source: string;
  platformName: string;
  school: PlatformCourse[] | null;
  items: StoreBillingItem[];
  canEdit: boolean;
  defaultCurrency: string;
}) {
  const { t, price } = text;
  const ownApi = source === "own_api";
  const rows = listedRows(items, school, defaultCurrency);
  const STATE_TONE = { sold: "success", stopped: "neutral", no_price: "warn" } as const;
  return (
    <Section id="items" title={t("inapp.itemsTitle")} titleId="h-inapp-items" description={ownApi ? t("inapp.itemsHintOwnApi") : t("inapp.itemsHintSchool", { platform: platformName })} flush>
      {!ownApi && school === null ? (
        <div className="px-5 pt-4">
          <Notice tone="warn" icon="warning">
            {t("inapp.schoolUnread", { platform: platformName })}
          </Notice>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState icon="sell" title={t("inapp.itemsEmpty")} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm" data-store-items="">
            <thead>
              <tr className="border-b border-line-soft text-muted">
                <th scope="col" className="px-5 py-3 text-start font-semibold">{t("inapp.colItem")}</th>
                <th scope="col" className="px-3 py-3 text-start font-semibold">{t("inapp.colId")}</th>
                <th scope="col" className="px-3 py-3 text-start font-semibold">{t("inapp.colSitePrice")}</th>
                {ownApi ? null : <th scope="col" className="px-3 py-3 text-start font-semibold">{t("inapp.colFrom")}</th>}
                <th scope="col" className="px-3 py-3 text-start font-semibold">{t("inapp.colState")}</th>
                {canEdit ? <th scope="col" className="px-5 py-3 text-start font-semibold">{t("inapp.colActions")}</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const key = `${row.values.kind}-${row.values.itemId}`;
                return (
                  <tr key={key} className="border-b border-line-soft align-top last:border-0" data-item={key} data-state={row.state}>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold" dir="auto">
                          {row.values.title}
                        </span>
                        <span className="text-xs text-muted">
                          {row.values.kind === "course" ? t("inapp.course") : row.values.period === "year" ? t("inapp.yearly") : t("inapp.monthly")}
                          {row.values.kind === "membership" ? (
                            <>
                              {" · "}
                              <span dir="ltr">{row.values.courseIds.join(", ")}</span>
                            </>
                          ) : null}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <code dir="ltr">{row.values.itemId}</code>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{row.sitePrice ? price(row.sitePrice, row.values.currency) : <span className="text-muted">{t("inapp.noPrice")}</span>}</td>
                    {ownApi ? null : <td className="px-3 py-3">{row.fromSchool && !row.listed ? platformName : t("inapp.fromList")}</td>}
                    <td className="px-3 py-3">
                      <Badge tone={STATE_TONE[row.state]}>{t(`inapp.itemStates.${row.state}`)}</Badge>
                    </td>
                    {canEdit ? (
                      <td className="px-5 py-3">
                        <div className="flex flex-col items-start gap-2">
                          <details className="w-full min-w-[260px]">
                            <summary className="cursor-pointer text-sm font-semibold text-midnight underline underline-offset-2">
                              {t("inapp.change")}
                              <span className="sr-only">: {row.values.title}</span>
                            </summary>
                            <div className="pt-3">
                              <StoreItemForm item={row.values} currencies={ITEM_CURRENCIES} defaultCurrency={defaultCurrency} formId={`f-item-${key}`} />
                            </div>
                          </details>
                          <StoreItemActiveForm kind={row.values.kind} itemId={row.values.itemId} active={row.state !== "stopped"} label={row.values.title} />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {canEdit ? (
        <section aria-labelledby="h-inapp-add" className="flex flex-col gap-3 border-t border-line-soft p-5" data-add-item="">
          <h3 id="h-inapp-add" className="m-0 text-base font-bold">
            {t("inapp.addTitle")}
          </h3>
          <StoreItemForm currencies={ITEM_CURRENCIES} defaultCurrency={defaultCurrency} formId="f-item-new" />
        </section>
      ) : null}
    </Section>
  );
}

/** 100.7 What the client's API answers for selling in the app, and the purchase notices it was sent. */
function ForYourDeveloper({ text, apiBaseUrl, billingUrl, guide, notices }: { text: { t: T; k: K; date: DateText }; apiBaseUrl: string; billingUrl: string; guide: string; notices: ApiWebhook[] }) {
  const { t, k, date } = text;
  const failed = notices.filter((n) => n.status === "failed" && n.lastError !== REPLACED).length;
  const config = `"store_billing": { "base_url": "${billingUrl}", "session": "access_token" }`; // i18n-ok: code
  const course = `"purchase": { "action": "store", "store_product_id": "course_12" }`; // i18n-ok: code
  return (
    <Section id="developer" title={t("inapp.developerTitle")} titleId="h-inapp-developer" description={richText(t("inapp.developerHint"), { link: (chunk) => <Link href={guide}>{chunk}</Link> })}>
      <div className="flex flex-col gap-4">
        {failed > 0 ? (
          <Notice tone="warn" icon="warning">
            {t("inapp.failedNotices", { count: failed })}
          </Notice>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-sm font-semibold">{t("inapp.developerConfig")}</p>
          <pre className="m-0 overflow-x-auto rounded-xl bg-sand px-3 py-2 text-xs" dir="ltr" data-code="config">
            {config}
          </pre>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-sm font-semibold">{t("inapp.developerCourse")}</p>
          <pre className="m-0 overflow-x-auto rounded-xl bg-sand px-3 py-2 text-xs" dir="ltr">
            {course}
          </pre>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-sm font-semibold">{t("inapp.developerProducts")}</p>
          <code className="text-xs break-all" dir="ltr">
            GET {billingUrl}/billing/products?platform=android {/* i18n-ok: code */}
          </code>
        </div>
        <p className="m-0 text-sm text-ink-4">
          {richText(t("inapp.developerNotices"), {
            code: () => <code dir="ltr">POST {webhookUrl(apiBaseUrl)}</code>, // i18n-ok: code
          })}
        </p>
        <div className="flex flex-col gap-2" aria-labelledby="h-inapp-notices">
          <h3 id="h-inapp-notices" className="m-0 text-base font-bold">
            {t("inapp.noticesTitle")}
          </h3>
          {notices.length === 0 ? (
            <p className="m-0 text-sm text-muted">{t("inapp.noticesEmpty")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px]" data-testid="purchase-notices">
              {notices.map((n) => {
                const product = String(n.data?.event?.product_id ?? "");
                return (
                  <li key={n.id} className="flex flex-wrap gap-x-3" data-notice={n.event} data-status={n.status}>
                    <span className="text-muted">{date(n.createdAt)}</span>
                    <span>{richText(t(n.event === "purchase.revoked" ? "inapp.noticeRevoked" : "inapp.noticeCompleted"), { code: () => <code dir="ltr">{product}</code> })}</span>
                    <span className="text-muted">{t("inapp.noticeUser", { user: n.subject })}</span>
                    <span className={n.status === "delivered" ? "text-success" : n.status === "failed" ? "text-danger" : "text-ink-4"}>{k(webhookStateText(n))}</span>
                    {n.status === "failed" && n.lastError !== REPLACED ? <ResendNoticeForm id={n.id} /> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}

const ERROR_CODES = ["google_key", "google_refused", "google_not_found", "google_failed", "google_invalid", "apple_refused", "apple_not_found", "apple_no_app", "apple_failed", "apple_invalid", "unreadable"] as const;

/** A store error code as a key of its text; an unknown one reads as the store not answering. */
function errorKey(code: string, which: "google" | "apple") {
  const known = (ERROR_CODES as readonly string[]).includes(code) ? (code as (typeof ERROR_CODES)[number]) : which === "google" ? "google_failed" : "apple_failed";
  return `inapp.known.errors.${known}` as const;
}
