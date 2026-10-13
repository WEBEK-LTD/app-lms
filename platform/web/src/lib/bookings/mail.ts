import { formatCents } from "../catalog/money";
import type { BookingAppointment } from "../data/types";
import { utcToLocal } from "./time";

/** The email telling the business about a new appointment. */
export function newAppointmentMail(a: BookingAppointment, timezone: string, appName: string, dashboardUrl: string): { subject: string; text: string } {
  const local = utcToLocal(a.startAt, timezone);
  return {
    subject: `New appointment: ${a.serviceName}, ${local.date} ${local.time}`,
    text:
      `${a.customerName} booked ${a.serviceName} with ${a.staffName} in ${appName}.\n\n` +
      `When: ${local.date} at ${local.time} (${timezone})\n` +
      `Price: ${formatCents(a.priceCents, a.currency)}\n` +
      `Phone: ${a.customerPhone}\n` +
      (a.notes ? `Note: ${a.notes}\n` : "") +
      (a.status === "pending" ? "\nIt waits for your approval.\n" : "") +
      `\nYour appointments: ${dashboardUrl}`,
  };
}
