import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { ItemRow, Thumb } from "@/components/page-kit";
import { FilterLinks, ListBar, Pager } from "@/components/page-kit-b";
import { requireClient } from "@/lib/auth/session";
import { courseSetup, lessonsOf } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import { questionFilter } from "@/lib/courses/community";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("community.questions") };
}

const PER_PAGE = 30;
const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" };
const FILTERS = ["open", "answered", "hidden", "all"] as const;

/** 63 Students' questions in the courses managed here, the latest activity first; waiting ones by default. */
export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const { app } = await requireClient("messages");
  const { t, date } = await dashboardText();
  if (!app || app.connector?.kind !== "courses") {
    return <PageHeader title={t("community.questions")} description={richText(t("community.notHere"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })} />;
  }
  const params = await searchParams;
  const filter = FILTERS.find((f) => f === params.status) ?? "open";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(params.page ?? "1", 10) || 1));
  const store = await getStore();
  // 64 Waiting and answered: the questions shown in the app; hidden ones have their own list.
  const { items, total } = await store.listCourseQuestions({ appId: app.id, ...questionFilter(filter), order: "updated", offset: (page - 1) * PER_PAGE, limit: PER_PAGE });
  const titles = new Map(courseSetup(app).courses.map((c) => [c.id, c.title]));
  const lessons = new Map(courseSetup(app).courses.flatMap((c) => lessonsOf(c).map((l) => [l.id, l.title] as const)));
  const users = new Map((await Promise.all([...new Set(items.map((q) => q.userId))].map((id) => store.getHostedUser(app.id, id)))).filter((u) => u !== null).map((u) => [u.id, u]));
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const label = { open: t("community.waiting"), answered: t("community.answered"), hidden: t("community.hidden"), all: t("community.all") };

  const link = (f: (typeof FILTERS)[number], p = 1) => `/dashboard/courses/questions?status=${f}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, then the questions in a flush Section with their filters and pages. */}
      <PageHeader title={t("community.questions")} description={t("community.questionsIntro")} />

      <section aria-label={label[filter]} className="flex min-w-0 flex-col rounded-2xl border border-line bg-white">
        <ListBar>
          <FilterLinks label={t("community.questions")} items={FILTERS.map((f) => ({ href: link(f), label: label[f], current: filter === f }))} />
          <span className="text-sm text-muted">{t("learning.questionsTotal", { count: total })}</span>
        </ListBar>
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="forum" title={t("community.noQuestions")} />
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0" data-testid="course-questions">
            {items.map((q, i) => {
              const name = users.get(q.userId)?.name ?? t("community.student");
              return (
                <ItemRow
                  key={q.id}
                  href={`/dashboard/courses/questions/${q.id}`}
                  media={<Thumb icon="forum" shape="round" tint={i} />}
                  title={
                    <span className={q.status === "open" ? "font-extrabold" : undefined}>
                      {name} · {t("community.inCourse", { course: titles.get(q.courseId) ?? t("community.deletedCourse") })}
                    </span>
                  }
                  meta={<span className="line-clamp-2 text-ink-4">{q.text}</span>}
                  extra={
                    <>
                      {/* 113.7 A lesson's discussion. */}
                      {q.lessonId && lessons.get(q.lessonId) ? <span>{t("learning.inLesson", { lesson: lessons.get(q.lessonId)! })}</span> : null}
                      <span>{t("community.answers", { count: q.answerCount })}</span>
                      <span>{t("listings.utc", { time: date(q.updatedAt, WHEN) })}</span>
                    </>
                  }
                  aside={
                    <>
                      {q.pinned ? <Badge tone="neutral">{t("learning.pinned")}</Badge> : null}
                      {q.hidden ? <Badge tone="neutral">{t("community.hiddenBadge")}</Badge> : q.status === "open" ? <Badge tone="info">{t("community.waiting")}</Badge> : null}
                    </>
                  }
                />
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
