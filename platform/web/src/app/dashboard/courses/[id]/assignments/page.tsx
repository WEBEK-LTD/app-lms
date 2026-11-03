import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterLinks, ListBar } from "@/components/page-kit-b";
import { requireClient } from "@/lib/auth/session";
import { assignmentDueAt, assignmentsOf, learningStart } from "@/lib/courses/learning";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import type { AssignmentStatus } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { appUrl } from "@/lib/env";
import { mediaLink } from "@/lib/media/files";
import { rubricResult } from "@/lib/courses/grading";
import { GradeForm } from "../../builder-forms";

export async function generateMetadata({ params }: PageProps<"/dashboard/courses/[id]/assignments">): Promise<Metadata> {
  const { app } = await requireClient("catalog");
  const id = Number((await params).id);
  const course = app ? courseSetup(app).courses.find((c) => c.id === id) : null;
  const { t } = await dashboardText();
  return { title: course ? `${t("lms.assignmentsTitle")} · ${course.title}` : t("courses.title") };
}

const FILTERS = ["submitted", "returned", "graded", "all"] as const;
const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" };

/** 112.5 A course's assignments handed in: waiting for a grade first; grade, write a note, or send one back. */
export default async function CourseAssignmentsPage({ params, searchParams }: PageProps<"/dashboard/courses/[id]/assignments">) {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const id = Number((await params).id);
  const course = courseSetup(app).courses.find((c) => c.id === id);
  if (!course) notFound();
  const query = (await searchParams) as { status?: string };
  const filter = FILTERS.find((f) => f === query.status) ?? "submitted";
  const { t, date } = await dashboardText();
  const store = await getStore();
  const assignments = new Map(assignmentsOf(course).map((a) => [a.id, a]));
  const all = (await store.listAssignmentSubmissions({ appId: app.id, courseId: course.id })).filter((s) => assignments.has(s.assignmentId));
  const shown = filter === "all" ? all : all.filter((s) => s.status === filter);
  // Waiting ones oldest first (first handed in, first graded); the others newest first.
  if (filter === "submitted") shown.reverse();
  // 112.5 Due dates count from the student's cohort's start.
  const enrolled = new Map((await store.listCourseEnrollments({ appId: app.id, courseId: course.id })).map((e) => [e.userId, learningStart(course, e)]));
  const users = new Map((await Promise.all([...new Set(shown.map((s) => s.userId))].map((uid) => store.getHostedUser(app.id, uid)))).filter((u) => u !== null).map((u) => [u.id, u]));
  const label: Record<(typeof FILTERS)[number], string> = { submitted: t("lms.waitingGrade"), returned: t("lms.sentBack"), graded: t("lms.graded"), all: t("community.all") };
  const status: Record<AssignmentStatus, { text: string; tone: "info" | "neutral" | "success" }> = {
    submitted: { text: t("lms.waitingGrade"), tone: "info" },
    returned: { text: t("lms.sentBack"), tone: "neutral" },
    graded: { text: t("lms.graded"), tone: "success" },
  };
  const count = (f: (typeof FILTERS)[number]) => (f === "all" ? all.length : all.filter((s) => s.status === f).length);

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the numbers, then the handed-in work filtered by its state. */}
      <PageHeader back={{ href: `/dashboard/courses/${course.id}`, label: course.title }} title={t("lms.assignmentsTitle")} description={t("lms.assignmentsIntro")} />

      {assignments.size === 0 ? (
        <EmptyState icon="assignment" title={t("lms.noAssignments")} />
      ) : (
        <>
          <StatRow label={t("lms.assignmentsTitle")}>
            <Stat icon="pending" tone="warn" label={t("lms.waitingGrade")} value={count("submitted")} />
            <Stat icon="undo" label={t("lms.sentBack")} value={count("returned")} />
            <Stat icon="task_alt" tone="success" label={t("lms.graded")} value={count("graded")} />
          </StatRow>

          <section aria-label={label[filter]} className="flex min-w-0 flex-col rounded-2xl border border-line bg-white">
            <ListBar>
              <FilterLinks
                label={t("lms.assignmentsTitle")}
                items={FILTERS.map((f) => ({ href: `/dashboard/courses/${course.id}/assignments?status=${f}`, label: label[f], current: filter === f, count: count(f) }))}
              />
            </ListBar>
            {shown.length === 0 ? (
              <p className="m-0 px-5 py-8 text-center text-[15px] text-muted sm:px-6">{t("lms.noSubmissions")}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {shown.map((s, i) => {
                  const a = assignments.get(s.assignmentId)!;
                  const due = assignmentDueAt(a, enrolled.get(s.userId) ?? null);
                  const late = due !== null && s.submittedAt.getTime() > due.getTime();
                  const user = users.get(s.userId);
                  return (
                    <li key={s.id} className="flex flex-col gap-3 border-t border-line-soft px-5 py-4 first:border-t-0 sm:px-6" data-submission={s.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <Thumb icon="person" shape="round" tint={i} />
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <h2 className="m-0 text-[16px] font-bold break-words">{a.title}</h2>
                            <span className="text-sm text-ink-4">
                              {user?.name ?? t("courses.deletedAccount")}
                              {user?.phone ? (
                                <span className="text-muted" dir="ltr">
                                  {" "}
                                  · {user.phone}
                                </span>
                              ) : null}
                            </span>
                            <span className="text-[13px] text-muted">{t("lms.handedInOn", { time: t("listings.utc", { time: date(s.submittedAt, WHEN) }) })}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {late ? <Badge tone="warn">{t("lms.late")}</Badge> : null}
                          {/* 113.7 Which try it is. */}
                          {(a.attemptsAllowed ?? 1) > 1 ? <Badge tone="neutral">{t("learning.tryOf", { attempt: s.attempt, count: a.attemptsAllowed! })}</Badge> : null}
                          <Badge tone={status[s.status].tone}>{s.status === "graded" ? t("lms.scoreBadge", { score: s.score ?? 0, max: a.maxPoints }) : status[s.status].text}</Badge>
                        </div>
                      </div>
                      {s.text ? <p className="m-0 rounded-xl bg-sand p-3.5 text-[15px] leading-relaxed whitespace-pre-wrap">{s.text}</p> : null}
                      {s.file ? (
                        <a href={mediaLink(appUrl(), s.file.fileId)} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-1.5 rounded-[10px] border border-line px-3 py-2 text-sm font-semibold no-underline hover:bg-sand">
                          <Icon name={s.file.kind === "pdf" ? "description" : "image"} size={18} />
                          {s.file.name}
                        </a>
                      ) : null}
                      {/* 113.7 The rubric's levels the student was given. */}
                      {s.status === "graded" && a.rubric?.length && s.rubric ? (
                        <ul className="m-0 flex list-none flex-col gap-1 rounded-xl border border-line-soft p-3 text-[14px]" data-rubric-result={s.id}>
                          {(rubricResult(a.rubric, s.rubric) ?? []).map((r) => (
                            <li key={r.criterion_id} className="flex flex-wrap justify-between gap-2">
                              <span className="font-semibold">{r.title}</span>
                              <span className="text-ink-4">{t("learning.levelResult", { level: r.level_label ?? "—", points: r.points, max: r.max_points })}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {s.gradedBy && s.gradedAt ? <p className="m-0 text-[13px] text-muted">{t("lms.gradedBy", { name: s.gradedBy, time: t("listings.utc", { time: date(s.gradedAt, WHEN) }) })}</p> : null}
                      <details className="rounded-xl border border-line-soft p-3" open={s.status === "submitted"}>
                        <summary className="cursor-pointer text-[15px] font-semibold">{s.status === "submitted" ? t("lms.grade") : t("lms.changeGrade")}</summary>
                        <div className="pt-3">
                          <GradeForm
                            submissionId={s.id}
                            maxPoints={a.maxPoints}
                            rubric={a.rubric}
                            current={{ score: s.score === null ? "" : String(s.score), feedback: s.feedback ?? "", ...Object.fromEntries(Object.entries(s.rubric ?? {}).map(([c, l]) => [`rubric-${c}`, String(l)])) }}
                          />
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
