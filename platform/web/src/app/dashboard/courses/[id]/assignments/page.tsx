import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { assignmentDueAt, assignmentsOf } from "@/lib/courses/learning";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import type { AssignmentStatus } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { appUrl } from "@/lib/env";
import { mediaLink } from "@/lib/media/files";
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
  const enrolled = new Map((await store.listCourseEnrollments({ appId: app.id, courseId: course.id })).map((e) => [e.userId, e.enrolledAt]));
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
      <div className="flex flex-col gap-2">
        <Link href={`/dashboard/courses/${course.id}`} className="flex items-center gap-1 text-sm no-underline">
          <Icon name="arrow_back" size={18} />
          {course.title}
        </Link>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("lms.assignmentsTitle")}</h1>
        <p className="m-0 max-w-[680px] text-[15px] leading-relaxed text-ink-4">{t("lms.assignmentsIntro")}</p>
      </div>

      {assignments.size === 0 ? (
        <p className="m-0 text-[15px] text-muted">{t("lms.noAssignments")}</p>
      ) : (
        <>
          <nav aria-label={t("lms.assignmentsTitle")} className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Link
                key={f}
                href={`/dashboard/courses/${course.id}/assignments?status=${f}`}
                aria-current={filter === f ? "page" : undefined}
                className={`rounded-[10px] px-3.5 py-2 text-[15px] no-underline ${filter === f ? "bg-midnight font-bold text-white hover:text-white" : "border border-line bg-white text-midnight hover:text-midnight"}`}
              >
                {label[f]} <span className={filter === f ? "" : "text-muted"}>{count(f)}</span>
              </Link>
            ))}
          </nav>

          <section aria-label={label[filter]} className="flex flex-col gap-3">
            {shown.length === 0 ? (
              <p className="m-0 rounded-2xl border border-line bg-white p-5 text-[15px] text-muted sm:p-6">{t("lms.noSubmissions")}</p>
            ) : (
              shown.map((s) => {
                const a = assignments.get(s.assignmentId)!;
                const due = assignmentDueAt(a, enrolled.get(s.userId) ?? null);
                const late = due !== null && s.submittedAt.getTime() > due.getTime();
                const user = users.get(s.userId);
                return (
                  <article key={s.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6" data-submission={s.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <h2 className="m-0 text-[17px] font-bold break-words">{a.title}</h2>
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
                      <div className="flex flex-wrap gap-1.5">
                        {late ? <Badge tone="warn">{t("lms.late")}</Badge> : null}
                        <Badge tone={status[s.status].tone}>{s.status === "graded" ? t("lms.scoreBadge", { score: s.score ?? 0, max: a.maxPoints }) : status[s.status].text}</Badge>
                      </div>
                    </div>
                    {s.text ? <p className="m-0 rounded-lg bg-sand p-3 text-[15px] leading-relaxed whitespace-pre-wrap">{s.text}</p> : null}
                    {s.file ? (
                      <a href={mediaLink(appUrl(), s.file.fileId)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-semibold no-underline">
                        <Icon name={s.file.kind === "pdf" ? "description" : "image"} size={18} />
                        {s.file.name}
                      </a>
                    ) : null}
                    {s.gradedBy && s.gradedAt ? <p className="m-0 text-[13px] text-muted">{t("lms.gradedBy", { name: s.gradedBy, time: t("listings.utc", { time: date(s.gradedAt, WHEN) }) })}</p> : null}
                    <details className="rounded-lg border border-line-soft p-3" open={s.status === "submitted"}>
                      <summary className="cursor-pointer text-[15px] font-semibold">{s.status === "submitted" ? t("lms.grade") : t("lms.changeGrade")}</summary>
                      <div className="pt-3">
                        <GradeForm submissionId={s.id} maxPoints={a.maxPoints} current={{ score: s.score === null ? "" : String(s.score), feedback: s.feedback ?? "" }} />
                      </div>
                    </details>
                  </article>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}
