import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { deleteAnswerAction, deleteQuestionAction, setAnswerHiddenAction, setQuestionHiddenAction, setQuestionPinnedAction } from "@/app/actions/course-community";
import { findLesson } from "@/lib/courses/setup";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, PageHeader, Section } from "@/components/ui";
import { DetailLayout } from "@/components/page-kit";
import { Facts, SideCard } from "@/components/page-kit-b";
import { requireClient } from "@/lib/auth/session";
import { richText } from "@/i18n/rich";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { AnswerForm } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("community.questions") };
}

const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" };

/** 63 A student's question with its answers, and the business's answer form. */
export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { app } = await requireClient("messages");
  if (!app || app.connector?.kind !== "courses") notFound();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const store = await getStore();
  const question = await store.getCourseQuestion(app.id, id);
  if (!question) notFound();
  const answers = await store.listCourseAnswers(app.id, question.id);
  const ids = [question.userId, ...answers.flatMap((a) => (a.userId === null ? [] : [a.userId]))];
  const users = new Map((await Promise.all([...new Set(ids)].map((u) => store.getHostedUser(app.id, u)))).filter((u) => u !== null).map((u) => [u.id, u]));
  const course = courseSetup(app).courses.find((c) => c.id === question.courseId);
  const lesson = question.lessonId ? findLesson(courseSetup(app), question.lessonId) : null;
  const { t, date } = await dashboardText();
  const when = (at: Date) => t("listings.utc", { time: date(at, WHEN) });
  const student = t("community.student");
  const sr = { sr: (chunk: ReactNode) => <span className="sr-only">{chunk}</span> };

  const asker = users.get(question.userId)?.name ?? student;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, then the thread and the answer form beside the question's state and what to do with it. */}
      <PageHeader
        back={{ href: "/dashboard/courses/questions", label: t("community.backToQuestions") }}
        title={asker}
        description={
          <span className="flex flex-col gap-0.5">
            <span>{t("community.inCourse", { course: course?.title ?? t("community.deletedCourse") })}</span>
            {/* 113.7 A lesson's discussion. */}
            {lesson ? <span className="text-[14px] text-muted">{t("learning.inLesson", { lesson: lesson.lesson.title })}</span> : null}
          </span>
        }
      />
      <DetailLayout
        main={
          <Section titleId="h-thread" title={t("community.questions")} description={t("community.answers", { count: answers.length })}>
            <ol className="m-0 flex list-none flex-col gap-3 p-0" data-testid="question-thread">
              <li className={`flex flex-col gap-1.5 rounded-2xl px-4 py-3.5 ${question.hidden ? "border border-dashed border-line-strong" : "bg-sand"}`} data-hidden={question.hidden ? "true" : undefined}>
                <span className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-muted">
                  {asker} · {when(question.createdAt)}
                  {question.hidden ? <Badge tone="neutral">{t("community.hiddenBadge")}</Badge> : null}
                  {question.pinned ? <Badge tone="info">{t("learning.pinned")}</Badge> : null}
                </span>
                <p className="m-0 text-[16px] leading-relaxed whitespace-pre-wrap" dir="auto">
                  {question.text}
                </p>
                {question.hidden ? <p className="m-0 text-[13px] text-muted">{t("community.questionHidden")}</p> : null}
              </li>
              {answers.map((a) => {
                const name = a.userId === null ? t("community.you") : (users.get(a.userId)?.name ?? student);
                return (
                  <li
                    key={a.id}
                    className={`flex flex-col gap-1 rounded-2xl px-4 py-3 ${a.userId === null ? "ms-6 border border-line bg-white sm:ms-10" : a.hidden ? "border border-dashed border-line-strong" : "bg-sand"}`}
                    data-hidden={a.hidden ? "true" : undefined}
                  >
                    <span className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-muted">
                      {name} · {when(a.createdAt)}
                      {a.hidden ? <Badge tone="neutral">{t("community.hiddenBadge")}</Badge> : null}
                    </span>
                    <p className="m-0 text-[15px] leading-relaxed whitespace-pre-wrap" dir="auto">
                      {a.text}
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                      {a.userId !== null ? (
                        <form action={setAnswerHiddenAction}>
                          <input type="hidden" name="id" value={question.id} />
                          <input type="hidden" name="answerId" value={a.id} />
                          <input type="hidden" name="hidden" value={a.hidden ? "0" : "1"} />
                          <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                            {richText(a.hidden ? t("community.showAnswer", { name }) : t("community.hideAnswer", { name }), sr)}
                          </SubmitButton>
                        </form>
                      ) : null}
                      {/* 113.7 */}
                      <form action={deleteAnswerAction}>
                        <input type="hidden" name="id" value={question.id} />
                        <input type="hidden" name="answerId" value={a.id} />
                        <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                          {richText(t("learning.deleteAnswer", { name }), sr)}
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ol>
            <AnswerForm id={question.id} />
          </Section>
        }
        side={
          <SideCard titleId="h-question" icon="forum" title={t("learning.theQuestion")}>
            <Facts
              columns={1}
              items={[
                { label: t("learning.askedOn"), value: when(question.createdAt) },
                { label: t("common.status"), value: question.hidden ? t("community.hiddenBadge") : question.status === "open" ? t("community.waiting") : t("community.answered") },
              ]}
            />
            {/* 64 Hidden from others; its author still sees it. 113.7 Pinned first in the app, or deleted with its answers. */}
            <div className="flex flex-col gap-2 border-t border-line-soft pt-3">
              <form action={setQuestionPinnedAction}>
                <input type="hidden" name="id" value={question.id} />
                <input type="hidden" name="pinned" value={question.pinned ? "0" : "1"} />
                <SubmitButton variant="secondary" className="h-10 w-full">
                  <Icon name="push_pin" size={18} />
                  {question.pinned ? t("learning.unpin") : t("learning.pin")}
                </SubmitButton>
              </form>
              <form action={setQuestionHiddenAction}>
                <input type="hidden" name="id" value={question.id} />
                <input type="hidden" name="hidden" value={question.hidden ? "0" : "1"} />
                <SubmitButton variant="secondary" className="h-10 w-full">
                  <Icon name={question.hidden ? "visibility" : "visibility_off"} size={18} />
                  {question.hidden ? t("community.showQuestion") : t("community.hideQuestion")}
                </SubmitButton>
              </form>
              <form action={deleteQuestionAction}>
                <input type="hidden" name="id" value={question.id} />
                <SubmitButton variant="danger" className="h-10 w-full">
                  <Icon name="delete" size={18} />
                  {t("learning.deleteQuestion")}
                </SubmitButton>
              </form>
            </div>
          </SideCard>
        }
      />
    </div>
  );
}
