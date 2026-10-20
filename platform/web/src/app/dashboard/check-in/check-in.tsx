"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { checkInAction, type CheckInState } from "@/app/actions/events";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import type { CheckInOutcome } from "@/lib/events/check-in";
import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import { formatDate } from "@/i18n/format";

/** The parts of the browser's BarcodeDetector this page uses (not in TypeScript's DOM types yet). */
interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type DetectorClass = { new (options: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> };

function detectorClass(): DetectorClass | null {
  return typeof window !== "undefined" && "BarcodeDetector" in window ? (window as unknown as { BarcodeDetector: DetectorClass }).BarcodeDetector : null;
}

const TONE: Record<CheckInOutcome, "ok" | "stop" | "warn"> = {
  admitted: "ok",
  used: "stop",
  cancelled: "stop",
  not_paid: "stop",
  forged: "stop",
  other_event: "warn",
  not_found: "warn",
  not_a_code: "warn",
};

function Result({ state, timeZone }: { state: CheckInState; timeZone: string }) {
  const tr = useDashT();
  const lang = useDashLang();
  const answer = state.answer;
  if (!answer) return null;
  const t = answer.ticket;
  const usedAt = t?.usedAt ? new Date(t.usedAt) : null;
  const headline: Record<CheckInOutcome, string> = {
    admitted: tr("events.admitted"),
    used: usedAt
      ? tr("events.usedAt", {
          time: formatDate(lang, usedAt, { hour: "2-digit", minute: "2-digit", timeZone }),
          date: formatDate(lang, usedAt, { day: "numeric", month: "short", timeZone }),
        })
      : tr("events.usedTicket"),
    cancelled: tr("events.cancelledTicket"),
    not_paid: tr("events.notPaid"),
    forged: tr("events.forged"),
    other_event: t ? tr("events.otherEventNamed", { event: t.eventTitle }) : tr("events.otherEvent"),
    not_found: tr("events.notFound"),
    not_a_code: tr("events.notACode"),
  };
  const tone = TONE[answer.outcome];
  const colors = tone === "ok" ? "bg-success-bg text-success" : tone === "stop" ? "bg-danger-bg text-danger" : "bg-warn-bg text-warn";
  return (
    <div role="status" aria-live="polite" className={`flex flex-col gap-2 rounded-2xl px-5 py-4 ${colors}`}>
      <p className="m-0 flex items-center gap-2 text-[20px] font-extrabold leading-tight">
        <Icon name={tone === "ok" ? "check_circle" : tone === "stop" ? "block" : "warning"} size={28} filled />
        {headline[answer.outcome]}
      </p>
      {t ? (
        <p className="m-0 text-[16px] text-ink-2">
          <b>{t.holderName}</b> · {t.typeName} · {t.eventTitle}
          <span className="block font-mono text-[14px] text-ink-4" dir="ltr">
            {t.code}
          </span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * 28 Check-in at the door: type a ticket's code, or scan its QR code with the
 * device's camera where the browser can read QR codes (BarcodeDetector,
 * like Chrome on Android); typing always works.
 */
export function CheckIn({ events, timeZone }: { events: { id: number; label: string }[]; timeZone: string }) {
  const t = useDashT();
  const [state, action, pending] = useActionState(checkInAction, {});
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const last = useRef<{ value: string; at: number } | null>(null);
  const [canScan, setCanScan] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    const Detector = detectorClass();
    if (!Detector) return;
    // Browsers without the list of formats are asked to read QR codes anyway.
    Promise.resolve(Detector.getSupportedFormats ? Detector.getSupportedFormats() : ["qr_code"])
      .then((formats) => setCanScan(formats.includes("qr_code")))
      .catch(() => setCanScan(false));
  }, []);

  // A new answer: ready for the next ticket.
  useEffect(() => {
    if (!state.at || !input.current) return;
    input.current.value = "";
    if (!scanning) input.current.focus();
  }, [state.at, scanning]);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!scanning) return;
    const Detector = detectorClass();
    if (!Detector || !video.current) return;
    const detector = new Detector({ formats: ["qr_code"] });
    let cancelled = false;
    const tick = async () => {
      if (cancelled || !video.current) return;
      try {
        if (video.current.readyState >= 2) {
          const found = (await detector.detect(video.current))[0]?.rawValue;
          const now = Date.now();
          // The same QR code stays in view for a moment: send it once.
          if (found && !(last.current && last.current.value === found && now - last.current.at < 4000)) {
            last.current = { value: found, at: now };
            if (input.current) input.current.value = found;
            form.current?.requestSubmit();
          }
        }
      } catch {
        // A frame that couldn't be read; the next one will be.
      }
      if (!cancelled) window.setTimeout(tick, 250);
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [scanning]);

  async function start() {
    setCameraError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      stream.current = media;
      setScanning(true);
      // The video element shows once scanning is on.
      window.setTimeout(() => {
        if (video.current) {
          video.current.srcObject = media;
          void video.current.play().catch(() => undefined);
        }
      }, 0);
    } catch {
      setCameraError(t("events.cameraError"));
      stop();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form ref={form} action={action} className="flex flex-col gap-4" autoComplete="off">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-event" className="text-sm font-semibold">
            {t("events.atTheDoor")}
          </label>
          <select id="f-event" name="eventId" defaultValue={events[0] ? String(events[0].id) : ""} className="input">
            <option value="">{t("events.anyEvent")}</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">{t("events.otherRefused")}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-code" className="text-sm font-semibold">
            {t("events.ticketCode")}
          </label>
          <div className="flex gap-2">
            <input
              ref={input}
              id="f-code"
              name="code"
              className="input min-w-0 flex-1 font-mono text-[18px] uppercase tracking-wider"
              placeholder="K7QM-4XP2-HD9W"
              dir="ltr"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
              required
            />
            <button type="submit" className={`${btn.primary} h-12 shrink-0`} disabled={pending}>
              {pending ? t("events.checking") : t("events.checkInButton")}
            </button>
          </div>
        </div>
      </form>

      {canScan ? (
        scanning ? (
          <div className="flex flex-col gap-3">
            <video ref={video} className="aspect-square w-full max-w-[420px] rounded-2xl bg-midnight object-cover" muted playsInline aria-label={t("events.cameraView")} />
            <button type="button" onClick={stop} className={`${btn.secondary} h-11 w-fit`}>
              <Icon name="close" size={20} />
              {t("events.stopCamera")}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => void start()} className={`${btn.secondary} h-12 w-fit`}>
            <Icon name="photo_camera" size={20} />
            {t("events.scan")}
          </button>
        )
      ) : (
        <p className="m-0 text-[14px] text-muted">
          {t("events.noScan")}
        </p>
      )}
      {cameraError ? (
        <p role="alert" className="m-0 text-[14px] font-semibold text-danger">
          {cameraError}
        </p>
      ) : null}

      <Result state={state} timeZone={timeZone} />
    </div>
  );
}
