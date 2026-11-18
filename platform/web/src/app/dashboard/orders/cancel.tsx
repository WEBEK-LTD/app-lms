"use client";

import { useId, useRef } from "react";
import { setOrderStatusAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { useDashT } from "@/components/dashboard-i18n";
import { kit } from "@/components/studio-page/classes";

/**
 * 175 Cancel order asks first. A paid order offers the owner's two choices,
 * every time: cancel and refund what's left (through the order's payment
 * gateway, or, when it can't refund by itself, the order shows Needs a
 * refund) or cancel without a refund. An unpaid one only asks to confirm.
 * Either way the units go back in stock and the customer is told.
 */
export function CancelOrderButton({ id, number, refund, byGateway }: { id: number; number: string; refund: string | null; byGateway: boolean }) {
  const t = useDashT();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = `${useId()}-cancel`;
  return (
    <>
      <button type="button" aria-haspopup="dialog" className={`${kit.ghost} h-10 px-4`} onClick={() => dialog.current?.showModal()} data-cancel-order={id}>
        {t("orders.cancelOrder")}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[calc(100%-32px)] max-w-[460px] rounded-[20px] border border-(--sp-line) bg-(--sp-surface) p-0 text-(--sp-ink) shadow-[0_24px_60px_rgba(14,13,36,0.3)] backdrop:bg-[#0e0d24]/45"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <form action={setOrderStatusAction} className="flex flex-col gap-4 p-5 sm:p-6">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="cancelled" />
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-bg text-danger">
              <Icon name="cancel" size={22} />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id={titleId} className="m-0 text-lg leading-snug font-bold">
                {t("orders.cancelTitle", { number })}
              </h2>
              <p className="m-0 text-sm leading-relaxed text-(--sp-muted)">{refund ? t("orders.cancelPaidText") : t("orders.cancelText")}</p>
            </div>
          </div>
          {refund ? (
            <div className="flex flex-col gap-2">
              <SubmitButton name="refund" value="yes" pendingFor={{ name: "refund", value: "yes" }} className="h-11 w-full justify-center px-4 text-sm">
                <Icon name="undo" size={18} />
                {t("orders.cancelRefund", { amount: refund })}
              </SubmitButton>
              <p className="m-0 text-xs leading-relaxed text-(--sp-muted)">{byGateway ? t("orders.cancelRefundGateway") : t("orders.cancelRefundManual")}</p>
              <SubmitButton name="refund" value="no" pendingFor={{ name: "refund", value: "no" }} variant="secondary" className="h-11 w-full justify-center px-4 text-sm">
                {t("orders.cancelNoRefund")}
              </SubmitButton>
              <p className="m-0 text-xs leading-relaxed text-(--sp-muted)">{t("orders.cancelNoRefundHint")}</p>
            </div>
          ) : (
            <SubmitButton className="h-11 w-full justify-center px-4 text-sm">{t("orders.cancelConfirm")}</SubmitButton>
          )}
          <button type="button" className={`${kit.quiet} h-11 w-full`} onClick={() => dialog.current?.close()}>
            {t("orders.cancelKeep")}
          </button>
        </form>
      </dialog>
    </>
  );
}
