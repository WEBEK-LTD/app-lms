import type { Metadata } from "next";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { schoolSettingsOf } from "@/lib/school/settings";
import { EmptyState } from "@/components/ui";
import { Stat, StatRow } from "@/components/page-kit";
import { FilterList } from "@/components/page-kit-client";
import { isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";
import { EXCUSE_KEYS, ExcuseItem } from "./parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("parents.excuses") };
}

/**
 * 113.4 The parents' excuses for their children's absences, waiting ones
 * first: accepted (those days excused in the register and at the gate) or
 * declined with a note; the parents are told in the app.
 */
export default async function SchoolExcusesPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("parents.excuses")} t={t} />;
  const store = await getStore();
  const now = new Date();
  const [saved, people, classes, excuses, plan] = await Promise.all([store.getSchoolSettings(app.id), store.listSchoolPeople(app.id), store.listSchoolClasses(app.id), store.listSchoolExcuses(app.id), appPlan(store, license, now)]);
  const settings = schoolSettingsOf(saved, app);
  const byId = new Map(people.map((p) => [p.id, p]));
  const className = new Map(classes.map((c) => [c.id, c.name]));
  const waiting = excuses.filter((e) => e.status === "pending").sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.id - b.id);
  const ordered = [...waiting, ...excuses.filter((e) => e.status !== "pending")].slice(0, 200);
  const classOf = (id: number) => {
    const student = byId.get(id);
    return student?.classId ? (className.get(student.classId) ?? null) : null;
  };

  const count = (status: (typeof excuses)[number]["status"]) => excuses.filter((e) => e.status === status).length;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the numbers by answer, then the excuses (waiting ones first) with search and filters. */}
      <PageHead title={t("parents.excuses")} intro={t("parents.excusesIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {excuses.length ? (
        <StatRow label={t("parents.excuses")}>
          <Stat icon="pending" tone={waiting.length ? "warn" : "neutral"} label={t(EXCUSE_KEYS.pending)} value={waiting.length} />
          <Stat icon="check_circle" tone="success" label={t(EXCUSE_KEYS.accepted)} value={count("accepted")} />
          <Stat icon="cancel" label={t(EXCUSE_KEYS.declined)} value={count("declined")} />
        </StatRow>
      ) : null}
      <Panel id="h-excuses" title={t("parents.excuses")} intro={waiting.length ? t("parents.waitingCount", { count: waiting.length }) : undefined} flush>
        {ordered.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="event_busy" title={t("parents.noExcuses")} />
          </div>
        ) : (
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("parents.searchExcuses")}
            noMatch={t("parents.noExcuseMatch")}
            filters={(["pending", "accepted", "declined", "cancelled"] as const).map((s) => ({ value: s, label: t(EXCUSE_KEYS[s]) }))}
            items={ordered.map((e) => ({
              id: e.id,
              text: [byId.get(e.studentId)?.name, classOf(e.studentId), e.reason].filter(Boolean).join(" "),
              group: e.status,
              node: <ExcuseItem excuse={e} student={byId.get(e.studentId)} parent={e.parentId !== null ? byId.get(e.parentId) : undefined} className={classOf(e.studentId)} t={t} timezone={settings.timezone} />,
            }))}
          />
        )}
      </Panel>
    </div>
  );
}
