"use client";

import { useActionState, useState } from "react";
import { buyStorageAction, renameMediaAction } from "@/app/actions/media";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

/** 51 A file's name, edited in place. */
export function RenameForm({ id, name }: { id: string; name: string }) {
  const t = useDashT();
  const [state, action] = useActionState(renameMediaAction, initialFormState);
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className={`${btn.ghost} h-8 px-2 text-sm`} aria-label={t("media.renameNamed", { name })}>
        <Icon name="edit" size={18} />
        {t("media.rename")}
      </button>
    );
  }
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-2" key={state.ok ? state.message : "form"}>
      <input type="hidden" name="id" value={id} />
      <Field id={`f-rename-${id}`} label={t("media.name")} name="name" defaultValue={state.values?.name ?? name} error={state.errors?.name} small className="min-w-[200px] flex-1" />
      <SubmitButton className="h-10">{t("media.saveName")}</SubmitButton>
      <button type="button" onClick={() => setEditing(false)} className={`${btn.ghost} h-10 px-3 text-sm`}>
        {t("common.close")}
      </button>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}

export interface PackOption {
  id: string;
  label: string;
  price: string;
  note: string;
  /** 52 "You'll be charged EGP 1,500 (about $30); your bank may convert it.", when the charge isn't in the shown currency. */
  charge: string | null;
}

/** 51 Buying a storage pack by card: the pack, the billing address, then the provider's page. */
export function BuyStorageForm({ appId, options, provider }: { appId: string; options: PackOption[]; provider: string }) {
  const t = useDashT();
  const [state, action] = useActionState(buyStorageAction, initialFormState);
  const [offer, setOffer] = useState(state.values?.offer || options[0]?.id || "");
  const v = state.values ?? {};
  const charge = options.find((o) => o.id === offer)?.charge;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} />
      <input type="hidden" name="appId" value={appId} />
      <input type="hidden" name="offer" value={offer} />
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">{t("media.pack")}</legend>
        {options.map((o) => (
          <label key={o.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${offer === o.id ? "border-midnight bg-ivory" : "border-line"}`}>
            <input type="radio" name="offerChoice" value={o.id} checked={offer === o.id} onChange={() => setOffer(o.id)} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[15px] font-bold">{o.label}</span>
                <span className="text-[15px] font-bold" dir="ltr">
                  {o.price}
                </span>
              </span>
              <span className="text-[13px] text-muted">{o.note}</span>
            </span>
          </label>
        ))}
        <FieldError id="f-offer-error" error={state.errors?.offer} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <Field label={t("license.city")} name="city" autoComplete="address-level2" defaultValue={v.city} error={state.errors?.city} small />
        <Field label={t("license.address")} name="address" autoComplete="street-address" defaultValue={v.address} error={state.errors?.address} small />
      </div>
      {charge ? (
        <p data-charge-line="" className="m-0 flex items-start gap-2 rounded-xl bg-ivory px-4 py-3 text-sm font-semibold text-ink-2">
          {charge}
        </p>
      ) : null}
      <SubmitButton className="h-11" pendingText={t("license.opening")}>
        {t("media.buyStorage")}
      </SubmitButton>
      <span className="text-xs leading-normal text-muted">{t("media.cardOn", { provider })}</span>
    </form>
  );
}
