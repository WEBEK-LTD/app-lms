import type { Metadata } from "next";
import Link from "next/link";
import { cancelClassSessionAction, deleteClassTemplateAction } from "@/app/actions/classes";
import { SubmitButton } from "@/components/form";
import { Badge, Notice } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { CLASS_WEEKS, classWhen } from "@/lib/bookings/classes";
import { bookingSetup, bookingWords, WEEKDAYS } from "@/lib/bookings/setup";
import { addDays, localToUtc, utcToLocal } from "@/lib/bookings/time";
import { getStore } from "@/lib/data";
import type { ClassBooking, ClassTemplate } from "@/lib/data/types";
import { ClassTemplateForm } from "./forms";

export const metadata: Metadata = { title: "Timetable" };

function Card({ id, title, text, children }: { id: string; title: string; text?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="m-0 text-lg font-bold">
          {title}
        </h2>
        {text ? <p className="m-0 text-[15px] text-ink-4">{text}</p> : null}
      </div>
      {children}
    </section>
  );
}

function templateValues(t: ClassTemplate | null, firstService?: { id: number; durationMinutes: number }): Record<string, string> {
  if (!t) return { serviceId: firstService ? String(firstService.id) : "", staffId: "", weekday: "1", time: "18:00", duration: String(firstService?.durationMinutes ?? 60), capacity: "12", active: "on" };
  return {
    id: String(t.id),
    serviceId: String(t.serviceId),
    staffId: String(t.staffId),
    weekday: String(t.weekday),
    time: t.time,
    duration: String(t.durationMinutes),
    capacity: String(t.capacity),
    active: t.active ? "on" : "",
  };
}

function who(b: ClassBooking): string {
  return [b.customerName, b.customerPhone ?? b.customerEmail].filter(Boolean).join(" · ");
}

/** 27 A gym's or studio's weekly timetable, and the classes of the coming week with who booked them. */
export default async function TimetablePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { app } = await requireClient();
  const words = bookingWords(app?.vertical);
  if (!app || app.connector?.kind !== "bookings") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Timetable</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Group classes are for businesses without a website. To manage them here, choose &quot;I don&apos;t have a website&quot; on the{" "}
          <Link href="/dashboard/setup?step=website">Website step</Link>.
        </p>
      </div>
    );
  }
  const setup = bookingSetup(app);
  const { timezone } = setup.rules;
  const week = Math.min(CLASS_WEEKS - 1, Math.max(0, Number.parseInt((await searchParams).week ?? "0", 10) || 0));
  const now = new Date();
  const from = addDays(utcToLocal(now, timezone).date, week * 7);
  const store = await getStore();
  const sessions = await store.listClassSessions({ appId: app.id, startFrom: week === 0 ? now : localToUtc(from, "00:00", timezone), startBefore: localToUtc(addDays(from, 7), "00:00", timezone) });
  const bookings = await store.listClassBookings({ appId: app.id, sessionIds: sessions.map((s) => s.id), status: "booked" });
  const service = new Map(setup.services.map((s) => [s.id, s]));
  const coach = new Map(setup.staff.map((s) => [s.id, s.name]));
  const templates = [...setup.classTemplates].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.time.localeCompare(b.time));
  const coaches = setup.staff.filter((s) => s.active);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Timetable</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Your weekly group classes. The app shows the next {CLASS_WEEKS} weeks, in {timezone} time, and {words.customer}s book a spot until a class is full.
        </p>
      </div>
      {setup.services.length === 0 || coaches.length === 0 ? (
        <Notice tone="warn" icon="warning">
          First add your classes and {words.team.toLowerCase()} on the <Link href="/dashboard/services">{words.page}</Link> page.
        </Notice>
      ) : null}

      <Card id="h-weekly" title="Weekly classes" text="Changes show in the app at once. A class someone already booked keeps its time and coach; cancel it below if it can't take place.">
        {templates.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {templates.map((t) => {
              const name = service.get(t.serviceId)?.name ?? "A class that was removed";
              return (
                <li key={t.id} className="rounded-xl border border-line">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <span className="text-[15px] font-bold">
                        {WEEKDAYS[t.weekday]} {t.time} · {name}
                      </span>
                      <span className="flex items-center gap-2 text-sm text-muted">
                        {coach.get(t.staffId) ?? "No coach"} · {t.durationMinutes} min · {t.capacity} spots
                        {t.active ? null : <Badge tone="warn">Paused</Badge>}
                      </span>
                    </summary>
                    <div className="flex flex-col gap-3 border-t border-line-soft p-4">
                      <ClassTemplateForm current={templateValues(t)} services={setup.services} coaches={coaches} submit="Save class" />
                      <form action={deleteClassTemplateAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                          Take off the timetable<span className="sr-only"> {name}</span>
                        </SubmitButton>
                      </form>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : null}
        {setup.services.length && coaches.length ? (
          <details className="rounded-xl border border-line p-4" open={templates.length === 0}>
            <summary className="cursor-pointer text-[15px] font-bold">Add a class to the timetable</summary>
            <div className="pt-3">
              <ClassTemplateForm current={templateValues(null, setup.services[0])} services={setup.services} coaches={coaches} submit="Add to timetable" />
            </div>
          </details>
        ) : null}
      </Card>

      <Card id="h-coming" title={week === 0 ? "Coming 7 days" : `Week of ${classWhen(localToUtc(from, "12:00", timezone), timezone).split(",")[0]}`} text="Who booked each class. Cancelling a class gives everyone their spot and class credit back and tells them in the app.">
        <nav aria-label="Weeks" className="flex flex-wrap gap-3 text-[15px]">
          {week > 0 ? <Link href={`/dashboard/timetable?week=${week - 1}`}>Previous week</Link> : null}
          {week < CLASS_WEEKS - 1 ? <Link href={`/dashboard/timetable?week=${week + 1}`}>Next week</Link> : null}
        </nav>
        {sessions.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">No classes these days.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {sessions.map((s) => {
              const people = bookings.filter((b) => b.sessionId === s.id);
              const cancelled = s.status === "cancelled";
              return (
                <li key={s.id} className="flex flex-col gap-2 rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[15px] font-bold">
                      {classWhen(s.startAt, timezone)} · {s.serviceName}
                    </span>
                    {cancelled ? (
                      <Badge tone="neutral">Cancelled</Badge>
                    ) : (
                      <Badge tone={s.bookedCount >= s.capacity ? "warn" : "success"}>
                        {s.bookedCount} of {s.capacity} booked
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted">with {s.staffName}</span>
                  {people.length ? (
                    <details className="rounded-lg border border-line-soft">
                      <summary className="cursor-pointer px-3 py-2 text-[15px] font-semibold">
                        Who&apos;s coming ({people.length})<span className="sr-only"> to {s.serviceName}</span>
                      </summary>
                      <ol className="m-0 flex flex-col gap-1 border-t border-line-soft py-2 pr-3 pl-8 text-[15px]">
                        {people.map((b) => (
                          <li key={b.id}>{who(b)}</li>
                        ))}
                      </ol>
                    </details>
                  ) : null}
                  {!cancelled && s.startAt > now ? (
                    <form action={cancelClassSessionAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                        Cancel class<span className="sr-only"> {s.serviceName} {classWhen(s.startAt, timezone)}</span>
                      </SubmitButton>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
