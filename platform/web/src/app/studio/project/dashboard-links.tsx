"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { studioPathFor } from "@/lib/studio/section";

/**
 * The dashboard's pages shown in a Studio project link to `/dashboard/…`
 * (the Plan page's `#renew`, an upgrade's `#change-plan`). The dashboard
 * would send them on to the same page in Studio's frame, but the browser
 * never sends a link's `#part`, so the page would open at its top: a click
 * on such a link goes straight to Studio's page here, `#part` and all.
 */
export function StudioDashboardLinks() {
  const router = useRouter();
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || !/^\/(?:ar\/|tr\/)?dashboard(\/|$)/.test(url.pathname)) return;
      const target = studioPathFor(`${url.pathname}${url.search}`);
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      router.push(`${target}${url.hash}`);
    };
    // Before Next's own link handling.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);
  return null;
}
