import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { appZone } from "@/lib/analytics/zone";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { AssignmentForm, LiveForm } from "../../../builder-forms";
import { LessonForm, QuizForm } from "../../../forms";
import { ITEM_ICON } from "../../item-icons";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ section?: string; kind?: string }> };
const KINDS = ["lesson", "quiz", "assignment", "live"] as const;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("courses.curriculum") };
}

/** 132.14 A new lesson, quiz, assignment or live class for a section, on its own page; once added, back to the curriculum. */
export default async function NewLessonPage({ params, searchParams }: Props) {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const id = Number((await params).id);
  const course = courseSetup(app).courses.find((c) => c.id === id);
  const query = await searchParams;
  const topic = course?.topics.find((x) => x.id === Number(query.section));
  const kind = KINDS.find((k) => k === query.kind) ?? "lesson";
  if (!course || !topic) notFound();
  const { t } = await dashboardText();
  const zone = await appZone(await getStore(), app);
  const back = `/dashboard/courses/${course.id}?tab=curriculum`;
  const page = { saveBar: { cancel: { href: back, label: t("common.cancel") } }, afterSave: back };
  const title = { lesson: t("courses.addLessonTo", { section: topic.title }), quiz: t("courses.addQuizTo", { section: topic.title }), assignment: t("lms.addAssignmentTo", { section: topic.title }), live: t("lms.addLiveTo", { section: topic.title }) }[kind];
  const word = { lesson: t("manage.kind_lesson"), quiz: t("manage.kind_quiz"), assignment: t("manage.kind_assignment"), live: t("manage.kind_live") }[kind];
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        back={{ href: back, label: course.title }}
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Icon name={ITEM_ICON[kind]} size={18} />
            {word} · {topic.title}
          </span>
        }
        title={title}
      />
      <section aria-label={word} className="flex min-w-0 max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6" data-item-editor={kind}>
        {kind === "lesson" ? (
          <LessonForm courseId={course.id} topicId={topic.id} current={{ title: "", videoUrl: "", text: "", duration: "", preview: "" }} submit={t("courses.addLesson")} {...page} />
        ) : kind === "quiz" ? (
          <QuizForm courseId={course.id} topicId={topic.id} current={{ title: "", passPercent: "70", attemptsAllowed: "", timeLimit: "", questions: "" }} submit={t("courses.addQuiz")} {...page} />
        ) : kind === "assignment" ? (
          <AssignmentForm courseId={course.id} topicId={topic.id} current={{ title: "", instructions: "", maxPoints: "100", passPoints: "", dueDays: "", dueOn: "", attachments: "" }} submit={t("lms.addAssignment")} {...page} />
        ) : (
          <LiveForm courseId={course.id} topicId={topic.id} current={{ title: "", date: "", time: "", duration: "60", meetingUrl: "", notes: "", recordingUrl: "" }} submit={t("lms.addLive")} zone={zone} {...page} />
        )}
      </section>
    </div>
  );
}
