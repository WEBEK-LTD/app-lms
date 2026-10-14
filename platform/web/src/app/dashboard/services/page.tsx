import type { Metadata } from "next";
import Link from "next/link";
import { changeIntakeFieldAction, deleteBookingCategoryAction, deleteBookingServiceAction, deleteBookingStaffAction } from "@/app/actions/bookings";
import { SubmitButton } from "@/components/form";
import { Badge, Notice } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { INTAKE_TYPE_LABELS } from "@/lib/bookings/intake";
import { bookingSetup, bookingWords, WEEKDAYS } from "@/lib/bookings/setup";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import type { BookingService, BookingStaff, IntakeField } from "@/lib/data/types";
import { CategoryForm, IntakeFieldForm, RulesForm, ServiceForm, StaffForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  const { app } = await requireClient();
  return { title: bookingWords(app?.vertical).page };
}

const TIMEZONES = ["Europe/Istanbul", "Europe/London", "Europe/Berlin", "Europe/Paris", "Asia/Dubai", "Asia/Riyadh", "Africa/Cairo", "America/New_York"];

function serviceValues(s: BookingService | null): Record<string, string> {
  if (!s) return { name: "", duration: "30", price: "", categoryId: "", description: "", color: "", active: "on" };
  return {
    id: String(s.id),
    name: s.name,
    duration: String(s.durationMinutes),
    price: s.priceCents ? centsToDecimal(s.priceCents) : "",
    categoryId: s.categoryId ? String(s.categoryId) : "",
    description: s.description,
    color: s.color ?? "",
    active: s.active ? "on" : "",
  };
}

function staffValues(s: BookingStaff | null): Record<string, string> {
  const v: Record<string, string> = s
    ? {
        id: String(s.id),
        name: s.name,
        title: s.title ?? "",
        daysOff: s.daysOff.join("\n"),
        active: s.active ? "on" : "",
        serviceIds: s.serviceIds.join(","),
        specialties: (s.specialties ?? []).join(", "),
        languages: (s.languages ?? []).join(", "),
        bio: s.bio ?? "",
      }
    : { name: "", title: "", daysOff: "", active: "on", serviceIds: "", specialties: "", languages: "", bio: "" };
  for (let d = 0; d < 7; d += 1) {
    const range = s?.hours[d]?.[0];
    v[`open${d}`] = s ? (range ? "on" : "") : d >= 1 && d <= 5 ? "on" : "";
    v[`start${d}`] = range?.start ?? "09:00";
    v[`end${d}`] = range?.end ?? "17:00";
  }
  return v;
}

function intakeValues(f: IntakeField | null): Record<string, string> {
  if (!f) return { label: "", type: "text", options: "", required: "" };
  return { id: f.id, label: f.label, type: f.type, options: f.options.join("\n"), required: f.required ? "on" : "" };
}

function hoursText(s: BookingStaff): string {
  const open = s.hours.map((h, d) => (h[0] ? `${WEEKDAYS[d]!.slice(0, 3)} ${h[0].start}–${h[0].end}` : null)).filter(Boolean);
  return open.length ? open.join(" · ") : "No working hours";
}

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

/** Services, team, hours and booking rules for Bookings apps without a website (21 a clinic's doctors and intake form). */
export default async function ServicesPage() {
  const { app } = await requireClient();
  const words = bookingWords(app?.vertical);
  const clinic = app?.vertical === "clinic";
  if (!app || app.connector?.kind !== "bookings") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{words.page}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Your app gets its services from your booking plugin. To manage them here instead, choose &quot;I don&apos;t have a website&quot; on
          the <Link href="/dashboard/setup?step=website">Website step</Link>.
        </p>
      </div>
    );
  }
  const setup = bookingSetup(app);
  const { rules } = setup;
  const money = (cents: number) => (cents ? formatCents(cents, rules.currency) : "Free");
  const category = new Map(setup.categories.map((c) => [c.id, c.name]));
  // 27 Classes on the timetable that aren't booked one to one.
  const onTimetable = new Set(setup.classTemplates.map((t) => t.serviceId));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{words.page}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {clinic
            ? "What patients can book in your app, which doctor sees them and when. Changes show in the app right away."
            : "What customers can book in your app, who does it and when. Changes show in the app right away."}
        </p>
      </div>
      {setup.services.length === 0 || setup.staff.length === 0 ? (
        <Notice tone="warn" icon="warning">
          {clinic ? "Patients can book once you add a service and a doctor who provides it." : "Customers can book once you add a service and a team member who provides it."}
        </Notice>
      ) : null}

      <Card id="h-services" title="Services">
        {setup.services.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {setup.services.map((s) => (
              <li key={s.id} className="rounded-xl border border-line">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="text-[15px] font-bold">{s.name}</span>
                    <span className="flex items-center gap-2 text-sm text-muted">
                      {s.durationMinutes} min · {money(s.priceCents)}
                      {s.categoryId ? ` · ${category.get(s.categoryId)}` : ""}
                      {s.active ? null : onTimetable.has(s.id) ? <Badge tone="neutral">Timetable only</Badge> : <Badge tone="warn">Hidden</Badge>}
                    </span>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-line-soft p-4">
                    <ServiceForm current={serviceValues(s)} categories={setup.categories} submit="Save service" />
                    <form action={deleteBookingServiceAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                        Delete service
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : null}
        <details className="rounded-xl border border-line p-4" open={setup.services.length === 0}>
          <summary className="cursor-pointer text-[15px] font-bold">Add a service</summary>
          <div className="pt-3">
            <ServiceForm current={serviceValues(null)} categories={setup.categories} submit="Add service" />
          </div>
        </details>
      </Card>

      <Card
        id="h-team"
        title={words.team}
        text={`Each ${words.member}'s services, working hours and days off decide the free times in the app. Specialties, languages and a few lines about them show on their profile.`}
      >
        {setup.staff.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {setup.staff.map((s) => (
              <li key={s.id} className="rounded-xl border border-line">
                <details>
                  <summary className="flex cursor-pointer flex-col gap-0.5 px-4 py-3">
                    <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                      {s.name}
                      {s.active ? null : <Badge tone="warn">Not bookable</Badge>}
                    </span>
                    <span className="text-[13px] text-muted">{hoursText(s)}</span>
                    {s.specialties?.length ? <span className="text-[13px] text-muted">{s.specialties.join(" · ")}</span> : null}
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-line-soft p-4">
                    <StaffForm current={staffValues(s)} services={setup.services} submit="Save" clinic={clinic} />
                    <form action={deleteBookingStaffAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                        {clinic ? "Remove this doctor" : "Remove from the team"}
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : null}
        {setup.services.length ? (
          <details className="rounded-xl border border-line p-4" open={setup.staff.length === 0}>
            <summary className="cursor-pointer text-[15px] font-bold">Add a {words.member}</summary>
            <div className="pt-3">
              <StaffForm current={staffValues(null)} services={setup.services} submit={`Add ${words.member}`} clinic={clinic} />
            </div>
          </details>
        ) : (
          <p className="m-0 text-sm text-muted">Add a service first.</p>
        )}
      </Card>

      {/* 21 Questions asked when booking. The answers are shown on the appointments page only, never in emails. */}
      <Card
        id="h-intake"
        title={words.intake}
        text={`Optional: questions ${words.customer}s answer when they book. You see the answers on the ${words.appointments} page; they are never put in emails or notifications.`}
      >
        {setup.intakeFields.length ? (
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {setup.intakeFields.map((f, index) => (
              <li key={f.id} className="rounded-xl border border-line">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="text-[15px] font-bold">{f.label}</span>
                    <span className="flex items-center gap-2 text-sm text-muted">
                      {INTAKE_TYPE_LABELS[f.type]}
                      {f.required ? <Badge tone="neutral">Must be answered</Badge> : null}
                    </span>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-line-soft p-4">
                    <IntakeFieldForm current={intakeValues(f)} submit="Save question" />
                    <div className="flex flex-wrap gap-2">
                      {index > 0 ? (
                        <form action={changeIntakeFieldAction}>
                          <input type="hidden" name="id" value={f.id} />
                          <input type="hidden" name="move" value="up" />
                          <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                            Move up<span className="sr-only"> “{f.label}”</span>
                          </SubmitButton>
                        </form>
                      ) : null}
                      <form action={changeIntakeFieldAction}>
                        <input type="hidden" name="id" value={f.id} />
                        <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                          Delete question<span className="sr-only"> “{f.label}”</span>
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ol>
        ) : null}
        <details className="rounded-xl border border-line p-4">
          <summary className="cursor-pointer text-[15px] font-bold">Add a question</summary>
          <div className="pt-3">
            <IntakeFieldForm current={intakeValues(null)} submit="Add question" />
          </div>
        </details>
      </Card>

      <Card id="h-categories" title="Categories" text="Optional: group your services in the app.">
        {setup.categories.length ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {setup.categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-full border border-line py-1 pr-1 pl-3 text-sm">
                {c.name}
                <form action={deleteBookingCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton variant="secondary" className="h-7 px-2 text-xs" aria-label={`Delete ${c.name}`}>
                    Delete
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
        <CategoryForm />
      </Card>

      <Card id="h-rules" title="Booking rules">
        <RulesForm
          timezones={TIMEZONES.includes(rules.timezone) ? TIMEZONES : [rules.timezone, ...TIMEZONES]}
          current={{
            timezone: rules.timezone,
            currency: rules.currency,
            slotStep: String(rules.slotStepMinutes),
            minHoursAhead: String(Math.round(rules.minMinutesAhead / 60)),
            maxDaysAhead: String(rules.maxDaysAhead),
            cancelHours: rules.cancelBeforeMinutes === null ? "" : String(Math.round(rules.cancelBeforeMinutes / 60)),
            notes: rules.notes ? "on" : "",
            autoApprove: rules.autoApprove ? "on" : "",
          }}
        />
      </Card>
    </div>
  );
}
