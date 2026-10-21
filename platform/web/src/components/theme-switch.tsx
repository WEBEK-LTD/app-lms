"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./icon";
import { THEME_KEY } from "./theme-script";

/**
 * 73 The light/dark switch of Yallapp's own pages (the website, the
 * dashboard, the admin, the sign-in pages). A toggle button, "Dark mode",
 * pressed while the page is dark: the system setting until the visitor
 * presses it, then their choice, which this browser remembers
 * (`localStorage`; components/theme-script.tsx sets it before the page
 * paints on the next visit).
 */

const CHANGED = "yallapp-theme-change";
const SYSTEM = "(prefers-color-scheme: dark)";

function isDark(): boolean {
  const chosen = document.documentElement.getAttribute("data-theme");
  if (chosen === "dark" || chosen === "light") return chosen === "dark";
  return window.matchMedia(SYSTEM).matches;
}

function subscribe(listener: () => void): () => void {
  const media = window.matchMedia(SYSTEM);
  media.addEventListener("change", listener);
  window.addEventListener(CHANGED, listener);
  // Another tab of the site changed it.
  const storage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY) return;
    if (event.newValue === "dark" || event.newValue === "light") document.documentElement.setAttribute("data-theme", event.newValue);
    else document.documentElement.removeAttribute("data-theme");
    listener();
  };
  window.addEventListener("storage", storage);
  return () => {
    media.removeEventListener("change", listener);
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", storage);
  };
}

export function ThemeSwitch({ label, className = "" }: { label: string; className?: string }) {
  // On the server (and until the page is live) it shows as off: the script already painted the right theme.
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // A browser that keeps nothing: the choice lasts for this page.
    }
    window.dispatchEvent(new Event(CHANGED));
  };
  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={label}
      title={label}
      onClick={toggle}
      data-theme-switch=""
      className={`flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-line-button bg-white text-midnight hover:border-midnight ${className}`}
    >
      <Icon name="dark_mode" size={22} filled={dark} />
    </button>
  );
}
