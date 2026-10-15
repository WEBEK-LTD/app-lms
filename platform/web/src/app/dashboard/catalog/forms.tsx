"use client";

import { useActionState, useState } from "react";
import {
  addCategoryAction,
  joinMarketplaceAction,
  saveFulfilmentAction,
  savePaymentKeysAction,
  saveProductAction,
  saveShopSettingsAction,
} from "@/app/actions/catalog";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { btn } from "@/components/ui";
import { initialFormState } from "@/lib/forms";

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
  const [state, action] = useActionState(saveProductAction, initialFormState);
  const v = (key: keyof ProductFormValues & string, fallback: string) => state.values?.[key] ?? fallback;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {product.id !== null ? <input type="hidden" name="id" value={product.id} /> : null}
      <FormMessage message={state.message} ok={state.ok} />
      <Field label="Name" name="name" required maxLength={120} defaultValue={v("name", product.name)} error={state.errors?.name} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-description" className="text-sm font-semibold">
          Description
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
          Leave an empty line between paragraphs.
        </span>
        <FieldError id="f-description-error" error={state.errors?.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={`Price (${currency})`}
          name="price"
          inputMode="decimal"
          required
          defaultValue={v("price", product.price)}
          placeholder="450.00"
          error={state.errors?.price}
        />
        <Field
          label={`Sale price (${currency})`}
          name="salePrice"
          inputMode="decimal"
          defaultValue={v("salePrice", product.salePrice)}
          hint="Optional. Shown with the price crossed out."
          error={state.errors?.salePrice}
        />
        <Field
          label="Stock"
          name="stock"
          inputMode="numeric"
          defaultValue={v("stock", product.stock)}
          hint="Leave empty if you don't count stock."
          error={state.errors?.stock}
        />
        <Field label="SKU" name="sku" maxLength={64} defaultValue={v("sku", product.sku)} hint="Optional. Your own product code." error={state.errors?.sku} />
      </div>
      {categories.length > 0 ? (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 text-sm font-semibold">Categories</legend>
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
        <legend className="mb-1.5 text-sm font-semibold">Photos</legend>
        {product.images.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {product.images.map((image) => (
              <label key={image.id} className="flex flex-col items-center gap-1 text-[13px] text-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="h-20 w-20 rounded-lg border border-line object-cover" />
                <span className="flex items-center gap-1">
                  <input type="checkbox" name="removeImage" value={image.id} className="h-3.5 w-3.5 accent-danger" />
                  Remove
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
          PNG or JPEG, up to 2 MB each and 6 per product. The first photo is shown in lists. Square photos look best.
        </span>
        <FieldError id="f-images-error" error={state.errors?.images} />
      </fieldset>
      <OptionGroupsEditor initial={product.optionGroups} currency={currency} restaurant={restaurant} error={state.errors?.optionGroups} />
      <div className="flex flex-col gap-3">
        <Check name="active" label="Show in the app" hint="Turn off to hide the product without deleting it." defaultChecked={product.active} />
        <Check name="featured" label="Featured" hint="Shown first on the app's home screen." defaultChecked={product.featured} />
        {restaurant ? null : (
          <Check
            name="digital"
            label="Digital product"
            hint="Nothing to ship, like a gift card or a file. No shipping is charged, and the iPhone app doesn't sell it (Apple's rules)."
            defaultChecked={product.digital}
          />
        )}
      </div>
      <div className="flex justify-end pt-1">
        <SubmitButton className="h-11" pendingText="Saving…">
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
  const [groups, setGroups] = useState<EditorGroup[]>(initial);
  const update = (i: number, patch: Partial<EditorGroup>) => setGroups((all) => all.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const updateOption = (i: number, k: number, patch: Partial<EditorGroup["options"][number]>) =>
    setGroups((all) => all.map((g, j) => (j === i ? { ...g, options: g.options.map((o, l) => (l === k ? { ...o, ...patch } : o)) } : g)));
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby="f-options-hint">
      <legend className="mb-1.5 text-sm font-semibold">Options</legend>
      <input type="hidden" name="optionGroups" value={JSON.stringify(groups)} />
      <span id="f-options-hint" className="text-[13px] text-muted">
        {restaurant
          ? "Choices customers make before adding the dish, like a size, a side or extras, each with its own extra price."
          : "Choices customers make before adding the product to the cart, like a size or a gift wrap, each with its own extra price."}{" "}
        &quot;At least 0&quot; makes a group optional.
      </span>
      {groups.map((group, i) => {
        const n = i + 1;
        return (
          <div key={i} role="group" aria-label={`Option group ${n}`} className="flex flex-col gap-3 rounded-xl border border-line p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px]">
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Group name
                <input
                  className="input input-sm font-normal"
                  value={group.name}
                  maxLength={60}
                  placeholder="Size"
                  aria-label={`Group ${n} name`}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                At least
                <input
                  className="input input-sm font-normal"
                  inputMode="numeric"
                  value={group.min}
                  aria-label={`Group ${n} at least`}
                  onChange={(e) => update(i, { min: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                At most
                <input
                  className="input input-sm font-normal"
                  inputMode="numeric"
                  value={group.max}
                  aria-label={`Group ${n} at most`}
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
                    placeholder="Option"
                    aria-label={`Group ${n} option ${k + 1}`}
                    onChange={(e) => updateOption(i, k, { name: e.target.value })}
                  />
                  <input
                    className="input input-sm w-[140px]"
                    inputMode="decimal"
                    value={option.price}
                    placeholder={`+ ${currency}`}
                    aria-label={`Group ${n} option ${k + 1} extra price`}
                    onChange={(e) => updateOption(i, k, { price: e.target.value })}
                  />
                  <button
                    type="button"
                    className="cursor-pointer border-0 bg-transparent p-1 text-sm font-semibold text-danger"
                    onClick={() => update(i, { options: group.options.filter((_, l) => l !== k) })}
                  >
                    Remove<span className="sr-only"> option {k + 1} of group {n}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} onClick={() => update(i, { options: [...group.options, blankOption()] })}>
                Add option<span className="sr-only"> to group {n}</span>
              </button>
              <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} onClick={() => setGroups((all) => all.filter((_, j) => j !== i))}>
                Remove group<span className="sr-only"> {n}</span>
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
          Add an option group
        </button>
      </div>
      <FieldError id="f-options-error" error={error} />
    </fieldset>
  );
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** 26 A restaurant's pickup and delivery, opening hours and order times. */
export function FulfilmentForm({ current, timezones, currency }: { current: Record<string, string>; timezones: string[]; currency: string }) {
  const [state, action] = useActionState(saveFulfilmentAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-5" key={JSON.stringify(v)}>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-3">
        <Check name="pickup" label="Pickup" hint="Customers collect their order." defaultChecked={v.pickup === "on"} />
        <Check name="delivery" label="Delivery" hint="You bring the order to the customer." defaultChecked={v.delivery === "on"} />
        <FieldError id="f-pickup-error" error={e.pickup} />
      </div>
      <Field label="Pickup address" name="pickupAddress" maxLength={200} defaultValue={v.pickupAddress} hint="Shown to customers who pick up." error={e.pickupAddress} small />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Delivery fee (${currency})`} name="deliveryFee" inputMode="decimal" defaultValue={v.deliveryFee} hint="Leave empty for free delivery." error={e.deliveryFee} small />
        <Field
          label={`Minimum order for delivery (${currency})`}
          name="minOrder"
          inputMode="decimal"
          defaultValue={v.minOrder}
          hint="Optional."
          error={e.minOrder}
          small
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-deliveryAreas" className="text-sm font-semibold">
          Delivery areas
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
          Districts or postcodes, one per line. Customers pick one. Leave empty to deliver anywhere.
        </span>
        <FieldError id="f-deliveryAreas-error" error={e.deliveryAreas} />
      </div>
      <Field
        label="Where you deliver"
        name="deliveryNote"
        maxLength={200}
        defaultValue={v.deliveryNote}
        hint='In your words, like "Within 3 km of Moda". Optional.'
        error={e.deliveryNote}
        small
      />
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">Opening hours</legend>
        {WEEKDAYS.map((day, d) => (
          <div key={day} className="flex flex-wrap items-center gap-3 text-[15px]">
            <label className="flex w-[130px] cursor-pointer items-center gap-2">
              <input type="checkbox" name={`open${d}`} defaultChecked={v[`open${d}`] === "on"} className="h-4 w-4 accent-midnight" aria-label={`Open on ${day}`} />
              {day}
            </label>
            <input type="time" name={`start${d}`} defaultValue={v[`start${d}`] || "09:00"} aria-label={`${day} opens at`} className="input input-sm w-[120px]" />
            <span className="text-muted">to</span>
            <input type="time" name={`end${d}`} defaultValue={v[`end${d}`] || "22:00"} aria-label={`${day} closes at`} className="input input-sm w-[120px]" />
          </div>
        ))}
        <FieldError id="f-hours-error" error={e.hours} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="f-timezone" className="text-sm font-semibold">
            Time zone
          </label>
          <select id="f-timezone" name="timezone" defaultValue={v.timezone} className="input input-sm">
            {timezones.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <FieldError id="f-timezone-error" error={e.timezone} />
        </div>
        <Field label="Preparation time (minutes)" name="prepMinutes" inputMode="numeric" defaultValue={v.prepMinutes} error={e.prepMinutes} small />
      </div>
      <div className="flex flex-col gap-3">
        <Check name="asap" label="Orders as soon as possible" hint="While you're open. When you're closed, the app says when you open." defaultChecked={v.asap === "on"} />
        <Check name="scheduled" label="Orders for later" hint="Customers choose a time, from your preparation time on." defaultChecked={v.scheduled === "on"} />
        <FieldError id="f-asap-error" error={e.asap} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="f-slotStep" className="text-sm font-semibold">
            Times for later every
          </label>
          <select id="f-slotStep" name="slotStep" defaultValue={v.slotStep} className="input input-sm">
            {["10", "15", "20", "30", "60"].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
          <FieldError id="f-slotStep-error" error={e.slotStep} />
        </div>
        <Field label="Orders for later, up to (days ahead)" name="maxDaysAhead" inputMode="numeric" defaultValue={v.maxDaysAhead} hint="0: today only." error={e.maxDaysAhead} small />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save pickup and delivery
        </SubmitButton>
      </div>
    </form>
  );
}

export function AddCategoryForm() {
  const [state, action] = useActionState(addCategoryAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-2">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex items-end gap-2">
        <Field label="New category" name="name" maxLength={80} className="flex-1" defaultValue={state.ok ? "" : state.values?.name} error={state.errors?.name} />
        <SubmitButton variant="secondary" className="h-11" pendingText="Adding…">
          Add
        </SubmitButton>
      </div>
    </form>
  );
}

export function ShopSettingsForm({
  currency,
  shipping,
  freeOver,
  currencies,
  shippingFields = true,
}: {
  currency: string;
  shipping: string;
  freeOver: string;
  currencies: string[];
  /** 26 Restaurants charge a delivery fee instead (Pickup and delivery). */
  shippingFields?: boolean;
}) {
  const [state, action] = useActionState(saveShopSettingsAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-currency" className="text-sm font-semibold">
          Currency
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
            label="Shipping fee"
            name="shipping"
            inputMode="decimal"
            defaultValue={state.values?.shipping ?? shipping}
            hint="Added to orders with physical products. Leave empty for free shipping."
            error={state.errors?.shipping}
          />
          <Field
            label="Free shipping from"
            name="freeOver"
            inputMode="decimal"
            defaultValue={state.values?.freeOver ?? freeOver}
            hint="Orders of this amount or more ship free. Optional."
            error={state.errors?.freeOver}
          />
        </>
      ) : null}
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText="Saving…">
          Save settings
        </SubmitButton>
      </div>
    </form>
  );
}

type ProviderChoice = "iyzico" | "kashier" | "fawaterk";

/** 37 Where each provider shows the keys, for the hint under the choice. */
const KEYS_WHERE: Record<ProviderChoice, string> = {
  iyzico: "Find your API key and secret key in the iyzico merchant panel, under Settings.",
  kashier: "Find your merchant ID, and create your Payment API key and secret key, in the Kashier dashboard under Integrate now. Test and live keys differ.",
  fawaterk: "Find your API key in the Fawaterk dashboard, under Integrations. Staging and live keys differ.",
};

/** The owner's own merchant account: 37 iyzico, Kashier or Fawaterk, with the keys each one needs. */
export function PaymentKeysForm({ provider, sandbox, merchantId = "" }: { provider: ProviderChoice | null; sandbox: boolean; merchantId?: string }) {
  const [state, action] = useActionState(savePaymentKeysAction, initialFormState);
  const [choice, setChoice] = useState<ProviderChoice>((state.values?.provider as ProviderChoice | undefined) || provider || "iyzico");
  const testLabel = choice === "iyzico" ? "Sandbox keys" : choice === "kashier" ? "Test mode keys" : "Staging key";
  const testHint =
    choice === "iyzico"
      ? "For test payments with iyzico's test cards. Turn off when you paste your live keys."
      : choice === "kashier"
        ? "For test payments with Kashier's test cards. Turn off when you paste your live keys."
        : "For test payments on Fawaterk's staging site. Turn off when you paste your live key.";
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-provider" className="text-sm font-semibold">
          Payment provider
        </label>
        <select id="f-provider" name="provider" value={choice} onChange={(event) => setChoice(event.target.value as ProviderChoice)} className="input">
          <option value="iyzico">iyzico (Türkiye)</option>
          <option value="kashier">Kashier (Egypt)</option>
          <option value="fawaterk">Fawaterk (Egypt)</option>
        </select>
        <span className="text-[13px] leading-normal text-muted">{KEYS_WHERE[choice]}</span>
        <FieldError id="f-provider-error" error={state.errors?.provider} />
      </div>
      {choice === "kashier" ? (
        <Field
          label="Merchant ID"
          name="merchantId"
          autoComplete="off"
          placeholder="MID-1234-567"
          defaultValue={state.values?.merchantId ?? merchantId}
          required
          error={state.errors?.merchantId}
        />
      ) : null}
      <Field key={`api-${choice}`} label={choice === "kashier" ? "Payment API key" : "API key"} name="apiKey" autoComplete="off" required error={state.errors?.apiKey} />
      {choice !== "fawaterk" ? (
        <Field key={`secret-${choice}`} label="Secret key" name="secretKey" type="password" autoComplete="off" required error={state.errors?.secretKey} />
      ) : null}
      <Check key={`test-${choice}`} name="sandbox" label={testLabel} hint={testHint} defaultChecked={state.values ? state.values.sandbox === "on" : sandbox} />
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Checking…">
          Save keys
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * Selling through Yallapp's account. With iyzico: the details iyzico needs
 * to register and pay the shop. 37 With Kashier or Fawaterk: who the team
 * transfers the shop's share to.
 */
export function MarketplaceForm({ types, provider = "iyzico" }: { types: { id: string; label: string }[]; provider?: ProviderChoice }) {
  const [state, action] = useActionState(joinMarketplaceAction, initialFormState);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const [type, setType] = useState(v.type || "PERSONAL");
  const company = type !== "PERSONAL";
  if (provider !== "iyzico") {
    return (
      <form action={action} noValidate className="flex flex-col gap-4">
        <FormMessage message={state.message} ok={state.ok} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shop name" name="payeeName" defaultValue={v.payeeName} error={e.payeeName} small />
          <Field label="Your full name" name="contactName" autoComplete="name" defaultValue={v.contactName} error={e.contactName} small />
          <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={v.email} error={e.email} small />
          <Field label="Mobile number" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} error={e.phone} small />
        </div>
        <Field label="Address" name="address" autoComplete="street-address" defaultValue={v.address} error={e.address} small />
        <Field label="IBAN" name="iban" autoComplete="off" placeholder="EG" defaultValue={v.iban} hint="Where Yallapp transfers your share. It must be in the payee's name." error={e.iban} small />
        <div className="flex justify-end">
          <SubmitButton className="h-10" pendingText="Saving…">
            Sell through Yallapp
          </SubmitButton>
        </div>
      </form>
    );
  }
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      {/* The choice is sent from state: React resets the form's own radios after each submit. */}
      <input type="hidden" name="type" value={type} />
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">Who gets paid</legend>
        {types.map((t) => (
          <label key={t.id} className="flex cursor-pointer items-center gap-3 text-[15px]">
            <input type="radio" name="typeChoice" value={t.id} checked={type === t.id} onChange={() => setType(t.id)} className="h-4 w-4 accent-midnight" />
            {t.label}
          </label>
        ))}
        <FieldError id="f-type-error" error={e.type} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Shop name" name="payeeName" defaultValue={v.payeeName} error={e.payeeName} small />
        <Field label="Your full name" name="contactName" autoComplete="name" defaultValue={v.contactName} error={e.contactName} small />
        <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={v.email} error={e.email} small />
        <Field label="Mobile number" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} error={e.phone} small />
      </div>
      <Field label="Address" name="address" autoComplete="street-address" defaultValue={v.address} error={e.address} small />
      <Field label="IBAN" name="iban" autoComplete="off" placeholder="TR" defaultValue={v.iban} hint="Where iyzico pays your share. It must be in the payee's name." error={e.iban} small />
      {type !== "LIMITED_OR_JOINT_STOCK_COMPANY" ? (
        <Field label="T.C. ID number" name="identityNumber" inputMode="numeric" autoComplete="off" defaultValue={v.identityNumber} error={e.identityNumber} small />
      ) : null}
      {company ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legal name" name="legalCompanyTitle" defaultValue={v.legalCompanyTitle} error={e.legalCompanyTitle} small />
          <Field label="Tax office" name="taxOffice" defaultValue={v.taxOffice} error={e.taxOffice} small />
          {type === "LIMITED_OR_JOINT_STOCK_COMPANY" ? (
            <Field label="Tax number" name="taxNumber" inputMode="numeric" defaultValue={v.taxNumber} error={e.taxNumber} small />
          ) : null}
        </div>
      ) : null}
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Registering with iyzico…">
          Sell through Yallapp
        </SubmitButton>
      </div>
    </form>
  );
}
