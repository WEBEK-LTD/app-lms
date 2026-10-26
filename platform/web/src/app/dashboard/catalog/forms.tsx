"use client";

import { useActionState, useState } from "react";
import {
  addCouponAction,
  addCategoryAction,
  saveFulfilmentAction,
  savePaymentKeysAction,
  saveProductAction,
  saveShopSettingsAction,
  saveLoyaltyAction,
} from "@/app/actions/catalog";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { btn } from "@/components/ui";
import { initialFormState } from "@/lib/forms";
import { MediaImagesPicker } from "@/components/media-picker";
import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";
import { formatDate } from "@/i18n/format";
import { richText } from "@/i18n/rich";

export interface ProductFormValues {
  id: number | null;
  name: string;
  description: string;
  price: string;
  salePrice: string;
  stock: string;
  sku: string;
  categoryIds: number[];
  images: { id: string; url: string }[];
  digital: boolean;
  featured: boolean;
  active: boolean;
  /** 26 The option groups as the editor keeps them (prices as typed). */
  optionGroups: EditorGroup[];
  /** 91.5 The variations as the editor keeps them (prices as typed). */
  variants: EditorVariants;
}

/** 91.5 Variations in the editor: attributes with their values typed as a list, and the combinations sold. */
export interface EditorVariants {
  attributes: { name: string; values: string }[];
  items: { id?: number; values: string[]; price: string; sale: string; stock: string; sku: string; active: boolean }[];
}

const splitValues = (text: string) => [...new Set(text.split(",").map((v) => v.replace(/\s+/g, " ").trim()).filter(Boolean))];
/** "450", "450.50" or "450,50" in cents; empty: null; anything else is sent as typed for the server to refuse. */
const cents = (text: string): number | null | string => {
  const t = text.trim().replace(",", ".");
  if (t === "") return null;
  return /^\d{1,7}(\.\d{1,2})?$/.test(t) ? Math.round(Number(t) * 100) : t;
};
const whole = (text: string): number | null | string => (text.trim() === "" ? null : /^\d{1,7}$/.test(text.trim()) ? Number(text.trim()) : text.trim());

/** 91.5 The variations of a shop's product (not a restaurant's): Size and Colour, and each combination's price and stock. */
function VariantsEditor({ initial, currency, error }: { initial: EditorVariants; currency: string; error?: string }) {
  const t = useDashT();
  const [attributes, setAttributes] = useState(initial.attributes);
  const [items, setItems] = useState(initial.items);
  const lists = attributes.map((a) => splitValues(a.values));
  const named = attributes.filter((a, i) => a.name.trim() && lists[i]!.length > 0);
  const combos = named.length
    ? lists.filter((_, i) => attributes[i]!.name.trim() && lists[i]!.length > 0).reduce<string[][]>((acc, values) => acc.flatMap((p) => values.map((v) => [...p, v])), [[]])
    : [];
  const live = items.filter((item) => item.values.length === named.length && combos.some((c) => c.join("\u0000") === item.values.join("\u0000")));
  const missing = combos.filter((c) => !live.some((item) => item.values.join("\u0000") === c.join("\u0000")));
  const payload = {
    attributes: attributes.map((a) => ({ name: a.name, values: splitValues(a.values) })),
    items: live.map((i) => ({ id: i.id, values: i.values, priceCents: cents(i.price), salePriceCents: cents(i.sale), stock: whole(i.stock), sku: i.sku, active: i.active })),
  };
  const update = (k: number, patch: Partial<EditorVariants["items"][number]>) => setItems((all) => all.map((x) => (x === live[k] ? { ...x, ...patch } : x)));
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby="f-variants-hint">
      <legend className="mb-1.5 text-sm font-semibold">{t("shop.variants")}</legend>
      <input type="hidden" name="variants" value={named.length ? JSON.stringify(payload) : ""} />
      <span id="f-variants-hint" className="text-[13px] text-muted">
        {t("shop.variantsHint")}
      </span>
      {attributes.map((a, i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <input
            className="input input-sm"
            value={a.name}
            maxLength={40}
            placeholder={t("shop.variantNamePlaceholder")}
            aria-label={t("shop.variantNameAria", { n: i + 1 })}
            onChange={(e) => setAttributes((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
          />
          <input
            className="input input-sm"
            value={a.values}
            placeholder={t("shop.variantValuesPlaceholder")}
            aria-label={t("shop.variantValuesAria", { n: i + 1 })}
            onChange={(e) => setAttributes((all) => all.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))}
          />
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-1 text-sm font-semibold text-danger"
            onClick={() => setAttributes((all) => all.filter((_, j) => j !== i))}
          >
            {t("shop.variantRemove")}
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {attributes.length < 3 ? (
          <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} onClick={() => setAttributes((all) => [...all, { name: "", values: "" }])}>
            {t("shop.variantAdd")}
          </button>
        ) : null}
        {missing.length ? (
          <button
            type="button"
            className={`${btn.secondary} h-9 px-3 text-sm`}
            onClick={() => setItems((all) => [...all, ...missing.map((values) => ({ values, price: "", sale: "", stock: "", sku: "", active: true }))])}
          >
            {t("shop.variantAddCombinations", { count: missing.length })}
          </button>
        ) : null}
      </div>
      {live.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1.5 pr-2 font-semibold">{t("shop.variantCombination")}</th>
                <th className="py-1.5 pr-2 font-semibold">{t("shop.variantPrice", { currency })}</th>
                <th className="py-1.5 pr-2 font-semibold">{t("shop.variantSale", { currency })}</th>
                <th className="py-1.5 pr-2 font-semibold">{t("shop.stock")}</th>
                <th className="py-1.5 pr-2 font-semibold">{t("shop.sku")}</th>
                <th className="py-1.5 font-semibold">{t("shop.variantOn")}</th>
              </tr>
            </thead>
            <tbody>
              {live.map((item, k) => {
                const label = item.values.join(", ");
                return (
                  <tr key={label} className="border-t border-line-soft" data-variant={label}>
                    <td className="py-1.5 pr-2 font-semibold">{label}</td>
                    <td className="py-1.5 pr-2">
                      <input className="input input-sm w-[110px]" inputMode="decimal" value={item.price} placeholder={t("shop.variantSamePrice")} aria-label={t("shop.variantPriceAria", { variant: label })} onChange={(e) => update(k, { price: e.target.value })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input className="input input-sm w-[110px]" inputMode="decimal" value={item.sale} aria-label={t("shop.variantSaleAria", { variant: label })} onChange={(e) => update(k, { sale: e.target.value })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input className="input input-sm w-[90px]" inputMode="numeric" value={item.stock} aria-label={t("shop.variantStockAria", { variant: label })} onChange={(e) => update(k, { stock: e.target.value })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input className="input input-sm w-[120px]" value={item.sku} maxLength={64} aria-label={t("shop.variantSkuAria", { variant: label })} onChange={(e) => update(k, { sku: e.target.value })} />
                    </td>
                    <td className="py-1.5">
                      <input type="checkbox" className="h-4 w-4 accent-midnight" checked={item.active} aria-label={t("shop.variantOnAria", { variant: label })} onChange={(e) => update(k, { active: e.target.checked })} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <FieldError id="f-variants-error" error={error} />
    </fieldset>
  );
}

/** 26 One option group in the editor; `id`s are kept so carts still match after an edit. */
export interface EditorGroup {
  id?: string;
  name: string;
  min: string;
  max: string;
  options: { id?: string; name: string; price: string }[];
}

function Check({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-midnight" />
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="text-[13px] text-muted">{hint}</span>
      </span>
    </label>
  );
}

export function ProductForm({
  product,
  categories,
  currency,
  words = { add: "Add product", save: "Save product" },
  restaurant = false,
}: {
  product: ProductFormValues;
  categories: { id: number; name: string }[];
  currency: string;
  /** 26 "Add dish" and "Save dish" for restaurants. */
  words?: { add: string; save: string };
  /** 26 Food is never a digital product. */
  restaurant?: boolean;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveProductAction, initialFormState);
  const v = (key: keyof ProductFormValues & string, fallback: string) => state.values?.[key] ?? fallback;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {product.id !== null ? <input type="hidden" name="id" value={product.id} /> : null}
      <FormMessage message={state.message} ok={state.ok} />
      <Field label={t("common.name")} name="name" required maxLength={120} defaultValue={v("name", product.name)} error={state.errors?.name} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-description" className="text-sm font-semibold">
          {t("common.description")}
        </label>
        <textarea
          id="f-description"
          name="description"
          rows={5}
          maxLength={5000}
          defaultValue={v("description", product.description)}
          className="input min-h-28 py-3"
          aria-describedby="f-description-hint"
        />
        <span id="f-description-hint" className="text-[13px] text-muted">
          {t("shop.descriptionHint")}
        </span>
        <FieldError id="f-description-error" error={state.errors?.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("shop.priceIn", { currency })}
          name="price"
          inputMode="decimal"
          required
          defaultValue={v("price", product.price)}
          placeholder="450.00"
          error={state.errors?.price}
        />
        <Field
          label={t("shop.salePriceIn", { currency })}
          name="salePrice"
          inputMode="decimal"
          defaultValue={v("salePrice", product.salePrice)}
          hint={t("shop.saleHint")}
          error={state.errors?.salePrice}
        />
        <Field
          label={t("shop.stock")}
          name="stock"
          inputMode="numeric"
          defaultValue={v("stock", product.stock)}
          hint={t("shop.stockHint")}
          error={state.errors?.stock}
        />
        <Field label={t("shop.sku")} name="sku" maxLength={64} defaultValue={v("sku", product.sku)} hint={t("shop.skuHint")} error={state.errors?.sku} />
      </div>
      {categories.length > 0 ? (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 text-sm font-semibold">{t("shop.categories")}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {categories.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 text-[15px]">
                <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={product.categoryIds.includes(c.id)} className="h-4 w-4 accent-midnight" />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">{t("shop.photos")}</legend>
        {product.images.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {product.images.map((image) => (
              <label key={image.id} className="flex flex-col items-center gap-1 text-[13px] text-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="h-20 w-20 rounded-lg border border-line object-cover" />
                <span className="flex items-center gap-1">
                  <input type="checkbox" name="removeImage" value={image.id} className="h-3.5 w-3.5 accent-danger" />
                  {t("common.remove")}
                </span>
              </label>
            ))}
          </div>
        ) : null}
        <input
          type="file"
          name="images"
          multiple
          accept="image/png,image/jpeg"
          className="text-sm"
          aria-describedby="f-images-hint"
          aria-invalid={state.errors?.images ? true : undefined}
        />
        <span id="f-images-hint" className="text-[13px] text-muted">
          {t("shop.photosHint")}
        </span>
        {/* 51 Or pictures already in the Media library. */}
        <MediaImagesPicker />
        <FieldError id="f-images-error" error={state.errors?.images} />
      </fieldset>
      <OptionGroupsEditor initial={product.optionGroups} currency={currency} restaurant={restaurant} error={state.errors?.optionGroups} />
      {restaurant ? null : <VariantsEditor initial={product.variants} currency={currency} error={state.errors?.variants} />}
      <div className="flex flex-col gap-3">
        <Check name="active" label={t("shop.show")} hint={t("shop.showHint")} defaultChecked={product.active} />
        <Check name="featured" label={t("shop.featured")} hint={t("shop.featuredHint")} defaultChecked={product.featured} />
        {restaurant ? null : (
          <Check
            name="digital"
            label={t("shop.digital")}
            hint={t("shop.digitalHint")}
            defaultChecked={product.digital}
          />
        )}
      </div>
      <div className="flex justify-end pt-1">
        <SubmitButton className="h-11" pendingText={t("common.saving")}>
          {product.id === null ? words.add : words.save}
        </SubmitButton>
      </div>
    </form>
  );
}

const blankOption = () => ({ name: "", price: "" });

/**
 * 26 A product's option groups: each with a name, how many options customers
 * choose (at least and at most) and its options with an extra price. Sent as
 * one JSON field and checked on the server (lib/catalog/options.ts).
 */
function OptionGroupsEditor({ initial, currency, restaurant, error }: { initial: EditorGroup[]; currency: string; restaurant: boolean; error?: string }) {
  const t = useDashT();
  const sr = { sr: (chunk: string) => <span className="sr-only">{chunk}</span> };
  const [groups, setGroups] = useState<EditorGroup[]>(initial);
  const update = (i: number, patch: Partial<EditorGroup>) => setGroups((all) => all.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const updateOption = (i: number, k: number, patch: Partial<EditorGroup["options"][number]>) =>
    setGroups((all) => all.map((g, j) => (j === i ? { ...g, options: g.options.map((o, l) => (l === k ? { ...o, ...patch } : o)) } : g)));
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby="f-options-hint">
      <legend className="mb-1.5 text-sm font-semibold">{t("shop.options")}</legend>
      <input type="hidden" name="optionGroups" value={JSON.stringify(groups)} />
      <span id="f-options-hint" className="text-[13px] text-muted">
        {restaurant ? t("shop.optionsHintRestaurant") : t("shop.optionsHintShop")}
      </span>
      {groups.map((group, i) => {
        const n = i + 1;
        return (
          <div key={i} role="group" aria-label={t("shop.groupLabel", { n })} className="flex flex-col gap-3 rounded-xl border border-line p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px]">
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t("shop.groupName")}
                <input
                  className="input input-sm font-normal"
                  value={group.name}
                  maxLength={60}
                  placeholder={t("shop.groupNamePlaceholder")}
                  aria-label={t("shop.groupNameAria", { n })}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t("shop.atLeast")}
                <input
                  className="input input-sm font-normal"
                  inputMode="numeric"
                  value={group.min}
                  aria-label={t("shop.atLeastAria", { n })}
                  onChange={(e) => update(i, { min: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t("shop.atMost")}
                <input
                  className="input input-sm font-normal"
                  inputMode="numeric"
                  value={group.max}
                  aria-label={t("shop.atMostAria", { n })}
                  onChange={(e) => update(i, { max: e.target.value })}
                />
              </label>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {group.options.map((option, k) => (
                <li key={k} className="flex flex-wrap items-center gap-2">
                  <input
                    className="input input-sm min-w-0 flex-[1_1_180px]"
                    value={option.name}
                    maxLength={60}
                    placeholder={t("shop.optionPlaceholder")}
                    aria-label={t("shop.optionAria", { n, k: k + 1 })}
                    onChange={(e) => updateOption(i, k, { name: e.target.value })}
                  />
                  <input
                    className="input input-sm w-[140px]"
                    inputMode="decimal"
                    value={option.price}
                    placeholder={`+ ${currency}`}
                    aria-label={t("shop.optionPriceAria", { n, k: k + 1 })}
                    onChange={(e) => updateOption(i, k, { price: e.target.value })}
                  />
                  <button
                    type="button"
                    className="cursor-pointer border-0 bg-transparent p-1 text-sm font-semibold text-danger"
                    onClick={() => update(i, { options: group.options.filter((_, l) => l !== k) })}
                  >
                    {richText(t("shop.removeOption", { n, k: k + 1 }), sr)}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} onClick={() => update(i, { options: [...group.options, blankOption()] })}>
                {richText(t("shop.addOption", { n }), sr)}
              </button>
              <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} onClick={() => setGroups((all) => all.filter((_, j) => j !== i))}>
                {richText(t("shop.removeGroup", { n }), sr)}
              </button>
            </div>
          </div>
        );
      })}
      <div>
        <button
          type="button"
          className={`${btn.secondary} h-9 px-3 text-sm`}
          onClick={() => setGroups((all) => [...all, { name: "", min: "1", max: "1", options: [blankOption(), blankOption()] }])}
        >
          {t("shop.addGroup")}
        </button>
      </div>
      <FieldError id="f-options-error" error={error} />
    </fieldset>
  );
}

/** Sunday to Saturday: 1 January 2023 was a Sunday. */
const WEEKDAY_DATES = [0, 1, 2, 3, 4, 5, 6].map((d) => new Date(Date.UTC(2023, 0, 1 + d)));

/** 26 A restaurant's pickup and delivery, opening hours and order times. */
export function FulfilmentForm({ current, timezones, currency }: { current: Record<string, string>; timezones: string[]; currency: string }) {
  const t = useDashT();
  const lang = useDashLang();
  const weekdays = WEEKDAY_DATES.map((date) => formatDate(lang, date, { weekday: "long", timeZone: "UTC" }));
  const [state, action] = useActionState(saveFulfilmentAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-5" key={JSON.stringify(v)}>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-3">
        <Check name="pickup" label={t("shop.pickup")} hint={t("shop.pickupHint")} defaultChecked={v.pickup === "on"} />
        <Check name="delivery" label={t("shop.delivery")} hint={t("shop.deliveryHint")} defaultChecked={v.delivery === "on"} />
        <FieldError id="f-pickup-error" error={e.pickup} />
      </div>
      <Field label={t("shop.pickupAddress")} name="pickupAddress" maxLength={200} defaultValue={v.pickupAddress} hint={t("shop.pickupAddressHint")} error={e.pickupAddress} small />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("shop.deliveryFee", { currency })}
          name="deliveryFee"
          inputMode="decimal"
          defaultValue={v.deliveryFee}
          hint={t("shop.deliveryFeeHint")}
          error={e.deliveryFee}
          small
        />
        <Field
          label={t("shop.minOrder", { currency })}
          name="minOrder"
          inputMode="decimal"
          defaultValue={v.minOrder}
          hint={t("shop.optionalHint")}
          error={e.minOrder}
          small
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-deliveryAreas" className="text-sm font-semibold">
          {t("shop.deliveryAreas")}
        </label>
        <textarea
          id="f-deliveryAreas"
          name="deliveryAreas"
          rows={3}
          defaultValue={v.deliveryAreas}
          className="input min-h-20 py-2.5"
          aria-describedby="f-deliveryAreas-hint"
        />
        <span id="f-deliveryAreas-hint" className="text-[13px] text-muted">
          {t("shop.deliveryAreasHint")}
        </span>
        <FieldError id="f-deliveryAreas-error" error={e.deliveryAreas} />
      </div>
      <Field
        label={t("shop.deliveryNote")}
        name="deliveryNote"
        maxLength={200}
        defaultValue={v.deliveryNote}
        hint={t("shop.deliveryNoteHint")}
        error={e.deliveryNote}
        small
      />
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">{t("shop.openingHours")}</legend>
        {weekdays.map((day, d) => (
          <div key={d} className="flex flex-wrap items-center gap-3 text-[15px]">
            <label className="flex w-[130px] cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name={`open${d}`}
                defaultChecked={v[`open${d}`] === "on"}
                className="h-4 w-4 accent-midnight"
                aria-label={t("shop.openOn", { day })}
              />
              {day}
            </label>
            <input type="time" name={`start${d}`} defaultValue={v[`start${d}`] || "09:00"} aria-label={t("shop.opensAt", { day })} className="input input-sm w-[120px]" />
            <span className="text-muted">{t("shop.to")}</span>
            <input type="time" name={`end${d}`} defaultValue={v[`end${d}`] || "22:00"} aria-label={t("shop.closesAt", { day })} className="input input-sm w-[120px]" />
          </div>
        ))}
        <FieldError id="f-hours-error" error={e.hours} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="f-timezone" className="text-sm font-semibold">
            {t("shop.timeZone")}
          </label>
          <select id="f-timezone" name="timezone" defaultValue={v.timezone} className="input input-sm" dir="ltr">
            {timezones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          <FieldError id="f-timezone-error" error={e.timezone} />
        </div>
        <Field label={t("shop.prepTime")} name="prepMinutes" inputMode="numeric" defaultValue={v.prepMinutes} error={e.prepMinutes} small />
      </div>
      <div className="flex flex-col gap-3">
        <Check name="asap" label={t("shop.asap")} hint={t("shop.asapHint")} defaultChecked={v.asap === "on"} />
        <Check name="scheduled" label={t("shop.later")} hint={t("shop.laterHint")} defaultChecked={v.scheduled === "on"} />
        <FieldError id="f-asap-error" error={e.asap} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="f-slotStep" className="text-sm font-semibold">
            {t("shop.slotEvery")}
          </label>
          <select id="f-slotStep" name="slotStep" defaultValue={v.slotStep} className="input input-sm">
            {["10", "15", "20", "30", "60"].map((m) => (
              <option key={m} value={m}>
                {t("shop.minutesN", { count: m })}
              </option>
            ))}
          </select>
          <FieldError id="f-slotStep-error" error={e.slotStep} />
        </div>
        <Field label={t("shop.daysAhead")} name="maxDaysAhead" inputMode="numeric" defaultValue={v.maxDaysAhead} hint={t("shop.daysAheadHint")} error={e.maxDaysAhead} small />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {t("shop.saveFulfilment")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 91.1 A new coupon: a code, a share or an amount off, and its limits. */
export function CouponForm({ currency }: { currency: string }) {
  const t = useDashT();
  const [state, action] = useActionState(addCouponAction, initialFormState);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={state.ok ? state.message : "coupon"}>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("shop.couponCode")} id="f-coupon-code" name="code" placeholder="SPRING10" dir="ltr" defaultValue={v.code} error={e.code} small />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-coupon-kind" className="text-sm font-semibold">
            {t("shop.couponKind")}
          </label>
          <select id="f-coupon-kind" name="kind" defaultValue={v.kind ?? "percent"} className="input input-sm">
            <option value="percent">{t("shop.couponPercent")}</option>
            <option value="amount">{t("shop.couponAmount", { currency })}</option>
          </select>
        </div>
        <Field label={t("shop.couponValue")} id="f-coupon-value" name="value" inputMode="decimal" defaultValue={v.value} error={e.value} small />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("shop.couponMinOrder", { currency })} id="f-coupon-min-order" name="minOrder" inputMode="decimal" defaultValue={v.minOrder} hint={t("shop.optional")} error={e.minOrder} small />
        <Field label={t("shop.couponEndsOn")} id="f-coupon-ends-on" name="endsOn" type="date" defaultValue={v.endsOn} hint={t("shop.optional")} error={e.endsOn} small />
        <Field label={t("shop.couponMaxUses")} id="f-coupon-max-uses" name="maxUses" inputMode="numeric" defaultValue={v.maxUses} hint={t("shop.couponMaxUsesHint")} error={e.maxUses} small />
      </div>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10">
          {t("shop.addCoupon")}
        </SubmitButton>
      </div>
    </form>
  );
}

export function AddCategoryForm() {
  const t = useDashT();
  const [state, action] = useActionState(addCategoryAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-2">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex items-end gap-2">
        <Field label={t("shop.newCategory")} name="name" maxLength={80} className="flex-1" defaultValue={state.ok ? "" : state.values?.name} error={state.errors?.name} />
        <SubmitButton variant="secondary" className="h-11" pendingText={t("common.adding")}>
          {t("common.add")}
        </SubmitButton>
      </div>
    </form>
  );
}

export function ShopSettingsForm({
  currency,
  shipping,
  freeOver,
  returnDays = "",
  tax = { label: "", rate: "", included: true },
  currencies,
  shippingFields = true,
}: {
  currency: string;
  shipping: string;
  freeOver: string;
  /** 91.3 Days after completion a return can be asked for; empty: none. */
  returnDays?: string;
  /** 91.5 The tax: its name, rate (empty: none) and whether the prices include it. */
  tax?: { label: string; rate: string; included: boolean };
  currencies: string[];
  /** 26 Restaurants charge a delivery fee instead (Pickup and delivery). */
  shippingFields?: boolean;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveShopSettingsAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-currency" className="text-sm font-semibold">
          {t("shop.currency")}
        </label>
        <select id="f-currency" name="currency" defaultValue={state.values?.currency ?? currency} className="input">
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <FieldError id="f-currency-error" error={state.errors?.currency} />
      </div>
      {shippingFields ? (
        <>
          <Field
            label={t("shop.shippingFee")}
            name="shipping"
            inputMode="decimal"
            defaultValue={state.values?.shipping ?? shipping}
            hint={t("shop.shippingHint")}
            error={state.errors?.shipping}
          />
          <Field
            label={t("shop.freeFrom")}
            name="freeOver"
            inputMode="decimal"
            defaultValue={state.values?.freeOver ?? freeOver}
            hint={t("shop.freeFromHint")}
            error={state.errors?.freeOver}
          />
          <Field
            label={t("shop.returnDays")}
            id="f-return-days"
            name="returnDays"
            inputMode="numeric"
            defaultValue={state.values?.returnDays ?? returnDays}
            hint={t("shop.returnDaysHint")}
            error={state.errors?.returnDays}
          />
        </>
      ) : null}
      {/* 91.5 The shop's tax (restaurants too: on the food and the delivery fee). */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("shop.taxRate")} id="f-tax-rate" name="taxRate" inputMode="decimal" defaultValue={state.values?.taxRate ?? tax.rate} hint={t("shop.taxRateHint")} error={state.errors?.taxRate} />
        <Field label={t("shop.taxLabel")} id="f-tax-label" name="taxLabel" defaultValue={state.values?.taxLabel ?? tax.label} hint={t("shop.taxLabelHint")} error={state.errors?.taxLabel} />
      </div>
      <Check name="taxIncluded" label={t("shop.taxIncluded")} hint={t("shop.taxIncludedHint")} defaultChecked={state.values ? state.values.taxIncluded === "on" : tax.included} />
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
          {t("shop.saveSettings")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 91.4 The shop's loyalty points. */
export function LoyaltyForm({ values: saved, currency }: { values: { on: string; spend: string; value: string; minPoints: string }; currency: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveLoyaltyAction, initialFormState);
  const values = { ...saved, ...state.values };
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Check name="on" label={t("shop.loyaltyOn")} hint={t("shop.loyaltyIntro")} defaultChecked={values.on === "on"} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label={t("shop.loyaltySpend", { currency })}
          id="f-loyalty-spend"
          name="spend"
          inputMode="decimal"
          defaultValue={values.spend}
          hint={t("shop.loyaltySpendHint")}
          error={state.errors?.spend}
        />
        <Field
          label={t("shop.loyaltyValue", { currency })}
          id="f-loyalty-value"
          name="value"
          inputMode="decimal"
          defaultValue={values.value}
          hint={t("shop.loyaltyValueHint")}
          error={state.errors?.value}
        />
        <Field
          label={t("shop.loyaltyMin")}
          id="f-loyalty-min"
          name="minPoints"
          inputMode="numeric"
          defaultValue={values.minPoints}
          hint={t("shop.loyaltyMinHint")}
          error={state.errors?.minPoints}
        />
      </div>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
          {t("shop.saveLoyalty")}
        </SubmitButton>
      </div>
    </form>
  );
}

type ProviderChoice = "iyzico" | "kashier" | "fawaterk";

/** 37 Where each provider shows the keys, for the hint under the choice. */
const KEYS_WHERE: Record<ProviderChoice, DashKey> = { iyzico: "shop.keysIyzico", kashier: "shop.keysKashier", fawaterk: "shop.keysFawaterk" };
const TEST_LABEL: Record<ProviderChoice, DashKey> = { iyzico: "shop.testIyzico", kashier: "shop.testKashier", fawaterk: "shop.testFawaterk" };
const TEST_HINT: Record<ProviderChoice, DashKey> = { iyzico: "shop.testIyzicoHint", kashier: "shop.testKashierHint", fawaterk: "shop.testFawaterkHint" };

/** The owner's own merchant account: 37 iyzico, Kashier or Fawaterk, with the keys each one needs. */
export function PaymentKeysForm({ provider, sandbox, merchantId = "" }: { provider: ProviderChoice | null; sandbox: boolean; merchantId?: string }) {
  const t = useDashT();
  const [state, action] = useActionState(savePaymentKeysAction, initialFormState);
  const [choice, setChoice] = useState<ProviderChoice>((state.values?.provider as ProviderChoice | undefined) || provider || "iyzico");
  const testLabel = t(TEST_LABEL[choice]);
  const testHint = t(TEST_HINT[choice]);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-provider" className="text-sm font-semibold">
          {t("shop.provider")}
        </label>
        <select id="f-provider" name="provider" value={choice} onChange={(event) => setChoice(event.target.value as ProviderChoice)} className="input">
          <option value="iyzico">{t("shop.optIyzico")}</option>
          <option value="kashier">{t("shop.optKashier")}</option>
          <option value="fawaterk">{t("shop.optFawaterk")}</option>
        </select>
        <span className="text-[13px] leading-normal text-muted">{t(KEYS_WHERE[choice])}</span>
        <FieldError id="f-provider-error" error={state.errors?.provider} />
      </div>
      {choice === "kashier" ? (
        <Field
          label={t("shop.merchantId")}
          name="merchantId"
          autoComplete="off"
          placeholder="MID-1234-567"
          defaultValue={state.values?.merchantId ?? merchantId}
          required
          error={state.errors?.merchantId}
        />
      ) : null}
      <Field key={`api-${choice}`} label={choice === "kashier" ? t("shop.paymentApiKey") : t("shop.apiKey")} name="apiKey" autoComplete="off" required error={state.errors?.apiKey} />
      {choice !== "fawaterk" ? (
        <Field key={`secret-${choice}`} label={t("shop.secretKey")} name="secretKey" type="password" autoComplete="off" required error={state.errors?.secretKey} />
      ) : null}
      <Check key={`test-${choice}`} name="sandbox" label={testLabel} hint={testHint} defaultChecked={state.values ? state.values.sandbox === "on" : sandbox} />
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("shop.checking")}>
          {t("shop.saveKeys")}
        </SubmitButton>
      </div>
    </form>
  );
}
