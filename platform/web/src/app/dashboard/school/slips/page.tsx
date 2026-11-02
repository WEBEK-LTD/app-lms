import type { Metadata } from "next";
import Link from "next/link";
import { saveSlipAction } from "@/app/actions/school-parent";
import { Badge } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { slipCounts, slipFor, slipForName, slipOpen } from "@/lib/school/parent";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { AddServiceBox } from "../../delivery/forms";
import { SchoolForm } from "../forms";
import { isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";
import { SlipFields } from "./parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("parents.slips") };
}

/**
 * 113.4 Permission slips: sent to a class, a grade or the whole school,
 * signed yes or no by the parents in the app by the due date; each slip's
 * count of yes, no and not yet, and its answers on its own page.
 */
export default async function SchoolSlipsPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("parents.slips")} t={t} />;
  const store = await getStore();
  const now = new Date();
  const [saved, classes, students, slips, plan] = await Promise.all([
    store.getSchoolSettings(app.id),
    store.listSchoolClasses(app.id),
    store.listSchoolPeople(app.id, { role: "student" }),
    store.listSchoolSlips(app.id),
    appPlan(store, license, now),
  ]);
  const today = schoolToday(schoolSettingsOf(saved, app), now);
  const answers = slips.length ? await store.listSchoolSlipAnswers(app.id, { slipIds: slips.map((s) => s.id) }) : [];
  const byClass = new Map(classes.map((c) => [c.id, c]));
  const active = students.filter((s) => s.active);

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("parents.slips")} intro={t("parents.slipsIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      <Panel id="h-slips" title={t("parents.slips")}>
        {slips.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("parents.noSlips")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-slips>
          {slips.map((slip) => {
            const counts = slipCounts(
              active.filter((s) => slipFor(slip, s, byClass)),
              answers.filter((a) => a.slipId === slip.id),
            );
            const open = slipOpen(slip, today);
            return (
              <li key={slip.id} className="flex flex-wrap items-center gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <span className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                  <Link href={`/dashboard/school/slips/${slip.id}`} className="text-[15px] font-bold">
                    {slip.title}
                  </Link>
                  <span className="text-[13px] text-muted">{[t("parents.dueLine", { date: slip.dueOn }), slipForName(slip, byClass) ?? t("schoolLife.forSchool"), slip.feeNote ? t("parents.feeIs", { note: slip.feeNote }) : null].filter(Boolean).join(" · ")}</span>
                  <span className="text-[13px] text-ink-4">{t("parents.counts", counts)}</span>
                </span>
                <Badge tone={open ? "success" : "neutral"}>{t(open ? "parents.open" : "parents.closed")}</Badge>
                <Link href={`/dashboard/school/slips/${slip.id}`} className="text-sm">
                  {t("parents.answers")}
                </Link>
              </li>
            );
          })}
        </ul>
        <AddServiceBox title={t("parents.sendSlip")} open={slips.length === 0}>
          <SchoolForm action={saveSlipAction} submit={t("parents.send")} reset>
            <SlipFields slip={null} classes={classes} today={today} t={t} />
          </SchoolForm>
        </AddServiceBox>
      </Panel>
    </div>
  );
}
