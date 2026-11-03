import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, Section } from "@/components/ui";
import { ItemList, ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { assetUrl } from "@/lib/assets";
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
      {/* The page kit: the header, the numbers, the courses waiting (each with its review form), then those sent back. */}
      <PageHead title={t("teachers.review")} intro={t("teachers.reviewIntro")} />
      <StatRow label={t("teachers.review")}>
        <Stat icon="pending" tone="warn" label={t("teachers.stage_in_review")} value={waiting.length} />
        <Stat icon="undo" label={t("teachers.returnedTitle")} value={returned.length} />
      </StatRow>

      <Section titleId="h-waiting" title={t("teachers.stage_in_review")} actions={<Badge tone="neutral">{waiting.length}</Badge>} flush>
        {waiting.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="task_alt" title={t("teachers.noReview")} />
          </div>
        ) : (
          <ItemList>
            {waiting.map((c, i) => (
              <li key={c.id} className="flex flex-col gap-3 border-t border-line-soft px-5 py-4 first:border-t-0 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3.5">
                    <Thumb src={c.imageAssetId ? assetUrl(c.imageAssetId) : null} icon="school" tint={i} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[15px] font-bold break-words">{c.title}</span>
                      <span className="text-[13px] text-muted">{line(c)}</span>
                    </span>
                  </span>
                  <Link href={`/dashboard/courses/${c.id}`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                    {t("teachers.open")}
                    <Icon name="arrow_forward" size={18} />
                  </Link>
                </div>
                <div className="rounded-xl bg-sand p-4">
                  <ReviewForm courseId={c.id} />
                </div>
              </li>
            ))}
          </ItemList>
        )}
      </Section>

      {returned.length ? (
        <Section titleId="h-returned" title={t("teachers.returnedTitle")} actions={<Badge tone="neutral">{returned.length}</Badge>} flush>
          <ItemList>
            {returned.map((c, i) => (
              <ItemRow
                key={c.id}
                href={`/dashboard/courses/${c.id}`}
                media={<Thumb src={c.imageAssetId ? assetUrl(c.imageAssetId) : null} icon="school" tint={i + 2} />}
                title={c.title}
                meta={line(c)}
                extra={c.reviewNote ? <span className="text-ink-3">{t("teachers.reviewNote", { note: c.reviewNote })}</span> : null}
                aside={<StageBadge stage="returned" t={t} />}
              />
            ))}
          </ItemList>
        </Section>
      ) : null}
    </div>
  );
}
