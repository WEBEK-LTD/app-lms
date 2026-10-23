"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { countAudienceAction, saveCampaignAction } from "@/app/actions/campaigns";
import { useDashT } from "@/components/dashboard-i18n";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { MediaPicker } from "@/components/media-picker";
import { btn } from "@/components/ui";
import { initialFormState } from "@/lib/forms";

export interface CampaignFormValues {
  id: number | null;
  title: string;
  body: string;
  open: "none" | "page" | "link";
  page: string;
  url: string;
  imageUrl: string;
  who: string;
  courseId: string;
  inactiveDays: string;
  languages: string[];
  platforms: string[];
  countries: string[];
  when: "draft" | "now" | "later" | "weekly";
  date: string;
  time: string;
  weekday: string;
}

export interface CampaignChoices {
  kinds: string[];
  courses: { id: number; title: string }[];
  pages: { slug: string; title: string }[];
  languages: { code: string; name: string }[];
  /** Countries phones signed in from, then others nearby. */
  countries: { code: string; name: string; seen: boolean }[];
  weekdays: string[];
  inactiveDays: readonly number[];
  titleMax: number;
  bodyMax: number;
  zone: string;
  today: string;
}

const KIND_KEYS = { everyone: "campaigns.everyone", buyers: "campaigns.buyers", students: "campaigns.students", members: "campaigns.members", inactive: "campaigns.inactive" } as const;

/** 85.2 A campaign: its words and picture, what it opens, who gets it and when. */
export function CampaignForm({ initial, choices }: { initial: CampaignFormValues; choices: CampaignChoices }) {
  const t = useDashT();
  const [state, action] = useActionState(saveCampaignAction, initialFormState);
  const kept = state.values;
  const [open, setOpen] = useState(kept?.open ?? initial.open);
  const [image, setImage] = useState(kept?.imageUrl ?? initial.imageUrl);
  const [who, setWho] = useState(kept?.who ?? initial.who);
  const [when, setWhen] = useState(kept?.when ?? initial.when);
  const [count, setCount] = useState<number | null>(null);
  const [counting, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const v = (name: keyof CampaignFormValues) => (kept?.[name] ?? String(initial[name] ?? ""));

  // The audience's size as the owner chooses it.
  const recount = () => {
    const data = new FormData(form.current ?? undefined);
    const audience = {
      who: String(data.get("who") ?? "everyone"),
      courseId: String(data.get("courseId") ?? ""),
      inactiveDays: String(data.get("inactiveDays") ?? "30"),
      languages: data.getAll("languages").map(String),
      platforms: data.getAll("platforms").map(String),
      countries: data.getAll("countries").map(String),
    };
    start(async () => setCount((await countAudienceAction(audience)).count));
  };
  useEffect(recount, []);

  const submit = when === "now" ? t("campaigns.sendNow") : when === "later" ? t("campaigns.schedule") : when === "weekly" ? t("campaigns.saveWeekly") : t("campaigns.save");
  return (
    <form ref={form} action={action} noValidate className="flex flex-col gap-5" onChange={(e) => (e.target as HTMLElement).closest("[data-audience]") && recount()}>
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <FormMessage message={state.message} ok={state.ok} />
      <Field label={t("notify.titleLabel")} name="title" required maxLength={choices.titleMax} defaultValue={v("title")} error={state.errors?.title} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-body" className="text-sm font-semibold">
          {t("notify.message")}
        </label>
        <textarea id="f-body" name="body" required rows={3} maxLength={choices.bodyMax} defaultValue={v("body")} className="input min-h-24 py-3" aria-invalid={state.errors?.body ? true : undefined} aria-describedby={state.errors?.body ? "f-body-error" : undefined} />
        <FieldError id="f-body-error" error={state.errors?.body} />
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 p-0 text-sm font-semibold">{t("campaigns.picture")}</legend>
        <input type="hidden" name="imageUrl" value={image} />
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={t("campaigns.pictureAlt")} className="h-32 w-full max-w-[320px] rounded-xl border border-line object-cover" />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <MediaPicker kind="image" share library label={t("campaigns.choosePicture")} onPick={setImage} />
          {image ? (
            <button type="button" className={`${btn.secondary} h-10`} onClick={() => setImage("")}>
              {t("campaigns.removePicture")}
            </button>
          ) : null}
        </div>
        <span className="text-[13px] text-muted">{t("campaigns.pictureHint")}</span>
        <FieldError id="f-image-error" error={state.errors?.image} />
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 p-0 text-sm font-semibold">{t("campaigns.opens")}</legend>
        {(["none", "page", "link"] as const).map((value) => (
          <label key={value} className="flex min-h-11 items-center gap-2 text-[15px]">
            <input type="radio" name="open" value={value} checked={open === value} onChange={() => setOpen(value)} className="size-5" />
            {t(value === "none" ? "campaigns.openApp" : value === "page" ? "campaigns.openPage" : "campaigns.openLink")}
          </label>
        ))}
        {open === "page" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-page" className="text-sm font-semibold">
              {t("campaigns.pageLabel")}
            </label>
            <select id="f-page" name="page" defaultValue={v("page")} className="input" aria-invalid={state.errors?.page ? true : undefined}>
              {choices.pages.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title}
                </option>
              ))}
            </select>
            <FieldError id="f-page-error" error={state.errors?.page} />
          </div>
        ) : null}
        {open === "link" ? <Field label={t("campaigns.urlLabel")} name="url" type="url" dir="ltr" defaultValue={v("url")} placeholder="https://" error={state.errors?.url} /> : null}
      </fieldset>

      <fieldset data-audience className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 p-0 text-sm font-semibold">{t("campaigns.who")}</legend>
        {choices.kinds.map((kind) => (
          <label key={kind} className="flex min-h-11 items-center gap-2 text-[15px]">
            <input type="radio" name="who" value={kind} checked={who === kind} onChange={() => setWho(kind)} className="size-5" />
            {t(KIND_KEYS[kind as keyof typeof KIND_KEYS])}
          </label>
        ))}
        {who === "students" && choices.courses.length ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-course" className="text-sm font-semibold">
              {t("campaigns.courseLabel")}
            </label>
            <select id="f-course" name="courseId" defaultValue={v("courseId")} className="input">
              <option value="">{t("campaigns.anyCourse")}</option>
              {choices.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {who === "inactive" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-inactive" className="text-sm font-semibold">
              {t("campaigns.inactiveFor")}
            </label>
            <select id="f-inactive" name="inactiveDays" defaultValue={v("inactiveDays") || "30"} className="input">
              {choices.inactiveDays.map((d) => (
                <option key={d} value={d}>
                  {t("campaigns.days", { count: d })}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <FieldError id="f-audience-error" error={state.errors?.audience} />

        <details className="rounded-xl border border-line-soft px-3 py-2" open={initial.languages.length + initial.platforms.length + initial.countries.length > 0}>
          <summary className="cursor-pointer text-[15px] font-semibold">{t("campaigns.narrow")}</summary>
          <div className="flex flex-col gap-3 pt-3">
            <p className="m-0 text-[13px] text-muted">{t("campaigns.narrowHint")}</p>
            <CheckList legend={t("campaigns.platforms")} name="platforms" items={[{ code: "android", name: t("campaigns.android") }, { code: "ios", name: t("campaigns.ios") }]} checked={initial.platforms} />
            {choices.languages.length ? <CheckList legend={t("campaigns.languages")} name="languages" items={choices.languages} checked={initial.languages} /> : null}
            <CheckList legend={t("campaigns.countries")} name="countries" items={choices.countries.filter((c) => c.seen || initial.countries.includes(c.code))} checked={initial.countries} />
            <details>
              <summary className="cursor-pointer text-[14px]">{t("campaigns.moreCountries")}</summary>
              <div className="pt-2">
                <CheckList legend={t("campaigns.moreCountries")} name="countries" items={choices.countries.filter((c) => !c.seen && !initial.countries.includes(c.code))} checked={[]} hideLegend />
              </div>
            </details>
          </div>
        </details>
        <p className="m-0 text-[15px] font-semibold" role="status" aria-live="polite">
          {counting || count === null ? t("campaigns.counting") : t("campaigns.count", { count })}
        </p>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 p-0 text-sm font-semibold">{t("campaigns.when")}</legend>
        {(["draft", "now", "later", "weekly"] as const).map((value) => (
          <label key={value} className="flex min-h-11 items-center gap-2 text-[15px]">
            <input type="radio" name="when" value={value} checked={when === value} onChange={() => setWhen(value)} className="size-5" />
            {t(value === "draft" ? "campaigns.saveDraft" : value === "now" ? "campaigns.sendNow" : value === "later" ? "campaigns.later" : "campaigns.weekly")}
          </label>
        ))}
        {when === "later" || when === "weekly" ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-3">
              {when === "later" ? (
                <Field id="f-date" label={t("notify.date")} name="date" type="date" min={choices.today} required defaultValue={v("date") || choices.today} className="min-w-40 flex-1" />
              ) : (
                <div className="flex min-w-40 flex-1 flex-col gap-1.5">
                  <label htmlFor="f-weekday" className="text-sm font-semibold">
                    {t("campaigns.day")}
                  </label>
                  <select id="f-weekday" name="weekday" defaultValue={v("weekday") || "1"} className="input">
                    {choices.weekdays.map((name, i) => (
                      <option key={i} value={i}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Field id="f-time" label={t("notify.time")} name="time" type="time" required defaultValue={v("time")} className="min-w-32 flex-1" />
            </div>
            <span className="text-[13px] text-muted">{t("notify.zoneHint", { zone: choices.zone })}</span>
            <FieldError id="f-when-error" error={state.errors?.send_at} />
          </div>
        ) : null}
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText={when === "now" ? t("common.sending") : t("common.saving")}>
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}

function CheckList({ legend, name, items, checked, hideLegend = false }: { legend: string; name: string; items: { code: string; name: string }[]; checked: string[]; hideLegend?: boolean }) {
  if (items.length === 0) return null;
  return (
    <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
      <legend className={hideLegend ? "sr-only" : "mb-1 p-0 text-sm font-semibold"}>{legend}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map((item) => (
          <label key={item.code} className="flex min-h-11 items-center gap-2 text-[15px]">
            <input type="checkbox" name={name} value={item.code} defaultChecked={checked.includes(item.code)} className="size-5" />
            {item.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
