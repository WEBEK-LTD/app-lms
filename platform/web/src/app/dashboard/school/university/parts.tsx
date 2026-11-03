import Link from "next/link";
import type { ReactNode } from "react";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import type { App, UniSettings, UniTerm } from "@/lib/data/types";
import type { PlanInfo } from "@/lib/plans";
import { universityInPlan } from "@/lib/university/settings";
import { Icon } from "@/components/icon";
import { ChipLinks } from "@/components/page-kit-c";
import { PageHead, SchoolPlanNotice } from "../parts";

export { AddSheet, EditSheet, FirstNote, isSchool, NotSchool, Panel } from "../parts";

/** 113.9 What the University pages share: their tabs, the notes on top and a term picker. */

export const UNI_BASE = "/dashboard/school/university";

const TABS: { path: string; key: DashKey }[] = [
  { path: "", key: "university.tabSettings" },
  { path: "/structure", key: "university.tabStructure" },
  { path: "/programs", key: "university.tabPrograms" },
  { path: "/courses", key: "university.tabCourses" },
  { path: "/students", key: "university.tabStudents" },
  { path: "/terms", key: "university.tabTerms" },
  { path: "/registration", key: "university.tabRegistration" },
  { path: "/results", key: "university.tabResults" },
  { path: "/transcripts", key: "university.tabTranscripts" },
];

/** The pages as the kit's chips. */
export function UniTabs({ current, t }: { current: string; t: DashT }) {
  return <ChipLinks label={t("university.title")} items={TABS.map((tab) => ({ href: `${UNI_BASE}${tab.path}`, label: t(tab.key), current: tab.path === current }))} />;
}

/** A note on top, with its link. */
function UniNote({ children }: { children: ReactNode }) {
  return (
    <p role="note" className="m-0 flex gap-2.5 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
      <Icon name="info" size={22} className="shrink-0 text-accent" />
      <span>{children}</span>
    </p>
  );
}

/** The page's title, the plan's notes, university mode off, and the tabs. */
export function UniHead({ title, intro, current, t, app, plan, settings }: { title: string; intro: string; current: string; t: DashT; app: App; plan: PlanInfo | null; settings: UniSettings }) {
  return (
    <>
      <PageHead title={title} intro={intro} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {plan && !universityInPlan(app, plan) ? (
        <UniNote>{richText(t("university.notOnPlan"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}</UniNote>
      ) : null}
      {!settings.enabled && current !== "" ? (
        <UniNote>{richText(t("university.modeOff"), { link: (chunk) => <Link href={UNI_BASE}>{chunk}</Link> })}</UniNote>
      ) : null}
      <UniTabs current={current} t={t} />
    </>
  );
}

/** A term picker as links (`?term=`). */
export function TermTabs({ terms, current, base, label, extra = "" }: { terms: readonly UniTerm[]; current: number | null; base: string; label: string; extra?: string }) {
  if (!terms.length) return null;
  return (
    <ChipLinks
      label={label}
      items={[...terms].sort((a, b) => a.startsOn.localeCompare(b.startsOn)).map((term) => ({ href: `${base}?term=${term.id}${extra}`, label: term.name, current: term.id === current }))}
    />
  );
}

export const STATUS_KEYS = {
  draft: "university.statusDraft",
  submitted: "university.statusSubmitted",
  approved: "university.statusApproved",
  returned: "university.statusReturned",
} as const satisfies Record<string, DashKey>;

export const ENROLMENT_KEYS = {
  pending: "university.enrolPending",
  enrolled: "university.enrolEnrolled",
  waitlisted: "university.enrolWaitlisted",
  dropped: "university.enrolDropped",
} as const satisfies Record<string, DashKey>;

/** "3" or "3.5" credits. */
export const credits = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
export const gpa = (value: number | null) => (value === null ? "—" : value.toFixed(2));
