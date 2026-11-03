import type { Metadata } from "next";
import { saveSlipAction } from "@/app/actions/school-parent";
import { Badge } from "@/components/ui";
import { ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { slipCounts, slipFor, slipForName, slipOpen } from "@/lib/school/parent";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
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

  const has = slips.length > 0;
  const openCount = slips.filter((slip) => slipOpen(slip, today)).length;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, then the slips, each opening its answers. */}
      <PageHead
        title={t("parents.slips")}
        intro={t("parents.slipsIntro")}
        actions={
          has ? (
            <SheetButton target="new-slip" icon="send">
              {t("parents.sendSlip")}
            </SheetButton>
          ) : null
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {has ? (
        <StatRow label={t("parents.slips")}>
          <Stat icon="description" tone="accent" label={t("parents.slips")} value={slips.length} />
          <Stat icon="hourglass_top" tone="success" label={t("parents.open")} value={openCount} />
          <Stat icon="lock" label={t("parents.closed")} value={slips.length - openCount} />
        </StatRow>
      ) : null}
      {has ? (
        <Panel id="h-slips" title={t("parents.slips")} flush>
          <ul className="m-0 flex list-none flex-col p-0" data-slips>
            {slips.map((slip, i) => {
              const counts = slipCounts(
                active.filter((s) => slipFor(slip, s, byClass)),
                answers.filter((a) => a.slipId === slip.id),
              );
              const open = slipOpen(slip, today);
              return (
                <ItemRow
                  key={slip.id}
                  href={`/dashboard/school/slips/${slip.id}`}
                  media={<Thumb icon="description" shape="square" tint={i} />}
                  title={slip.title}
                  meta={[t("parents.dueLine", { date: slip.dueOn }), slipForName(slip, byClass) ?? t("schoolLife.forSchool"), slip.feeNote ? t("parents.feeIs", { note: slip.feeNote }) : null].filter(Boolean).join(" · ")}
                  extra={<span>{t("parents.counts", counts)}</span>}
                  aside={<Badge tone={open ? "success" : "neutral"}>{t(open ? "parents.open" : "parents.closed")}</Badge>}
                />
              );
            })}
          </ul>
        </Panel>
      ) : null}
      {/* One place in the page either way, so the form that sends the first slip keeps its message. */}
      <Sheet id="new-slip" inline={!has} title={t("parents.sendSlip")} description={has ? undefined : t("parents.noSlips")}>
        <SchoolForm action={saveSlipAction} submit={t("parents.send")} reset sheet>
          <SlipFields slip={null} classes={classes} today={today} t={t} />
        </SchoolForm>
      </Sheet>
    </div>
  );
}
