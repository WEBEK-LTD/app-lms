import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addPickupPersonAction, deletePickupNoteAction, removePickupPersonAction, savePickupNoteAction } from "@/app/actions/school-parent";
import { Field } from "@/components/form";
import { btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { addDays, utcToLocal } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { mediaLink } from "@/lib/media/files";
import { PARENT_LIMITS, PICKUP_DAYS_AHEAD, slipFor } from "@/lib/school/parent";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { ConfirmButton } from "../../../chat/forms";
import { AddServiceBox } from "../../../delivery/forms";
import { ExcuseItem } from "../../excuses/parts";
import { SchoolForm } from "../../forms";
import { isSchool, NotSchool, Panel } from "../../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("parents.studentPage") };
}

/**
 * 113.4 A student's page: their class and parents, who may pick them up
 * (as the parents listed them in the app, or the office when a parent
 * calls), the one-day pick-up notes, their excuses and the slips not
 * answered yet.
 */
export default async function SchoolStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { app } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("parents.studentPage")} t={t} />;
  const { id } = await params;
  const store = await getStore();
  const student = /^\d{1,15}$/.test(id) ? await store.getSchoolPerson(app.id, Number(id)) : null;
  if (!student || student.role !== "student") notFound();
  const now = new Date();
  const [saved, classes, family, people, pickup, excuses] = await Promise.all([
    store.getSchoolSettings(app.id),
    store.listSchoolClasses(app.id),
    store.listSchoolFamily(app.id, { studentId: student.id }),
    store.listSchoolPeople(app.id, { role: "parent" }),
    store.getSchoolPickup(app.id, student.id),
    store.listSchoolExcuses(app.id, { studentId: student.id }),
  ]);
  const settings = schoolSettingsOf(saved, app);
  const today = schoolToday(settings, now);
  const [notes, slips] = await Promise.all([store.listSchoolPickupNotes(app.id, { studentId: student.id, from: today }), store.listSchoolSlips(app.id, { from: today })]);
  const byClass = new Map(classes.map((c) => [c.id, c]));
  const answers = slips.length ? await store.listSchoolSlipAnswers(app.id, { slipIds: slips.map((s) => s.id), studentIds: [student.id] }) : [];
  const waiting = slips.filter((s) => slipFor(s, student, byClass) && !answers.some((a) => a.slipId === s.id));
  const parents = people.filter((p) => family.some((l) => l.parentId === p.id));
  const byId = new Map(parents.map((p) => [p.id, p]));
  const className = student.classId ? (byClass.get(student.classId)?.name ?? null) : null;
  const updated = pickup ? utcToLocal(pickup.updatedAt, settings.timezone).date : null;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/school/people" className="inline-flex items-center gap-1 text-sm font-semibold no-underline">
        {t("school.people")}
      </Link>
      <div className="flex max-w-[860px] flex-col gap-1">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{student.name}</h1>
        <p className="m-0 text-[15px] text-muted" dir="auto">
          {[className, student.code ? t("school.codeIs", { code: student.code }) : null, student.phone].filter(Boolean).join(" · ")}
        </p>
        <p className="m-0 flex flex-wrap gap-3 text-sm">
          <Link href={`/dashboard/school/checkin/report?person=${student.id}`}>{t("parents.attendance")}</Link>
          <Link href={`/dashboard/school/teacher-reports?student=${student.id}`}>{t("parents.reports")}</Link>
        </p>
      </div>

      <Panel id="h-parents" title={t("parents.parentsOf")}>
        {parents.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("parents.noParents")}</p> : null}
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {parents.map((p) => (
            <li key={p.id} className="text-[15px]" dir="auto">
              <span className="font-bold">{p.name}</span>
              {p.phone || p.email ? <span className="text-muted"> · {p.phone ?? p.email}</span> : null}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel id="h-pickup" title={t("parents.pickup")} intro={t("parents.pickupIntro")}>
        {(pickup?.people.length ?? 0) === 0 ? <p className="m-0 text-[15px] text-muted">{t("parents.noPickup")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-pickup>
          {(pickup?.people ?? []).map((person, i) => (
            <li key={`${i}-${person.name}`} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
              {person.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaLink(appUrl(), person.photo.fileId)} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
              ) : null}
              <span className="flex min-w-[160px] flex-1 flex-col gap-0.5" dir="auto">
                <span className="text-[15px] font-bold">{person.name}</span>
                <span className="text-[13px] text-muted">{[person.relation, person.phone].filter(Boolean).join(" · ")}</span>
              </span>
              <form action={removePickupPersonAction}>
                <input type="hidden" name="studentId" value={student.id} />
                <input type="hidden" name="index" value={i} />
                <ConfirmButton confirm={t("parents.removePerson", { name: person.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                  {t("parents.remove")}
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
        {pickup && updated ? <p className="m-0 text-[13px] text-muted">{t("parents.updatedBy", { by: pickup.updatedBy ?? "—", date: updated })}</p> : null}
        {(pickup?.people.length ?? 0) < PARENT_LIMITS.people ? (
          <AddServiceBox title={t("parents.addPerson")} open={false}>
            <SchoolForm action={addPickupPersonAction} submit={t("parents.add")} reset>
              <input type="hidden" name="studentId" value={student.id} />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field id="f-pickup-name" label={t("parents.personName")} name="name" maxLength={PARENT_LIMITS.name} required />
                <Field id="f-pickup-relation" label={t("parents.relation")} name="relation" placeholder={t("parents.relationExample")} maxLength={PARENT_LIMITS.relation} />
                <Field id="f-pickup-phone" label={t("parents.phoneOptional")} name="phone" type="tel" dir="ltr" maxLength={PARENT_LIMITS.phone} />
              </div>
            </SchoolForm>
          </AddServiceBox>
        ) : null}
      </Panel>

      <Panel id="h-pickup-notes" title={t("parents.pickupNotes")} intro={t("parents.pickupNotesIntro")}>
        {notes.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("parents.noPickupNotes")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-pickup-notes>
          {notes.map((note) => (
            <li key={note.date} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
              <span className="flex min-w-[160px] flex-1 flex-col gap-0.5" dir="auto">
                <span className="text-[15px] font-bold">
                  {note.date} · {[note.name, note.relation].filter(Boolean).join(", ")}
                </span>
                <span className="text-[13px] text-muted">{[note.phone, note.note, note.writtenBy ? t("parents.writtenBy", { by: note.writtenBy }) : null].filter(Boolean).join(" · ")}</span>
              </span>
              <form action={deletePickupNoteAction}>
                <input type="hidden" name="studentId" value={student.id} />
                <input type="hidden" name="date" value={note.date} />
                <ConfirmButton confirm={t("parents.removeNote", { date: note.date })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                  {t("parents.remove")}
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
        <AddServiceBox title={t("parents.addNote")} open={false}>
          <SchoolForm action={savePickupNoteAction} submit={t("parents.save")} reset>
            <input type="hidden" name="studentId" value={student.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="f-note-date" label={t("parents.date")} name="date" type="date" dir="ltr" defaultValue={today} min={today} max={addDays(today, PICKUP_DAYS_AHEAD)} />
              <Field id="f-note-name" label={t("parents.personName")} name="name" maxLength={PARENT_LIMITS.name} required />
              <Field id="f-note-relation" label={t("parents.relation")} name="relation" placeholder={t("parents.relationExample")} maxLength={PARENT_LIMITS.relation} />
              <Field id="f-note-phone" label={t("parents.phoneOptional")} name="phone" type="tel" dir="ltr" maxLength={PARENT_LIMITS.phone} />
              <Field id="f-note-note" label={t("parents.noteOptional")} name="note" maxLength={PARENT_LIMITS.note} className="sm:col-span-2" />
            </div>
          </SchoolForm>
        </AddServiceBox>
      </Panel>

      <Panel id="h-slips-waiting" title={t("parents.slipsWaiting")}>
        {waiting.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("parents.noSlipsWaiting")}</p> : null}
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {waiting.map((s) => (
            <li key={s.id} className="text-[15px]">
              <Link href={`/dashboard/school/slips/${s.id}`}>{s.title}</Link> <span className="text-muted">· {t("parents.dueLine", { date: s.dueOn })}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel id="h-student-excuses" title={t("parents.recentExcuses")}>
        {excuses.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("parents.noExcuses")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {excuses.slice(0, 20).map((e) => (
            <ExcuseItem key={e.id} excuse={e} student={student} parent={e.parentId !== null ? byId.get(e.parentId) : undefined} className={className} t={t} timezone={settings.timezone} />
          ))}
        </ul>
      </Panel>
    </div>
  );
}
