import { answerRequestAction } from "@/app/actions/requests";
import { Badge } from "@/components/ui";
import { Thumb } from "@/components/page-kit";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import type { CatalogCurrency, StoreRequest, StoreRequestStatus } from "@/lib/data/types";
import { STORE_REQUEST_STATUSES } from "@/lib/data/types";
import { REQUEST_REPLY_MAX } from "@/lib/selling/requests";
import { SchoolForm } from "@/app/dashboard/school/forms";

export const REQUEST_KEYS: Record<StoreRequestStatus, DashKey> = { new: "shop.requestNew", quoted: "shop.requestQuoted", accepted: "shop.requestAccepted", declined: "shop.requestDeclined", done: "shop.requestDone" };
const TONES: Record<StoreRequestStatus, "success" | "warn" | "danger" | "neutral"> = { new: "warn", quoted: "neutral", accepted: "success", declined: "danger", done: "neutral" };

/** 210 One custom-order request: who sent it and when, its answers, the shop's answer so far, and the form to answer it. */
export function RequestItem({ request: r, t }: { request: StoreRequest; t: DashT }) {
  const contact = [r.customer.name, r.customer.phone, r.customer.email].filter(Boolean).join(" · ");
  return (
    <li data-request={r.id} className="flex flex-col gap-3 border-t border-line-soft px-5 py-3.5 first:border-t-0 sm:px-6">
      <div className="flex flex-wrap items-start gap-3">
        <Thumb icon="edit_note" shape="round" tint={r.id} />
        <span className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-[15px] font-bold">{contact || t("shop.requestSomeone")}</span>
          <span className="text-[13px] text-muted">{t("shop.requestSent", { title: r.title, date: r.createdAt.toISOString().slice(0, 10) })}</span>
          <dl className="m-0 grid gap-x-4 gap-y-1 text-[14px] sm:grid-cols-[minmax(120px,auto)_1fr]">
            {r.answers.map((a, i) => (
              <div key={i} className="contents">
                <dt className="font-semibold text-ink-4">{a.label}</dt>
                <dd className="m-0 whitespace-pre-line">{a.value}</dd>
              </div>
            ))}
          </dl>
          {r.reply || r.quoteCents !== null ? (
            <span className="text-[13px] text-muted">{[r.quoteCents !== null ? t("shop.requestQuote", { price: formatCents(r.quoteCents, r.currency as CatalogCurrency) }) : null, r.reply].filter(Boolean).join(" · ")}</span>
          ) : null}
        </span>
        <Badge tone={TONES[r.status]}>{t(REQUEST_KEYS[r.status])}</Badge>
      </div>
      <SchoolForm action={answerRequestAction} submit={t("shop.requestSave")} className="rounded-xl bg-sand p-4">
        <input type="hidden" name="id" value={r.id} />
        <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
          <legend className="sr-only">{t("shop.requestStatus")}</legend>
          {STORE_REQUEST_STATUSES.map((s) => (
            <label key={s} className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white px-3 text-sm has-[:checked]:border-midnight has-[:checked]:bg-midnight has-[:checked]:font-bold has-[:checked]:text-ivory">
              <input type="radio" name="status" value={s} defaultChecked={s === (r.status === "new" ? "quoted" : r.status)} className="h-4 w-4 accent-ember" />
              {t(REQUEST_KEYS[s])}
            </label>
          ))}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`f-quote-${r.id}`} className="text-sm font-semibold">
              {t("shop.requestPrice", { currency: r.currency })}
            </label>
            <input id={`f-quote-${r.id}`} name="quote" inputMode="decimal" dir="ltr" defaultValue={r.quoteCents !== null ? centsToDecimal(r.quoteCents, r.currency) : ""} className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`f-reply-${r.id}`} className="text-sm font-semibold">
              {t("shop.requestReply")}
            </label>
            <textarea id={`f-reply-${r.id}`} name="reply" rows={2} maxLength={REQUEST_REPLY_MAX} defaultValue={r.reply ?? ""} className="input min-h-16 py-3" />
          </div>
        </div>
      </SchoolForm>
    </li>
  );
}
