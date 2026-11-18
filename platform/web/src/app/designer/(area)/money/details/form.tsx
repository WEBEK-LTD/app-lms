"use client";

import { useActionState, useState } from "react";
import { savePayoutDetailsAction } from "@/app/actions/designer-money";
import { useDashT } from "@/components/dashboard-i18n";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { initialFormState } from "@/lib/forms";

/** 106.11 What the designer saved before, the secrets masked ("•••• 1326"). */
export interface SavedDetails {
  legalName: string;
  country: string;
  idType: "passport" | "national_id";
  idNumberMasked: string;
  /** When the ID document was added, or null. */
  documentDate: string | null;
  holderName: string;
  accountKind: "iban" | "number";
  accountMasked: string;
  swift: string;
  bankCode: string;
  bankName: string;
  bankCountry: string;
  address: string;
}

/**
 * 106.11 The checks before the first payout: the designer's ID (the name on
 * it, where they live, its kind and number, a photo or PDF of it) and their
 * bank for SWIFT. Sent at once to Yallapp's team; the ID number and the
 * account are never sent back to the page (a saved one shows masked and is
 * kept when its field is left empty).
 */
export function PayoutDetailsForm({ saved, countries, defaultCountry }: { saved: SavedDetails | null; countries: { code: string; name: string }[]; defaultCountry: string }) {
  const t = useDashT();
  const [state, action] = useActionState(savePayoutDetailsAction, initialFormState);
  const v = (name: keyof SavedDetails & string, fallback = "") => state.values?.[name] ?? (saved ? String(saved[name] ?? "") : fallback);
  const [kind, setKind] = useState<"iban" | "number">((state.values?.accountKind as "iban" | "number" | undefined) ?? saved?.accountKind ?? "iban");
  const e = state.errors ?? {};

  const field = (name: string, label: string, options: { hint?: string; type?: string; autoComplete?: string; maxLength?: number; dir?: "ltr" | "auto"; value?: string; placeholder?: string; upper?: boolean } = {}) => {
    const id = `pd-${name}`;
    const describedBy = [options.hint ? `${id}-hint` : null, e[name] ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        <input
          id={id}
          name={name}
          type={options.type ?? "text"}
          defaultValue={options.value}
          maxLength={options.maxLength ?? 120}
          autoComplete={options.autoComplete ?? "off"}
          dir={options.dir}
          placeholder={options.placeholder}
          spellCheck={false}
          className={`input ${options.upper ? "uppercase" : ""}`}
          aria-invalid={e[name] ? true : undefined}
          aria-describedby={describedBy}
        />
        {options.hint ? (
          <span id={`${id}-hint`} className="text-xs text-muted">
            {options.hint}
          </span>
        ) : null}
        <FieldError id={`${id}-error`} error={e[name]} />
      </div>
    );
  };

  const country = (name: "country" | "bankCountry", label: string, value: string) => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={`pd-${name}`} className="text-sm font-semibold">
        {label}
      </label>
      <select id={`pd-${name}`} name={name} defaultValue={value} className="input" aria-invalid={e[name] ? true : undefined} aria-describedby={e[name] ? `pd-${name}-error` : undefined}>
        <option value="">{t("marketMoney.chooseCountry")}</option>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      <FieldError id={`pd-${name}-error`} error={e[name]} />
    </div>
  );

  const radio = (name: string, value: string, label: string, checked: boolean, onChange?: () => void) => (
    <label className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${checked ? "border-midnight bg-white" : "border-line bg-white/60"}`}>
      <input type="radio" name={name} value={value} defaultChecked={checked} onChange={onChange} className="h-4 w-4 accent-[var(--color-ember,#ff5a1f)]" />
      {label}
    </label>
  );

  const idType = v("idType", "passport");

  return (
    <form action={action} noValidate className="mk-panel flex flex-col gap-6 rounded-[24px] px-5 py-6 sm:px-8">
      <FormMessage message={state.errors?.form ?? (state.ok ? state.message : undefined)} ok={state.ok} />
      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1 flex items-center gap-2 p-0 text-lg font-bold">
          <Icon name="badge" size={22} className="text-accent" />
          {t("marketMoney.sectionYou")}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("legalName", t("marketMoney.legalName"), { value: v("legalName"), autoComplete: "name", dir: "auto" })}
          {country("country", t("marketMoney.country"), v("country", defaultCountry))}
        </div>
        <div role="radiogroup" aria-labelledby="pd-idType-label" className="flex flex-col gap-1.5">
          <span id="pd-idType-label" className="text-sm font-semibold">
            {t("marketMoney.idType")}
          </span>
          <div className="flex flex-wrap gap-2.5">
            {radio("idType", "passport", t("marketMoney.passport"), idType === "passport")}
            {radio("idType", "national_id", t("marketMoney.nationalId"), idType === "national_id")}
          </div>
          <FieldError id="pd-idType-error" error={e.idType} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("idNumber", t("marketMoney.idNumber"), { maxLength: 40, dir: "ltr", upper: true, hint: saved ? t("marketMoney.idNumberSaved", { masked: saved.idNumberMasked }) : undefined })}
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="pd-document" className="text-sm font-semibold">
              {t("marketMoney.document")}
            </label>
            <input
              id="pd-document"
              name="document"
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              className="input py-2 text-sm"
              aria-invalid={e.document ? true : undefined}
              aria-describedby={`pd-document-hint${e.document ? " pd-document-error" : ""}`}
            />
            <span id="pd-document-hint" className="text-xs text-muted">
              {saved?.documentDate ? t("marketMoney.documentSaved", { date: saved.documentDate }) : t("marketMoney.documentHint")}
            </span>
            <FieldError id="pd-document-error" error={e.document} />
          </div>
        </div>
      </fieldset>

      <hr className="m-0 border-0 border-t border-line-soft" />
      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1 flex items-center gap-2 p-0 text-lg font-bold">
          <Icon name="payments" size={22} className="text-accent" />
          {t("marketMoney.sectionBank")}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("holderName", t("marketMoney.holderName"), { value: v("holderName"), hint: t("marketMoney.holderHint"), dir: "auto" })}
          {field("bankName", t("marketMoney.bankName"), { value: v("bankName"), dir: "auto" })}
        </div>
        <div role="radiogroup" aria-labelledby="pd-kind-label" className="flex flex-col gap-1.5">
          <span id="pd-kind-label" className="text-sm font-semibold">
            {t("marketMoney.accountKind")}
          </span>
          <div className="flex flex-wrap gap-2.5">
            {radio("accountKind", "iban", t("marketMoney.kindIban"), kind === "iban", () => setKind("iban"))}
            {radio("accountKind", "number", t("marketMoney.kindNumber"), kind === "number", () => setKind("number"))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("account", t("marketMoney.account"), {
            maxLength: 48,
            dir: "ltr",
            upper: true,
            hint: saved && saved.accountKind === kind ? t("marketMoney.accountSaved", { masked: saved.accountMasked }) : kind === "iban" ? t("marketMoney.accountHint") : undefined,
          })}
          {field("swift", t("marketMoney.swift"), { value: v("swift"), maxLength: 14, dir: "ltr", upper: true, hint: t("marketMoney.swiftHint") })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {country("bankCountry", t("marketMoney.bankCountry"), v("bankCountry", defaultCountry))}
          {field("bankCode", t("marketMoney.bankCode"), { value: v("bankCode"), maxLength: 40, dir: "ltr", upper: true, hint: t("marketMoney.bankCodeHint") })}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="pd-address" className="text-sm font-semibold">
            {t("marketMoney.address")}
          </label>
          <textarea
            id="pd-address"
            name="address"
            rows={2}
            maxLength={300}
            defaultValue={v("address")}
            dir="auto"
            autoComplete="street-address"
            className="input min-h-[72px] py-2.5"
            aria-invalid={e.address ? true : undefined}
            aria-describedby={`pd-address-hint${e.address ? " pd-address-error" : ""}`}
          />
          <span id="pd-address-hint" className="text-xs text-muted">
            {t("marketMoney.addressHint")}
          </span>
          <FieldError id="pd-address-error" error={e.address} />
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5 border-t border-line-soft pt-5">
        <label className="flex cursor-pointer items-start gap-2.5 text-[15px]">
          <input type="checkbox" name="confirm" className="mt-1 h-4 w-4 flex-none" aria-invalid={e.confirm ? true : undefined} aria-describedby={e.confirm ? "pd-confirm-error" : undefined} />
          <span>{t("marketMoney.confirm")}</span>
        </label>
        <FieldError id="pd-confirm-error" error={e.confirm} />
      </div>
      <div>
        <SubmitButton pendingText={t("marketMoney.sending")} className="h-12 gap-2">
          <Icon name="send" size={20} />
          {t("marketMoney.send")}
        </SubmitButton>
      </div>
    </form>
  );
}
