import Link from "next/link";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import type { App, UniSettings, UniTerm } from "@/lib/data/types";
import type { PlanInfo } from "@/lib/plans";
import { universityInPlan } from "@/lib/university/settings";
import { PageHead, SchoolPlanNotice } from "../parts";

export { FirstNote, isSchool, NotSchool, Panel } from "../parts";

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

const pill = (active: boolean) =>
  `flex h-9 items-center rounded-full border px-3.5 text-sm no-underline ${
    active ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-ink-3 hover:border-midnight hover:text-midnight"
  }`;

export function UniTabs({ current, t }: { current: string; t: DashT }) {
  return (
    <nav aria-label={t("university.title")} className="flex max-w-[960px] flex-wrap gap-1.5">
      {TABS.map((tab) => (
        <Link key={tab.path} href={`${UNI_BASE}${tab.path}`} aria-current={tab.path === current ? "page" : undefined} className={pill(tab.path === current)}>
          {t(tab.key)}
        </Link>
      ))}
    </nav>
  );
}

/** The page's title, the plan's notes, university mode off, and the tabs. */
export function UniHead({ title, intro, current, t, app, plan, settings }: { title: string; intro: string; current: string; t: DashT; app: App; plan: PlanInfo | null; settings: UniSettings }) {
  return (
    <>
      <PageHead title={title} intro={intro} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {plan && !universityInPlan(app, plan) ? (
        <p role="note" className="m-0 max-w-[860px] rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
          {richText(t("university.notOnPlan"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}
        </p>
      ) : null}
      {!settings.enabled && current !== "" ? (
        <p role="note" className="m-0 max-w-[860px] rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
          {richText(t("university.modeOff"), { link: (chunk) => <Link href={UNI_BASE}>{chunk}</Link> })}
        </p>
      ) : null}
      <UniTabs current={current} t={t} />
    </>
  );
}

/** A term picker as links (`?term=`). */
export function TermTabs({ terms, current, base, label, extra = "" }: { terms: readonly UniTerm[]; current: number | null; base: string; label: string; extra?: string }) {
  if (!terms.length) return null;
  return (
    <nav aria-label={label} className="flex max-w-[960px] flex-wrap gap-1.5">
      {[...terms]
        .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
        .map((term) => (
          <Link key={term.id} href={`${base}?term=${term.id}${extra}`} aria-current={term.id === current ? "page" : undefined} className={pill(term.id === current)}>
            {term.name}
          </Link>
        ))}
    </nav>
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
