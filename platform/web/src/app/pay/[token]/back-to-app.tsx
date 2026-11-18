"use client";

import { useEffect } from "react";

/**
 * 170 "Back to the app" on a payment the app opened in the phone's browser
 * sheet: its own address brings the app back (`yallapp-<app id>://…`, see
 * lib/payments/app-return.ts). With `auto` (the payment is through) it goes
 * there by itself once the page shows; the button stays for a phone that
 * asks first (Safari's "Open in …?") or didn't go.
 */
export function BackToApp({ href, auto, color, textColor, quiet = false }: { href: string; auto: boolean; color: string; textColor: string; /** Beside the page's own Pay button: outlined. */ quiet?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const timer = window.setTimeout(() => window.location.assign(href), 600);
    return () => window.clearTimeout(timer);
  }, [auto, href]);
  return (
    <a
      href={href}
      data-app-return={href}
      data-app-return-auto={auto ? "" : undefined}
      className="flex h-12 w-full items-center justify-center rounded-xl text-[16px] font-bold no-underline"
      style={quiet ? { border: `2px solid ${color}`, color } : { backgroundColor: color, color: textColor }}
    >
      Back to the app
    </a>
  );
}
