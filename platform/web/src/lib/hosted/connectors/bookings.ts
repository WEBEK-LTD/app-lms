import { freeTimes, staffFor } from "../../bookings/availability";
import { checkAnswers, intakeFieldsJson } from "../../bookings/intake";
import { BOOKING_STATUS_LABELS, bookingSetup } from "../../bookings/setup";
import { addDays, isDate, utcToLocal } from "../../bookings/time";
import { centsToDecimal, formatCents } from "../../catalog/money";
import type { DataStore } from "../../data/store";
import {
  ACTIVE_BOOKING_STATUSES,
  type App,
  type BookingAppointment,
  type BookingService,
  type BookingSetup,
  type BookingStaff,
  type IntakeField,
} from "../../data/types";
import { descriptionHtml } from "./catalog";
import { error, intParam } from "./common";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";

interface BookingsDeps {
  store: DataStore;
  app: App;
  assetUrl: (assetId: string) => string;
  /** Tells the business about a new appointment (an email); failures don't fail the booking. */
  onBooked?: (appointment: BookingAppointment) => Promise<void>;
}

const slotTaken = () => error(409, "slot_taken", "This time was just taken. Please choose another one.");
const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");

/**
 * Bookings managed in the Yallapp dashboard, served like the plugin's
 * bookings endpoints: services, staff and hours from the app's booking
 * setup, appointments from booking_appointments.
 */
export class BookingsConnector implements Connector {
  private readonly setup: BookingSetup & { intakeFields: IntakeField[] };

  constructor(private readonly deps: BookingsDeps) {
    this.setup = bookingSetup(deps.app);
  }

  async config() {
    const { rules } = this.setup;
    return {
      bookings: {
        plugin: "yallapp",
        plugin_version: "1",
        timezone: rules.timezone,
        currency: rules.currency,
        staff_choice: this.setup.staff.filter((s) => s.active).length > 1,
        notes: rules.notes,
        max_days_ahead: rules.maxDaysAhead,
        min_minutes_ahead: rules.minMinutesAhead,
        cancel_before_minutes: rules.cancelBeforeMinutes,
        // 21 A clinic's intake form, when it has questions.
        ...(this.setup.intakeFields.length ? { intake_fields: intakeFieldsJson(this.setup.intakeFields) } : {}),
      },
    };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const route = `${request.method} /${request.path.join("/")}`;
    switch (route) {
      case "GET /bookings/home":
        return { status: 200, body: { sections: await this.home(request) } };
      case "GET /bookings/categories":
        return { status: 200, body: { items: this.categories() } };
      case "GET /bookings/services":
        return this.services(request.query);
      case "GET /bookings/availability":
        return this.availability(request);
      case "POST /bookings/appointments":
        return this.book(request);
      case "GET /me/appointments":
        return this.appointments(request);
    }
    const [first, second, third, fourth] = request.path;
    if (request.method === "GET" && first === "bookings" && second === "services" && third && request.path.length === 3) {
      const service = this.service(Number(third));
      return service ? { status: 200, body: this.detail(service) } : error(404, "not_found", "Service not found.");
    }
    if (first === "me" && second === "appointments" && third) {
      const id = Number(third);
      if (request.method === "GET" && request.path.length === 3) return this.appointment(request, id);
      if (request.method === "POST" && fourth === "cancel" && request.path.length === 4) return this.cancel(request, id);
    }
    return null;
  }

  /** 21 A clinic's app: doctor and visit wording in the sections' titles. */
  private get clinic(): boolean {
    return this.deps.app.vertical === "clinic";
  }

  // Mapping

  private price(cents: number) {
    const { currency } = this.setup.rules;
    return { amount: centsToDecimal(cents), currency, formatted: formatCents(cents, currency), free: cents === 0 };
  }

  private bookable(): BookingService[] {
    return this.setup.services.filter((s) => s.active && staffFor(this.setup, s.id).length > 0);
  }

  private service(id: number): BookingService | null {
    return Number.isSafeInteger(id) ? (this.bookable().find((s) => s.id === id) ?? null) : null;
  }

  private summary(s: BookingService) {
    return {
      id: s.id,
      name: s.name,
      image_url: s.imageAssetId ? this.deps.assetUrl(s.imageAssetId) : null,
      duration_minutes: s.durationMinutes,
      price: this.price(s.priceCents),
      category_id: s.categoryId,
      color: s.color,
    };
  }

  private person(s: BookingStaff) {
    return {
      id: s.id,
      name: s.name,
      image_url: s.imageAssetId ? this.deps.assetUrl(s.imageAssetId) : null,
      title: s.title,
      price: null,
      // 21 A doctor's profile, when the business wrote one.
      ...(s.specialties?.length ? { specialties: s.specialties } : {}),
      ...(s.languages?.length ? { languages: s.languages } : {}),
      ...(s.bio ? { bio: s.bio } : {}),
    };
  }

  private detail(s: BookingService) {
    return { ...this.summary(s), description_html: descriptionHtml(s.description), staff: staffFor(this.setup, s.id).map((m) => this.person(m)) };
  }

  private categories() {
    const services = this.bookable();
    return this.setup.categories
      .map((c) => ({ id: c.id, name: c.name, count: services.filter((s) => s.categoryId === c.id).length, image_url: null }))
      .filter((c) => c.count > 0);
  }

  private canCancel(a: BookingAppointment, now: Date): boolean {
    const before = this.setup.rules.cancelBeforeMinutes;
    return ACTIVE_BOOKING_STATUSES.includes(a.status) && before !== null && a.startAt.getTime() - now.getTime() >= before * 60_000;
  }

  private appointmentJson(a: BookingAppointment, now: Date) {
    const local = utcToLocal(a.startAt, this.setup.rules.timezone);
    const service = this.setup.services.find((s) => s.id === a.serviceId);
    const staff = this.setup.staff.find((s) => s.id === a.staffId);
    // After the end, an approved appointment counts as completed.
    const status = a.status === "approved" && a.endAt < now ? "completed" : a.status;
    return {
      id: a.id,
      status,
      status_label: BOOKING_STATUS_LABELS[status],
      service: { id: a.serviceId, name: a.serviceName, image_url: service?.imageAssetId ? this.deps.assetUrl(service.imageAssetId) : null },
      staff: staff ? this.person(staff) : { id: a.staffId, name: a.staffName, image_url: null, title: null, price: null },
      start: a.startAt.toISOString(),
      end: a.endAt.toISOString(),
      local_date: local.date,
      local_time: local.time,
      price: this.price(a.priceCents),
      notes: a.notes,
      location: null,
      can_cancel: this.canCancel(a, now),
      // 21 Only ever in the customer's own appointments.
      ...(a.answers?.length ? { answers: a.answers.map((x) => ({ id: x.id, label: x.label, value: x.value })) } : {}),
    };
  }

  // Endpoints

  private async home(request: ConnectorRequest) {
    const sections: Record<string, unknown>[] = [];
    if (request.user) {
      const { items } = await this.deps.store.listBookingAppointments({
        appId: this.deps.app.id,
        userId: request.user.id,
        scope: { kind: "upcoming", now: request.now },
        offset: 0,
        limit: 1,
      });
      if (items[0]) {
        sections.push({ type: "next_appointment", title: this.clinic ? "Your next visit" : "Your next appointment", appointment: this.appointmentJson(items[0], request.now) });
      }
    }
    const categories = this.categories();
    if (categories.length) sections.push({ type: "categories", title: "Categories", categories });
    const services = this.bookable();
    if (services.length) sections.push({ type: "services", title: "Services", services: services.slice(0, 20).map((s) => this.summary(s)) });
    const staff = this.setup.staff.filter((s) => s.active && s.serviceIds.some((id) => services.some((x) => x.id === id)));
    if (staff.length > 1) sections.push({ type: "staff", title: this.clinic ? "Our doctors" : "Our team", staff: staff.map((s) => this.person(s)) });
    return sections;
  }

  private services(query: URLSearchParams): ConnectorResult {
    const page = intParam(query, "page", 1, 10_000);
    const perPage = intParam(query, "per_page", 20, 100);
    const search = (query.get("search") ?? "").trim().toLowerCase();
    const category = Number(query.get("category") ?? 0);
    const all = this.bookable()
      .filter((s) => !search || s.name.toLowerCase().includes(search))
      .filter((s) => !category || s.categoryId === category);
    const items = all.slice((page - 1) * perPage, page * perPage).map((s) => this.summary(s));
    return { status: 200, body: { page, per_page: perPage, total: all.length, total_pages: Math.max(1, Math.ceil(all.length / perPage)), items } };
  }

  /** Active appointments around these local days (with a margin for any time zone and for appointments across midnight). */
  private async busy(from: string, days: number) {
    const { items } = await this.deps.store.listBookingAppointments({
      appId: this.deps.app.id,
      statuses: ACTIVE_BOOKING_STATUSES,
      startFrom: new Date(new Date(`${addDays(from, -1)}T00:00:00Z`).getTime() - 14 * 3_600_000),
      startBefore: new Date(new Date(`${addDays(from, days + 1)}T00:00:00Z`).getTime() + 14 * 3_600_000),
      offset: 0,
      limit: 5000,
    });
    return items;
  }

  private async availability(request: ConnectorRequest): Promise<ConnectorResult> {
    const { query } = request;
    const service = this.service(Number(query.get("service")));
    if (!service) return error(404, "not_found", "Service not found.");
    const staffParam = query.get("staff");
    const staffId = staffParam ? Number(staffParam) : null;
    if (staffId !== null && !staffFor(this.setup, service.id).some((s) => s.id === staffId)) {
      return error(400, "invalid_request", "This staff member doesn't provide this service.");
    }
    const from = query.get("from") ?? "";
    if (!isDate(from)) return error(400, "invalid_request", "Choose a valid date.");
    const days = Math.min(31, Math.max(1, Number.parseInt(query.get("days") ?? "7", 10) || 7));
    const out = freeTimes({ setup: this.setup, serviceId: service.id, staffId, from, days, now: request.now, appointments: await this.busy(from, days) });
    return {
      status: 200,
      body: {
        timezone: this.setup.rules.timezone,
        days: out.map((d) => ({
          date: d.date,
          slots: d.slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString(), local_time: s.localTime, staff_ids: s.staffIds })),
        })),
      },
    };
  }

  private async book(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const body = (request.body ?? {}) as Record<string, unknown>;
    const service = this.service(Number(body.service_id));
    if (!service) return error(400, "invalid_request", "This service can't be booked.");
    const staffId = body.staff_id === null || body.staff_id === undefined ? null : Number(body.staff_id);
    const candidates = staffFor(this.setup, service.id).filter((s) => staffId === null || s.id === staffId);
    if (candidates.length === 0) return error(400, "invalid_request", "This staff member doesn't provide this service.");
    const start = typeof body.start === "string" ? new Date(body.start) : new Date(Number.NaN);
    if (Number.isNaN(start.getTime())) return error(400, "invalid_request", "Choose a time.");
    const notes = this.setup.rules.notes && typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 1000) : null;
    // 21 The intake form's answers, checked before the time so a missing answer never costs the slot.
    const answers = checkAnswers(this.setup.intakeFields, body.answers);
    if (!answers.ok) {
      return { status: 400, body: { code: "invalid_answers", message: "Please check your answers to the questions.", details: { fields: answers.errors } } };
    }
    // The time must be one the availability offers now, for someone free.
    const date = utcToLocal(start, this.setup.rules.timezone).date;
    const [day] = freeTimes({ setup: this.setup, serviceId: service.id, staffId, from: date, days: 1, now: request.now, appointments: await this.busy(date, 1) });
    const slot = day?.slots.find((s) => s.start.getTime() === start.getTime());
    if (!slot) return slotTaken();
    for (const member of candidates.filter((c) => slot.staffIds.includes(c.id))) {
      const appointment = await this.deps.store.createBookingAppointment({
        appId: this.deps.app.id,
        userId: request.user.id,
        serviceId: service.id,
        staffId: member.id,
        serviceName: service.name,
        staffName: member.name,
        customerName: request.user.name,
        // 19 Someone who signed in by email has no phone: their email goes in its own field.
        customerPhone: request.user.phone,
        customerEmail: request.user.phone ? null : request.user.email,
        startAt: slot.start,
        endAt: slot.end,
        status: this.setup.rules.autoApprove ? "approved" : "pending",
        priceCents: service.priceCents,
        currency: this.setup.rules.currency,
        notes,
        answers: answers.value,
        createdAt: request.now,
        updatedAt: request.now,
      });
      if (appointment) {
        await this.deps.onBooked?.(appointment).catch(() => {
          // The appointment stands; the business sees it in the dashboard.
        });
        return { status: 201, body: this.appointmentJson(appointment, request.now) };
      }
    }
    return slotTaken();
  }

  private async appointments(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const status = request.query.get("status") ?? "upcoming";
    if (status !== "upcoming" && status !== "past") return error(400, "invalid_request", "Unknown status.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 100);
    const { items, total } = await this.deps.store.listBookingAppointments({
      appId: this.deps.app.id,
      userId: request.user.id,
      scope: { kind: status, now: request.now },
      offset: (page - 1) * perPage,
      limit: perPage,
    });
    return {
      status: 200,
      body: { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)), items: items.map((a) => this.appointmentJson(a, request.now)) },
    };
  }

  private async own(request: ConnectorRequest, id: number): Promise<BookingAppointment | null> {
    if (!request.user || !Number.isSafeInteger(id)) return null;
    const appointment = await this.deps.store.getBookingAppointment(this.deps.app.id, id);
    return appointment && appointment.userId === request.user.id ? appointment : null;
  }

  private async appointment(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const appointment = await this.own(request, id);
    return appointment ? { status: 200, body: this.appointmentJson(appointment, request.now) } : error(404, "not_found", "Appointment not found.");
  }

  private async cancel(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const appointment = await this.own(request, id);
    if (!appointment) return error(404, "not_found", "Appointment not found.");
    if (!this.canCancel(appointment, request.now)) {
      return error(409, "too_late", "This appointment can no longer be cancelled in the app. Please contact us.");
    }
    await this.deps.store.updateBookingAppointment(this.deps.app.id, id, { status: "cancelled", updatedAt: request.now });
    return { status: 200, body: this.appointmentJson({ ...appointment, status: "cancelled", updatedAt: request.now }, request.now) };
  }
}
