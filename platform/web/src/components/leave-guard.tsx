"use client";

import { useEffect, useRef } from "react";

/**
 * 132.67 Changes that aren't saved yet are never lost by a click: while
 * `dirty`, leaving the page (closing the tab, reloading, a link in the menu)
 * asks first. Links that open elsewhere (a new tab, a download) or the same
 * page with other choices go as they are.
 */
export function useLeaveGuard(dirty: boolean, message: string): void {
  const ref = useRef({ dirty, message });
  useEffect(() => {
    ref.current = { dirty, message };
  }, [dirty, message]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (ref.current.dirty) e.preventDefault();
    };
    const click = (e: MouseEvent) => {
      if (!ref.current.dirty || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      // The same page with other choices (?lang=, a #part) is the page's own business: it asks itself when it needs to.
      if (url.origin === window.location.origin && url.pathname === window.location.pathname) return;
      if (window.confirm(ref.current.message)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("beforeunload", unload);
    // Before Next's own link handling.
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, []);
}
