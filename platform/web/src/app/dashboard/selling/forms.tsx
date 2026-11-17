"use client";

import { useActionState, useState } from "react";
import { saveAddonsAction, saveAreasAction, saveCheckoutModeAction, saveDeliveryAction, saveFlashSaleAction, saveGiftsAction, saveOccasionAction, addOccasionAction, saveTemplateAction, saveTitlesAction } from "@/app/actions/selling";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { FormActions } from "@/components/page-kit";
import { TimeZonePicker } from "@/components/time-zone-picker";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";
import { AreasEditor, ProductPicker, SlotList, slotRowsOf, type AreasStart, type CountryChoice, type ProductChoice } from "./pickers";

/** 131 Store › Delivery & offers: its forms. */

/** A platform tag for the gift add-ons, as an example (a tag, not words). */
const TAG_EXAMPLE = "yallapp-addon";

function Check({ name, label, hint, defaultChecked, value }: { name: string; label: string; hint?: string; defaultChecked: boolean; value?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} value={value ?? "on"} defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-midnight" />
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{label}</span>
        {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

function Radio({ name, value, label, hint, defaultChecked }: { name: string; value: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line-soft p-3">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-midnight" />
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="text-[13px] text-muted">{hint}</span>
      </span>
    </label>
  );
}

export function CheckoutModeForm({ mode }: { mode: "standard" | "gift" }) {
  const t = useDashT();
  const [state, action] = useActionState(saveCheckoutModeAction, initialFormState);
  const value = state.values?.checkout ?? mode;
  return (
    <form action={action} className="flex flex-col gap-3" data-checkout-mode="">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Radio name="checkout" value="standard" label={t("selling.modeStandard")} hint={t("selling.modeStandardHint")} defaultChecked={value !== "gift"} />
        <Radio name="checkout" value="gift" label={t("selling.modeGift")} hint={t("selling.modeGiftHint")} defaultChecked={value === "gift"} />
      </div>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
          {t("common.save")}
        </SubmitButton>
      </div>
    </form>
  );
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export function DeliveryForm({
  values: saved,
  currency,
  weekdays,
  feesNote,
  maxSlots,
}: {
  values: Record<string, string>;
  currency: string;
  weekdays: string[];
  feesNote: string | null;
  /** lib/selling/delivery.ts `DELIVERY_LIMITS.slots`. */
  maxSlots: number;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveDeliveryAction, initialFormState);
  const v = { ...saved, ...state.values };
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4" data-delivery-form="">
      <FormMessage message={state.message} ok={state.ok} />
      <Check name="enabled" label={t("selling.deliveryOn")} defaultChecked={v.enabled === "on"} />
      <Check name="required" label={t("selling.deliveryRequired")} defaultChecked={v.required === "on"} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Check name="sameDay" label={t("selling.sameDay")} defaultChecked={v.sameDay === "on"} />
        <Field label={t("selling.cutoff")} name="cutoff" placeholder="14:00" dir="ltr" defaultValue={v.cutoff} hint={t("selling.cutoffHint")} error={e.cutoff} small />
        <Check name="nextDay" label={t("selling.nextDay")} hint={t("selling.nextDayHint")} defaultChecked={v.nextDay === "on"} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("selling.maxDays")} name="maxDays" inputMode="numeric" defaultValue={v.maxDays} hint={t("selling.maxDaysHint")} error={e.maxDays} small />
        {/* 137 Every time zone: searched by city, zone or offset, the usual ones first. */}
        <TimeZonePicker id="f-timezone" label={t("selling.timezone")} defaultValue={v.timezone} error={e.timezone} size="sm" />
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">{t("selling.closedDays")}</legend>
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={`closed${d}`} defaultChecked={v[`closed${d}`] === "on"} className="h-4 w-4 accent-midnight" />
              {weekdays[d]}
            </label>
          ))}
        </div>
        {e.closed ? <p className="m-0 text-sm text-danger">{e.closed}</p> : null}
      </fieldset>
      {/* 132.186 The day's times as rows: several a day (a break between them is two times), never overlapping. */}
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">{t("selling.slots")}</legend>
        <p className="m-0 text-[13px] text-muted">{t("selling.slotsHint")}</p>
        <SlotList initial={slotRowsOf(v, maxSlots)} max={maxSlots} currency={currency} errors={e} submitted={state.values} note={feesNote ?? t("selling.slotFull")} />
      </fieldset>
      <FormActions>
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {t("selling.saveDelivery")}
        </SubmitButton>
      </FormActions>
    </form>
  );
}

export function AreasForm({
  values: saved,
  currency,
  countries,
  starters,
  areas,
}: {
  values: Record<string, string>;
  currency: string;
  /** 132.186 Every country, the platform's first ones on top. */
  countries: CountryChoice[];
  starters: Record<string, string[]>;
  /** Where it delivers now, as the editor starts. */
  areas: AreasStart;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveAreasAction, initialFormState);
  const v = { ...saved, ...state.values };
  const e = state.errors ?? {};
  const [mode, setMode] = useState(v.shippingMode || "flat");
  return (
    <form action={action} noValidate className="flex flex-col gap-4" data-areas-form="">
      <FormMessage message={state.message} ok={state.ok} />
      {/* 132.186 Every country or the ones chosen from all of them, each with the owner's own cities right under it. */}
      <AreasEditor start={areas} countries={countries} starters={starters} currency={currency} errors={e} />
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">{t("selling.pricing")}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["flat", "city", "distance"] as const).map((m) => (
            <label key={m} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line-soft p-3">
              <input type="radio" name="shippingMode" value={m} checked={mode === m} onChange={() => setMode(m)} className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{t(m === "flat" ? "selling.modeFlat" : m === "city" ? "selling.modeCity" : "selling.modeDistance")}</span>
                <span className="text-[13px] text-muted">{t(m === "flat" ? "selling.modeFlatHint" : m === "city" ? "selling.modeCityHint" : "selling.modeDistanceHint")}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {mode === "city" ? <Field label={t("selling.otherCity", { currency })} name="otherCity" inputMode="decimal" defaultValue={v.otherCity} hint={t("selling.otherCityHint")} error={e.otherCity} small /> : null}
      {mode === "distance" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("selling.originLat")} name="originLat" inputMode="decimal" dir="ltr" defaultValue={v.originLat} hint={t("selling.originHint")} error={e.origin} small />
          <Field label={t("selling.originLng")} name="originLng" inputMode="decimal" dir="ltr" defaultValue={v.originLng} small />
          <Field label={t("selling.maxKm")} name="maxKm" inputMode="decimal" defaultValue={v.maxKm} hint={t("selling.maxKmHint")} error={e.maxKm} small />
          <Field label={t("selling.baseFee", { currency })} name="baseFee" inputMode="decimal" defaultValue={v.baseFee} error={e.baseFee} small />
          <Field label={t("selling.perKm", { currency })} name="perKm" inputMode="decimal" defaultValue={v.perKm} error={e.perKm} small />
        </div>
      ) : null}
      <Check name="byWeight" label={t("selling.byWeight")} hint={t("selling.byWeightHint")} defaultChecked={v.byWeight === "on"} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("selling.perKg", { currency })} name="perKg" inputMode="decimal" defaultValue={v.perKg} error={e.perKg} small />
        <Field label={t("selling.includedKg")} name="includedKg" inputMode="decimal" defaultValue={v.includedKg} error={e.includedKg} small />
        <Field label={t("selling.minFee", { currency })} name="minFee" inputMode="decimal" defaultValue={v.minFee} hint={t("selling.minFeeHint")} error={e.minFee} small />
      </div>
      <FormActions>
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {t("selling.saveAreas")}
        </SubmitButton>
      </FormActions>
    </form>
  );
}

export function GiftsForm({ values: saved }: { values: Record<string, string> }) {
  const t = useDashT();
  const [state, action] = useActionState(saveGiftsAction, initialFormState);
  const v = { ...saved, ...state.values };
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4" data-gifts-form="">
      <FormMessage message={state.message} ok={state.ok} />
      <Check name="message" label={t("selling.giftMessage")} defaultChecked={v.message === "on"} />
      <Field label={t("selling.giftLength")} name="maxLength" inputMode="numeric" defaultValue={v.maxLength} error={e.maxLength} small />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-starters" className="text-sm font-semibold">
          {t("selling.starters")}
        </label>
        <textarea id="f-starters" name="starters" rows={3} defaultValue={v.starters} className="input" />
        <span className="text-xs text-muted">{t("selling.startersHint")}</span>
        {e.starters ? <p className="m-0 text-sm text-danger">{e.starters}</p> : null}
      </div>
      <Check name="recipient" label={t("selling.recipient")} defaultChecked={v.recipient === "on"} />
      <Check name="anonymous" label={t("selling.anonymous")} defaultChecked={v.anonymous === "on"} />
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
          {t("selling.saveGifts")}
        </SubmitButton>
      </div>
    </form>
  );
}

export function FlashSaleForm({
  sale,
  currency,
  zone,
  products,
  categories,
  platform,
  languages = [],
}: {
  sale?: { id: number; values: Record<string, string> };
  currency: string;
  zone: string;
  /** The shop's own products (checkboxes with their pictures and prices); null: a platform's, by number. */
  products: ProductChoice[] | null;
  categories: { id: number; name: string }[];
  platform: string | null;
  /** 131 The app's other languages, for the title in each. */
  languages?: { code: string; name: string }[];
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveFlashSaleAction, initialFormState);
  const v = { ...(sale?.values ?? {}), ...(state.values ?? {}) };
  const e = state.errors ?? {};
  const chosen = new Set((v.productIds ?? "").split(",").filter(Boolean));
  const f = (name: string) => `f-flash-${sale ? `${sale.id}-` : ""}${name}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={!sale && state.ok ? state.message : "flash"} data-flash-form="">
      <FormMessage message={state.message} ok={state.ok} />
      {sale ? <input type="hidden" name="id" value={sale.id} /> : null}
      <Field label={t("selling.flashName")} id={f("title")} name="title" maxLength={80} defaultValue={v.title} hint={t("selling.flashNameHint")} error={e.title} />
      {/* 131 Its title in the app's other languages; empty: the name above. */}
      {languages.map((l) => (
        <Field key={l.code} label={t("selling.flashNameIn", { language: l.name })} id={f(`title-${l.code}`)} name={`title_${l.code}`} maxLength={40} defaultValue={v[`title_${l.code}`]} small />
      ))}
      {e.titles ? <p className="m-0 text-sm text-danger">{e.titles}</p> : null}
      {products ? (
        <ProductPicker products={products} chosen={chosen} legend={t("selling.flashProducts")} />
      ) : (
        <Field label={t("selling.flashProductIds")} id={f("ids")} name="productIds" dir="ltr" defaultValue={v.productIds} hint={t("selling.flashProductIdsHint")} small />
      )}
      {e.productIds ? <p className="m-0 text-sm text-danger">{e.productIds}</p> : null}
      {categories.length ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={f("category")} className="text-sm font-semibold">
            {t("selling.flashCategory")}
          </label>
          <select id={f("category")} name="categoryId" defaultValue={v.categoryId ?? ""} className="input input-sm">
            <option value="">{t("selling.countryNone")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={f("kind")} className="text-sm font-semibold">
            {t("selling.flashKind")}
          </label>
          <select id={f("kind")} name="kind" defaultValue={v.kind ?? "percent"} className="input input-sm">
            <option value="percent">{t("selling.flashPercent")}</option>
            <option value="price">{t("selling.flashPrice", { currency })}</option>
          </select>
        </div>
        <Field label={t("selling.flashValue")} id={f("value")} name="value" inputMode="decimal" defaultValue={v.value} error={e.value} small />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("selling.flashStarts")} id={f("starts")} name="startsAt" type="datetime-local" defaultValue={v.startsAt} hint={t("selling.flashTimezone", { zone })} error={e.startsAt} small />
        <Field label={t("selling.flashEnds")} id={f("ends")} name="endsAt" type="datetime-local" defaultValue={v.endsAt} error={e.endsAt} small />
        <Field label={t("selling.flashLimit")} id={f("limit")} name="limit" inputMode="numeric" defaultValue={v.limit} hint={t("selling.flashLimitHint")} error={e.limit} small />
      </div>
      {platform ? (
        <Field label={t("selling.platformCode", { platform })} id={f("code")} name="platformCode" dir="ltr" defaultValue={v.platformCode} hint={t("selling.platformCodeHint", { platform })} error={e.platformCode} small />
      ) : null}
      <FormActions>
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {t("selling.saveFlash")}
        </SubmitButton>
      </FormActions>
    </form>
  );
}

export function OccasionForm({ occasion, languages }: { occasion?: { id: number; names: Record<string, string> }; languages: string[] }) {
  const t = useDashT();
  const [state, action] = useActionState(occasion ? saveOccasionAction : addOccasionAction, initialFormState);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={!occasion && state.ok ? state.message : "occasion"} data-occasion-form="">
      <FormMessage message={state.message} ok={state.ok} />
      {occasion ? <input type="hidden" name="id" value={occasion.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {languages.map((lang) => (
          <Field key={lang} label={t("selling.occasionName", { lang: lang.toUpperCase() })} name={`name_${lang}`} maxLength={40} defaultValue={v[`name_${lang}`] ?? occasion?.names[lang] ?? ""} error={state.errors?.name} small />
        ))}
      </div>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm" pendingText={t("common.saving")}>
          {occasion ? t("selling.saveOccasion") : t("selling.addOccasion")}
        </SubmitButton>
      </div>
    </form>
  );
}

export function TemplateForm({ occasionId, template, languages }: { occasionId: number; template?: { id: string; texts: Record<string, string> }; languages: string[] }) {
  const t = useDashT();
  const [state, action] = useActionState(saveTemplateAction, initialFormState);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={!template && state.ok ? state.message : "template"} data-template-form="">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="occasionId" value={occasionId} />
      {template ? <input type="hidden" name="templateId" value={template.id} /> : null}
      {languages.map((lang) => (
        <div key={lang} className="flex flex-col gap-1.5">
          <label htmlFor={`f-text-${occasionId}-${template?.id ?? "new"}-${lang}`} className="text-sm font-semibold">
            {t("selling.messageText", { lang: lang.toUpperCase() })}
          </label>
          <textarea
            id={`f-text-${occasionId}-${template?.id ?? "new"}-${lang}`}
            name={`text_${lang}`}
            rows={2}
            maxLength={500}
            dir={lang === "ar" ? "rtl" : "auto"}
            defaultValue={v[`text_${lang}`] ?? template?.texts[lang] ?? ""}
            className="input"
          />
          {state.errors?.[`text_${lang}`] ? <p className="m-0 text-sm text-danger">{state.errors[`text_${lang}`]}</p> : null}
        </div>
      ))}
      <span className="text-xs text-muted">{t("selling.messageHint")}</span>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm" pendingText={t("common.saving")}>
          {template ? t("selling.saveMessage") : t("selling.addMessage")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 131 A connected platform's gift add-ons: its product numbers, a category, a tag, and what they go with. */
export function AddonsForm({ values: saved, tags, platform }: { values: Record<string, string>; tags: boolean; platform: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveAddonsAction, initialFormState);
  const v = { ...saved, ...state.values };
  const e = state.errors ?? {};
  const [offer, setOffer] = useState(v.offerWith || "all");
  return (
    <form action={action} noValidate className="flex flex-col gap-4" data-addons-form="">
      <FormMessage message={state.message} ok={state.ok} />
      <Field label={t("selling.addonIds", { platform })} name="addonProductIds" dir="ltr" defaultValue={v.addonProductIds} hint={t("selling.addonIdsHint")} small />
      <Field label={t("selling.addonCategory", { platform })} name="addonCategoryId" dir="ltr" inputMode="numeric" defaultValue={v.addonCategoryId} hint={t("selling.addonCategoryHint")} error={e.addonCategoryId} small />
      {tags ? <Field label={t("selling.addonTag", { platform })} name="addonTag" dir="ltr" maxLength={40} defaultValue={v.addonTag} placeholder={TAG_EXAMPLE} hint={t("selling.addonTagHint", { platform })} error={e.addonTag} small /> : null}
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">{t("shop.addonOfferWith")}</legend>
        {(["all", "categories", "products"] as const).map((k) => (
          <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" name="offerWith" value={k} checked={offer === k} onChange={() => setOffer(k)} className="h-4 w-4 accent-midnight" />
            {t(k === "all" ? "shop.addonWithAll" : k === "categories" ? "shop.addonWithCategories" : "shop.addonWithProducts")}
          </label>
        ))}
        {offer === "categories" ? <Field label={t("selling.addonOfferCategories", { platform })} name="offerCategoryIds" dir="ltr" defaultValue={v.offerCategoryIds} small /> : null}
        {offer === "products" ? <Field label={t("selling.addonOfferProducts", { platform })} name="offerProductIds" dir="ltr" defaultValue={v.offerProductIds} small /> : null}
        {e.addonFor ? <p className="m-0 text-sm text-danger">{e.addonFor}</p> : null}
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
          {t("selling.saveAddons")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 131 The titles of the add-ons, the card and the delivery picker, in each of the app's languages. */
export function TitlesForm({ values: saved, languages }: { values: Record<string, string>; languages: { code: string; name: string }[] }) {
  const t = useDashT();
  const [state, action] = useActionState(saveTitlesAction, initialFormState);
  const v = { ...saved, ...state.values };
  const e = state.errors ?? {};
  const parts = [
    { key: "addons", label: t("selling.titleAddons") },
    { key: "card", label: t("selling.titleCard") },
    { key: "delivery", label: t("selling.titleDelivery") },
  ];
  return (
    <form action={action} noValidate className="flex flex-col gap-4" data-titles-form="">
      <FormMessage message={state.message} ok={state.ok} />
      {parts.map((part) => (
        <fieldset key={part.key} className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold">{part.label}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {languages.map((l) => (
              <Field key={l.code} label={l.name} name={`${part.key}_${l.code}`} maxLength={40} defaultValue={v[`${part.key}_${l.code}`]} placeholder={t("selling.titlePlaceholder")} small />
            ))}
          </div>
        </fieldset>
      ))}
      {e.titles ? <p className="m-0 text-sm text-danger">{e.titles}</p> : null}
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
          {t("selling.saveTitles")}
        </SubmitButton>
      </div>
    </form>
  );
}
