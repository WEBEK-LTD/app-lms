"use client";

import { useActionState, useState } from "react";
import { addCategoryAction, joinMarketplaceAction, savePaymentKeysAction, saveProductAction, saveShopSettingsAction } from "@/app/actions/catalog";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
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
}: {
  product: ProductFormValues;
  categories: { id: number; name: string }[];
  currency: string;
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
      <div className="flex flex-col gap-3">
        <Check name="active" label="Show in the app" hint="Turn off to hide the product without deleting it." defaultChecked={product.active} />
        <Check name="featured" label="Featured" hint="Shown first on the app's home screen." defaultChecked={product.featured} />
        <Check
          name="digital"
          label="Digital product"
          hint="Nothing to ship, like a gift card or a file. No shipping is charged, and the iPhone app doesn't sell it (Apple's rules)."
          defaultChecked={product.digital}
        />
      </div>
      <div className="flex justify-end pt-1">
        <SubmitButton className="h-11" pendingText="Saving…">
          {product.id === null ? "Add product" : "Save product"}
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
}: {
  currency: string;
  shipping: string;
  freeOver: string;
  currencies: string[];
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
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText="Saving…">
          Save settings
        </SubmitButton>
      </div>
    </form>
  );
}

export function PaymentKeysForm({ sandbox }: { sandbox: boolean }) {
  const [state, action] = useActionState(savePaymentKeysAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Field label="API key" name="apiKey" autoComplete="off" required error={state.errors?.apiKey} />
      <Field label="Secret key" name="secretKey" type="password" autoComplete="off" required error={state.errors?.secretKey} />
      <Check
        name="sandbox"
        label="Sandbox keys"
        hint="For test payments with iyzico's test cards. Turn off when you paste your live keys."
        defaultChecked={state.values ? state.values.sandbox === "on" : sandbox}
      />
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Checking…">
          Save keys
        </SubmitButton>
      </div>
    </form>
  );
}

/** Selling through Yallapp's iyzico account: the details iyzico needs to pay the shop. */
export function MarketplaceForm({ types }: { types: { id: string; label: string }[] }) {
  const [state, action] = useActionState(joinMarketplaceAction, initialFormState);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const [type, setType] = useState(v.type || "PERSONAL");
  const company = type !== "PERSONAL";
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
