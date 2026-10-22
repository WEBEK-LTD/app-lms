"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * 78 Where a visitor came from, for the sign-up's source (lib/milestones):
 * the campaign link's UTM values and `from`, and the other website that sent
 * them (its host name only), as on the first page they opened, and whether
 * they looked at the demo apps. Kept in this page's memory only, never in a
 * cookie or the browser's storage: it lasts while they move between our
 * pages, and is gone when the tab is closed or reloaded.
 */
type Campaign = Partial<Record<(typeof FIELDS)[number], string>>;

const FIELDS = ["utm_source", "utm_medium", "utm_campaign", "from", "ref"] as const;

let first: Campaign | null = null;
let sawDemo = false;

function referrerHost(): string | null {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname;
    return host && host !== window.location.hostname ? host : null;
  } catch {
    return null;
  }
}

/** The first page's values: taken once, by whichever of the two below runs first. */
function landing(): Campaign {
  if (first) return first;
  const params = new URLSearchParams(window.location.search);
  const campaign: Campaign = {};
  for (const field of ["utm_source", "utm_medium", "utm_campaign", "from"] as const) {
    const value = params.get(field)?.trim();
    if (value) campaign[field] = value.slice(0, 100);
  }
  const ref = referrerHost();
  if (ref) campaign.ref = ref;
  first = campaign;
  return campaign;
}

/** In the root layout: notes the first page and the demo pages. */
export function KeepCampaign() {
  const pathname = usePathname();
  useEffect(() => {
    landing();
  }, []);
  useEffect(() => {
    if (/^\/(?:(?:ar|tr)\/)?demo(?:\/|$)/.test(pathname)) sawDemo = true;
  }, [pathname]);
  return null;
}

/** The sign-up form's hidden fields. */
export function CampaignFields() {
  const inputs = useRef<Partial<Record<(typeof FIELDS)[number], HTMLInputElement | null>>>({});
  useEffect(() => {
    const campaign = { ...landing() };
    if (!campaign.from && sawDemo) campaign.from = "demo";
    for (const field of FIELDS) {
      const input = inputs.current[field];
      if (input) input.value = campaign[field] ?? "";
    }
  }, []);
  return (
    <>
      {FIELDS.map((field) => (
        <input
          key={field}
          type="hidden"
          name={`src_${field}`}
          ref={(el) => {
            inputs.current[field] = el;
          }}
        />
      ))}
    </>
  );
}
