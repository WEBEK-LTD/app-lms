"use client";

import { useEffect, useRef, useState } from "react";

/** The few parts of Stripe.js this page uses (https://docs.stripe.com/js/embedded_checkout). */
interface EmbeddedCheckout {
  mount: (element: HTMLElement) => void;
  destroy: () => void;
}
interface StripeJs {
  initEmbeddedCheckout: (options: { fetchClientSecret: () => Promise<string> }) => Promise<EmbeddedCheckout>;
}
type StripeFactory = (publishableKey: string) => StripeJs;

declare global {
  interface Window {
    Stripe?: StripeFactory;
  }
}

/** How long Stripe's form may take to appear before the customer is offered Stripe's own page. */
const LOAD_TIMEOUT_MS = 20_000;

let loading: Promise<StripeFactory> | null = null;

/** Loads Stripe.js once (from Stripe, never bundled: Stripe asks for it to be loaded from js.stripe.com). */
function loadStripe(src: string): Promise<StripeFactory> {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (loading) return loading;
  loading = new Promise<StripeFactory>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => (window.Stripe ? resolve(window.Stripe) : reject(new Error("Stripe.js didn't load.")));
    script.onerror = () => reject(new Error("Stripe.js didn't load."));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

/**
 * 144 Stripe's card form inside the payment page (Embedded Checkout): the
 * customer types the card here, in Stripe's own frame (the shop and Yallapp
 * never see its number), and Stripe sends them to the order's page once it's
 * paid. When it can't load, `onFailed` offers Stripe's own page instead.
 */
export function StripeCard({ clientSecret, publishableKey, jsUrl, onFailed }: { clientSecret: string; publishableKey: string; jsUrl: string; onFailed: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const failed = useRef(onFailed);
  useEffect(() => {
    failed.current = onFailed;
  }, [onFailed]);

  useEffect(() => {
    let cancelled = false;
    let checkout: EmbeddedCheckout | null = null;
    const timer = window.setTimeout(() => {
      if (!checkout && !cancelled) failed.current();
    }, LOAD_TIMEOUT_MS);
    loadStripe(jsUrl)
      .then((Stripe) => Stripe(publishableKey).initEmbeddedCheckout({ fetchClientSecret: async () => clientSecret }))
      .then((started) => {
        if (cancelled || !box.current) {
          started.destroy();
          return;
        }
        checkout = started;
        started.mount(box.current);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) failed.current();
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      // Stripe allows one form on a page at a time.
      checkout?.destroy();
    };
  }, [clientSecret, publishableKey, jsUrl]);

  return (
    <div className="flex flex-col gap-2">
      {ready ? null : (
        <p role="status" className="m-0 text-[15px] text-muted">
          Loading the card form…
        </p>
      )}
      <div ref={box} data-stripe-embedded="" className="min-h-24" />
    </div>
  );
}
