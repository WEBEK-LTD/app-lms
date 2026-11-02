import { Badge } from "@/components/ui";
import type { DashKey, DashT } from "@/i18n/dashboard";
import type { SchoolReportField, SchoolReportStatus } from "@/lib/data/types";

/** 113.5 What the teachers' report pages share. */

export const STATUS_KEYS: Record<SchoolReportStatus, DashKey> = { draft: "reports.statusDraft", sent: "reports.statusSent", returned: "reports.statusReturned", approved: "reports.statusApproved" };
const STATUS_TONES: Record<SchoolReportStatus, "info" | "warn" | "success" | "neutral"> = { draft: "neutral", sent: "info", returned: "warn", approved: "success" };

export function StatusBadge({ status, t }: { status: SchoolReportStatus; t: DashT }) {
  return <Badge tone={STATUS_TONES[status]}>{t(STATUS_KEYS[status])}</Badge>;
}

export const FIELD_TYPE_KEYS: Record<SchoolReportField["type"], DashKey> = { text: "reports.typeText", choice: "reports.typeChoice", rating: "reports.typeRating" };

/** An answer as the administration reads it: a rating out of 5, else the text. */
export function AnswerText({ field, value, t }: { field: SchoolReportField; value: string | number | undefined; t: DashT }) {
  if (value === undefined || value === "") return <span className="text-muted">—</span>;
  if (field.type === "rating") {
    const n = Number(value);
    return (
      <span className="font-semibold" aria-label={t("reports.ratingOf", { value: n })}>
        <span aria-hidden="true" className="text-ember">
          {"★".repeat(n)}
          <span className="text-line-strong">{"★".repeat(Math.max(0, 5 - n))}</span>
        </span>{" "}
        {t("reports.ratingOf", { value: n })}
      </span>
    );
  }
  return <span className="whitespace-pre-line">{String(value)}</span>;
}
