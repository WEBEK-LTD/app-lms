"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * 132.3 A `<details>` menu on Studio's bar (the account's) closes when a
 * page opens, on Esc and on a click beside it: the bar stays on screen
 * from page to page.
 */
export function CloseOnNavigate({ selector }: { selector: string }) {
  const path = usePathname();
  useEffect(() => {
    for (const el of document.querySelectorAll<HTMLDetailsElement>(selector)) el.open = false;
  }, [path, selector]);
  useEffect(() => {
    const close = (event: MouseEvent | KeyboardEvent) => {
      for (const el of document.querySelectorAll<HTMLDetailsElement>(selector)) {
        if (!el.open) continue;
        if (event instanceof KeyboardEvent ? event.key === "Escape" : !el.contains(event.target as Node)) el.open = false;
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, [selector]);
  return null;
}
