import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { addPickupPersonAction, deletePickupNoteAction, removePickupPersonAction, savePickupNoteAction } from "@/app/actions/school-parent";
import { Field } from "@/components/form";
import { EmptyState, btn } from "@/components/ui";
import { DetailLayout, ItemList, ItemRow, LinkCards, Thumb } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
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
import { ExcuseItem } from "../../excuses/parts";
import { SchoolForm } from "../../forms";
import { isSchool, NotSchool, PageHead, Panel } from "../../parts";

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

  const canAddPerson = (pickup?.people.length ?? 0) < PARENT_LIMITS.people;

  const main = (
    <>
      <Panel
        id="h-pickup"
        title={t("parents.pickup")}
        intro={t("parents.pickupIntro")}
        flush
        actions={
          canAddPerson ? (
            <SheetButton target="new-pickup" icon="add" variant="secondary" className="h-10 px-3.5 text-sm">
              {t("parents.addPerson")}
            </SheetButton>
          ) : null
        }
      >
        {(pickup?.people.length ?? 0) === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="groups" title={t("parents.noPickup")} />
          </div>
        ) : null}
        <ul className="m-0 flex list-none flex-col p-0" data-pickup>
          {(pickup?.people ?? []).map((person, i) => (
            <ItemRow
              key={`${i}-${person.name}`}
              media={<Thumb src={person.photo ? mediaLink(appUrl(), person.photo.fileId) : null} icon="person" shape="round" tint={i} />}
              title={<span dir="auto">{person.name}</span>}
              meta={[person.relation, person.phone].filter(Boolean).join(" · ") || null}
              actions={
                <form action={removePickupPersonAction}>
                  <input type="hidden" name="studentId" value={student.id} />
                  <input type="hidden" name="index" value={i} />
                  <ConfirmButton confirm={t("parents.removePerson", { name: person.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                    {t("parents.remove")}
                  </ConfirmButton>
                </form>
              }
            />
          ))}
        </ul>
        {pickup && updated ? <p className="m-0 border-t border-line-soft px-5 py-3 text-[13px] text-muted sm:px-6">{t("parents.updatedBy", { by: pickup.updatedBy ?? "—", date: updated })}</p> : null}
        {canAddPerson ? (
          <Sheet id="new-pickup" title={t("parents.addPerson")} description={t("parents.pickupIntro")}>
            <SchoolForm action={addPickupPersonAction} submit={t("parents.add")} reset sheet>
              <input type="hidden" name="studentId" value={student.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="f-pickup-name" label={t("parents.personName")} name="name" maxLength={PARENT_LIMITS.name} required className="sm:col-span-2" />
                <Field id="f-pickup-relation" label={t("parents.relation")} name="relation" placeholder={t("parents.relationExample")} maxLength={PARENT_LIMITS.relation} />
                <Field id="f-pickup-phone" label={t("parents.phoneOptional")} name="phone" type="tel" dir="ltr" maxLength={PARENT_LIMITS.phone} />
              </div>
            </SchoolForm>
          </Sheet>
        ) : null}
      </Panel>

      <Panel
        id="h-pickup-notes"
        title={t("parents.pickupNotes")}
        intro={t("parents.pickupNotesIntro")}
        flush
        actions={
          <SheetButton target="new-pickup-note" icon="add" variant="secondary" className="h-10 px-3.5 text-sm">
            {t("parents.addNote")}
          </SheetButton>
        }
      >
        {notes.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="event" title={t("parents.noPickupNotes")} />
          </div>
        ) : null}
        <ul className="m-0 flex list-none flex-col p-0" data-pickup-notes>
          {notes.map((note) => (
            <ItemRow
              key={note.date}
              media={
                <span dir="ltr" className="flex h-11 w-[104px] shrink-0 items-center justify-center rounded-xl bg-ivory text-[14px] font-bold tabular-nums">
                  {note.date}
                </span>
              }
              title={<span dir="auto">{[note.name, note.relation].filter(Boolean).join(", ")}</span>}
              meta={[note.phone, note.note, note.writtenBy ? t("parents.writtenBy", { by: note.writtenBy }) : null].filter(Boolean).join(" · ") || null}
              actions={
                <form action={deletePickupNoteAction}>
                  <input type="hidden" name="studentId" value={student.id} />
                  <input type="hidden" name="date" value={note.date} />
                  <ConfirmButton confirm={t("parents.removeNote", { date: note.date })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                    {t("parents.remove")}
                  </ConfirmButton>
                </form>
              }
            />
          ))}
        </ul>
        <Sheet id="new-pickup-note" title={t("parents.addNote")} description={t("parents.pickupNotesIntro")}>
          <SchoolForm action={savePickupNoteAction} submit={t("parents.save")} reset sheet>
            <input type="hidden" name="studentId" value={student.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="f-note-date" label={t("parents.date")} name="date" type="date" dir="ltr" defaultValue={today} min={today} max={addDays(today, PICKUP_DAYS_AHEAD)} />
              <Field id="f-note-name" label={t("parents.personName")} name="name" maxLength={PARENT_LIMITS.name} required />
              <Field id="f-note-relation" label={t("parents.relation")} name="relation" placeholder={t("parents.relationExample")} maxLength={PARENT_LIMITS.relation} />
              <Field id="f-note-phone" label={t("parents.phoneOptional")} name="phone" type="tel" dir="ltr" maxLength={PARENT_LIMITS.phone} />
              <Field id="f-note-note" label={t("parents.noteOptional")} name="note" maxLength={PARENT_LIMITS.note} className="sm:col-span-2" />
            </div>
          </SchoolForm>
        </Sheet>
      </Panel>

      <Panel id="h-student-excuses" title={t("parents.recentExcuses")}>
        {excuses.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("parents.noExcuses")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {excuses.slice(0, 20).map((e) => (
            <ExcuseItem key={e.id} excuse={e} student={student} parent={e.parentId !== null ? byId.get(e.parentId) : undefined} className={className} t={t} timezone={settings.timezone} />
          ))}
        </ul>
      </Panel>
    </>
  );

  const side = (
    <>
      <Panel id="h-parents" title={t("parents.parentsOf")} flush>
        {parents.length === 0 ? (
          <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("parents.noParents")}</p>
        ) : (
          <ItemList>
            {parents.map((p, i) => (
              <ItemRow key={p.id} media={<Thumb icon="child_care" shape="round" tint={i} />} title={<span dir="auto">{p.name}</span>} meta={p.phone ?? p.email ?? null} />
            ))}
          </ItemList>
        )}
      </Panel>
      <LinkCards
        label={t("parents.studentPage")}
        items={[
          { href: `/dashboard/school/checkin/report?person=${student.id}`, icon: "task_alt", label: t("parents.attendance") },
          { href: `/dashboard/school/teacher-reports?student=${student.id}`, icon: "description", label: t("parents.reports") },
        ]}
      />
      <Panel id="h-slips-waiting" title={t("parents.slipsWaiting")} flush>
        {waiting.length === 0 ? (
          <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("parents.noSlipsWaiting")}</p>
        ) : (
          <ItemList>
            {waiting.map((s) => (
              <ItemRow key={s.id} href={`/dashboard/school/slips/${s.id}`} title={s.title} meta={t("parents.dueLine", { date: s.dueOn })} />
            ))}
          </ItemList>
        )}
      </Panel>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the student's header with the way back, then their pick-up and excuses beside their parents and links. */}
      <PageHead
        title={student.name}
        intro={<span dir="auto">{[className, student.code ? t("school.codeIs", { code: student.code }) : null, student.phone].filter(Boolean).join(" · ")}</span>}
        back={{ href: "/dashboard/school/people", label: t("school.people") }}
      />
      <DetailLayout main={main} side={side} />
    </div>
  );
}
