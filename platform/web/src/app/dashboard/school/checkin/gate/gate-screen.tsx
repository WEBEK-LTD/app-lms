"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDashT } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { QrCode } from "@/components/qr-code";
import { btn } from "@/components/ui";

interface GateCode {
  starts_at: string;
  ends_at: string;
  code: string;
  payload: string;
}

/** How often the screen asks for codes (it holds ten minutes of them). */
const REFRESH_MS = 30_000;

/**
 * 113.2 The gate's screen: the QR code and its six digits, new every 30
 * seconds, by the server's clock. It holds the next ten minutes of codes,
 * so a short loss of the network doesn't stop it; full screen on a tablet
 * or a monitor at the gate.
 */
export function GateScreen({ schoolName }: { schoolName: string }) {
  const t = useDashT();
  const [codes, setCodes] = useState<GateCode[]>([]);
  const [offset, setOffset] = useState(0);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [full, setFull] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/school/gate", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { now: string; codes: GateCode[] };
      setOffset(Date.parse(data.now) - Date.now());
      setCodes(data.codes);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const refresh = setInterval(() => void load(), REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const changed = () => setFull(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", changed);
    return () => {
      clearTimeout(first);
      clearInterval(refresh);
      clearInterval(tick);
      document.removeEventListener("fullscreenchange", changed);
    };
  }, [load]);

  const at = now + offset;
  const current = codes.find((c) => Date.parse(c.starts_at) <= at && at < Date.parse(c.ends_at)) ?? null;
  const seconds = current ? Math.max(1, Math.ceil((Date.parse(current.ends_at) - at) / 1000)) : 0;

  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame.current?.requestFullscreen?.();
  };

  return (
    <div ref={frame} data-gate className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-white p-6 text-center sm:p-10 [&:fullscreen]:justify-center [&:fullscreen]:rounded-none [&:fullscreen]:border-0">
      <p className="m-0 text-xl font-extrabold sm:text-2xl">{schoolName}</p>
      {current ? (
        <>
          <QrCode value={current.payload} label={t("school.gateQr")} size={full ? 420 : 280} />
          <p className="m-0 flex flex-col gap-1">
            <span className="text-sm font-semibold text-muted">{t("school.gateCode")}</span>
            <span data-gate-code dir="ltr" className="font-mono text-5xl font-extrabold tracking-[0.2em] sm:text-6xl">
              {`${current.code.slice(0, 3)} ${current.code.slice(3)}`}
            </span>
          </p>
          <p role="timer" aria-live="off" className="m-0 text-[15px] text-muted">
            {t("school.gateNext", { seconds })}
          </p>
          <p className="m-0 text-[15px] text-ink-4">{t("school.gateScanHint")}</p>
        </>
      ) : (
        <p role="status" className="m-0 text-[15px] text-muted">
          {t("school.gateNoCodes")}
        </p>
      )}
      {offline && current ? (
        <p role="status" className="m-0 rounded-xl bg-peach-soft px-4 py-2 text-sm">
          {t("school.gateOffline")}
        </p>
      ) : null}
      <button type="button" onClick={toggle} className={`${btn.secondary} h-10 px-4 text-sm`}>
        <Icon name={full ? "close" : "crop_free"} size={18} />
        {full ? t("school.exitFullScreen") : t("school.fullScreen")}
      </button>
    </div>
  );
}
