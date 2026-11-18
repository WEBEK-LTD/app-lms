"use client";

import { useEffect, useRef, useState } from "react";
import { kashierDestination, kashierMessage } from "@/lib/payments/embed";

/** How long Kashier's form may stay silent before the customer is also offered Kashier's own page. */
const LOAD_TIMEOUT_MS = 20_000;

/** After Kashier says it's paid, how long its own redirect may take before the page goes on by itself. */
const AFTER_PAID_MS = 5_000;

/**
 * 153 Kashier's card form inside the payment page: the payment session's own
 * page (`sessionUrl`) in a frame, as Kashier's payment sessions offer. The
 * card is typed in Kashier's frame (the shop and Yallapp never see its
 * number). Kashier tells the page when it's done (`urlRedirection`), and the
 * page goes on to our return address, which reads the payment back from
 * Kashier as before. Only the frame's own messages count. When it stays
 * silent, or the customer closes it, `onTrouble` offers Kashier's own page
 * too (the same session), without taking the form away.
 */
export function KashierCard({ frameUrl, returnUrl, onTrouble }: { frameUrl: string; returnUrl: string; onTrouble: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const trouble = useRef(onTrouble);
  useEffect(() => {
    trouble.current = onTrouble;
  }, [onTrouble]);

  useEffect(() => {
    let heard = false;
    let left = false;
    let afterPaid = 0;
    const leave = (to: string) => {
      if (left) return;
      left = true;
      window.location.assign(to);
    };
    const onMessage = (event: MessageEvent) => {
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      const message = kashierMessage(event.data);
      if (!message) return;
      heard = true;
      if (message.kind === "urlRedirection") leave(kashierDestination(message.redirectUrl, returnUrl));
      else if (message.kind === "paymentSuccess") afterPaid ||= window.setTimeout(() => leave(returnUrl), AFTER_PAID_MS);
      else if (message.kind === "closeIframe") trouble.current();
    };
    window.addEventListener("message", onMessage);
    const timer = window.setTimeout(() => {
      if (!heard) trouble.current();
    }, LOAD_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
      window.clearTimeout(afterPaid);
    };
  }, [returnUrl]);

  return (
    <div className="flex flex-col gap-2">
      {loaded ? null : (
        <p role="status" className="m-0 text-[15px] text-muted">
          Loading the card form…
        </p>
      )}
      <iframe
        ref={frame}
        src={frameUrl}
        title="Kashier card form"
        data-kashier-embedded=""
        onLoad={() => setLoaded(true)}
        className="h-[640px] w-full rounded-xl border border-line bg-white"
      />
    </div>
  );
}
