"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { PhoneFrame } from "@/components/device-frame";
import { useOptionalDashT } from "@/components/dashboard-i18n";
import { fontsOfPage, useStudioFonts } from "@/components/studio/fonts";
import { StudioView } from "@/components/studio/view";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { CoverView } from "@/lib/studio-market/catalog";

/**
 * 106 A template's page in a phone, drawn as the app draws it (Studio's
 * canvas, components/studio/view.tsx): the market's cards, a template's
 * pictures and its demo are these drawings, never screenshots kept apart,
 * so they always show the template as it is. The samples a list shows and
 * the canvas's words are given once for the page (MarketPhones).
 */

/**
 * Drawn in the browser only: a page's countdowns and greetings follow the
 * clock, which the server's drawing wouldn't match.
 */
const noSubscription = () => () => {};
function useMounted(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

/** The width a Studio page is drawn at before it is scaled into the phone. */
const SCREEN_WIDTH = 360;

type Words = Parameters<typeof StudioView>[0]["words"];

interface PhoneContext {
  pickable: Pickable;
  words: Words | null;
}

const NO_DATA: Pickable = { items: {}, categories: {} };
const Context = createContext<PhoneContext>({ pickable: NO_DATA, words: null });

/** The samples the lists show (lib/studio/sample-entries.ts), or an app's own entries, for every phone below. */
export function MarketPhones({ pickable, words, children }: { pickable: Pickable; words?: Words; children: ReactNode }) {
  return <Context.Provider value={{ pickable, words: words ?? null }}>{children}</Context.Provider>;
}

function useWords(): Words {
  const fromPage = useContext(Context).words;
  const t = useOptionalDashT();
  if (fromPage) return fromPage;
  if (t) {
    return {
      price: t("studio.price"),
      addPicture: t("studio.addPicture"),
      addVideo: t("studio.addVideo"),
      send: t("studio.send"),
      search: t("studio.search"),
      days: t("studio.days"),
      hours: t("studio.hours"),
      minutes: t("studio.minutes"),
      seconds: t("studio.seconds"),
      copy: t("studio.copyCode"),
    };
  }
  // The admin is in English.
  return { price: "Price", addPicture: "Add a picture", addVideo: "Add a video", send: "Send", search: "Search", days: "Days", hours: "Hours", minutes: "Min", seconds: "Sec", copy: "Copy" }; // i18n-ok
}

/** The page in a phone `width` wide; `dark` draws its dark look. The phone's screen is scrolled to the page's top. */
export function TemplatePhone({ view, width, dark = false, lang, className = "", scroll = false }: { view: CoverView | null; width: number; dark?: boolean; lang?: string; className?: string; scroll?: boolean }) {
  const { pickable } = useContext(Context);
  const words = useWords();
  const mounted = useMounted();
  useStudioFonts(view ? fontsOfPage(view.page.body, view.look.font) : []);
  const bezel = Math.min(10, Math.max(3, width * 0.026));
  const inner = width - bezel * 2;
  const scale = inner / SCREEN_WIDTH;
  return (
    <PhoneFrame aria-hidden="true" className={`mk-phone flex-none ${className}`} style={{ width }} screenClassName={`aspect-[1080/2340] ${dark ? "bg-[#14121F]" : "bg-[#FBF8F2]"}`}>
      {view && mounted ? (
        <div dir="ltr" className={scroll ? "absolute inset-0 overflow-y-auto overflow-x-hidden" : "absolute inset-0 overflow-hidden"}>
          {/* Scrolled (the demo): zoomed, so the screen scrolls the page's real height; else scaled, as Studio's home draws a project. */}
          <div style={scroll ? { width: SCREEN_WIDTH, minHeight: (inner * (2340 / 1080)) / scale, zoom: scale } : { width: SCREEN_WIDTH, minHeight: (inner * (2340 / 1080)) / scale, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
            <StudioView page={view.page} lang={(lang as CoverView["lang"]) ?? view.lang} defaultLang={view.defaultLang} dark={dark} look={view.look} pickable={pickable} words={words} />
          </div>
        </div>
      ) : null}
    </PhoneFrame>
  );
}

/** A page drawn small without a phone around it: a template's thumbnails. */
export function PageThumb({ view, width, height, dark = false, lang }: { view: CoverView; width: number; height: number; dark?: boolean; lang?: string }) {
  const { pickable } = useContext(Context);
  const words = useWords();
  const mounted = useMounted();
  const scale = width / SCREEN_WIDTH;
  return (
    <span aria-hidden="true" dir="ltr" className={`relative block overflow-hidden ${dark ? "bg-[#14121F]" : "bg-[#FBF8F2]"}`} style={{ width, height }}>
      {mounted ? (
        <span className="block" style={{ width: SCREEN_WIDTH, minHeight: height / scale, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
          <StudioView page={view.page} lang={(lang as CoverView["lang"]) ?? view.lang} defaultLang={view.defaultLang} dark={dark} look={view.look} pickable={pickable} words={words} />
        </span>
      ) : null}
    </span>
  );
}
