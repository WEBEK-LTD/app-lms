import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/ui";
import { FilterLinks, ListBar } from "@/components/page-kit-b";
import { appZone } from "@/lib/analytics/zone";
import { requireClient } from "@/lib/auth/session";
import { classLearners, coursePoints, leaderboard } from "@/lib/courses/gamification";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata({ params }: PageProps<"/dashboard/courses/[id]/leaderboard">): Promise<Metadata> {
  const { app } = await requireClient("catalog");
  const id = Number((await params).id);
  const course = app ? courseSetup(app).courses.find((c) => c.id === id) : null;
  const { t } = await dashboardText();
  return { title: course ? `${t("learning.leaderboard")} · ${course.title}` : t("courses.title") };
}

/** 113.7 A course's leaderboard as the academy sees it: full names, the points, by cohort maybe (the app shows first names and an initial). */
export default async function CourseLeaderboardPage({ params, searchParams }: PageProps<"/dashboard/courses/[id]/leaderboard">) {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const setup = courseSetup(app);
  const id = Number((await params).id);
  const course = setup.courses.find((c) => c.id === id);
  if (!course) notFound();
  const { t } = await dashboardText();
  const store = await getStore();
  const cohortId = Number(((await searchParams) as { cohort?: string }).cohort) || null;
  const cohort = cohortId ? (course.cohorts ?? []).find((c) => c.id === cohortId) ?? null : null;
  const enrollments = (await store.listCourseEnrollments({ appId: app.id, courseId: course.id })).filter((e) => !cohort || e.cohortId === cohort.id);
  const zone = await appZone(store, app);
  const learners = await classLearners(store, app.id, course.id);
  const users = (await Promise.all(enrollments.map((e) => store.getHostedUser(app.id, e.userId)))).filter((u) => u !== null);
  const full = new Map(users.map((u) => [u.id, u.name]));
  const rows = leaderboard(users.map((user) => ({ user, points: coursePoints(course, learners.get(user.id) ?? { progress: new Map(), attempts: [], submissions: [] }, zone) })));

  const podium = ["bg-tile-1 text-ink-3", "bg-tile-3 text-ink-3", "bg-tile-5 text-ink-3"];

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, then the ranking in a flush Section, by cohort when the course has them. */}
      <PageHeader back={{ href: `/dashboard/courses/${course.id}`, label: course.title }} title={t("learning.leaderboard")} description={setup.gamification ? t("learning.leaderboardIntro") : t("learning.leaderboardOff")} />
      <section aria-label={t("learning.leaderboard")} className="flex min-w-0 max-w-[860px] flex-col rounded-2xl border border-line bg-white">
        {(course.cohorts ?? []).length ? (
          <ListBar>
            <FilterLinks
              label={t("lms.cohorts")}
              items={[null, ...(course.cohorts ?? [])].map((c) => ({
                href: `/dashboard/courses/${course.id}/leaderboard${c ? `?cohort=${c.id}` : ""}`,
                label: c?.name ?? t("community.all"),
                current: (cohort?.id ?? null) === (c?.id ?? null),
              }))}
            />
          </ListBar>
        ) : null}
        {rows.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="emoji_events" title={t("courses.noStudents")} />
          </div>
        ) : (
          <ol className="m-0 flex list-none flex-col p-0" data-testid="leaderboard">
            {rows.map((r) => (
              <li key={r.userId} className="flex items-center gap-3 border-t border-line-soft px-5 py-3 text-[15px] first:border-t-0 sm:px-6">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums ${r.rank <= 3 ? podium[r.rank - 1] : "bg-sand text-muted"}`}>{r.rank}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {full.get(r.userId)} <span className="font-normal text-muted">({r.name})</span>
                </span>
                <span className="shrink-0 rounded-full bg-peach px-3 py-1 text-sm font-bold text-midnight">{t("learning.points", { count: r.points })}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
