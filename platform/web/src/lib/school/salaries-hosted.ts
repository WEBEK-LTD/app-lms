import { hmacSha256 } from "../crypto/tokens";
import { signUrl } from "../crypto/signed-url";
import type { SchoolPerson } from "../data/types";
import { error, intParam } from "../hosted/connectors/common";
import type { ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import type { SchoolContext } from "./hosted";
import { advanceBalance, advanceJson, ownPayslips, payslipJson } from "./salaries";
import type { SchoolMember } from "./service";

/**
 * 113.12 The hosted API's payslips (tag Staff): a teacher or staff member
 * sees only their own sheets once the school made them final, their
 * advances, and each payslip's PDF from a signed link that lasts a quarter
 * of an hour (`/a/<app>/payslips/<id>/pdf`). Nothing here pays anyone.
 */

/** A payslip's PDF link lasts this long. */
export const PAYSLIP_LINK_SECONDS = 15 * 60;

/** The key a school's payslip links are signed with, from the hosted API's secret. */
export const payslipLinkKey = (hostedSecret: string, appId: string) => hmacSha256(hostedSecret, `payslip-pdf:${appId}`);

export const payslipPdfPath = (appId: string, id: number) => `/a/${appId}/payslips/${id}/pdf`;

/** A short-lived signed link to the payslip's PDF in `lang`. */
export function payslipPdfUrl(input: { platformUrl: string; hostedSecret: string; appId: string; id: number; lang: string; now: Date }): string {
  const lang = ["en", "ar", "tr"].includes(input.lang) ? input.lang : "en";
  return signUrl(input.platformUrl.replace(/\/+$/, ""), payslipPdfPath(input.appId, input.id), { lang }, payslipLinkKey(input.hostedSecret, input.appId), PAYSLIP_LINK_SECONDS, input.now);
}

const ok = (body: unknown, status = 200): ConnectorResult => ({ status, body });
const idOf = (value: string | undefined): number | null => (value && /^\d{1,15}$/.test(value) ? Number(value) : null);

/** The signed-in person's own records as a teacher and as staff (one person can be both). */
const ownIds = (member: SchoolMember) => [member.teacher, member.staff].filter((p): p is SchoolPerson => p !== null).map((p) => p.id);

/** The answer for `/staff/payslips…`, or null when the path isn't one. */
export async function handlePayslipRoute(ctx: SchoolContext, request: ConnectorRequest, member: SchoolMember): Promise<ConnectorResult | null> {
  const path = request.path;
  if (path[1] !== "payslips") return null;
  if (request.method !== "GET") return error(404, "not_found", "Page not found.");
  const { payslips, advances, all } = await ownPayslips(ctx.store, ctx.app.id, ownIds(member));
  const link = (id: number) => payslipPdfUrl({ platformUrl: ctx.platformUrl, hostedSecret: ctx.secret, appId: ctx.app.id, id, lang: request.lang ?? "en", now: request.now });
  if (path.length === 2) {
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 100);
    const items = payslips.slice((page - 1) * perPage, page * perPage);
    return ok({
      page,
      per_page: perPage,
      total: payslips.length,
      total_pages: Math.max(1, Math.ceil(payslips.length / perPage)),
      items: items.map((p) => payslipJson(p, link(p.id))),
      // Advances still being taken back.
      advances: advances.filter((a) => advanceBalance(a, all).left > 0).map((a) => advanceJson(a, all)),
    });
  }
  const id = idOf(path[2]);
  const found = path.length === 3 && id !== null ? payslips.find((p) => p.id === id) : undefined;
  if (!found) return error(404, "not_found", "Payslip not found.");
  return ok(payslipJson(found, link(found.id)));
}
