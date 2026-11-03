import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, btn } from "@/components/ui";
import { ItemList, ItemRow, Thumb } from "@/components/page-kit";
import { ChipLinks, ListBar, Pager } from "@/components/page-kit-c";
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

  const row = (r: SchoolReport, i: number) => (
    <ItemRow
      key={r.id}
      data-report={r.id}
      href={`${base}/${r.id}`}
      media={<Thumb icon="description" shape="square" tint={i} />}
      title={r.templateName}
      badges={r.status === "sent" && r.readAt === null ? <Badge tone="danger">{t("reports.new")}</Badge> : null}
      meta={[reportAbout(r, dir), r.teacherName, r.subjectId !== null ? dir.subjects.get(r.subjectId)?.name : null, r.sentAt ? t("reports.sentOn", { date: r.sentAt.toISOString().slice(0, 10) }) : null].filter(Boolean).join(" · ")}
      aside={
        <>
          {r.sharedAt ? <Badge tone="neutral">{t("reports.sharedBadge")}</Badge> : null}
          <StatusBadge status={r.status} t={t} />
        </>
      }
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header (with the way back from one student's reports), then the reports with their chips and filters in the list's bar. */}
      <PageHead
        title={t("reports.inbox")}
        intro={student ? t("reports.historyOf", { name: student.name }) : t("reports.inboxIntro")}
        back={student ? { href: base, label: t("reports.allReports") } : undefined}
        actions={
          <Link href="/dashboard/school/report-templates" className={`${btn.secondary} h-11 px-4`}>
            {t("reports.templates")}
          </Link>
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {templates.length === 0 ? <FirstNote text={t("reports.templatesFirst")} href="/dashboard/school/report-templates" /> : null}
      <Panel id="h-reports" title={student ? t("reports.historyOf", { name: student.name }) : t(FILTER_KEYS[filter])} flush>
        {student ? null : (
          <ListBar>
            <ChipLinks label={t("reports.inbox")} items={FILTERS.map((f) => ({ href: `${base}?status=${f}${keep}`, label: t(FILTER_KEYS[f]), count: f === "sent" ? waiting : undefined, current: f === filter }))} />
            <form method="get" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="status" value={filter} />
              <Choice id="f-filter-class" name="class" label={t("school.class")} options={classes.map((c) => ({ value: String(c.id), label: c.name }))} defaultValue={classId ? String(classId) : ""} empty={t("reports.anyClass")} />
              <Choice id="f-filter-teacher" name="teacher" label={t("school.teacher")} options={teachers.map((p) => ({ value: String(p.id), label: p.name }))} defaultValue={teacherId ? String(teacherId) : ""} empty={t("reports.anyTeacher")} />
              <button type="submit" className={`${btn.secondary} h-10 px-3.5 text-sm`}>
                {t("lms.showPeriod")}
              </button>
            </form>
          </ListBar>
        )}
        {shown.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="description" title={filter === "sent" && !student ? t("reports.nothingToReview") : t("reports.noReports")} />
          </div>
        ) : null}
        <ItemList>{shown.map(row)}</ItemList>
        {pages > 1 ? (
          <Pager
            label={t("school.pages")}
            prev={page > 1 ? { href: `${base}?status=${filter}${keep}&page=${page - 1}`, label: t("school.previous") } : null}
            next={page < pages ? { href: `${base}?status=${filter}${keep}&page=${page + 1}`, label: t("school.next") } : null}
            text={t("school.pageOf", { page, pages })}
          />
        ) : null}
      </Panel>
    </div>
  );
}
