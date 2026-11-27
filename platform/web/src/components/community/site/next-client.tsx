"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/** 232–234 The few pieces of the new pages that run in the browser. */

/** Share: copy the post's address. */
export function CopyLink({ url, label, copied }: { url: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="cm-act"
      onClick={() => {
        void navigator.clipboard?.writeText(url).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        });
      }}
    >
      <span className="ms" aria-hidden="true">{done ? "check" : "share"}</span>
      <span aria-live="polite">{done ? copied : label}</span>
    </button>
  );
}

/** A time shown in the viewer's own time zone; the server (which can't know it) renders UTC. */
const noop = () => () => undefined;
export function LocalTime({ at, lang, withDate = true }: { at: string; lang: string; withDate?: boolean }) {
  const inBrowser = useSyncExternalStore(noop, () => true, () => false);
  const locale = lang === "ar" ? "ar-EG-u-nu-latn" : lang;
  const text = new Date(at).toLocaleString(locale, { ...(withDate ? { dateStyle: "medium" } : {}), timeStyle: "short", timeZone: inBrowser ? undefined : "UTC" });
  return <time dateTime={at} suppressHydrationWarning>{inBrowser ? text : `${text} UTC`}</time>;
}

/** Fetch the page again every few seconds while it is visible (an inbox, a chat, a live's comments, a pending payment). */
export function Poll({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

/** Keep a chat scrolled to its newest message. */
export function ScrollEnd({ dep }: { dep: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  // A block body: scrollIntoView returns a promise in newer browsers, and an effect may only return its cleanup.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [dep]);
  return <span ref={ref} aria-hidden="true" />;
}
