import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import type { App } from "@/lib/data/types";
import { hasFeature, type PlanInfo } from "@/lib/plans";
import type { CourseStage } from "@/lib/teachers/service";
import { isTeachersApp } from "@/lib/teachers/service";

/** 105.3 What the Teachers, Courses to review and Teacher statements pages share. */

export const isTeachers = (app: App | null): app is App => app !== null && isTeachersApp(app);

/** The page for apps that aren't academies with many teachers. */
export function NotTeachers({ title, t }: { title: string; t: DashT }) {
  return <PageHeader title={title} description={t("teachers.notHere")} />;
}

/** Teachers aren't in the plan yet: everything can be set up, the app shows them once they are. */
export function TeachersPlanNotice({ plan, t }: { plan: PlanInfo | null; t: DashT }) {
  if (!plan || hasFeature(plan, "instructors")) return null;
  return (
    <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
      {richText(t("teachers.notOnPlan"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}
    </p>
  );
}

/** The page kit's header, for the Courses to review and Teacher statements pages. */
export function PageHead({ title, intro }: { title: string; intro: string }) {
  return <PageHeader title={title} description={intro} />;
}

const STAGE_TONES: Record<CourseStage, "neutral" | "info" | "success" | "warn"> = {
  draft: "neutral",
  in_review: "warn",
  returned: "info",
  published: "success",
  hidden: "neutral",
};

export function StageBadge({ stage, t }: { stage: CourseStage; t: DashT }) {
  return <Badge tone={STAGE_TONES[stage]}>{t(`teachers.stage_${stage}` as DashKey)}</Badge>;
}
