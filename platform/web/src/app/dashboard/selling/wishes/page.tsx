import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { EmptyState, PageHeader } from "@/components/ui";
import { Thumb } from "@/components/page-kit";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { appUrl, encryptionKey } from "@/lib/env";
import { productLabels } from "@/lib/selling/product-reviews-admin";
import { shopFeaturesOn, stockAlertCounts } from "@/lib/selling/shop-features";
import { SellingTabs } from "../tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("shopFeatures.wishes") };
}

/** 212 Who waits for a product to be back in stock (each is told once it's back), and what customers saved to their wishlists. */
export default async function WishesPage() {
  const { app } = await requireClient("catalog");
  const { t } = await dashboardText();
  if (!app || !shopFeaturesOn(app)) return <PageHeader title={t("shopFeatures.wishes")} description={t("shopFeatures.notStore")} />;
  const store = await getStore();
  const [waiting, saved, occasions, ratings] = await Promise.all([stockAlertCounts(store, app.id), store.countShopWishlist(app.id), store.listGiftOccasions(app.id).catch(() => []), store.countProductRatings(app.id)]);
  const topSaved = saved.slice(0, 30);
  const labels = await productLabels({ store, key: encryptionKey(), assetUrl, platformUrl: appUrl() }, app, [...waiting.slice(0, 30).map((w) => w.productId), ...topSaved.map((s) => s.productId)]);
  const row = (key: string, productId: number, fallback: string, detail: string | null, count: string, i: number) => {
    const product = labels.get(productId);
    return (
      <li key={key} className="flex items-center justify-between gap-3 border-t border-line-soft px-5 py-3 first:border-t-0 sm:px-6">
        <span className="flex min-w-0 items-center gap-3">
          {product?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl object-cover" />
          ) : (
            <Thumb icon="inventory_2" tint={i} />
          )}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-semibold" dir="auto">
              {product?.name || fallback || t("shopFeatures.deletedProduct")}
            </span>
            {detail ? <span className="text-[13px] text-muted">{detail}</span> : null}
          </span>
        </span>
        <span className="shrink-0 text-[14px] font-semibold text-midnight">{count}</span>
      </li>
    );
  };
  return (
    <div className="flex flex-col gap-6">
      <SellingTabs messages={occasions.reduce((n, o) => n + o.templates.length, 0)} reviews={ratings.reduce((n, r) => n + r.count, 0)} />
      <PageHeader title={t("shopFeatures.wishes")} description={t("shopFeatures.wishesIntro")} />
      <section aria-labelledby="h-waiting" className="flex min-w-0 flex-col rounded-2xl border border-line bg-white">
        <div className="flex flex-col gap-1 px-5 pt-5 pb-3 sm:px-6">
          <h2 id="h-waiting" className="m-0 flex items-center gap-2 text-lg font-bold">
            <Icon name="notifications" size={22} />
            {t("shopFeatures.waiting")}
          </h2>
          <p className="m-0 text-[14px] text-muted">{t("shopFeatures.waitingHint")}</p>
        </div>
        {waiting.length === 0 ? (
          <div className="px-5 pb-5 sm:px-6">
            <EmptyState icon="notifications" title={t("shopFeatures.waitingNone")} />
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0" data-testid="stock-waiting">
            {waiting.slice(0, 30).map((w, i) => row(`${w.productId}:${w.variationId}`, w.productId, w.name, w.variationId ? t("shopFeatures.variation", { id: w.variationId }) : null, t("shopFeatures.waitingCount", { count: w.count }), i))}
          </ul>
        )}
      </section>
      <section aria-labelledby="h-saved" className="flex min-w-0 flex-col rounded-2xl border border-line bg-white">
        <div className="px-5 pt-5 pb-3 sm:px-6">
          <h2 id="h-saved" className="m-0 flex items-center gap-2 text-lg font-bold">
            <Icon name="favorite" size={22} />
            {t("shopFeatures.saved")}
          </h2>
        </div>
        {topSaved.length === 0 ? (
          <div className="px-5 pb-5 sm:px-6">
            <EmptyState icon="favorite" title={t("shopFeatures.savedNone")} />
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0" data-testid="wishlist-counts">
            {topSaved.map((s, i) => row(`s${s.productId}`, s.productId, "", null, t("shopFeatures.savedCount", { count: s.count }), i))}
          </ul>
        )}
      </section>
    </div>
  );
}
