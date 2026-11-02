import type { Metadata } from "next";
import Link from "next/link";
import { Badge, btn } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolReport } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { schoolDirectory } from "@/lib/school/service";
import { reportAbout } from "@/lib/school/teacher-reports";
import { Choice } from "../forms";
import { FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";
import { StatusBadge } from "../report-parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("reports.inbox") };
}

const FILTERS = ["sent", "returned", "approved", "all"] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_KEYS: Record<Filter, DashKey> = { sent: "reports.toReview", returned: "reports.statusReturned", approved: "reports.statusApproved", all: "reports.all" };
const PER_PAGE = 50;

/**
 * 113.5 The teachers' reports to the administration: those to review first
 * (new ones marked), sent back, approved; by class or teacher, and a
 * student's history. Drafts stay the teachers' own.
 */
export default async function TeacherReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; class?: string; teacher?: string; student?: string; page?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("reports.inbox")} t={t} />;
  const params = await searchParams;
  const store = await getStore();
  const [dir, templates, plan] = await Promise.all([schoolDirectory(store, app.id), store.listSchoolReportTemplates(app.id), appPlan(store, license, new Date())]);
  const student = params.student ? (dir.people.get(Number(params.student)) ?? null) : null;
  const filter: Filter = student ? "all" : ((FILTERS as readonly string[]).includes(params.status ?? "") ? (params.status as Filter) : "sent");
  const classId = Number(params.class) || undefined;
  const teacherId = Number(params.teacher) || undefined;
  const all = await store.listSchoolReports(app.id, {
    statuses: filter === "all" ? ["sent", "returned", "approved"] : [filter],
    ...(student ? { studentId: student.id } : {}),
    ...(classId ? { classId } : {}),
    ...(teacherId ? { teacherId } : {}),
  });
  // The oldest waiting first when there's something to review; the last changed first otherwise.
  const list = filter === "sent" ? [...all].sort((a, b) => (a.sentAt?.getTime() ?? 0) - (b.sentAt?.getTime() ?? 0)) : all;
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const waiting = (await store.listSchoolReports(app.id, { statuses: ["sent"] })).length;
  const classes = [...dir.classes.values()].sort((a, b) => a.position - b.position);
  const teachers = [...dir.people.values()].filter((p) => p.role === "teacher").sort((a, b) => a.name.localeCompare(b.name));
  const keep = `${classId ? `&class=${classId}` : ""}${teacherId ? `&teacher=${teacherId}` : ""}`;
  const base = "/dashboard/school/teacher-reports";

  const row = (r: SchoolReport) => (
    <li key={r.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0" data-report={r.id}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link href={`${base}/${r.id}`} className="text-[15px] font-bold">
          {r.templateName}
        </Link>
        <span className="text-[13px] text-muted">
          {[reportAbout(r, dir), r.teacherName, r.subjectId !== null ? dir.subjects.get(r.subjectId)?.name : null, r.sentAt ? t("reports.sentOn", { date: r.sentAt.toISOString().slice(0, 10) }) : null].filter(Boolean).join(" · ")}
        </span>
      </span>
      {r.status === "sent" && r.readAt === null ? <Badge tone="danger">{t("reports.new")}</Badge> : null}
      {r.sharedAt ? <Badge tone="neutral">{t("reports.sharedBadge")}</Badge> : null}
      <StatusBadge status={r.status} t={t} />
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("reports.inbox")} intro={t("reports.inboxIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {templates.length === 0 ? <FirstNote text={t("reports.templatesFirst")} href="/dashboard/school/report-templates" /> : null}
      {student ? (
        <p className="m-0 flex flex-wrap items-center gap-3 text-[15px]">
          <span className="font-bold">{t("reports.historyOf", { name: student.name })}</span>
          <Link href={base}>{t("reports.allReports")}</Link>
        </p>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <nav aria-label={t("reports.inbox")} className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Link
                key={f}
                href={`${base}?status=${f}${keep}`}
                aria-current={f === filter ? "page" : undefined}
                className={`flex h-9 items-center rounded-full border px-3.5 text-sm no-underline ${
                  f === filter ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-ink-3 hover:border-midnight hover:text-midnight"
                }`}
              >
                {t(FILTER_KEYS[f])}
                {f === "sent" && waiting ? ` (${waiting})` : ""}
              </Link>
            ))}
          </nav>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="status" value={filter} />
            <Choice id="f-filter-class" name="class" label={t("school.class")} options={classes.map((c) => ({ value: String(c.id), label: c.name }))} defaultValue={classId ? String(classId) : ""} empty={t("reports.anyClass")} />
            <Choice id="f-filter-teacher" name="teacher" label={t("school.teacher")} options={teachers.map((p) => ({ value: String(p.id), label: p.name }))} defaultValue={teacherId ? String(teacherId) : ""} empty={t("reports.anyTeacher")} />
            <button type="submit" className={`${btn.secondary} h-10 px-4 text-sm`}>
              {t("lms.showPeriod")}
            </button>
          </form>
        </div>
      )}
      <Panel id="h-reports" title={student ? t("reports.historyOf", { name: student.name }) : t(FILTER_KEYS[filter])}>
        {shown.length === 0 ? <p className="m-0 text-[15px] text-muted">{filter === "sent" && !student ? t("reports.nothingToReview") : t("reports.noReports")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">{shown.map(row)}</ul>
        {pages > 1 ? (
          <nav aria-label={t("school.pages")} className="flex items-center justify-between gap-3 text-[15px]">
            {page > 1 ? <Link href={`${base}?status=${filter}${keep}&page=${page - 1}`}>{t("school.previous")}</Link> : <span />}
            <span className="text-muted">{t("school.pageOf", { page, pages })}</span>
            {page < pages ? <Link href={`${base}?status=${filter}${keep}&page=${page + 1}`}>{t("school.next")}</Link> : <span />}
          </nav>
        ) : null}
      </Panel>
    </div>
  );
}
