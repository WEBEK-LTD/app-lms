import { addDays, localToUtc, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, CatalogOrder, CourseSetup, Teacher } from "../data/types";

/**
 * 105.3 What a teacher's courses sold over a period and the teacher's share:
 * orders paid on the academy's payment page (`paidAt` in the period), each
 * course's part of the order after any coupon, less what was refunded of it.
 * The share is the teacher's share as set now; the academy pays its teachers
 * itself.
 */

export type EarningsPeriod = "month" | "last_month" | "year";
export const EARNINGS_PERIODS: readonly EarningsPeriod[] = ["month", "last_month", "year"];

export interface CourseSales {
  courseId: number;
  title: string;
  sales: number;
  salesCents: number;
  refundsCents: number;
}

export interface TeacherStatement {
  teacherId: number;
  sales: number;
  salesCents: number;
  refundsCents: number;
  shareBp: number;
  /** The teacher's share of the sales less refunds. */
  earnedCents: number;
  /** What the academy keeps. */
  academyCents: number;
  courses: CourseSales[];
}

/** The days a period covers in the academy's time zone (`to` is today for the current ones). */
export function periodDays(period: EarningsPeriod, now: Date, zone: string): { from: string; to: string } {
  const today = utcToLocal(now, zone).date;
  const [y, m] = today.split("-").map(Number) as [number, number];
  if (period === "year") return { from: `${y}-01-01`, to: today };
  if (period === "month") return { from: `${today.slice(0, 8)}01`, to: today };
  const year = m === 1 ? y - 1 : y;
  const month = m === 1 ? 12 : m - 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, "0")}` };
}

/** From the start of `from` to the end of `to`, in the zone. */
export function dayRange(from: string, to: string, zone: string): { start: Date; end: Date } {
  return { start: localToUtc(from, "00:00", zone), end: localToUtc(addDays(to, 1), "00:00", zone) };
}

const PAID = ["processing", "completed", "refunded"] as const;

/** The academy's paid orders in the range (every page of them). */
export async function paidOrders(store: DataStore, app: Pick<App, "id">, start: Date, end: Date): Promise<CatalogOrder[]> {
  const out: CatalogOrder[] = [];
  for (let offset = 0; ; offset += 200) {
    const { items, total } = await store.listCatalogOrders({ appId: app.id, statuses: [...PAID], offset, limit: 200 });
    for (const order of items) if (order.paidAt && order.paidAt >= start && order.paidAt < end) out.push(order);
    if (offset + items.length >= total || items.length === 0) break;
  }
  return out;
}

/** Each course's part of the orders: its price after any coupon, and its part of the refunds. */
export function salesByCourse(orders: readonly CatalogOrder[], setup: CourseSetup): Map<number, CourseSales> {
  const titles = new Map(setup.courses.map((c) => [c.id, c.title]));
  const out = new Map<number, CourseSales>();
  for (const order of orders) {
    const subtotal = order.lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);
    if (subtotal <= 0) continue;
    for (const line of order.lines) {
      if (!titles.has(line.productId)) continue;
      const value = line.unitCents * line.quantity;
      const row = out.get(line.productId) ?? { courseId: line.productId, title: titles.get(line.productId)!, sales: 0, salesCents: 0, refundsCents: 0 };
      row.sales += line.quantity;
      row.salesCents += Math.round((value * order.totalCents) / subtotal);
      row.refundsCents += Math.round((value * (order.refundedCents ?? 0)) / subtotal);
      out.set(line.productId, row);
    }
  }
  return out;
}

/** The statement of each teacher (with no sales too) over the orders. */
export function statements(teachers: readonly Teacher[], setup: CourseSetup, orders: readonly CatalogOrder[]): TeacherStatement[] {
  const byCourse = salesByCourse(orders, setup);
  return teachers.map((teacher) => {
    const courses = setup.courses.filter((c) => c.teacherId === teacher.id).flatMap((c) => (byCourse.has(c.id) ? [byCourse.get(c.id)!] : []));
    const salesCents = courses.reduce((sum, c) => sum + c.salesCents, 0);
    const refundsCents = courses.reduce((sum, c) => sum + c.refundsCents, 0);
    const net = Math.max(0, salesCents - refundsCents);
    const earnedCents = Math.round((net * teacher.shareBp) / 10_000);
    return {
      teacherId: teacher.id,
      sales: courses.reduce((sum, c) => sum + c.sales, 0),
      salesCents,
      refundsCents,
      shareBp: teacher.shareBp,
      earnedCents,
      academyCents: net - earnedCents,
      courses: courses.sort((a, b) => b.salesCents - a.salesCents || a.courseId - b.courseId),
    };
  });
}
