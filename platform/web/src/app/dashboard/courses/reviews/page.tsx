import type { Metadata } from "next";
import Link from "next/link";
import { removeReviewReplyAction, setReviewHiddenAction } from "@/app/actions/course-community";
import { Icon } from "@/components/icon";
import { SubmitButton } from "@/components/form";
import { Badge, btn } from "@/components/ui";
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
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("community.reviews")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{richText(t("community.notHere"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })}</p>
      </div>
    );
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("community.reviews")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("community.reviewsIntro")}</p>
        <p className="m-0 flex items-center gap-1.5 text-[15px] font-semibold" data-testid="reviews-average">
          <Icon name="star" size={20} filled className="text-ember" />
          {summary.rating === null ? t("community.noRating") : t("community.average", { rating: number(summary.rating), count: summary.count })}
        </p>
      </div>

      <nav aria-label={t("community.reviews")} className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/dashboard/courses/reviews?filter=${f}`}
            aria-current={filter === f ? "page" : undefined}
            className={`rounded-[10px] px-3.5 py-2 text-[15px] no-underline ${filter === f ? "bg-midnight font-bold text-white hover:text-white" : "border border-line bg-white text-midnight hover:text-midnight"}`}
          >
            {label[f]}
          </Link>
        ))}
      </nav>

      <section aria-label={label[filter]} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        {items.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("community.noReviews")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0" data-testid="course-reviews">
            {items.map((r) => {
              const name = users.get(r.userId)?.name ?? t("community.student");
              return (
                <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                      <span role="img" aria-label={t("community.rating", { rating: r.rating })} className="flex text-ember">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon key={star} name="star" size={18} filled={star <= r.rating} />
                        ))}
                      </span>
                      {name}
                    </span>
                    <span className="flex items-center gap-2 text-[13px] text-muted">
                      {r.hidden ? <Badge tone="warn">{t("community.hiddenBadge")}</Badge> : null}
                      {date(r.createdAt, WHEN)}
                    </span>
                  </div>
                  <span className="text-[13px] text-muted">{t("community.inCourse", { course: titles.get(r.courseId) ?? t("community.deletedCourse") })}</span>
                  {r.text ? <p className="m-0 whitespace-pre-wrap text-[15px]">{r.text}</p> : null}
                  {r.replyText ? (
                    <div className="ms-6 flex flex-col gap-1 rounded-xl bg-sand px-4 py-3">
                      <span className="text-[13px] font-semibold text-muted">{t("community.replyFrom")}</span>
                      <p className="m-0 whitespace-pre-wrap text-[15px]">{r.replyText}</p>
                      <form action={removeReviewReplyAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <SubmitButton variant="danger" className="mt-1 h-9 px-3 text-sm">
                          {t("community.removeReply")}
                        </SubmitButton>
                      </form>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-start gap-2">
                    <details className="min-w-0 flex-1">
                      <summary className="cursor-pointer text-sm font-semibold">{r.replyText ? t("community.changeReply") : t("community.reply")}</summary>
                      <ReviewReplyForm id={r.id} current={r.replyText ?? ""} />
                    </details>
                    <form action={setReviewHiddenAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="hidden" value={r.hidden ? "0" : "1"} />
                      <button type="submit" className={`${btn.secondary} h-9 text-sm`}>
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
        {pages > 1 ? (
          <nav aria-label={t("orders.pages")} className="flex items-center justify-between gap-3 pt-2 text-sm">
            {page > 1 ? <Link href={`/dashboard/courses/reviews?filter=${filter}&page=${page - 1}`}>{t("listings.newer")}</Link> : <span />}
            <span className="text-muted">{t("common.page", { page, pages })}</span>
            {page < pages ? <Link href={`/dashboard/courses/reviews?filter=${filter}&page=${page + 1}`}>{t("listings.older")}</Link> : <span />}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
