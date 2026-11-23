import type { Metadata } from "next";
import { removeProductReviewReplyAction, setProductReviewHiddenAction } from "@/app/actions/product-reviews";
import { Icon } from "@/components/icon";
import { SubmitButton } from "@/components/form";
import { Badge, btn, EmptyState, PageHeader } from "@/components/ui";
import { Thumb } from "@/components/page-kit";
import { FilterLinks, ListBar, Pager } from "@/components/page-kit-b";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { appUrl, encryptionKey } from "@/lib/env";
import { mediaLink } from "@/lib/media/files";
import { productLabels, reviewFilter, type ReviewFilter } from "@/lib/selling/product-reviews-admin";
import { productRatingSummary, shopFeaturesOn } from "@/lib/selling/shop-features";
import { richText } from "@/i18n/rich";
import { SellingTabs } from "../tabs";
import { ProductReviewReplyForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("shopFeatures.reviews") };
}

const PER_PAGE = 30;
const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" };
const FILTERS: ReviewFilter[] = ["all", "unreplied", "photos", "hidden"];

/** 212 A store's product reviews with their photos: reply once under one, or hide an abusive one from everyone but its author. */
export default async function ProductReviewsPage({ searchParams }: { searchParams: Promise<{ filter?: string; page?: string }> }) {
  const { app } = await requireClient("catalog");
  const { t, date, lang } = await dashboardText();
  if (!app || !shopFeaturesOn(app)) return <PageHeader title={t("shopFeatures.reviews")} description={t("shopFeatures.notStore")} />;
  const params = await searchParams;
  const filter = FILTERS.find((f) => f === params.filter) ?? "all";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(params.page ?? "1", 10) || 1));
  const store = await getStore();
  const [{ items, total }, ratings, messages] = await Promise.all([
    store.listProductReviews({ appId: app.id, ...reviewFilter(filter), offset: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    store.countProductRatings(app.id),
    store.listGiftOccasions(app.id).catch(() => []),
  ]);
  const summary = productRatingSummary(ratings);
  const labels = await productLabels({ store, key: encryptionKey(), assetUrl, platformUrl: appUrl() }, app, items.map((r) => r.productId));
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const label: Record<ReviewFilter, string> = { all: t("shopFeatures.all"), unreplied: t("shopFeatures.withoutReply"), photos: t("shopFeatures.withPhotos"), hidden: t("shopFeatures.hidden") };
  const number = (n: number) => new Intl.NumberFormat(lang === "ar" ? "ar-EG" : lang, { maximumFractionDigits: 1 }).format(n);
  const sr = (chunk: string) => <span className="sr-only">{chunk}</span>;
  const link = (f: ReviewFilter, p = 1) => `/dashboard/selling/reviews?filter=${f}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <SellingTabs messages={messages.reduce((n, o) => n + o.templates.length, 0)} reviews={summary.rating_count} />
      <PageHeader
        title={t("shopFeatures.reviews")}
        description={
          <span className="flex flex-col gap-2">
            <span>{t("shopFeatures.reviewsIntro")}</span>
            <span className="flex w-fit items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[15px] font-semibold text-midnight" data-testid="product-reviews-average">
              <Icon name="star" size={20} filled className="text-ember" />
              {summary.rating === null ? t("shopFeatures.noRating") : t("shopFeatures.average", { rating: number(summary.rating), count: summary.rating_count })}
            </span>
          </span>
        }
      />

      <section aria-label={label[filter]} className="flex min-w-0 flex-col rounded-2xl border border-line bg-white">
        <ListBar>
          <FilterLinks label={t("shopFeatures.reviews")} items={FILTERS.map((f) => ({ href: link(f), label: label[f], current: filter === f }))} />
        </ListBar>
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="star" title={t("shopFeatures.noReviews")} />
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0" data-testid="product-reviews">
            {items.map((r, i) => {
              // Privacy: the short name the app shows, never an email or a phone.
              const name = r.authorName || t("shopFeatures.customer");
              const product = labels.get(r.productId);
              return (
                <li key={r.id} className="flex flex-col gap-2.5 border-t border-line-soft px-5 py-4 first:border-t-0 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Thumb icon="person" shape="round" tint={i} />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                          <span dir="auto">{name}</span>
                          <span role="img" aria-label={t("community.rating", { rating: r.rating })} className="flex text-ember">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Icon key={star} name="star" size={17} filled={star <= r.rating} />
                            ))}
                          </span>
                        </span>
                        <span className="text-[13px] text-muted">
                          <span dir="auto">{t("shopFeatures.ofProduct", { product: product?.name || t("shopFeatures.deletedProduct") })}</span> · {date(r.createdAt, WHEN)}
                        </span>
                      </span>
                    </div>
                    {r.hidden ? <Badge tone="warn">{t("community.hiddenBadge")}</Badge> : null}
                  </div>
                  {r.text ? (
                    <p className="m-0 text-[15px] leading-relaxed whitespace-pre-wrap" dir="auto">
                      {r.text}
                    </p>
                  ) : null}
                  {r.photoIds.length ? (
                    <ul aria-label={t("shopFeatures.photos")} className="m-0 flex list-none flex-wrap gap-2 p-0" data-testid="review-photos">
                      {r.photoIds.map((id, n) => (
                        <li key={id}>
                          <a href={mediaLink(appUrl(), id)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-line-soft">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={mediaLink(appUrl(), id)} alt={t("shopFeatures.photo", { n: n + 1 })} width={88} height={88} loading="lazy" className="size-22 object-cover" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {r.replyText ? (
                    <div className="ms-6 flex flex-col gap-1 rounded-xl bg-sand px-4 py-3 sm:ms-14">
                      <span className="text-[13px] font-semibold text-muted">{t("community.replyFrom")}</span>
                      <p className="m-0 text-[15px] whitespace-pre-wrap" dir="auto">
                        {r.replyText}
                      </p>
                      <form action={removeProductReviewReplyAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <SubmitButton variant="danger" className="mt-1 h-9 px-3 text-sm">
                          {t("community.removeReply")}
                        </SubmitButton>
                      </form>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-start gap-2">
                    <details className="min-w-0 flex-1 rounded-xl border border-line-soft px-3 py-2">
                      <summary className="cursor-pointer text-sm font-semibold">{r.replyText ? t("community.changeReply") : t("community.reply")}</summary>
                      <ProductReviewReplyForm id={r.id} current={r.replyText ?? ""} />
                    </details>
                    <form action={setProductReviewHiddenAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="hidden" value={r.hidden ? "0" : "1"} />
                      <button type="submit" className={`${btn.secondary} h-10 text-sm`}>
                        <Icon name={r.hidden ? "visibility" : "visibility_off"} size={18} />
                        {richText(r.hidden ? t("community.show", { name }) : t("community.hide", { name }), { sr })}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Pager
          label={t("orders.pages")}
          page={page}
          pages={pages}
          newer={link(filter, page - 1)}
          older={link(filter, page + 1)}
          newerLabel={t("listings.newer")}
          olderLabel={t("listings.older")}
          pageLabel={t("common.page", { page, pages })}
        />
      </section>
    </div>
  );
}
