"use client";

import { useState, type RefObject } from "react";
import { PhoneFrame } from "@/components/device-frame";
import { useDashT } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";

/** 82.3 The sizes the app is shown at: its frame's width and screen height. */
export const DEVICE_SIZES = {
  small: { label: "pages.sizeSmall", width: 300, height: 540 },
  phone: { label: "pages.sizePhone", width: 340, height: 680 },
  tablet: { label: "pages.sizeTablet", width: 560, height: 740 },
} as const satisfies Record<string, { label: DashKey; width: number; height: number }>;
export type DeviceSize = keyof typeof DEVICE_SIZES;
export type DeviceSystem = "android" | "ios";

/**
 * 82.1 The real app beside the editor: the app preview (public/preview-app)
 * with the Pages & look draft. The editor tells it after each save
 * (`notifyDraftSaved`); the app reloads its tabs and pages in place
 * (mobile/lib/modules/shared/pages/draft_reload.dart). 82.3 At a small
 * phone's, a phone's or a tablet's size, as on Android or an iPhone (its
 * rules too: no purchase buttons), and light and dark side by side.
 */
export function LivePreview({ src, appName, framesRef }: { src: string; appName: string; framesRef: RefObject<HTMLDivElement | null> }) {
  const t = useDashT();
  const [reloads, setReloads] = useState(0);
  const [size, setSize] = useState<DeviceSize>("phone");
  const [system, setSystem] = useState<DeviceSystem>("android");
  const [both, setBoth] = useState(false);
  const device = DEVICE_SIZES[size];
  // Side by side, each a little smaller so both fit.
  const scale = both ? 0.82 : 1;
  const frame = (theme: "light" | "dark" | null) => (
    <div key={theme ?? "app"} className="flex flex-col items-center gap-1.5">
      <PhoneFrame
        className="max-w-full"
        style={{ width: Math.round(device.width * scale) }}
        screenClassName="bg-white"
        island={false}
        dir="ltr"
        data-device={`${size} ${system}${theme ? ` ${theme}` : ""}`}
      >
        <iframe
          key={`${reloads}-${size}-${system}-${theme}`}
          src={`${src}&os=${system}${theme ? `&theme=${theme}` : ""}&r=${reloads}`}
          title={theme ? t("pages.previewFrameTheme", { app: appName, theme: theme === "light" ? t("pages.light") : t("pages.dark") }) : t("pages.previewFrame", { app: appName })}
          className="block w-full border-0"
          style={{ height: Math.round(device.height * scale) }}
          referrerPolicy="no-referrer"
          data-testid="editor-preview"
        />
      </PhoneFrame>
      {theme ? <span className="text-xs font-semibold text-muted">{theme === "light" ? t("pages.light") : t("pages.dark")}</span> : null}
    </div>
  );
  const choice = <T extends string>(label: string, value: T, options: { value: T; label: string }[], onChange: (v: T) => void) => (
    <div role="group" aria-label={label} className="flex rounded-[10px] border border-line-strong bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-8 cursor-pointer rounded-lg px-2.5 text-[13px] font-semibold ${value === o.value ? "bg-midnight text-white" : "text-midnight hover:bg-ivory"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
  return (
    <div className="flex max-w-full flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {choice(
          t("pages.size"),
          size,
          (Object.keys(DEVICE_SIZES) as DeviceSize[]).map((s) => ({ value: s, label: t(DEVICE_SIZES[s].label) })),
          setSize,
        )}
        {choice(
          t("pages.system"),
          system,
          [
            { value: "android", label: "Android" },
            { value: "ios", label: "iPhone" },
          ],
          setSystem,
        )}
        <label className="flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold">
          <input type="checkbox" checked={both} onChange={(e) => setBoth(e.target.checked)} className="h-4 w-4" />
          {t("pages.lightAndDark")}
        </label>
      </div>
      <div ref={framesRef} className="flex max-w-full flex-wrap items-start justify-center gap-3 overflow-x-auto">
        {both ? [frame("light"), frame("dark")] : frame(null)}
      </div>
      <p className="m-0 max-w-[340px] text-center text-[13px] leading-snug text-muted">{t("pages.previewLiveNote")}</p>
      <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} onClick={() => setReloads((n) => n + 1)}>
        <Icon name="refresh" size={18} />
        {t("pages.previewReload")}
      </button>
    </div>
  );
}

/** Tells the app previews in the frames that the draft was saved: same origin only. */
export function notifyDraftSaved(frames: HTMLElement | null): void {
  for (const frame of frames?.querySelectorAll("iframe") ?? []) {
    frame.contentWindow?.postMessage({ yallappPreview: "draft-saved" }, window.location.origin);
  }
}
