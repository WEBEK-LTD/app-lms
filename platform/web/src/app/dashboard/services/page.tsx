import type { Metadata } from "next";
import Link from "next/link";
import { changeIntakeFieldAction, deleteBookingCategoryAction, deleteBookingServiceAction, deleteBookingStaffAction } from "@/app/actions/bookings";
import { SubmitButton } from "@/components/form";
import { Badge, Notice, PageHeader, Section } from "@/components/ui";
import { ItemList, LinkCards, PageGroup, Stat, StatRow, Thumb } from "@/components/page-kit";
import { AddDetails, ItemDetails } from "@/components/page-kit-a";
import { DetailsButton } from "@/components/page-kit-a-client";
import { requireClient } from "@/lib/auth/session";
import { INTAKE_TYPE_LABELS } from "@/lib/bookings/intake";
import { bookingSetup, WEEKDAYS } from "@/lib/bookings/setup";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import type { BookingService, BookingStaff, IntakeField } from "@/lib/data/types";
import { CategoryForm, IntakeFieldForm, RulesForm, ServiceForm, StaffForm } from "./forms";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { formatDate } from "@/i18n/format";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";

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

/** Services, team, hours and booking rules for Bookings apps without a website (21 a clinic's doctors and intake form). */
export default async function ServicesPage({ searchParams }: { searchParams: Promise<SampleQuery> }) {
  const { app } = await requireClient("bookings");
  const text = await dashboardText();
  const { t, k } = text;
  const kind = app?.vertical === "fitness" ? "fitness" : app?.vertical === "clinic" ? "clinic" : "other";
  const clinic = app?.vertical === "clinic";
  if (!app || app.connector?.kind !== "bookings") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("bookings.page", { kind })} description={richText(t("bookings.fromPlugin"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })} />
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
  const query = await searchParams;

  const hasServices = setup.services.length > 0;
  const serviceIcon = kind === "fitness" ? "fitness_center" : clinic ? "stethoscope" : "content_cut";
  const hidden = setup.services.filter((s) => !s.active).length;
  const notBookable = setup.staff.filter((s) => !s.active).length;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, import, the services and the team (each opens in place), then the settings. */}
      <PageHeader
        title={t("bookings.page", { kind })}
        description={t("bookings.intro", { kind })}
        actions={
          hasServices ? (
            <DetailsButton target="add-service" icon="add">
              {t("bookings.addService")}
            </DetailsButton>
          ) : null
        }
      />
      {setup.services.length === 0 || setup.staff.length === 0 ? (
        <Notice tone="warn" icon="warning">
          {t("bookings.needBoth", { kind })}
        </Notice>
      ) : null}
      {/* 110.2 */}
      <SampleEntries app={app} list="services" query={query} />
      <SampleEntries app={app} list="staff" query={query} />

      {hasServices ? (
        <StatRow label={t("bookings.page", { kind })}>
          <Stat icon={serviceIcon} label={t("bookings.services")} value={setup.services.length} hint={hidden ? `${t("common.hidden")}: ${hidden}` : undefined} />
          <Stat icon="groups" tone="accent" label={t("bookings.team", { kind })} value={setup.staff.length} hint={notBookable ? `${t("bookings.notBookable")}: ${notBookable}` : undefined} />
          {clinic ? (
            <Stat icon="assignment" tone="success" label={t("bookings.intake", { kind })} value={setup.intakeFields.length} />
          ) : (
            <Stat icon="category" tone="success" label={t("shop.categories")} value={setup.categories.length} />
          )}
        </StatRow>
      ) : null}

      <LinkCards
        label={t("bookings.toolsLabel", { kind })}
        items={[
          // 81.4
          { href: "/dashboard/services/import", icon: "upload", label: t("imports.open"), hint: t("shop.importHint") },
        ]}
      />

      <Section titleId="h-services" title={t("bookings.services")} flush>
        {hasServices ? (
          <ItemList>
            {setup.services.map((s, i) => (
              <ItemDetails
                key={s.id}
                media={<Thumb icon={serviceIcon} shape="square" tint={i} />}
                title={s.name}
                badges={<SampleBadge sample={s.sample} />}
                meta={[t("bookings.serviceLine", { minutes: s.durationMinutes, price: money(s.priceCents) }), s.categoryId ? category.get(s.categoryId) : null].filter(Boolean).join(" · ")}
                aside={s.active ? null : onTimetable.has(s.id) ? <Badge tone="neutral">{t("bookings.timetableOnly")}</Badge> : <Badge tone="warn">{t("common.hidden")}</Badge>}
              >
                <ServiceForm current={serviceValues(s)} categories={setup.categories} submit={t("bookings.saveService")} />
                <form action={deleteBookingServiceAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                    {t("bookings.deleteService")}
                  </SubmitButton>
                </form>
              </ItemDetails>
            ))}
          </ItemList>
        ) : null}
        <AddDetails id="add-service" label={t("bookings.addService")} open={!hasServices}>
          <ServiceForm current={serviceValues(null)} categories={setup.categories} submit={t("bookings.addServiceButton")} />
        </AddDetails>
      </Section>

      <Section titleId="h-team" title={t("bookings.team", { kind })} description={t("bookings.teamText", { kind })} flush>
        {setup.staff.length ? (
          <ItemList>
            {setup.staff.map((s, i) => (
              <ItemDetails
                key={s.id}
                media={<Thumb icon="person" shape="round" tint={i + 2} />}
                title={s.name}
                badges={
                  <>
                    <SampleBadge sample={s.sample} />
                    {s.active ? null : <Badge tone="warn">{t("bookings.notBookable")}</Badge>}
                  </>
                }
                meta={[s.title, hoursText(s, text)].filter(Boolean).join(" · ")}
                extra={s.specialties?.length ? <span>{s.specialties.join(" · ")}</span> : null}
              >
                <StaffForm current={staffValues(s)} services={setup.services} submit={t("common.save")} clinic={clinic} />
                <form action={deleteBookingStaffAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                    {t("bookings.removeMember", { kind })}
                  </SubmitButton>
                </form>
              </ItemDetails>
            ))}
          </ItemList>
        ) : null}
        {hasServices ? (
          <AddDetails label={t("bookings.addMember", { kind })} open={setup.staff.length === 0}>
            <StaffForm current={staffValues(null)} services={setup.services} submit={t("bookings.addMemberButton", { kind })} clinic={clinic} />
          </AddDetails>
        ) : (
          <p className="m-0 px-5 py-5 text-[15px] text-muted sm:px-6">{t("bookings.serviceFirst")}</p>
        )}
      </Section>

      <PageGroup title={t("bookings.groupSettings")}>
        {/* 21 Questions asked when booking. The answers are shown on the appointments page only, never in emails. */}
        <Section titleId="h-intake" title={t("bookings.intake", { kind })} description={t("bookings.intakeText", { kind })} flush>
          {setup.intakeFields.length ? (
            <ItemList>
              {setup.intakeFields.map((f, index) => (
                <ItemDetails
                  key={f.id}
                  media={<Thumb icon="help" shape="square" tint={index + 3} />}
                  title={f.label}
                  meta={k(INTAKE_TYPE_LABELS[f.type])}
                  aside={f.required ? <Badge tone="neutral">{t("bookings.mustAnswer")}</Badge> : null}
                >
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
                </ItemDetails>
              ))}
            </ItemList>
          ) : null}
          <AddDetails label={t("bookings.addQuestion")}>
            <IntakeFieldForm current={intakeValues(null)} submit={t("bookings.addQuestionButton")} />
          </AddDetails>
        </Section>

        <div className="flex flex-wrap items-start gap-5">
          <Section titleId="h-categories" title={t("shop.categories")} description={t("bookings.categoriesText")} className="flex-[1_1_320px]">
            {setup.categories.length ? (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {setup.categories.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 rounded-full border border-line bg-sand py-1 ps-3.5 pe-1 text-sm font-semibold">
                    {c.name}
                    <form action={deleteBookingCategoryAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <SubmitButton variant="secondary" className="h-7 px-2.5 text-xs" aria-label={t("bookings.deleteName", { name: c.name })}>
                        {t("common.delete")}
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}
            <CategoryForm />
          </Section>

          <Section titleId="h-rules" title={t("bookings.rules")} className="flex-[1_1_380px]">
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
          </Section>
        </div>
      </PageGroup>
    </div>
  );
}
