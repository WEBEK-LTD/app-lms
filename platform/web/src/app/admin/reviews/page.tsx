import type { Metadata } from "next";
import Link from "next/link";
import { deleteReviewAction, hideReviewAction, moveReviewAction } from "@/app/actions/admin-reviews";
import { ReadOnly } from "@/components/read-only";
import { ReviewsSection } from "@/components/reviews-section";
import { Badge, btn, formatDate, Notice } from "@/components/ui";
import { messagesFor } from "@/i18n";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { REVIEW_SOURCE_BRANDS, REVIEW_SOURCES } from "@/lib/brands";
import { PLANS } from "@/lib/plans";
import { publicReviews, reviewsSetting, reviewsView } from "@/lib/reviews/reviews";
import { getPlans } from "@/lib/settings/platform";
import { Card } from "../bot/shared";
import { ReviewForm, ReviewsSettingForm } from "./forms";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

const LANG_NAME = { en: "English", ar: "Arabic", tr: "Turkish" } as const;

/**
 * Admin › Reviews: the reviews the team has from real customers, shown on
 * the home page in the team's order. Without a shown review the home page
 * has no reviews section; the preview below then uses labelled sample
 * cards, which never reach the website.
 */
export default async function ReviewsPage() {
  const { adminRole } = await requireAdmin();
  const edit = can(adminRole, "marketing.edit");
  const store = await getStore();
  const [reviews, plans, setting] = await Promise.all([store.listSiteReviews(), getPlans(store), reviewsSetting(store, { fresh: true })]);
  const shown = publicReviews(reviews, "en");
  // What visitors see now; with nothing to show, the preview still draws the labelled samples for the layout.
  const live = reviewsView(reviews, setting, "en");
  const preview = live ?? reviewsView(reviews, { samples: true }, "en");
  const sourceOptions = REVIEW_SOURCES.map((s) => ({ value: s, label: s === "direct" ? "Given to us directly (no badge)" : REVIEW_SOURCE_BRANDS[s].name }));
  const planOptions = PLANS.filter((p) => plans[p]).map((p) => ({ value: p, label: plans[p].name }));
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Reviews</h1>
        <span className="max-w-[860px] text-[15px] text-muted">
          Reviews from real customers, on the home page in every language, in the order below. Add only reviews a customer really gave and agreed to show, with
          their name as they agreed. With no review shown, the home page has no reviews section at all.
        </span>
      </div>

      <ReadOnly when={!edit} what="change the reviews">
        <Card id="h-reviews-setting" title="Sample cards">
          <ReviewsSettingForm samples={setting.samples} />
        </Card>

        <Card id="h-review-add" title="Add a review">
          <ReviewForm plans={planOptions} sources={sourceOptions} today={new Date().toISOString().slice(0, 10)} />
        </Card>

        <Card id="h-reviews-list" title={`Reviews (${reviews.length}, ${shown.length} shown)`}>
          {reviews.length === 0 ? (
            <p className="m-0 text-[15px] text-muted">None yet.</p>
          ) : (
            <ol className="m-0 flex list-none flex-col p-0">
              {reviews.map((r, i) => (
                <li key={r.id} data-review={r.id} className="flex flex-wrap items-start gap-3 border-t border-line-soft py-3 first:border-t-0">
                  <span className="w-6 flex-none pt-0.5 text-sm text-muted">{i + 1}.</span>
                  {r.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- The customer's photo, from our files store.
                    <img src={`/api/reviews/photo/${r.photo}`} alt="" width={40} height={40} className="h-10 w-10 flex-none rounded-full object-cover" />
                  ) : null}
                  <span className="flex min-w-[220px] flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <bdi className="font-bold">{r.name}</bdi>
                      <span className="text-sm text-ember" aria-label={`${r.rating} of 5 stars`}>
                        {"★".repeat(r.rating)}
                        <span className="text-line-strong">{"★".repeat(5 - r.rating)}</span>
                      </span>
                      {r.hidden ? <Badge tone="neutral">Hidden</Badge> : <Badge tone="success">Shown</Badge>}
                    </span>
                    <span className="text-[13px] text-muted">
                      {[r.role, r.city, r.appName, r.plan ? plans[r.plan]?.name : null].filter(Boolean).join(" · ") || "No role or city"} · {LANG_NAME[r.lang]}
                      {Object.keys(r.translations).length ? `, translated into ${Object.keys(r.translations).map((l) => LANG_NAME[l as keyof typeof LANG_NAME]).join(", ")}` : ""} ·{" "}
                      {r.source === "direct" ? "Given directly" : REVIEW_SOURCE_BRANDS[r.source].name}
                      {r.sourceUrl ? (
                        <>
                          {" ("}
                          <a href={r.sourceUrl} target="_blank" rel="noopener nofollow noreferrer">
                            original
                          </a>
                          {")"}
                        </>
                      ) : null}{" "}
                      · {formatDate(r.reviewedAt)} · added by {r.createdBy}
                      {r.clientId ? (
                        <>
                          {" · "}
                          <Link href={`/admin/clients/${r.clientId}`}>Client</Link>
                        </>
                      ) : null}
                    </span>
                    <span dir="auto" className="text-[15px] text-ink-2">
                      {r.text}
                    </span>
                  </span>
                  {edit ? (
                    <span className="flex flex-wrap gap-2">
                      <form action={moveReviewAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" name="direction" value="up" disabled={i === 0} className={`${btn.secondary} h-8 px-3 text-[13px]`}>
                          Up<span className="sr-only"> {r.name}</span>
                        </button>
                      </form>
                      <form action={moveReviewAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" name="direction" value="down" disabled={i === reviews.length - 1} className={`${btn.secondary} h-8 px-3 text-[13px]`}>
                          Down<span className="sr-only"> {r.name}</span>
                        </button>
                      </form>
                      <form action={hideReviewAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="hidden" value={r.hidden ? "false" : "true"} />
                        <button type="submit" className={`${btn.secondary} h-8 px-3 text-[13px]`}>
                          {r.hidden ? "Show" : "Hide"}
                          <span className="sr-only"> {r.name}</span>
                        </button>
                      </form>
                      <form action={deleteReviewAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className={`${btn.secondary} h-8 px-3 text-[13px] text-danger hover:text-danger`}>
                          Delete<span className="sr-only"> {r.name}</span>
                        </button>
                      </form>
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </ReadOnly>

      <Card id="h-reviews-preview" title="Preview of the home page's section (in English)">
        {live?.kind === "real" ? (
          <p className="m-0 text-sm text-ink-4">The shown reviews, as the home page draws them.</p>
        ) : live?.kind === "samples" ? (
          <Notice tone="warn" icon="visibility">
            No real review is shown yet, so the home page shows these labelled sample cards. They disappear as soon as you add a real review.
          </Notice>
        ) : (
          <Notice tone="neutral" icon="visibility_off">
            Sample, not shown on the site. No real review is shown and the sample cards are off, so the home page has no reviews section.
          </Notice>
        )}
        <div data-reviews-preview={live?.kind ?? "none"} className="overflow-hidden rounded-2xl">
          <ReviewsSection view={preview} words={messagesFor("en").reviews} lang="en" />
        </div>
      </Card>
    </>
  );
}
