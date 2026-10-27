"use client";

import { useActionState } from "react";
import { checkStoresAction, saveStoreBillingAction, saveStorePriceAction, syncStoresNowAction } from "@/app/actions/store-billing";
import { FormMessage, SubmitButton } from "@/components/form";
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
