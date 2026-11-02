import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteSlipAction, saveSlipAction } from "@/app/actions/school-parent";
import { Badge, btn } from "@/components/ui";
import { ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { ChipLinks, ListBar } from "@/components/page-kit-c";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { utcToLocal } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { slipCounts, slipFor, slipForName, slipOpen } from "@/lib/school/parent";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { ConfirmButton } from "../../../chat/forms";
import { SchoolForm } from "../../forms";
import { isSchool, NotSchool, PageHead, Panel } from "../../parts";
import { SlipFields } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("parents.answers") };
}

const SHOWS = ["all", "yes", "no", "waiting"] as const;
const SHOW_KEYS: Record<(typeof SHOWS)[number], DashKey> = { all: "parents.all", yes: "parents.signedYes", no: "parents.declined", waiting: "parents.notAnswered" };

/** 113.4 A permission slip's answers: each student it is for, signed yes, declined or not yet, with who signed and when. */
export default async function SchoolSlipPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ show?: string }> }) {
  const { app } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("parents.slips")} t={t} />;
  const { id } = await params;
  const store = await getStore();
  const slip = /^\d{1,15}$/.test(id) ? await store.getSchoolSlip(app.id, Number(id)) : null;
  if (!slip) notFound();
  const wanted = (await searchParams).show ?? "";
  const show = (SHOWS as readonly string[]).includes(wanted) ? (wanted as (typeof SHOWS)[number]) : "all";
  const now = new Date();
  const [saved, classes, students, answers] = await Promise.all([
    store.getSchoolSettings(app.id),
    store.listSchoolClasses(app.id),
    store.listSchoolPeople(app.id, { role: "student" }),
    store.listSchoolSlipAnswers(app.id, { slipId: slip.id }),
  ]);
  const settings = schoolSettingsOf(saved, app);
  const today = schoolToday(settings, now);
  const byClass = new Map(classes.map((c) => [c.id, c]));
  const forThem = students.filter((s) => s.active && slipFor(slip, s, byClass)).sort((a, b) => a.name.localeCompare(b.name));
  const answerOf = new Map(answers.map((a) => [a.studentId, a]));
  const counts = slipCounts(forThem, answers);
  const shown = forThem.filter((s) => show === "all" || (show === "waiting" ? !answerOf.has(s.id) : answerOf.get(s.id)?.answer === show));
  const open = slipOpen(slip, today);

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the slip's header with the way back and Edit, its numbers, then the answers. */}
      <PageHead
        title={slip.title}
        intro={
          <>
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone={open ? "success" : "neutral"}>{t(open ? "parents.open" : "parents.closed")}</Badge>
              {[t("parents.dueLine", { date: slip.dueOn }), slipForName(slip, byClass) ?? t("schoolLife.forSchool"), slip.feeNote ? t("parents.feeIs", { note: slip.feeNote }) : null].filter(Boolean).join(" · ")}
            </span>
            {slip.details ? <span className="mt-1 block whitespace-pre-line">{slip.details}</span> : null}
          </>
        }
        back={{ href: "/dashboard/school/slips", label: t("parents.slips") }}
        actions={
          <SheetButton target="edit-slip" icon="edit">
            {t("parents.editSlip")}
          </SheetButton>
        }
      />

      <StatRow label={t("parents.answers")}>
        <Stat icon="check_circle" tone="success" label={t("parents.signedYes")} value={counts.yes} href={`/dashboard/school/slips/${slip.id}?show=yes`} />
        <Stat icon="cancel" tone="warn" label={t("parents.declined")} value={counts.no} href={`/dashboard/school/slips/${slip.id}?show=no`} />
        <Stat icon="hourglass_top" label={t("parents.notAnswered")} value={counts.waiting} href={`/dashboard/school/slips/${slip.id}?show=waiting`} />
      </StatRow>

      <Panel id="h-answers" title={t("parents.answers")} intro={t("parents.counts", counts)} flush>
        <ListBar>
          <ChipLinks
            label={t("parents.answers")}
            items={SHOWS.map((s) => ({
              href: `/dashboard/school/slips/${slip.id}${s === "all" ? "" : `?show=${s}`}`,
              label: t(SHOW_KEYS[s]),
              count: s === "all" ? forThem.length : s === "yes" ? counts.yes : s === "no" ? counts.no : counts.waiting,
              current: s === show,
            }))}
          />
        </ListBar>
        {forThem.length === 0 ? <p className="m-0 px-5 py-8 text-center text-[15px] text-muted sm:px-6">{t("parents.noStudents")}</p> : null}
        {forThem.length > 0 && shown.length === 0 ? <p className="m-0 px-5 py-8 text-center text-[15px] text-muted sm:px-6">{t("parents.noMatch")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-slip-answers>
          {shown.map((student, i) => {
            const answer = answerOf.get(student.id);
            const local = answer ? utcToLocal(answer.answeredAt, settings.timezone) : null;
            return (
              <ItemRow
                key={student.id}
                data-student={student.id}
                href={`/dashboard/school/people/${student.id}`}
                media={<Thumb icon="school" shape="round" tint={i} />}
                title={student.name}
                meta={[student.classId ? byClass.get(student.classId)?.name : null, answer && local ? t("parents.signedBy", { name: answer.signedName, date: `${local.date} ${local.time}` }) : null].filter(Boolean).join(" · ") || null}
                aside={<Badge tone={!answer ? "neutral" : answer.answer === "yes" ? "success" : "danger"}>{t(!answer ? "parents.notAnswered" : answer.answer === "yes" ? "parents.signedYes" : "parents.declined")}</Badge>}
              />
            );
          })}
        </ul>
      </Panel>

      <Sheet id="edit-slip" title={t("parents.editSlip")} description={slip.title}>
        <SchoolForm action={saveSlipAction} submit={t("parents.save")} sheet>
          <SlipFields slip={slip} classes={classes} today={today} t={t} />
        </SchoolForm>
        <form action={deleteSlipAction} className="flex justify-start pb-4">
          <input type="hidden" name="id" value={slip.id} />
          <ConfirmButton confirm={t("parents.deleteSlip", { title: slip.title })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
            {t("parents.remove")}
          </ConfirmButton>
        </form>
      </Sheet>
    </div>
  );
}
