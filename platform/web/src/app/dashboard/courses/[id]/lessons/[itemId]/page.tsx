import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteItemAction, deleteLessonAction, deleteQuizAction } from "@/app/actions/courses";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { appZone } from "@/lib/analytics/zone";
import { assignmentValues, liveValues } from "@/lib/courses/builder";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { AssignmentForm, LiveForm } from "../../../builder-forms";
import { LessonForm, QuizForm } from "../../../forms";
import { ITEM_ICON } from "../../item-icons";
import { courseItemsWithTopics, itemMeta, itemTitle, lessonValues, quizValues } from "../../items";

type Props = { params: Promise<{ id: string; itemId: string }> };

async function find({ params }: Props) {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const { id, itemId } = await params;
  const course = courseSetup(app).courses.find((c) => c.id === Number(id));
  if (!course) notFound();
  const all = courseItemsWithTopics(course);
  const at = all.findIndex((x) => x.item.id === Number(itemId));
  if (at < 0) notFound();
  return { app, course, all, at, ...all[at]! };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { item, course } = await find(props);
  return { title: `${itemTitle(item)} · ${course.title}` };
}

/**
 * 132.14 A lesson (or a quiz, an assignment, a live class) on its own page:
 * its form with the sticky save bar, the ones before and after it, and
 * deleting it (back to the curriculum).
 */
export default async function LessonPage(props: Props) {
  const { app, course, all, at, topic, item } = await find(props);
  const { t } = await dashboardText();
  const zone = await appZone(await getStore(), app);
  const back = `/dashboard/courses/${course.id}?tab=curriculum`;
  const saveBar = { cancel: { href: back, label: t("common.cancel") } };
  const kind = { lesson: t("manage.kind_lesson"), quiz: t("manage.kind_quiz"), assignment: t("manage.kind_assignment"), live: t("manage.kind_live") }[item.kind];
  const prev = all[at - 1];
  const next = all[at + 1];
  const step = (x: (typeof all)[number] | undefined, dir: "prev" | "next") =>
    x ? (
      <Link href={`/dashboard/courses/${course.id}/lessons/${x.item.id}`} className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-midnight no-underline hover:border-line-strong hover:text-midnight ${dir === "next" ? "justify-end text-end" : ""}`}>
        {dir === "prev" ? <Icon name="chevron_left" size={20} className="shrink-0 text-muted" /> : null}
        <span className="flex min-w-0 flex-col">
          <span className="text-xs font-semibold text-muted">{dir === "prev" ? t("common.previous") : t("common.next")}</span>
          <span className="truncate text-sm font-bold">{itemTitle(x.item)}</span>
        </span>
        {dir === "next" ? <Icon name="chevron_right" size={20} className="shrink-0 text-muted" /> : null}
      </Link>
    ) : (
      <span className="flex-1" />
    );
  const del =
    item.kind === "lesson" ? { action: deleteLessonAction, field: "lessonId", label: t("courses.deleteLesson") } : item.kind === "quiz" ? { action: deleteQuizAction, field: "quizId", label: t("courses.deleteQuiz") } : { action: deleteItemAction, field: "itemId", label: item.kind === "assignment" ? t("lms.deleteAssignment") : t("lms.deleteLive") };
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        back={{ href: back, label: course.title }}
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Icon name={ITEM_ICON[item.kind]} size={18} />
            {kind} · {topic.title}
          </span>
        }
        title={itemTitle(item)}
        description={itemMeta(item, t, zone)}
      />
      <section aria-label={kind} className="flex min-w-0 max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6" data-item-editor={item.kind}>
        {item.kind === "lesson" ? (
          <LessonForm courseId={course.id} topicId={topic.id} current={lessonValues(item.lesson, zone)} submit={t("courses.saveLesson")} saveBar={saveBar} />
        ) : item.kind === "quiz" ? (
          <QuizForm courseId={course.id} topicId={topic.id} current={quizValues(item.quiz, zone)} submit={t("courses.saveQuiz")} saveBar={saveBar} />
        ) : item.kind === "assignment" ? (
          <AssignmentForm courseId={course.id} topicId={topic.id} current={assignmentValues(item.assignment, zone)} submit={t("lms.saveAssignment")} saveBar={saveBar} />
        ) : (
          <LiveForm courseId={course.id} topicId={topic.id} current={liveValues(item.live, zone)} submit={t("lms.saveLive")} zone={zone} saveBar={saveBar} />
        )}
      </section>
      <nav aria-label={t("manage.otherLessons")} className="flex max-w-[860px] gap-3">
        {step(prev, "prev")}
        {step(next, "next")}
      </nav>
      <form action={del.action} className="flex max-w-[860px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5">
        <input type="hidden" name="courseId" value={course.id} />
        <input type="hidden" name={del.field} value={item.id} />
        <input type="hidden" name="next" value={back} />
        <span className="text-sm leading-relaxed text-ink-4">{t("manage.deleteItemNote")}</span>
        <SubmitButton variant="danger" className="h-10">
          <Icon name="delete" size={18} />
          {del.label}
        </SubmitButton>
      </form>
    </div>
  );
}
