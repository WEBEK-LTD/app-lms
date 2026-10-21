"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { browserInEgypt, regionOf, type WhatsAppLines, type WhatsAppRegion } from "@/lib/contact-lines";

const noChange = () => () => {};

function browserRegion(): WhatsAppRegion {
  try {
    return browserInEgypt(Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.languages ?? [navigator.language]) ? "egypt" : "international";
  } catch {
    return "international";
  }
}

/**
 * 72 The region whose WhatsApp number a single button opens: the country
 * the server knew (the account's, or the request's on pages rendered per
 * request), else, on pages built ahead of time, the browser's (Cairo's time
 * zone or an Egyptian language region) once the page has loaded. The
 * international number until then.
 */
export function useWhatsAppRegion(country: string | null | undefined): WhatsAppRegion {
  const browser = useSyncExternalStore(noChange, browserRegion, () => "international" as const);
  return country ? regionOf(country) : browser;
}

/**
 * 72 A link to Yallapp's WhatsApp where only one fits: the number for the
 * visitor's country (see useWhatsAppRegion). `text` may hold `{number}`
 * for the number it opens.
 */
export function WhatsAppLink({
  lines,
  country = null,
  className,
  children,
  text,
  target,
}: {
  lines: WhatsAppLines;
  country?: string | null;
  className?: string;
  children?: ReactNode;
  text?: string;
  target?: "_blank";
}) {
  const line = lines[useWhatsAppRegion(country)];
  return (
    <a
      href={line.url}
      className={className}
      data-whatsapp={line.region}
      {...(target ? { target, rel: "noopener noreferrer" } : {})}
    >
      {children}
      {text ? text.replace("{number}", line.display) : null}
    </a>
  );
}
