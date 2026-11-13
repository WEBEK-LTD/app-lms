"use client";

/* eslint-disable @next/next/no-img-element -- the demo's own screenshot, in the approved phone frame. */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icon";
import { useSiteDark } from "@/components/theme-switch";
import { LIVE_PHONE, liveStart, previewHasPages, type FetchedResource } from "@/lib/demo/live";

/** How long the live app may take before the screenshot stays (and "Try it live" comes back). */
const GIVE_UP_MS = 45_000;
/** After its pages arrive, the time the app takes to draw them. */
const DRAWN_MS = 700;

/** What the browser says about itself does not change while the page is open. */
const noChange = () => () => undefined;

/** How the live app starts on this browser (lib/demo/live.ts). */
function readDevice(): "view" | "tap" {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return liveStart({
    desktop: window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)").matches,
    saveData: Boolean(connection?.saveData) || /2g/.test(connection?.effectiveType ?? ""),
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
}

export interface LiveApp {
  /** The app preview with the demo's preview link and language (lib/preview/token.ts); the theme is added here. */
  src: string;
  appId: string;
  /** The frame's name for screen readers. */
  title: string;
}

/**
 * 128.9 The phone on /start/<demo>: the demo's screenshot first, then the
 * real demo app running in it (the app preview, public/preview-app, as the
 * dashboard's Preview shows an app), light or dark as the page is. On a
 * desktop it loads by itself once the phone is in view and the page has
 * loaded; on a phone, with Save-Data or with reduced motion, when "Try it
 * live" is tapped. The screenshot stays until the app has its pages, so the
 * phone is never blank, and stays for good when the app doesn't come (no
 * preview link: the demo apps aren't made yet). The app is drawn at a
 * phone's size (360 × 780) and scaled to the frame.
 */
export function LivePhone({ shot, live, labels, className }: { shot: { src: string; alt: string }; live: LiveApp | null; labels: { tryLive: string; opening: string }; className: string }) {
  const dark = useSiteDark();
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const device = useSyncExternalStore(noChange, readDevice, () => null);
  // Started: the app is loading or shown. Ready: the theme whose app has its pages. Gave up: it didn't come in time.
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState<"light" | "dark" | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [scale, setScale] = useState(0);
  const theme = dark ? "dark" : "light";
  const mode = device === null ? null : gaveUp ? "tap" : device;
  // A new theme loads the app again in it; the screenshot shows meanwhile.
  const phase: "shot" | "loading" | "live" = !started ? "shot" : ready === theme ? "live" : "loading";

  // The demo opens on its home, as its screenshot, not on its sign-in screen: as if "Not now" was pressed
  // (the app preview keeps each app's settings apart, under its prefix: mobile/lib/core/preview/preview_start.dart).
  useEffect(() => {
    if (!live) return;
    try {
      localStorage.setItem(`yallapp.preview.${live.appId}.settings.guest_mode`, "true");
    } catch {
      // A browser that keeps nothing: the app opens on its sign-in screen, with "Not now".
    }
  }, [live]);

  // On a desktop: once the phone is in view and the page has loaded.
  useEffect(() => {
    const el = box.current;
    if (!live || mode !== "view" || !el) return;
    let seen = false;
    let loaded = document.readyState === "complete";
    const go = () => {
      if (seen && loaded) setStarted(true);
    };
    const onLoad = () => {
      loaded = true;
      go();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        seen = true;
        observer.disconnect();
        go();
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    window.addEventListener("load", onLoad, { once: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("load", onLoad);
    };
  }, [live, mode]);

  // The app at a phone's size, scaled to the frame's width.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale((entry?.contentRect.width ?? 0) / LIVE_PHONE.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Ready once the app has its pages (read from the frame: the preview is on this origin).
  useEffect(() => {
    if (phase !== "loading" || !live) return;
    const since = Date.now();
    let drawn: number | null = null;
    const timer = window.setInterval(() => {
      const win = frame.current?.contentWindow;
      let has = false;
      try {
        has = Boolean(win && previewHasPages(win.performance.getEntriesByType("resource") as unknown as FetchedResource[], live.appId));
      } catch {
        has = false;
      }
      if (has && drawn === null) drawn = Date.now() + DRAWN_MS;
      if (drawn !== null && Date.now() >= drawn) {
        window.clearInterval(timer);
        setReady(theme);
      } else if (Date.now() - since > GIVE_UP_MS) {
        window.clearInterval(timer);
        setGaveUp(true);
        setStarted(false);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase, live, theme]);

  // The app takes the keyboard as it starts; it gets it only once the visitor goes into it (a press, or Tab).
  const framed = Boolean(live) && phase !== "shot" && scale > 0;
  useEffect(() => {
    const el = frame.current;
    if (!framed || !el) return;
    let entered = false;
    const onPress = () => (entered = true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab") entered = true;
    };
    const onBlur = () =>
      queueMicrotask(() => {
        if (!entered && document.activeElement === el) el.blur();
      });
    const watch = () => {
      try {
        el.contentWindow?.addEventListener("pointerdown", onPress, true);
      } catch {
        // Not on this origin: its presses aren't seen.
      }
    };
    watch();
    el.addEventListener("load", watch);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", onBlur);
    return () => {
      el.removeEventListener("load", watch);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [framed, theme]);

  const showing = phase === "live";
  return (
    <div className={`relative shrink-0 overflow-hidden border-solid border-[#0E0D24] bg-[#0E0D24] ${className}`} data-live-phone={phase}>
      <div ref={box} className="relative w-full overflow-hidden" style={{ aspectRatio: `${LIVE_PHONE.width} / ${LIVE_PHONE.height}` }}>
        <img src={shot.src} alt={shot.alt} aria-hidden={showing || undefined} className="absolute inset-0 block h-full w-full object-cover object-top" />
        {live && framed ? (
          <iframe
            ref={frame}
            key={theme}
            src={`${live.src}&theme=${theme}`}
            title={live.title}
            referrerPolicy="no-referrer"
            data-live-frame={theme}
            tabIndex={showing ? 0 : -1}
            aria-hidden={showing ? undefined : true}
            className={`absolute top-0 left-0 block border-0 bg-transparent motion-safe:transition-opacity motion-safe:duration-500 ${showing ? "opacity-100" : "pointer-events-none opacity-0"}`}
            style={{ width: LIVE_PHONE.width, height: LIVE_PHONE.height, transform: `scale(${scale})`, transformOrigin: "0 0" }}
          />
        ) : null}
        {live && mode === "tap" && phase === "shot" ? (
          <button
            type="button"
            onClick={() => setStarted(true)}
            data-live-try=""
            className="absolute inset-x-0 bottom-3 mx-auto flex h-10 w-max max-w-[calc(100%-16px)] cursor-pointer items-center gap-1.5 rounded-full border-0 bg-[#0E0D24]/85 ps-2.5 pe-3.5 font-[inherit] text-[13px] font-bold text-white shadow-lg backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Icon name="play_arrow" size={20} filled />
            <span className="truncate">{labels.tryLive}</span>
          </button>
        ) : null}
        {phase === "loading" ? (
          <span role="status" className="absolute inset-x-0 bottom-3 mx-auto flex h-9 w-max max-w-[calc(100%-16px)] items-center gap-2 rounded-full bg-[#0E0D24]/85 px-3.5 text-[13px] font-bold text-white shadow-lg backdrop-blur">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-[#E6C26E] motion-safe:animate-pulse" />
            <span className="truncate">{labels.opening}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
