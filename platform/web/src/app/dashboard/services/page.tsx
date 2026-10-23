import type { Metadata } from "next";
import Link from "next/link";
import { changeIntakeFieldAction, deleteBookingCategoryAction, deleteBookingServiceAction, deleteBookingStaffAction } from "@/app/actions/bookings";
import { SubmitButton } from "@/components/form";
import { Badge, Notice, btn } from "@/components/ui";
import { Icon } from "@/components/icon";
import { requireClient } from "@/lib/auth/session";
import { INTAKE_TYPE_LABELS } from "@/lib/bookings/intake";
import { bookingSetup, WEEKDAYS } from "@/lib/bookings/setup";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import type { BookingService, BookingStaff, IntakeField } from "@/lib/data/types";
import { CategoryForm, IntakeFieldForm, RulesForm, ServiceForm, StaffForm } from "./forms";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { formatDate } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const { app } = await requireClient("bookings");
  const kind = app?.vertical === "fitness" ? "fitness" : app?.vertical === "clinic" ? "clinic" : "other";
  return { title: (await dashboardText()).t("bookings.page", { kind }) };
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

/** "Mon 09:00–17:00 · Tue …": short day names in the dashboard's language (1 January 2023 was a Sunday). */
function hoursText(s: BookingStaff, { t, lang }: DashboardText): string {
  const day = (d: number) => (lang === "en" ? WEEKDAYS[d]!.slice(0, 3) : formatDate(lang, new Date(Date.UTC(2023, 0, 1 + d)), { weekday: "short", timeZone: "UTC" }));
  const open = s.hours.map((h, d) => (h[0] ? `${day(d)} ${h[0].start}–${h[0].end}` : null)).filter(Boolean);
  return open.length ? open.join(" · ") : t("bookings.noHours");
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
  const { app } = await requireClient("bookings");
  const text = await dashboardText();
  const { t, k } = text;
  const kind = app?.vertical === "fitness" ? "fitness" : app?.vertical === "clinic" ? "clinic" : "other";
  const clinic = app?.vertical === "clinic";
  if (!app || app.connector?.kind !== "bookings") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("bookings.page", { kind })}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {richText(t("bookings.fromPlugin"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })}
        </p>
      </div>
    );
  }
  const setup = bookingSetup(app);
  const { rules } = setup;
  const money = (cents: number) => (cents ? formatCents(cents, rules.currency) : t("common.free"));
  const sr = { sr: (chunk: string) => <span className="sr-only">{chunk}</span> };
  const category = new Map(setup.categories.map((c) => [c.id, c.name]));
  // 27 Classes on the timetable that aren't booked one to one.
  const onTimetable = new Set(setup.classTemplates.map((t) => t.serviceId));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[620px] flex-col gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("bookings.page", { kind })}</h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("bookings.intro", { kind })}</p>
        </div>
        {/* 81.4 */}
        <Link href="/dashboard/services/import" className={`${btn.secondary} h-11`}>
          <Icon name="upload" size={20} />
          {t("imports.open")}
        </Link>
      </div>
      {setup.services.length === 0 || setup.staff.length === 0 ? (
        <Notice tone="warn" icon="warning">
          {t("bookings.needBoth", { kind })}
        </Notice>
      ) : null}

      <Card id="h-services" title={t("bookings.services")}>
        {setup.services.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {setup.services.map((s) => (
              <li key={s.id} className="rounded-xl border border-line">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="text-[15px] font-bold">{s.name}</span>
                    <span className="flex items-center gap-2 text-sm text-muted">
                      {t("bookings.serviceLine", { minutes: s.durationMinutes, price: money(s.priceCents) })}
                      {s.categoryId ? ` · ${category.get(s.categoryId)}` : ""}
                      {s.active ? null : onTimetable.has(s.id) ? <Badge tone="neutral">{t("bookings.timetableOnly")}</Badge> : <Badge tone="warn">{t("common.hidden")}</Badge>}
                    </span>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-line-soft p-4">
                    <ServiceForm current={serviceValues(s)} categories={setup.categories} submit={t("bookings.saveService")} />
                    <form action={deleteBookingServiceAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                        {t("bookings.deleteService")}
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : null}
        <details className="rounded-xl border border-line p-4" open={setup.services.length === 0}>
          <summary className="cursor-pointer text-[15px] font-bold">{t("bookings.addService")}</summary>
          <div className="pt-3">
            <ServiceForm current={serviceValues(null)} categories={setup.categories} submit={t("bookings.addServiceButton")} />
          </div>
        </details>
      </Card>

      <Card
        id="h-team"
        title={t("bookings.team", { kind })}
        text={t("bookings.teamText", { kind })}
      >
        {setup.staff.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {setup.staff.map((s) => (
              <li key={s.id} className="rounded-xl border border-line">
                <details>
                  <summary className="flex cursor-pointer flex-col gap-0.5 px-4 py-3">
                    <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                      {s.name}
                      {s.active ? null : <Badge tone="warn">{t("bookings.notBookable")}</Badge>}
                    </span>
                    <span className="text-[13px] text-muted">{hoursText(s, text)}</span>
                    {s.specialties?.length ? <span className="text-[13px] text-muted">{s.specialties.join(" · ")}</span> : null}
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-line-soft p-4">
                    <StaffForm current={staffValues(s)} services={setup.services} submit={t("common.save")} clinic={clinic} />
                    <form action={deleteBookingStaffAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                        {t("bookings.removeMember", { kind })}
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
            <summary className="cursor-pointer text-[15px] font-bold">{t("bookings.addMember", { kind })}</summary>
            <div className="pt-3">
              <StaffForm current={staffValues(null)} services={setup.services} submit={t("bookings.addMemberButton", { kind })} clinic={clinic} />
            </div>
          </details>
        ) : (
          <p className="m-0 text-sm text-muted">{t("bookings.serviceFirst")}</p>
        )}
      </Card>

      {/* 21 Questions asked when booking. The answers are shown on the appointments page only, never in emails. */}
      <Card
        id="h-intake"
        title={t("bookings.intake", { kind })}
        text={t("bookings.intakeText", { kind })}
      >
        {setup.intakeFields.length ? (
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {setup.intakeFields.map((f, index) => (
              <li key={f.id} className="rounded-xl border border-line">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="text-[15px] font-bold">{f.label}</span>
                    <span className="flex items-center gap-2 text-sm text-muted">
                      {k(INTAKE_TYPE_LABELS[f.type])}
                      {f.required ? <Badge tone="neutral">{t("bookings.mustAnswer")}</Badge> : null}
                    </span>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-line-soft p-4">
                    <IntakeFieldForm current={intakeValues(f)} submit={t("bookings.saveQuestion")} />
                    <div className="flex flex-wrap gap-2">
                      {index > 0 ? (
                        <form action={changeIntakeFieldAction}>
                          <input type="hidden" name="id" value={f.id} />
                          <input type="hidden" name="move" value="up" />
                          <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                            {richText(t("bookings.moveUp", { label: f.label }), sr)}
                          </SubmitButton>
                        </form>
                      ) : null}
                      <form action={changeIntakeFieldAction}>
                        <input type="hidden" name="id" value={f.id} />
                        <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                          {richText(t("bookings.deleteQuestion", { label: f.label }), sr)}
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
          <summary className="cursor-pointer text-[15px] font-bold">{t("bookings.addQuestion")}</summary>
          <div className="pt-3">
            <IntakeFieldForm current={intakeValues(null)} submit={t("bookings.addQuestionButton")} />
          </div>
        </details>
      </Card>

      <Card id="h-categories" title={t("shop.categories")} text={t("bookings.categoriesText")}>
        {setup.categories.length ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {setup.categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-full border border-line py-1 ps-3 pe-1 text-sm">
                {c.name}
                <form action={deleteBookingCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton variant="secondary" className="h-7 px-2 text-xs" aria-label={t("bookings.deleteName", { name: c.name })}>
                    {t("common.delete")}
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
        <CategoryForm />
      </Card>

      <Card id="h-rules" title={t("bookings.rules")}>
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
