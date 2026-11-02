import type { Metadata } from "next";
import Link from "next/link";
import { removeReviewReplyAction, setReviewHiddenAction } from "@/app/actions/course-community";
import { Icon } from "@/components/icon";
import { SubmitButton } from "@/components/form";
import { Badge, btn, EmptyState, PageHeader } from "@/components/ui";
import { Thumb } from "@/components/page-kit";
import { FilterLinks, ListBar, Pager } from "@/components/page-kit-b";
import { requireClient } from "@/lib/auth/session";
import { ratingSummary } from "@/lib/courses/community";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { ReviewReplyForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("community.reviews") };
}

const PER_PAGE = 30;
const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" };
const FILTERS = ["all", "unreplied", "hidden"] as const;

/** 63 Students' reviews of the courses managed here: reply under one, or hide it from everyone but its author. */
export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ filter?: string; page?: string }> }) {
  const { app } = await requireClient("catalog");
  const { t, date, lang } = await dashboardText();
  if (!app || app.connector?.kind !== "courses") {
    return <PageHeader title={t("community.reviews")} description={richText(t("community.notHere"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })} />;
  }
  const params = await searchParams;
  const filter = FILTERS.find((f) => f === params.filter) ?? "all";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(params.page ?? "1", 10) || 1));
  const store = await getStore();
  const [{ items, total }, ratings] = await Promise.all([
    store.listCourseReviews({
      appId: app.id,
      ...(filter === "hidden" ? { hidden: true } : filter === "unreplied" ? { hidden: false, unreplied: true } : {}),
      offset: (page - 1) * PER_PAGE,
      limit: PER_PAGE,
    }),
    store.countCourseRatings(app.id),
  ]);
  const summary = ratingSummary(ratings);
  const titles = new Map(courseSetup(app).courses.map((c) => [c.id, c.title]));
  const users = new Map((await Promise.all([...new Set(items.map((r) => r.userId))].map((id) => store.getHostedUser(app.id, id)))).filter((u) => u !== null).map((u) => [u.id, u]));
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const label = { all: t("community.all"), unreplied: t("community.withoutReply"), hidden: t("community.hidden") };
  const number = (n: number) => new Intl.NumberFormat(lang === "ar" ? "ar-EG" : lang, { maximumFractionDigits: 1 }).format(n);
  const sr = (chunk: string) => <span className="sr-only">{chunk}</span>;

  const link = (f: (typeof FILTERS)[number], p = 1) => `/dashboard/courses/reviews?filter=${f}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header with the average, then the reviews in a flush Section with their filters and pages. */}
      <PageHeader
        title={t("community.reviews")}
        description={
          <span className="flex flex-col gap-2">
            <span>{t("community.reviewsIntro")}</span>
            <span className="flex w-fit items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[15px] font-semibold text-midnight" data-testid="reviews-average">
              <Icon name="star" size={20} filled className="text-ember" />
              {summary.rating === null ? t("community.noRating") : t("community.average", { rating: number(summary.rating), count: summary.count })}
            </span>
          </span>
        }
      />

      <section aria-label={label[filter]} className="flex min-w-0 flex-col rounded-2xl border border-line bg-white">
        <ListBar>
          <FilterLinks label={t("community.reviews")} items={FILTERS.map((f) => ({ href: link(f), label: label[f], current: filter === f }))} />
        </ListBar>
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="star" title={t("community.noReviews")} />
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0" data-testid="course-reviews">
            {items.map((r, i) => {
              const name = users.get(r.userId)?.name ?? t("community.student");
              return (
                <li key={r.id} className="flex flex-col gap-2.5 border-t border-line-soft px-5 py-4 first:border-t-0 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Thumb icon="person" shape="round" tint={i} />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                          {name}
                          <span role="img" aria-label={t("community.rating", { rating: r.rating })} className="flex text-ember">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Icon key={star} name="star" size={17} filled={star <= r.rating} />
                            ))}
                          </span>
                        </span>
                        <span className="text-[13px] text-muted">
                          {t("community.inCourse", { course: titles.get(r.courseId) ?? t("community.deletedCourse") })} · {date(r.createdAt, WHEN)}
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
                  {r.replyText ? (
                    <div className="ms-6 flex flex-col gap-1 rounded-xl bg-sand px-4 py-3 sm:ms-14">
                      <span className="text-[13px] font-semibold text-muted">{t("community.replyFrom")}</span>
                      <p className="m-0 text-[15px] whitespace-pre-wrap" dir="auto">
                        {r.replyText}
                      </p>
                      <form action={removeReviewReplyAction}>
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
                      <ReviewReplyForm id={r.id} current={r.replyText ?? ""} />
                    </details>
                    <form action={setReviewHiddenAction}>
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
