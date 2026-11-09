import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { btn, Notice } from "@/components/ui";
import { submitJoinAction } from "@/app/actions/joining";
import type { DashKey } from "@/i18n/dashboard";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { ApplicationField } from "@/lib/data/types";
import { JOIN_DAYS } from "@/lib/market/joining-forms";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // 115.12 The joining forms' links are shared by the owner, never listed.
  return { title: (await dashboardText()).t("market.joinTitle"), robots: { index: false, follow: false } };
}

const field = "input w-full";
const label = "flex flex-col gap-1.5 text-[14px] font-semibold text-ink-2";

function Question({ q, t }: { q: ApplicationField; t: (key: DashKey) => string }) {
  const name = q.key;
  const help = q.help ? <span className="text-[13px] font-normal text-ink-4">{q.help}</span> : null;
  const title = (
    <span>
      {q.label}
      {q.required ? <span className="text-danger"> *</span> : null}
    </span>
  );
  switch (q.kind) {
    case "long_text":
      return (
        <label className={label}>
          {title}
          {help}
          <textarea name={name} rows={4} maxLength={4000} required={q.required} className={field} />
        </label>
      );
    case "list":
      return (
        <label className={label}>
          {title}
          {help}
          <select name={name} required={q.required} defaultValue="" className="input h-11">
            <option value="" disabled>
              —
            </option>
            {q.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      );
    case "yes_no":
      return (
        <label className="flex items-center gap-2.5 text-[14px] font-semibold text-ink-2">
          <input type="checkbox" name={name} value="on" />
          {title}
        </label>
      );
    case "file":
    case "logo":
    case "documents":
      return (
        <label className={label}>
          {title}
          {help}
          <input type="file" name={name} required={q.required} multiple={q.kind === "documents"} accept={q.kind === "logo" ? "image/png,image/jpeg" : "image/png,image/jpeg,application/pdf"} className="text-[14px]" />
        </label>
      );
    case "place":
      return (
        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 text-[14px] font-semibold text-ink-2">{title}</legend>
          {help}
          <input name={`${name}.address`} required={q.required} maxLength={200} placeholder={t("market.jAddress")} className={field} />
          <div className="grid grid-cols-2 gap-2">
            <input name={`${name}.lat`} inputMode="decimal" required={q.required} placeholder={t("market.jLat")} dir="ltr" className={field} />
            <input name={`${name}.lng`} inputMode="decimal" required={q.required} placeholder={t("market.jLng")} dir="ltr" className={field} />
          </div>
        </fieldset>
      );
    case "hours":
      return (
        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 text-[14px] font-semibold text-ink-2">{title}</legend>
          {help}
          {JOIN_DAYS.map((day) => (
            <div key={day} className="grid grid-cols-[80px_1fr_1fr] items-center gap-2">
              <span className="text-[13px] font-semibold text-ink-3">{t(`market.day_${day}` as DashKey)}</span>
              <input type="time" name={`${name}.${day}.opens`} className={field} dir="ltr" />
              <input type="time" name={`${name}.${day}.closes`} className={field} dir="ltr" />
            </div>
          ))}
        </fieldset>
      );
    default:
      return (
        <label className={label}>
          {title}
          {help}
          <input name={name} type={q.kind === "email" ? "email" : q.kind === "phone" ? "tel" : q.kind === "number" ? "number" : "text"} required={q.required} maxLength={200} dir={q.kind === "phone" || q.kind === "email" ? "ltr" : undefined} className={field} />
        </label>
      );
  }
}

/** 115.12 The page a place fills in to join a marketplace, by the link its owner shares. */
export default async function JoinPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { token } = await params;
  const { t } = await dashboardText();
  const store = await getStore();
  const form = await store.findMarketApplicationFormByToken(token);
  if (!form) notFound();
  const app = await store.getAppById(form.appId);
  if (!app) notFound();
  const { error, sent } = await searchParams;

  return (
    <main className="min-h-screen bg-sand px-4 py-10">
      <div className="mx-auto flex max-w-[680px] flex-col gap-6">
        <header className="flex flex-col gap-2 rounded-[22px] bg-midnight p-6 text-white sm:p-8">
          <span className="text-[12px] font-bold tracking-[0.8px] text-white/70 uppercase">{app.appName}</span>
          <h1 className="m-0 text-[28px] leading-tight font-extrabold tracking-[-0.5px] sm:text-[34px]">{form.title}</h1>
          {form.intro ? <p className="m-0 text-[15px] leading-relaxed whitespace-pre-wrap text-white/85">{form.intro}</p> : null}
        </header>
        {sent ? (
          <Notice tone="success" icon="check_circle">
            {t("market.jSent")}
          </Notice>
        ) : !form.open ? (
          <Notice tone="info" icon="schedule">
            {t("market.jClosed")}
          </Notice>
        ) : (
          <form action={submitJoinAction} className="flex flex-col gap-5 rounded-[22px] border border-line-soft bg-white p-6 sm:p-8">
            {error ? (
              <Notice tone="danger" icon="error">
                {error}
              </Notice>
            ) : null}
            <input type="hidden" name="token" value={token} />
            <label className={label}>
              <span>
                {t("market.jBusiness")}
                <span className="text-danger"> *</span>
              </span>
              <input name="business_name" required maxLength={120} className={field} />
            </label>
            <label className={label}>
              <span>
                {t("market.jEmail")}
                <span className="text-danger"> *</span>
              </span>
              <span className="text-[13px] font-normal text-ink-4">{t("market.jEmailHint")}</span>
              <input name="email" type="email" required maxLength={191} dir="ltr" className={field} />
            </label>
            {form.kinds.length !== 1 ? (
              <label className={label}>
                {t("market.jKind")}
                <select name="kind" required defaultValue="" className="input h-11">
                  <option value="" disabled>
                    —
                  </option>
                  {(form.kinds.length ? form.kinds : (["restaurant", "grocery", "shop"] as const)).map((k) => (
                    <option key={k} value={k}>
                      {t(`market.vk_${k}` as DashKey)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {form.fields.map((q) => (
              <Question key={q.key} q={q} t={t} />
            ))}
            <button type="submit" className={`${btn.primary} h-12 px-6 text-[15px]`}>
              <Icon name="send" size={18} />
              {t("market.jSend")}
            </button>
            <p className="m-0 text-[12px] text-ink-4">{t("market.jPrivacy")}</p>
          </form>
        )}
      </div>
    </main>
  );
}
