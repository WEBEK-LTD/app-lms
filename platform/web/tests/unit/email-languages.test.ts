import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { emailLangOf, renderEmail } from "@/lib/email/send";
import { EMAIL_TEMPLATES, emailTemplate, placeholderErrors } from "@/lib/email/templates";
import { LOCALIZED_DEFAULTS, localizedDefault } from "@/lib/email/templates-lang";
import { paymentLine } from "@/lib/billing/plan-mail";
import { formatAmount } from "@/lib/billing/prices";
import { newAppointmentMailValues } from "@/lib/bookings/mail";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import type { BookingAppointment, PlanPayment } from "@/lib/data/types";
import { NOW } from "./helpers";

const placeholders = (text: string) => [...new Set([...text.matchAll(/\{\{([^{}]*)\}\}/g)].map((m) => m[1]))].sort();

// 56 Emails to clients go out in the language they chose for the dashboard.
describe("emails in the client's language", () => {
  it("have Arabic and Turkish defaults with the same placeholders as the English ones", () => {
    for (const [lang, templates] of Object.entries(LOCALIZED_DEFAULTS)) {
      for (const [key, text] of Object.entries(templates)) {
        const english = emailTemplate(key)!;
        expect(english, `${lang} ${key}`).toBeDefined();
        expect(placeholders(text.subject), `${lang} ${key} subject`).toEqual(placeholders(english.subject));
        expect(placeholders(text.body), `${lang} ${key} body`).toEqual(placeholders(english.body));
        expect(placeholderErrors(text.subject, english), `${lang} ${key}`).toEqual([]);
        expect(placeholderErrors(text.body, english), `${lang} ${key}`).toEqual([]);
      }
    }
  });

  it("cover the same emails in both languages, and only emails to clients", () => {
    expect(Object.keys(LOCALIZED_DEFAULTS.ar).sort()).toEqual(Object.keys(LOCALIZED_DEFAULTS.tr).sort());
    for (const key of ["build_failed_team", "setup_request", "publishing_request", "sign_in_code", "donation_receipt", "payment_refunded", "announcement"]) {
      expect(localizedDefault(key as never, "ar"), key).toBeNull();
    }
    expect(localizedDefault("password_reset", "en")).toBeNull();
    expect(EMAIL_TEMPLATES.filter((t) => localizedDefault(t.key, "ar")).length).toBe(Object.keys(LOCALIZED_DEFAULTS.ar).length);
  });

  it("use the person's language, else English", () => {
    expect(emailLangOf({ language: "ar" })).toBe("ar");
    expect(emailLangOf({ language: "tr" })).toBe("tr");
    expect(emailLangOf({ language: null })).toBe("en");
    expect(emailLangOf({ language: "fr" })).toBe("en");
    expect(emailLangOf({})).toBe("en");
  });

  it("send the built-in default in Arabic, right to left, with dates in Arabic", async () => {
    const store = new MemoryStore();
    clearPlatformSettingsCache();
    const values = { name: "Ada", app_name: "Ada Academy", plan: "Pro", end_date: "31 Mar 2027", renew_url: "https://x.test/r" };
    const ar = await renderEmail(store, "plan_ends_in_7_days", values, undefined, "ar");
    expect(ar.subject).toBe("Ada Academy: تنتهي خطتك في 31 مارس 2027");
    expect(ar.text).toContain("تنتهي خطة Pro لتطبيق Ada Academy في 31 مارس 2027.");
    expect(ar.html).toContain('<html lang="ar" dir="rtl">');
    const tr = await renderEmail(store, "plan_ends_in_7_days", values, undefined, "tr");
    expect(tr.subject).toBe("Ada Academy: planınızın bitiş tarihi 31 Mar 2027");
    expect(tr.html).toContain('<html lang="tr" dir="ltr">');
    const en = await renderEmail(store, "plan_ends_in_7_days", values);
    expect(en.subject).toBe("Ada Academy: your plan ends on 31 Mar 2027");
    expect(en.html).toContain("<!doctype html><html><body");
    clearPlatformSettingsCache();
  });

  it("keep an email the team edited in English in every language", async () => {
    const store = new MemoryStore();
    clearPlatformSettingsCache();
    await store.setEmailTemplate("build_ready", { subject: "Build {{build_number}} is here", body: "Hi {{name}}, it's ready." }, "admin@yallapp.test", NOW);
    const ar = await renderEmail(store, "build_ready", { name: "Ada", build_number: "3" }, undefined, "ar");
    expect(ar).toMatchObject({ subject: "Build 3 is here", text: "Hi Ada, it's ready." });
    expect(ar.html).toContain("<!doctype html><html><body");
    await store.setEmailTemplate("build_ready", null, "admin@yallapp.test", NOW);
    expect((await renderEmail(store, "build_ready", { name: "Ada", app_name: "Ada Academy", build_number: "3" }, undefined, "ar")).subject).toBe(
      "Ada Academy: الإصدار رقم 3 جاهز",
    );
    clearPlatformSettingsCache();
  });

  it("write the lines that go into an email in its language", () => {
    const payment = { id: "p1", amountCents: 150_000, currency: "EGP", shownCents: null, shownCurrency: null, paymentProvider: "kashier" } as unknown as PlanPayment;
    const egp = formatAmount(150_000, "EGP");
    expect(paymentLine(payment, "https://x.test")).toBe(`Paid: ${egp} by card through Kashier.\nReceipt: https://x.test/dashboard/license/receipts/p1\n\n`);
    expect(paymentLine(payment, "https://x.test", "tr")).toBe(`Ödenen: ${egp}, Kashier üzerinden kartla.\nMakbuz: https://x.test/dashboard/license/receipts/p1\n\n`);
    const appointment = {
      startAt: new Date("2026-10-20T11:30:00.000Z"),
      customerName: "Elif",
      serviceName: "Haircut",
      staffName: "Deniz",
      priceCents: 60_000,
      currency: "TRY",
      customerPhone: null,
      customerEmail: "elif@example.com",
      notes: "First visit",
      answers: [],
      status: "pending",
    } as unknown as BookingAppointment;
    expect(newAppointmentMailValues(appointment, "Europe/Istanbul", "Salon", "u")).toMatchObject({
      contact_label: "Email",
      note_line: "Note: First visit\n",
      approval_line: "\nIt waits for your approval.\n",
    });
    expect(newAppointmentMailValues(appointment, "Europe/Istanbul", "Salon", "u", "ar")).toMatchObject({
      contact_label: "البريد الإلكتروني",
      note_line: "ملاحظة: First visit\n",
      approval_line: "\nينتظر موافقتك.\n",
    });
  });
});
