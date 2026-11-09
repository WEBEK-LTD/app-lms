import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { Badge, btn, Notice, PageHeader, Section } from "@/components/ui";
import { newJoinLinkAction, questionAction, saveJoinFormAction } from "@/app/actions/joining";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { APPLICATION_FIELD_KINDS, type ApplicationField } from "@/lib/data/types";
import { joinFormUrl, VENDOR_KINDS } from "@/lib/market/joining";
import { isFood } from "../../../shipments/parts";
import { NotMarket } from "../../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.joinForm") };
}

const field = "input w-full";
const label = "flex flex-col gap-1 text-[13px] font-semibold text-ink-3";

function QuestionFields({ q, t }: { q?: ApplicationField; t: (key: DashKey) => string }) {
  return (
    <>
      <label className={`${label} sm:col-span-2`}>
        {t("market.qLabel")}
        <input name="label" required maxLength={120} defaultValue={q?.label} className={field} />
      </label>
      <label className={label}>
        {t("market.qKind")}
        <select name="kind" defaultValue={q?.kind ?? "text"} className="input h-10">
          {APPLICATION_FIELD_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`market.qk_${k}` as DashKey)}
            </option>
          ))}
        </select>
      </label>
      <label className={`${label} sm:col-span-2`}>
        {t("market.qHelp")}
        <input name="help" maxLength={300} defaultValue={q?.help ?? ""} className={field} />
      </label>
      <label className={label}>
        {t("market.qOptions")}
        <textarea name="options" rows={2} defaultValue={q?.options.join("\n")} className={field} />
      </label>
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" name="required" value="on" defaultChecked={q?.required ?? false} />
        {t("market.qRequired")}
      </label>
    </>
  );
}

/** 115.12 Studio › Joining › a form: its words, kinds and link, and its questions in order. */
export default async function JoinFormPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { app } = await requireClient("orders");
  const { t } = await dashboardText();
  if (!isFood(app)) return <NotMarket title={t("market.joinForm")} t={t} />;
  const form = await (await getStore()).getMarketApplicationForm(app.id, Number((await params).id));
  if (!form) notFound();
  const error = (await searchParams).error;
  const url = joinFormUrl(form.token);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/market/joining" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-3 no-underline">
        <Icon name="arrow_back" size={18} className="rtl:rotate-180" />
        {t("market.joining")}
      </Link>
      <PageHeader title={form.title} description={t("market.joinFormIntro")} actions={<Badge tone={form.open ? "success" : "neutral"}>{t(form.open ? "market.formOpen" : "market.formClosed")}</Badge>} />
      {error ? (
        <Notice tone="danger" icon="error">
          {error}
        </Notice>
      ) : null}

      <Section titleId="h-link" title={t("market.formLink")} description={t("market.formLinkHint")}>
        <div className="flex flex-wrap items-center gap-3">
          <code className="min-w-0 flex-1 rounded-xl bg-sand px-3 py-2 text-[13px] break-all" dir="ltr">
            {url}
          </code>
          <form action={newJoinLinkAction}>
            <input type="hidden" name="id" value={form.id} />
            <button type="submit" className={`${btn.secondary} h-10 px-4 text-sm`}>
              <Icon name="refresh" size={18} />
              {t("market.newLink")}
            </button>
          </form>
        </div>
      </Section>

      <form action={saveJoinFormAction}>
        <input type="hidden" name="id" value={form.id} />
        <Section titleId="h-about" title={t("market.formAbout")}>
          <div className="grid gap-3">
            <label className={label}>
              {t("market.formTitle")}
              <input name="title" required maxLength={120} defaultValue={form.title} className={field} />
            </label>
            <label className={label}>
              {t("market.formWords")}
              <textarea name="intro" rows={3} maxLength={2000} defaultValue={form.intro ?? ""} className={field} />
            </label>
            <fieldset className="flex flex-wrap gap-4 border-0 p-0">
              <legend className="mb-1 text-[13px] font-semibold text-ink-3">{t("market.formKinds")}</legend>
              {VENDOR_KINDS.map((k) => (
                <label key={k} className="flex items-center gap-2 text-[14px]">
                  <input type="checkbox" name={`kind_${k}`} value="on" defaultChecked={form.kinds.length === 0 || form.kinds.includes(k)} />
                  {t(`market.vk_${k}` as DashKey)}
                </label>
              ))}
            </fieldset>
            <label className="flex items-center gap-2 text-[14px] font-semibold">
              <input type="checkbox" name="open" value="on" defaultChecked={form.open} />
              {t("market.formTakes")}
            </label>
            <div>
              <button type="submit" className={`${btn.primary} h-11 px-5 text-sm`}>
                <Icon name="check" size={18} />
                {t("market.saveForm")}
              </button>
            </div>
          </div>
        </Section>
      </form>

      <Section titleId="h-questions" title={t("market.questions")} description={t("market.questionsHint")} actions={<Badge tone="neutral">{form.fields.length}</Badge>}>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {form.fields.map((q, index) => (
            <li key={q.key} className="rounded-2xl border border-line-soft bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-midnight text-[13px] font-bold text-white">{index + 1}</span>
                <strong className="text-[15px]">{q.label}</strong>
                <Badge tone="neutral">{t(`market.qk_${q.kind}` as DashKey)}</Badge>
                {q.required ? <Badge tone="info">{t("market.qRequired")}</Badge> : null}
                <span className="ms-auto flex gap-1">
                  {(["up", "down", "remove"] as const).map((op) => (
                    <form key={op} action={questionAction}>
                      <input type="hidden" name="id" value={form.id} />
                      <input type="hidden" name="index" value={index} />
                      <input type="hidden" name="op" value={op} />
                      <button type="submit" aria-label={t(`market.q_${op}` as DashKey)} className={`${btn.secondary} h-8 w-8 p-0`}>
                        <Icon name={op === "up" ? "arrow_upward" : op === "down" ? "arrow_downward" : "delete"} size={16} />
                      </button>
                    </form>
                  ))}
                </span>
              </div>
              <details>
                <summary className="cursor-pointer text-[13px] font-semibold text-ink-3">{t("market.qEdit")}</summary>
                <form action={questionAction} className="mt-3 grid gap-3 sm:grid-cols-3">
                  <input type="hidden" name="id" value={form.id} />
                  <input type="hidden" name="index" value={index} />
                  <input type="hidden" name="op" value="edit" />
                  <QuestionFields q={q} t={t} />
                  <div className="sm:col-span-3">
                    <button type="submit" className={`${btn.secondary} h-9 px-4 text-sm`}>
                      {t("market.qSave")}
                    </button>
                  </div>
                </form>
              </details>
            </li>
          ))}
        </ol>
        <form action={questionAction} className="mt-4 grid gap-3 rounded-2xl border border-dashed border-line p-4 sm:grid-cols-3">
          <input type="hidden" name="id" value={form.id} />
          <input type="hidden" name="op" value="add" />
          <h3 className="m-0 text-[15px] font-bold sm:col-span-3">{t("market.addQuestion")}</h3>
          <QuestionFields t={t} />
          <div className="sm:col-span-3">
            <button type="submit" className={`${btn.primary} h-10 px-4 text-sm`}>
              <Icon name="add" size={18} />
              {t("market.addQuestion")}
            </button>
          </div>
        </form>
      </Section>
    </div>
  );
}
