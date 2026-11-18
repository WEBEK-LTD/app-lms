"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PayWords } from "@/lib/catalog/pay-words";

/**
 * 188 Stripe's PaymentSheet in the app: inside the app's own web view the
 * app gives the page a `YallappPay` channel. When the buyer pays with
 * Stripe, the page asks the app to take the payment
 * (`{"type":"stripe_sheet"}`); the app shows Stripe's native sheet (card,
 * Apple Pay, Google Pay), asks the platform for the PaymentIntent with the
 * payment's token, then reads the payment's status and, once it's paid,
 * closes the page as when it reached the order received page. Anything else
 * comes back to `window.yallappReceive` as
 * `{"type":"stripe_sheet","result":"canceled" | "failed" | "pending" | "unavailable"}`.
 * In a browser (no channel), and in apps without it, Stripe's own form
 * shows in the page as before.
 */

declare global {
  interface Window {
    YallappPay?: { postMessage: (text: string) => void };
    yallappReceive?: (text: string) => void;
  }
}

export const SHEET_MESSAGE = "stripe_sheet";

const never = () => () => {};

/** Whether the app's PaymentSheet can take the payment here (false on the server and in a browser). */
export function useAppSheet(): boolean {
  return useSyncExternalStore(
    never,
    () => typeof window.YallappPay?.postMessage === "function",
    () => false,
  );
}

const fill = (text: string, values: Record<string, string>) => text.replace(/\{([a-z]+)\}/g, (all, name: string) => values[name] ?? all);

export function AppSheet({
  token,
  total,
  color,
  textColor,
  words: w,
  onUnavailable,
}: {
  token: string;
  total: string;
  color: string;
  textColor: string;
  words: PayWords;
  /** The app can't take it after all: Stripe's form in the page. */
  onUnavailable: () => void;
}) {
  const [phase, setPhase] = useState<"opening" | "canceled" | "failed">("opening");
  const router = useRouter();
  const unavailable = useRef(onUnavailable);
  useEffect(() => {
    unavailable.current = onUnavailable;
  }, [onUnavailable]);
  const ask = useCallback(() => {
    setPhase("opening");
    window.YallappPay?.postMessage(JSON.stringify({ type: SHEET_MESSAGE }));
  }, []);

  useEffect(() => {
    const before = window.yallappReceive;
    window.yallappReceive = (text: string) => {
      let message: { type?: unknown; result?: unknown } | null = null;
      try {
        message = JSON.parse(text) as { type?: unknown; result?: unknown };
      } catch {
        message = null;
      }
      if (!message || message.type !== SHEET_MESSAGE) {
        before?.(text);
        return;
      }
      if (message.result === "canceled") setPhase("canceled");
      else if (message.result === "failed") setPhase("failed");
      else if (message.result === "unavailable") unavailable.current();
      else if (message.result === "pending") router.replace(`/pay/${encodeURIComponent(token)}?payment=pending`);
    };
    window.YallappPay?.postMessage(JSON.stringify({ type: SHEET_MESSAGE }));
    return () => {
      window.yallappReceive = before;
    };
  }, [token, router]);

  return (
    <div className="flex flex-col gap-3" data-pay-step="app-sheet">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[18px] font-bold">{w.sheetTitle}</h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{fill(w.sheetIntro, { total })}</p>
      </div>
      {phase === "opening" ? (
        <p role="status" className="m-0 text-[15px] text-muted">
          {w.sheetOpening}
        </p>
      ) : (
        <>
          <p role="alert" className={`m-0 rounded-xl px-4 py-3 text-[15px] ${phase === "failed" ? "bg-danger-bg font-semibold text-danger" : "bg-sand"}`}>
            {phase === "failed" ? w.payFailed : w.sheetCanceled}
          </p>
          <button type="button" onClick={ask} className="h-12 w-full cursor-pointer rounded-xl border-0 text-[16px] font-bold" style={{ backgroundColor: color, color: textColor }}>
            {fill(w.sheetPay, { total })}
          </button>
        </>
      )}
    </div>
  );
}
