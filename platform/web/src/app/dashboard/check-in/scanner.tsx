"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { useDashT } from "@/components/dashboard-i18n";

/** The parts of the browser's BarcodeDetector this page uses (not in TypeScript's DOM types yet). */
interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type DetectorClass = { new (options: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> };

function detectorClass(): DetectorClass | null {
  return typeof window !== "undefined" && "BarcodeDetector" in window ? (window as unknown as { BarcodeDetector: DetectorClass }).BarcodeDetector : null;
}

/**
 * 28 Scanning QR codes with the device's camera where the browser can read
 * them (BarcodeDetector, like Chrome on Android); typing always works. 63
 * Shared by the events' Check-in and the gym's Member check-in: `onRead`
 * gets each code once while it stays in view.
 */
export function QrScanner({ onRead, onScanning }: { onRead: (value: string) => void; /** Whether the camera is on (the page doesn't focus the typed field then). */ onScanning?: (on: boolean) => void }) {
  const t = useDashT();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const last = useRef<{ value: string; at: number } | null>(null);
  const read = useRef(onRead);
  const [canScan, setCanScan] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    read.current = onRead;
  }, [onRead]);

  useEffect(() => {
    onScanning?.(scanning);
  }, [scanning, onScanning]);

  useEffect(() => {
    const Detector = detectorClass();
    if (!Detector) return;
    // Browsers without the list of formats are asked to read QR codes anyway.
    Promise.resolve(Detector.getSupportedFormats ? Detector.getSupportedFormats() : ["qr_code"])
      .then((formats) => setCanScan(formats.includes("qr_code")))
      .catch(() => setCanScan(false));
  }, []);

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
            read.current(found);
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
    <>
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
        <p className="m-0 text-[14px] text-muted">{t("events.noScan")}</p>
      )}
      {cameraError ? (
        <p role="alert" className="m-0 text-[14px] font-semibold text-danger">
          {cameraError}
        </p>
      ) : null}
    </>
  );
}
