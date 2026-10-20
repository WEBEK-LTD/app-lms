import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth/session";
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
          <li className="flex flex-col gap-1 rounded-xl bg-sand px-4 py-3">
            <span className="text-[13px] font-semibold text-muted">
              {users.get(question.userId)?.name ?? student} · {when(question.createdAt)}
            </span>
            <p className="m-0 whitespace-pre-wrap text-[15px]">{question.text}</p>
          </li>
          {answers.map((a) => (
            <li key={a.id} className={`flex flex-col gap-1 rounded-xl px-4 py-3 ${a.userId === null ? "ms-8 border border-line" : "bg-sand"}`}>
              <span className="text-[13px] font-semibold text-muted">
                {a.userId === null ? t("community.you") : (users.get(a.userId)?.name ?? student)} · {when(a.createdAt)}
              </span>
              <p className="m-0 whitespace-pre-wrap text-[15px]">{a.text}</p>
            </li>
          ))}
        </ol>
        <AnswerForm id={question.id} />
      </section>
    </div>
  );
}
