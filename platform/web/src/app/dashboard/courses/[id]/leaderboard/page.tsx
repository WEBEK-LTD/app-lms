import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
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

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={`/dashboard/courses/${course.id}`} className="flex items-center gap-1 text-sm no-underline">
          <Icon name="arrow_back" size={18} />
          {course.title}
        </Link>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("learning.leaderboard")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{setup.gamification ? t("learning.leaderboardIntro") : t("learning.leaderboardOff")}</p>
      </div>
      {(course.cohorts ?? []).length ? (
        <nav aria-label={t("lms.cohorts")} className="flex flex-wrap gap-2">
          {[null, ...(course.cohorts ?? [])].map((c) => (
            <Link
              key={c?.id ?? "all"}
              href={`/dashboard/courses/${course.id}/leaderboard${c ? `?cohort=${c.id}` : ""}`}
              aria-current={(cohort?.id ?? null) === (c?.id ?? null) ? "page" : undefined}
              className={`rounded-[10px] px-3.5 py-2 text-[15px] no-underline ${(cohort?.id ?? null) === (c?.id ?? null) ? "bg-midnight font-bold text-white hover:text-white" : "border border-line bg-white text-midnight hover:text-midnight"}`}
            >
              {c?.name ?? t("community.all")}
            </Link>
          ))}
        </nav>
      ) : null}
      <section aria-label={t("learning.leaderboard")} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        {rows.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("courses.noStudents")}</p>
        ) : (
          <ol className="m-0 flex list-none flex-col p-0" data-testid="leaderboard">
            {rows.map((r) => (
              <li key={r.userId} className="flex items-center gap-3 border-t border-line-soft py-2.5 text-[15px] first:border-t-0">
                <span className="w-8 shrink-0 text-center font-extrabold text-muted">{r.rank}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {full.get(r.userId)} <span className="font-normal text-muted">({r.name})</span>
                </span>
                <span className="shrink-0 font-bold">{t("learning.points", { count: r.points })}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
