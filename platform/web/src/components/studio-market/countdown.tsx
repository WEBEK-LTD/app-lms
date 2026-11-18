"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { ltr } from "@/lib/studio-market/plans";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 106.12 A flash sale's live countdown ("Ends in 01:59:58", "Ends in 2
 * days, 04:12:09"), ticking once a second whatever the motion settings
 * (only the numbers change). Drawn with dashes until the page runs in the
 * browser, so the server's page and the browser's first one match; at zero
 * the page is asked again, so the prices change back by themselves.
 */
export function Countdown({ endsAt, className = "", size = 16 }: { endsAt: string; className?: string; size?: number }) {
  const t = useDashT();
  const lang = useDashLang();
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  const refreshed = useRef(false);
  const end = Date.parse(endsAt);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  const left = now === null ? null : Math.max(0, end - now);
  useEffect(() => {
    if (left === 0 && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [left, router]);
  let text: string;
  if (left === null) text = t("marketDiscounts.endsIn", { time: ltr("--:--:--", lang) });
  else if (left === 0) text = t("marketDiscounts.saleEnded");
  else {
    const s = Math.floor(left / 1000);
    const days = Math.floor(s / 86_400);
    const time = ltr(`${pad(Math.floor((s % 86_400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`, lang);
    text = days ? t("marketDiscounts.endsInDays", { days, time }) : t("marketDiscounts.endsIn", { time });
  }
  return (
    <span role="timer" aria-live="off" data-countdown={endsAt} className={`inline-flex items-center gap-1 font-bold whitespace-nowrap tabular-nums ${className}`}>
      <Icon name="timer" size={size} />
      <time dateTime={endsAt}>{text}</time>
    </span>
  );
}
