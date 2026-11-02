import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePathAction } from "@/app/actions/courses";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { BADGES, POINTS } from "@/lib/courses/gamification";
import { courseSetup } from "@/lib/courses/setup";
import { dashboardText } from "@/lib/dashboard-lang";
import { GamificationForm, PathForm } from "../learning-forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("learning.pathsTitle") };
}

/** 113.7 Learning paths (courses one after another), and points and badges on or off. */
export default async function LearningPathsPage() {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const setup = courseSetup(app);
  const { t } = await dashboardText();
  const courses = setup.courses.map((c) => ({ id: c.id, title: c.title }));
  const title = new Map(courses.map((c) => [c.id, c.title]));
  const paths = setup.paths ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/courses" className="flex items-center gap-1 text-sm no-underline">
          <Icon name="arrow_back" size={18} />
          {t("courses.backToCourses")}
        </Link>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("learning.pathsTitle")}</h1>
        <p className="m-0 max-w-[680px] text-[15px] leading-relaxed text-ink-4">{t("learning.pathsIntro")}</p>
      </div>

      <section aria-labelledby="h-paths" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-paths" className="m-0 text-lg font-bold">
          {t("learning.paths")} <span className="font-normal text-muted">{paths.length}</span>
        </h2>
        {paths.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("learning.noPaths")}</p> : null}
        {paths.map((p) => (
          <details key={p.id} className="rounded-lg border border-line-soft" data-path={p.id}>
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[15px]">
              <span className="flex items-center gap-1.5 font-semibold">
                <Icon name="route" size={18} />
                {p.title}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                {p.courseIds.map((id) => title.get(id)).filter(Boolean).join(" → ")}
                {p.inOrder ? <Badge tone="neutral">{t("learning.inOrderBadge")}</Badge> : null}
                {p.active ? null : <Badge tone="warn">{t("common.hidden")}</Badge>}
              </span>
            </summary>
            <div className="flex flex-col gap-3 border-t border-line-soft p-3">
              <PathForm
                current={{ id: String(p.id), title: p.title, description: p.description, courseIds: p.courseIds.join(","), inOrder: p.inOrder ? "on" : "", active: p.active ? "on" : "" }}
                courses={courses}
                submit={t("learning.savePath")}
              />
              <form action={deletePathAction}>
                <input type="hidden" name="pathId" value={p.id} />
                <SubmitButton variant="danger" className="h-8 px-3 text-[13px]">
                  {t("learning.deletePath")}
                </SubmitButton>
              </form>
            </div>
          </details>
        ))}
        {courses.length >= 2 ? (
          <details className="rounded-lg bg-sand p-3" open={paths.length === 0}>
            <summary className="cursor-pointer text-[15px] font-semibold">{t("learning.addPath")}</summary>
            <div className="pt-3">
              <PathForm current={{ title: "", description: "", courseIds: "", inOrder: "on", active: "on" }} courses={courses} submit={t("learning.addPathButton")} />
            </div>
          </details>
        ) : (
          <p className="m-0 text-[15px] text-muted">{t("learning.pathsNeedCourses")}</p>
        )}
      </section>

      <section aria-labelledby="h-points" className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-points" className="m-0 text-lg font-bold">
            {t("learning.gamification")}
          </h2>
          <p className="m-0 text-sm leading-relaxed text-muted">{t("learning.gamificationIntro", { lesson: POINTS.lesson, quiz: POINTS.quiz, assignment: POINTS.assignment, day: POINTS.streakDay })}</p>
        </div>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {BADGES.map((b) => (
            <li key={b.id} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[14px]">
              <Icon name={b.icon} size={18} />
              {t(`learning.badge_${b.id}`)}
            </li>
          ))}
        </ul>
        <GamificationForm on={setup.gamification === true} />
      </section>
    </div>
  );
}
