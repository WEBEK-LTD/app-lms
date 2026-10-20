import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import type { CourseQuestionStatus } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("community.questions") };
}

const PER_PAGE = 30;
const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" };
const FILTERS = ["open", "answered", "all"] as const;

/** 63 Students' questions in the courses managed here, the latest activity first; waiting ones by default. */
export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const { app } = await requireClient("messages");
  const { t, date } = await dashboardText();
  if (!app || app.connector?.kind !== "courses") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("community.questions")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{richText(t("community.notHere"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })}</p>
      </div>
    );
  }
  const params = await searchParams;
  const filter = FILTERS.find((f) => f === params.status) ?? "open";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(params.page ?? "1", 10) || 1));
  const store = await getStore();
  const status: CourseQuestionStatus | undefined = filter === "all" ? undefined : filter;
  const { items, total } = await store.listCourseQuestions({ appId: app.id, ...(status ? { status } : {}), order: "updated", offset: (page - 1) * PER_PAGE, limit: PER_PAGE });
  const titles = new Map(courseSetup(app).courses.map((c) => [c.id, c.title]));
  const users = new Map((await Promise.all([...new Set(items.map((q) => q.userId))].map((id) => store.getHostedUser(app.id, id)))).filter((u) => u !== null).map((u) => [u.id, u]));
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const label = { open: t("community.waiting"), answered: t("community.answered"), all: t("community.all") };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("community.questions")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("community.questionsIntro")}</p>
      </div>

      <nav aria-label={t("community.questions")} className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/dashboard/courses/questions?status=${f}`}
            aria-current={filter === f ? "page" : undefined}
            className={`rounded-[10px] px-3.5 py-2 text-[15px] no-underline ${filter === f ? "bg-midnight font-bold text-white hover:text-white" : "border border-line bg-white text-midnight hover:text-midnight"}`}
          >
            {label[f]}
          </Link>
        ))}
      </nav>

      <section aria-label={label[filter]} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        {items.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("community.noQuestions")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0" data-testid="course-questions">
            {items.map((q) => {
              const name = users.get(q.userId)?.name ?? t("community.student");
              return (
                <li key={q.id} className="border-t border-line-soft first:border-t-0">
                  <Link href={`/dashboard/courses/questions/${q.id}`} className="flex items-center gap-3 py-3 text-midnight no-underline hover:bg-sand">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={`truncate text-[15px] ${q.status === "open" ? "font-extrabold" : "font-bold"}`}>
                        {name} · {t("community.inCourse", { course: titles.get(q.courseId) ?? t("community.deletedCourse") })}
                      </span>
                      <span className="truncate text-[14px] text-ink-4">{q.text}</span>
                      <span className="text-[13px] text-muted">{t("community.answers", { count: q.answerCount })}</span>
                    </span>
                    <span className="shrink-0 text-[13px] text-muted">{t("listings.utc", { time: date(q.updatedAt, WHEN) })}</span>
                    {q.status === "open" ? <Badge tone="info">{t("community.waiting")}</Badge> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {pages > 1 ? (
          <nav aria-label={t("orders.pages")} className="flex items-center justify-between gap-3 pt-2 text-sm">
            {page > 1 ? <Link href={`/dashboard/courses/questions?status=${filter}&page=${page - 1}`}>{t("listings.newer")}</Link> : <span />}
            <span className="text-muted">{t("common.page", { page, pages })}</span>
            {page < pages ? <Link href={`/dashboard/courses/questions?status=${filter}&page=${page + 1}`}>{t("listings.older")}</Link> : <span />}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
