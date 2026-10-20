import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setAnswerHiddenAction, setQuestionHiddenAction } from "@/app/actions/course-community";
import { SubmitButton } from "@/components/form";
import { Badge } from "@/components/ui";
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
  const { t, date } = await dashboardText();
  const when = (at: Date) => t("listings.utc", { time: date(at, WHEN) });
  const student = t("community.student");
  const sr = { sr: (chunk: ReactNode) => <span className="sr-only">{chunk}</span> };

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/courses/questions" className="text-sm font-semibold">
          {t("community.backToQuestions")}
        </Link>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{users.get(question.userId)?.name ?? student}</h1>
        <p className="m-0 text-[15px] text-ink-4">{t("community.inCourse", { course: course?.title ?? t("community.deletedCourse") })}</p>
      </div>
      <section aria-label={t("community.questions")} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <ol className="m-0 flex list-none flex-col gap-3 p-0" data-testid="question-thread">
          <li className={`flex flex-col gap-1 rounded-xl px-4 py-3 ${question.hidden ? "border border-dashed border-line" : "bg-sand"}`} data-hidden={question.hidden ? "true" : undefined}>
            <span className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-muted">
              {users.get(question.userId)?.name ?? student} · {when(question.createdAt)}
              {question.hidden ? <Badge tone="neutral">{t("community.hiddenBadge")}</Badge> : null}
            </span>
            <p className="m-0 whitespace-pre-wrap text-[15px]">{question.text}</p>
            {question.hidden ? <p className="m-0 text-[13px] text-muted">{t("community.questionHidden")}</p> : null}
            {/* 64 Hidden from others; its author still sees it. */}
            <form action={setQuestionHiddenAction} className="flex justify-end">
              <input type="hidden" name="id" value={question.id} />
              <input type="hidden" name="hidden" value={question.hidden ? "0" : "1"} />
              <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                {question.hidden ? t("community.showQuestion") : t("community.hideQuestion")}
              </SubmitButton>
            </form>
          </li>
          {answers.map((a) => {
            const name = a.userId === null ? t("community.you") : (users.get(a.userId)?.name ?? student);
            return (
              <li
                key={a.id}
                className={`flex flex-col gap-1 rounded-xl px-4 py-3 ${a.userId === null ? "ms-8 border border-line" : a.hidden ? "border border-dashed border-line" : "bg-sand"}`}
                data-hidden={a.hidden ? "true" : undefined}
              >
                <span className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-muted">
                  {name} · {when(a.createdAt)}
                  {a.hidden ? <Badge tone="neutral">{t("community.hiddenBadge")}</Badge> : null}
                </span>
                <p className="m-0 whitespace-pre-wrap text-[15px]">{a.text}</p>
                {a.userId !== null ? (
                  <form action={setAnswerHiddenAction} className="flex justify-end">
                    <input type="hidden" name="id" value={question.id} />
                    <input type="hidden" name="answerId" value={a.id} />
                    <input type="hidden" name="hidden" value={a.hidden ? "0" : "1"} />
                    <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                      {richText(a.hidden ? t("community.showAnswer", { name }) : t("community.hideAnswer", { name }), sr)}
                    </SubmitButton>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ol>
        <AnswerForm id={question.id} />
      </section>
    </div>
  );
}
