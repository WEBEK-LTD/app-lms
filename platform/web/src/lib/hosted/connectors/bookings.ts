import { freeTimes, staffFor } from "../../bookings/availability";
import { busyTimes } from "../../bookings/busy";
import { hasClasses } from "../../bookings/classes";
import { checkAnswers, intakeFieldsJson } from "../../bookings/intake";
import { membershipActive, membershipStatus } from "../../bookings/memberships";
import { BOOKING_STATUS_LABELS, bookingSetup, type FullBookingSetup } from "../../bookings/setup";
import { addDays, isDate, localToUtc, utcToLocal } from "../../bookings/time";
import { centsToDecimal, formatCents } from "../../catalog/money";
import { PAY_LINK_MINUTES, paymentsSetUp } from "../../catalog/settings";
import { randomToken, sha256Hex } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import {
  ACTIVE_BOOKING_STATUSES,
  type App,
  type BookingAppointment,
  type BookingService,
  type BookingStaff,
  type BookClassFailure,
  type ClassSession,
  type Membership,
  type MembershipPlan,
} from "../../data/types";
import { descriptionHtml, payUrl } from "./catalog";
import { error, intParam } from "./common";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";

interface BookingsDeps {
  store: DataStore;
  app: App;
  assetUrl: (assetId: string) => string;
  /** Tells the business about a new appointment (an email); failures don't fail the booking. */
  onBooked?: (appointment: BookingAppointment) => Promise<void>;
  /** 27 The payment page's address, for memberships. */
  platformUrl?: string;
  /** 27 Card payments in the app are in the app's plan (default true); without them no membership is on sale. */
  cardPayments?: boolean;
}

const slotTaken = () => error(409, "slot_taken", "This time was just taken. Please choose another one.");
const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");

/**
 * Bookings managed in the Yallapp dashboard, served like the plugin's
 * bookings endpoints: services, staff and hours from the app's booking
 * setup, appointments from booking_appointments.
 */
export class BookingsConnector implements Connector {
  private readonly setup: FullBookingSetup;

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
        // 27 A gym's or studio's group classes.
        ...(hasClasses(this.setup)
          ? {
              classes: {
                membership_required: this.setup.membershipRequired,
                cancel_before_minutes: rules.cancelBeforeMinutes,
                memberships: this.plansOnSale().length > 0,
              },
            }
          : {}),
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
      case "GET /bookings/classes":
        return this.classes(request);
      case "GET /memberships/plans":
        return this.plans();
      case "POST /memberships/checkout-link":
        return this.membershipCheckout(request);
      case "GET /me/memberships":
        return this.myMemberships(request);
    }
    const [first, second, third, fourth] = request.path;
    if (request.method === "GET" && first === "bookings" && second === "services" && third && request.path.length === 3) {
      const service = this.service(Number(third));
      return service ? { status: 200, body: this.detail(service) } : error(404, "not_found", "Service not found.");
    }
    if (request.method === "POST" && first === "bookings" && second === "classes" && third && request.path.length === 4) {
      if (fourth === "book") return this.bookClass(request, Number(third));
      if (fourth === "cancel") return this.cancelClass(request, Number(third));
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

  /** Active appointments and classes around these local days (lib/bookings/busy.ts). */
  private busy(from: string, days: number): Promise<Pick<BookingAppointment, "staffId" | "startAt" | "endAt">[]> {
    return busyTimes(this.deps.store, this.deps.app.id, this.setup, from, days);
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

  // 27 Group classes and memberships

  /** Memberships are sold when card payments are set up and in the app's plan (a demo's payment page charges nothing). */
  private get canSell(): boolean {
    return paymentsSetUp(this.deps.app) && this.deps.cardPayments !== false && Boolean(this.deps.platformUrl);
  }

  private plansOnSale(): MembershipPlan[] {
    return this.canSell ? this.setup.membershipPlans.filter((p) => p.active) : [];
  }

  private canCancelClass(session: ClassSession, now: Date): boolean {
    const before = this.setup.rules.cancelBeforeMinutes;
    return session.status === "scheduled" && before !== null && session.startAt.getTime() - now.getTime() >= before * 60_000;
  }

  private classJson(session: ClassSession, booked: boolean, now: Date) {
    const local = utcToLocal(session.startAt, this.setup.rules.timezone);
    const service = this.setup.services.find((s) => s.id === session.serviceId);
    const staff = this.setup.staff.find((s) => s.id === session.staffId);
    return {
      id: session.id,
      status: session.status,
      service: {
        id: session.serviceId,
        name: session.serviceName,
        image_url: service?.imageAssetId ? this.deps.assetUrl(service.imageAssetId) : null,
        color: service?.color ?? null,
      },
      staff: staff ? this.person(staff) : { id: session.staffId, name: session.staffName, image_url: null, title: null, price: null },
      start: session.startAt.toISOString(),
      end: session.endAt.toISOString(),
      local_date: local.date,
      local_time: local.time,
      capacity: session.capacity,
      spots_left: session.status === "scheduled" ? Math.max(0, session.capacity - session.bookedCount) : 0,
      booked,
      can_cancel: booked && this.canCancelClass(session, now),
    };
  }

  private noClasses = () => error(404, "not_found", "This app has no classes.");

  private async classes(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!hasClasses(this.setup)) return this.noClasses();
    const from = request.query.get("from") ?? "";
    if (!isDate(from)) return error(400, "invalid_request", "Choose a valid date.");
    const to = request.query.get("to") ?? addDays(from, 6);
    if (!isDate(to) || to < from || to > addDays(from, 31)) return error(400, "invalid_request", "Choose up to 31 days.");
    const { timezone } = this.setup.rules;
    const sessions = await this.deps.store.listClassSessions({
      appId: this.deps.app.id,
      startFrom: localToUtc(from, "00:00", timezone),
      startBefore: localToUtc(addDays(to, 1), "00:00", timezone),
    });
    const mine = request.user
      ? new Set(
          (await this.deps.store.listClassBookings({ appId: this.deps.app.id, userId: request.user.id, sessionIds: sessions.map((s) => s.id), status: "booked" })).map(
            (b) => b.sessionId,
          ),
        )
      : new Set<number>();
    return { status: 200, body: { timezone, items: sessions.map((s) => this.classJson(s, mine.has(s.id), request.now)) } };
  }

  private static readonly CLASS_ERRORS: Record<Exclude<BookClassFailure, "not_found">, [number, string, string]> = {
    cancelled: [409, "class_cancelled", "This class was cancelled."],
    too_late: [409, "too_late", "This class can no longer be booked in the app."],
    full: [409, "class_full", "This class is full. Please choose another one."],
    membership_required: [403, "membership_required", "You need a membership to book classes."],
    no_credits: [403, "no_credits", "Your membership has no classes left."],
  };

  private async bookClass(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (!hasClasses(this.setup) || !Number.isSafeInteger(id)) return error(404, "not_found", "Class not found.");
    const result = await this.deps.store.bookClass({
      appId: this.deps.app.id,
      sessionId: id,
      userId: request.user.id,
      customerName: request.user.name,
      customerPhone: request.user.phone,
      customerEmail: request.user.phone ? null : request.user.email,
      membershipRequired: this.setup.membershipRequired,
      bookableFrom: new Date(request.now.getTime() + this.setup.rules.minMinutesAhead * 60_000),
      now: request.now,
    });
    if (!result.ok) {
      if (result.reason === "not_found") return error(404, "not_found", "Class not found.");
      const [status, code, message] = BookingsConnector.CLASS_ERRORS[result.reason];
      return error(status, code, message);
    }
    return { status: 200, body: this.classJson(result.session, true, request.now) };
  }

  private async cancelClass(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const session = hasClasses(this.setup) && Number.isSafeInteger(id) ? await this.deps.store.getClassSession(this.deps.app.id, id) : null;
    if (!session) return error(404, "not_found", "Class not found.");
    const [booking] = await this.deps.store.listClassBookings({ appId: this.deps.app.id, sessionIds: [id], userId: request.user.id, status: "booked" });
    if (!booking) return error(404, "not_found", "You don't have a spot in this class.");
    if (!this.canCancelClass(session, request.now)) return error(409, "too_late", "This class can no longer be cancelled in the app. Please contact us.");
    if (!(await this.deps.store.cancelClassBooking({ appId: this.deps.app.id, sessionId: id, userId: request.user.id, now: request.now }))) {
      return error(404, "not_found", "You don't have a spot in this class.");
    }
    const after = (await this.deps.store.getClassSession(this.deps.app.id, id)) ?? session;
    return { status: 200, body: this.classJson(after, false, request.now) };
  }

  private planJson(p: MembershipPlan) {
    return { id: p.id, name: p.name, price: this.price(p.priceCents), period: p.period, credits: p.credits, description: p.description || null };
  }

  private plans(): ConnectorResult {
    if (!hasClasses(this.setup) && this.setup.membershipPlans.length === 0) return this.noClasses();
    return { status: 200, body: { items: this.plansOnSale().map((p) => this.planJson(p)) } };
  }

  /** 27 On Android and iOS alike: a membership is a service used in person (App Store Review Guideline 3.1.3(e)). */
  private async membershipCheckout(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const planId = Number((request.body as { plan_id?: unknown } | null)?.plan_id);
    const plan = this.setup.membershipPlans.find((p) => p.id === planId && p.active);
    if (!plan) return error(404, "not_found", "This membership isn't on sale.");
    if (!this.canSell) return error(403, "feature_disabled", "Memberships can't be bought in the app right now.");
    const token = randomToken(24);
    await this.deps.store.createCatalogOrder({
      appId: this.deps.app.id,
      tokenHash: sha256Hex(token),
      userId: request.user.id,
      status: "pending",
      lines: [{ productId: plan.id, name: plan.name, quantity: 1, unitCents: plan.priceCents, imageAssetId: null, digital: true }],
      subtotalCents: plan.priceCents,
      shippingCents: 0,
      totalCents: plan.priceCents,
      currency: this.setup.rules.currency,
      customer: null,
      paymentId: null,
      createdAt: request.now,
      paidAt: null,
      updatedAt: request.now,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
    return {
      status: 200,
      body: {
        url: payUrl(this.deps.platformUrl!, token),
        expires_at: new Date(request.now.getTime() + PAY_LINK_MINUTES * 60_000).toISOString(),
        open_in: "in_app",
      },
    };
  }

  private membershipJson(m: Membership, now: Date) {
    return {
      id: m.id,
      plan: { id: m.planId, name: m.planName, period: m.period },
      status: membershipStatus(m, now),
      starts_at: m.startsAt.toISOString(),
      ends_at: m.endsAt ? m.endsAt.toISOString() : null,
      credits_left: m.creditsLeft,
    };
  }

  private async myMemberships(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (!hasClasses(this.setup) && this.setup.membershipPlans.length === 0) return this.noClasses();
    const all = await this.deps.store.listMemberships({ appId: this.deps.app.id, userId: request.user.id, limit: 100 });
    const now = request.now;
    const active = all
      .filter((m) => membershipActive(m, now))
      .sort((a, b) => (a.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER) || a.id - b.id);
    const ended = all.filter((m) => !membershipActive(m, now));
    return { status: 200, body: { items: [...active, ...ended].map((m) => this.membershipJson(m, now)) } };
  }
}
