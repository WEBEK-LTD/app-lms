import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { courseSetup, lessonsOf } from "@/lib/courses/setup";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { courseStage } from "@/lib/teachers/service";
import { ReviewForm } from "../forms";
import { isTeachers, NotTeachers, PageHead, StageBadge } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("teachers.review") };
}

/** 105.3 Teachers' courses waiting for the academy: publish, or send back with a note; and those sent back. */
export default async function ReviewPage() {
  const { app } = await requireClient("catalog");
  const { t } = await dashboardText();
  if (!isTeachers(app)) return <NotTeachers title={t("teachers.review")} t={t} />;
  const setup = courseSetup(app);
  const teachers = new Map((await (await getStore()).listTeachers(app.id)).map((teacher) => [teacher.id, teacher]));
  const waiting = setup.courses.filter((c) => c.teacherId && courseStage(c) === "in_review");
  const returned = setup.courses.filter((c) => c.teacherId && courseStage(c) === "returned");
  const line = (c: (typeof waiting)[number]) =>
    t("teachers.reviewLine", {
      teacher: teachers.get(c.teacherId!)?.name ?? c.instructorName ?? "",
      lessons: lessonsOf(c).length,
      price: c.priceCents ? formatCents(c.priceCents, setup.currency) : t("common.free"),
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("teachers.review")} intro={t("teachers.reviewIntro")} />
      <section aria-labelledby="h-waiting" className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-waiting" className="m-0 text-lg font-bold">
          {t("teachers.stage_in_review")}
        </h2>
        {waiting.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("teachers.noReview")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {waiting.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 border-t border-line-soft py-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{c.title}</span>
                    <span className="text-[13px] text-muted">{line(c)}</span>
                  </span>
                  <Link href={`/dashboard/courses/${c.id}`} className="inline-flex items-center gap-1 text-sm font-semibold">
                    {t("teachers.open")}
                    <Icon name="arrow_forward" size={18} />
                  </Link>
                </div>
                <ReviewForm courseId={c.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {returned.length ? (
        <section aria-labelledby="h-returned" className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-returned" className="m-0 text-lg font-bold">
            {t("teachers.returnedTitle")}
          </h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {returned.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{c.title}</span>
                  <span className="text-[13px] text-muted">{line(c)}</span>
                  {c.reviewNote ? <span className="text-[13px]">{t("teachers.reviewNote", { note: c.reviewNote })}</span> : null}
                </span>
                <StageBadge stage="returned" t={t} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
