import type { Metadata } from "next";
import { Stat, StatRow } from "@/components/page-kit";
import { saveUniSettingsAction } from "@/app/actions/university";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { scaleText } from "@/lib/university/forms";
import { loadUniSettings } from "@/lib/university/settings";
import { Choice, SchoolForm } from "../forms";
import { isSchool, NotSchool, Panel, UNI_BASE, UniHead } from "./parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("university.title") };
}

/** 113.9 The school as a university: the switch, the waiting list, the current term and the grading scale. */
export default async function UniversitySettingsPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("university.title")} t={t} />;
  const store = await getStore();
  const [settings, terms, faculties, programs, courses, plan] = await Promise.all([
    loadUniSettings(store, app.id),
    store.listUniTerms(app.id),
    store.listUniFaculties(app.id),
    store.listUniPrograms(app.id),
    store.listUniCourses(app.id),
    appPlan(store, license, new Date()),
  ]);
  const termOptions = terms.map((term) => ({ value: String(term.id), label: `${term.name} (${term.academicYear})` }));
  return (
    <div className="flex flex-col gap-6">
      <UniHead title={t("university.title")} intro={t("university.intro")} current="" t={t} app={app} plan={plan} settings={settings} />
      {/* The page kit: the university's numbers, each opening its page, then its settings. */}
      <StatRow label={t("university.counts", { faculties: faculties.length, programs: programs.length, courses: courses.length, terms: terms.length })}>
        <Stat icon="apartment" label={t("university.tabStructure")} value={faculties.length} href={`${UNI_BASE}/structure`} />
        <Stat icon="workspace_premium" tone="accent" label={t("university.tabPrograms")} value={programs.length} href={`${UNI_BASE}/programs`} />
        <Stat icon="menu_book" label={t("university.tabCourses")} value={courses.length} href={`${UNI_BASE}/courses`} />
        <Stat icon="calendar_month" label={t("university.tabTerms")} value={terms.length} href={`${UNI_BASE}/terms`} />
      </StatRow>
      <Panel id="h-uni-settings" title={t("university.settingsTitle")} intro={t("university.settingsIntro")}>
        <SchoolForm action={saveUniSettingsAction} submit={t("university.saveSettings")}>
          <label className="flex items-start gap-2 text-[15px]">
            <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t("university.enabled")}</span>
              <span className="text-[14px] text-muted">{t("university.enabledHint")}</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-[15px]">
            <input type="checkbox" name="waitlist" defaultChecked={settings.waitlist} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t("university.waitlist")}</span>
              <span className="text-[14px] text-muted">{t("university.waitlistHint")}</span>
            </span>
          </label>
          <Choice id="f-current-term" name="currentTermId" label={t("university.currentTerm")} options={termOptions} defaultValue={settings.currentTermId ? String(settings.currentTermId) : ""} empty={t("university.currentTermAuto")} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-scale" className="text-sm font-semibold">
              {t("university.scale")}
            </label>
            <textarea id="f-scale" name="scale" rows={11} dir="ltr" defaultValue={scaleText(settings.scale)} className="input min-h-48 py-3 font-mono text-[14px]" />
            <span className="text-[13px] text-muted">{t("university.scaleHint")}</span>
          </div>
        </SchoolForm>
      </Panel>
    </div>
  );
}
