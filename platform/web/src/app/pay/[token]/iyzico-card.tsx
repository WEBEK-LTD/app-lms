"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    /** iyzico's Checkout Form script starts only while this is unset (its `checkoutFormContent`). */
    iyziInit?: unknown;
  }
}

/** How long iyzico's form may take to appear before the customer is offered iyzico's own page. */
const LOAD_TIMEOUT_MS = 20_000;

/** Elements that are iyzico's script and styles, not its form yet. */
const NOT_SHOWN = new Set(["SCRIPT", "LINK", "STYLE"]);

/**
 * 153 iyzico's Checkout Form inside the payment page, in its "responsive"
 * look: the content iyzico gives with the payment (`checkoutFormContent`, a
 * script that loads iyzico's form into the div `iyzipay-checkout-form`) runs
 * here, as iyzico's own plugins put it in the shop's page. The card is typed
 * in iyzico's form (the shop and Yallapp never see its number), and iyzico
 * then posts its token to our callback, as from its own page. When the form
 * doesn't appear (a blocked script), `onFailed` offers iyzico's own page:
 * the same payment.
 */
export function IyzicoCard({ formContent, onFailed }: { formContent: string; onFailed: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const failed = useRef(onFailed);
  useEffect(() => {
    failed.current = onFailed;
  }, [onFailed]);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    let settled = false;
    const earlier = new Set(Array.from(document.scripts));
    const fail = () => {
      if (settled) return;
      settled = true;
      failed.current();
    };
    // Shown once iyzico's script has put its form in the div.
    const observer = new MutationObserver(() => {
      if (settled || !Array.from(element.children).some((child) => !NOT_SHOWN.has(child.tagName))) return;
      settled = true;
      setReady(true);
    });
    observer.observe(element, { childList: true, subtree: true });
    // A script of iyzico's that doesn't load (blocked, offline): iyzico's page at once.
    const onError = (event: Event) => {
      if (event.target instanceof HTMLScriptElement && !earlier.has(event.target)) fail();
    };
    document.addEventListener("error", onError, true);
    const timer = window.setTimeout(fail, LOAD_TIMEOUT_MS);
    // Its scripts run as they're added: a fragment's do, unlike innerHTML's.
    window.iyziInit = undefined;
    try {
      element.replaceChildren(document.createRange().createContextualFragment(formContent));
    } catch {
      fail();
    }
    return () => {
      settled = true;
      observer.disconnect();
      document.removeEventListener("error", onError, true);
      window.clearTimeout(timer);
      element.replaceChildren();
      window.iyziInit = undefined;
    };
  }, [formContent]);

  return (
    <div className="flex flex-col gap-2">
      {ready ? null : (
        <p role="status" className="m-0 text-[15px] text-muted">
          Loading the card form…
        </p>
      )}
      <div className="min-h-24" data-iyzico-embedded="">
        {/* iyzico's script finds its place by this id, and its look by this class alone. */}
        <div ref={box} id="iyzipay-checkout-form" className="responsive" />
      </div>
    </div>
  );
}
