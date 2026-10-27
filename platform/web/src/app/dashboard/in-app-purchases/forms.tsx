"use client";

import { useActionState, useState } from "react";
import { checkStoresAction, resendPurchaseNoticeAction, saveStoreBillingAction, saveStoreItemAction, saveStorePriceAction, setStoreItemActiveAction, syncStoresNowAction } from "@/app/actions/store-billing";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

/** 100.2 Selling in the app on or off. */
export function StoreBillingForm({ enabled }: { enabled: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveStoreBillingAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <label className="flex items-start gap-3">
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="mt-1 h-4 w-4" aria-describedby="f-inapp-hint" />
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{t("inapp.onLabel")}</span>
          <span id="f-inapp-hint" className="text-sm text-muted">
            {t("inapp.onHint")}
          </span>
        </span>
      </label>
      <div>
        <SubmitButton className="h-10">{t("inapp.save")}</SubmitButton>
      </div>
    </form>
  );
}

/** "Check": asks each store with its key whether Yallapp may manage the app's products. */
export function CheckStoresForm() {
  const t = useDashT();
  const [state, action] = useActionState(checkStoresAction, initialFormState);
  return (
    <form action={action} className="flex flex-col items-start gap-1.5">
      <SubmitButton className="h-9 px-4 text-sm">{t("inapp.check")}</SubmitButton>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}

/** "Update the stores now": makes or changes the waiting products at once (failed ones too). */
export function SyncStoresForm() {
  const t = useDashT();
  const [state, action] = useActionState(syncStoresNowAction, initialFormState);
  return (
    <form action={action} className="flex flex-col items-start gap-1.5">
      <SubmitButton className="h-9 px-4 text-sm">{t("inapp.syncNow")}</SubmitButton>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}

/** A product's own price in the stores; empty: the site's. */
export function StorePriceForm({ productId, ownPrice, sitePrice, label }: { productId: string; ownPrice: string | null; sitePrice: string; label: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveStorePriceAction, initialFormState);
  const id = `f-price-${productId}`;
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="product" value={productId} />
      <label htmlFor={id} className="sr-only">
        {t("inapp.ownPrice")}: {label}
      </label>
      <div className="flex items-center gap-2">
        <input id={id} name="price" inputMode="decimal" defaultValue={ownPrice ?? ""} placeholder={sitePrice} className="input h-9 w-28" aria-describedby={`${id}-hint`} dir="ltr" />
        <SubmitButton className="h-9 px-3 text-sm">{t("inapp.save")}</SubmitButton>
      </div>
      <span id={`${id}-hint`} className="text-xs text-muted">
        {t("inapp.sitePriceHint")}
      </span>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}

/** 100.7 What a listed course or plan holds, for its forms. */
export interface ItemValues {
  kind: "course" | "membership";
  itemId: string;
  title: string;
  price: string;
  currency: string;
  period: "month" | "year" | null;
  courseIds: number[];
}

/**
 * 100.7 Adds a course or membership plan to the app's list, or changes one
 * (`item` given: its kind, ID and period stay).
 */
export function StoreItemForm({ item, currencies, defaultCurrency, formId }: { item?: ItemValues; currencies: readonly string[]; defaultCurrency: string; formId: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveStoreItemAction, initialFormState);
  const [kind, setKind] = useState<"course" | "membership">(item?.kind ?? "course");
  const editing = Boolean(item);
  const id = (name: string) => `${formId}-${name}`;
  return (
    <form action={action} className="flex flex-col gap-4" data-item-form={formId}>
      {editing ? (
        <>
          <input type="hidden" name="kind" value={item!.kind} />
          <input type="hidden" name="item" value={item!.itemId} />
          {item!.period ? <input type="hidden" name="period" value={item!.period} /> : null}
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={id("kind")} className="text-sm font-semibold">
              {t("inapp.fieldKind")}
            </label>
            <select id={id("kind")} name="kind" value={kind} onChange={(e) => setKind(e.target.value === "membership" ? "membership" : "course")} className="input">
              <option value="course">{t("inapp.kindCourse")}</option>
              <option value="membership">{t("inapp.kindPlan")}</option>
            </select>
          </div>
          <Field id={id("item")} name="item" label={t("inapp.fieldId")} hint={t("inapp.fieldIdHint")} defaultValue={state.values?.item ?? ""} required maxLength={64} dir="ltr" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Field id={id("title")} name="title" label={t("inapp.fieldTitle")} defaultValue={state.values?.title ?? item?.title ?? ""} required maxLength={200} dir="auto" />
        <Field id={id("price")} name="price" label={t("inapp.fieldPrice")} defaultValue={state.values?.price ?? item?.price ?? ""} required inputMode="decimal" dir="ltr" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={id("currency")} className="text-sm font-semibold">
            {t("inapp.fieldCurrency")}
          </label>
          <select id={id("currency")} name="currency" defaultValue={state.values?.currency || item?.currency || defaultCurrency} className="input">
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      {kind === "membership" ? (
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          {editing ? (
            <p className="m-0 text-sm text-muted">{t("inapp.periodFixed")}</p>
          ) : (
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={id("period")} className="text-sm font-semibold">
                {t("inapp.fieldPeriod")}
              </label>
              <select id={id("period")} name="period" defaultValue={state.values?.period || "month"} className="input">
                <option value="month">{t("inapp.periodMonth")}</option>
                <option value="year">{t("inapp.periodYear")}</option>
              </select>
            </div>
          )}
          <Field id={id("courses")} name="courses" label={t("inapp.fieldCourses")} hint={t("inapp.fieldCoursesHint")} defaultValue={state.values?.courses ?? item?.courseIds.join(", ") ?? ""} required dir="ltr" />
        </div>
      ) : null}
      <FormMessage message={state.message} ok={state.ok} />
      <div>
        <SubmitButton className="h-10">{editing ? t("inapp.save") : t("inapp.add")}</SubmitButton>
      </div>
    </form>
  );
}

/** 100.7 Stops selling a listed course or plan (or a school's course), or sells it again. */
export function StoreItemActiveForm({ kind, itemId, active, label }: { kind: "course" | "membership"; itemId: string; active: boolean; label: string }) {
  const t = useDashT();
  const [state, action] = useActionState(setStoreItemActiveAction, initialFormState);
  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="item" value={itemId} />
      <input type="hidden" name="active" value={active ? "0" : "1"} />
      <SubmitButton className="h-9 px-3 text-sm" variant="secondary">
        {active ? t("inapp.stop") : t("inapp.sellAgain")}
        <span className="sr-only">: {label}</span>
      </SubmitButton>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}

/** 100.7 "Send again" for a purchase notice your API didn't take. */
export function ResendNoticeForm({ id }: { id: string }) {
  const t = useDashT();
  const [state, action] = useActionState(resendPurchaseNoticeAction, initialFormState);
  return (
    <form action={action} className="flex flex-col items-start gap-1.5">
      <input type="hidden" name="id" value={id} />
      <SubmitButton className="h-8 px-3 text-sm">{t("signin.sendAgain")}</SubmitButton>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}
