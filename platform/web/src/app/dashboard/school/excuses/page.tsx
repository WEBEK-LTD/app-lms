import type { Metadata } from "next";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { schoolSettingsOf } from "@/lib/school/settings";
import { isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";
import { ExcuseItem } from "./parts";

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

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("parents.excuses")} intro={t("parents.excusesIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      <Panel id="h-excuses" title={t("parents.excuses")} intro={waiting.length ? t("parents.waitingCount", { count: waiting.length }) : undefined}>
        {ordered.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("parents.noExcuses")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {ordered.map((e) => (
            <ExcuseItem key={e.id} excuse={e} student={byId.get(e.studentId)} parent={e.parentId !== null ? byId.get(e.parentId) : undefined} className={classOf(e.studentId)} t={t} timezone={settings.timezone} />
          ))}
        </ul>
      </Panel>
    </div>
  );
}
