import { formatCents } from "../catalog/money";
import type { BookingAppointment } from "../data/types";
import { emailTemplate, renderTemplate } from "../email/templates";
import { utcToLocal } from "./time";
import { getDashT } from "@/i18n/dashboard";
import type { Lang } from "@/i18n/config";

/** The values of the business's "New appointment" email (lib/email/templates.ts). */
export function newAppointmentMailValues(a: BookingAppointment, timezone: string, appName: string, dashboardUrl: string, lang: Lang = "en"): Record<string, string> {
  const local = utcToLocal(a.startAt, timezone);
  const t = getDashT(lang);
  return {
    app_name: appName,
    customer_name: a.customerName,
    service: a.serviceName,
    staff: a.staffName,
    date: local.date,
    time: local.time,
    timezone,
    price: formatCents(a.priceCents, a.currency),
    // 19 Someone who signed in by email is reached by email.
    contact_label: a.customerPhone ? t("emails.phone") : t("emails.email"),
    phone: a.customerPhone ?? a.customerEmail ?? "",
    note_line: a.notes ? `${t("emails.note", { note: a.notes })}\n` : "",
    // 21 Intake answers are health data: never in the email, only a pointer to the dashboard.
    intake_line: a.answers?.length ? `${t("emails.intake")}\n` : "",
    approval_line: a.status === "pending" ? `\n${t("emails.approval")}\n` : "",
    appointments_url: dashboardUrl,
  };
}

/** The email telling the business about a new appointment, with the default template (sending uses the team's edit). */
export function newAppointmentMail(a: BookingAppointment, timezone: string, appName: string, dashboardUrl: string): { subject: string; text: string } {
  const { subject, text } = renderTemplate(emailTemplate("new_appointment")!, newAppointmentMailValues(a, timezone, appName, dashboardUrl));
  return { subject, text };
}
