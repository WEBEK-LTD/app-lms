"use client";

import { useDashT } from "@/components/dashboard-i18n";
import { MediaPicker } from "@/components/media-picker";
import type { DashKey } from "@/i18n/dashboard";
import { STUDIO_HEADER_STYLES, type LanguageCode, type StudioHeader, type StudioHeaderStyle } from "@/lib/pages/types";
import { SYSTEM_LOOKS, type SystemLook } from "@/lib/studio/premium-chrome";

/**
 * 130.20 The header panel's premium part: the header's premium style (or
 * none, its type as before), the line under its title in the language
 * being edited, the photo of the `photo` style and whether it collapses as
 * the page scrolls. 130.21 The page panel's choice of the system screens'
 * look (the account, settings, notifications, the lists, sign-in…), saved
 * with Studio › Screens and drawn on the canvas at once.
 */

const FIELD = { border: "1px solid var(--studio-line)" } as const;

const STYLE_NAMES: Record<StudioHeaderStyle, DashKey> = {
  large: "studio.chromeStyle_large",
  glass: "studio.chromeStyle_glass",
  photo: "studio.chromeStyle_photo",
  brand: "studio.chromeStyle_brand",
  search: "studio.chromeStyle_search",
};

const LOOK_NAMES: Record<SystemLook, DashKey> = {
  large: "studio.chromeLook_large",
  glass: "studio.chromeLook_glass",
  photo: "studio.chromeLook_photo",
  brand: "studio.chromeLook_brand",
};

export function HeaderStyleControls({ header, onChange, lang, defaultLang }: { header: StudioHeader; onChange: (patch: Partial<StudioHeader>) => void; lang: LanguageCode; defaultLang: LanguageCode }) {
  const t = useDashT();
  const style = header.style;
  const translated = lang !== defaultLang;
  const subtitle = translated ? ((header.translations?.[lang]?.subtitle as string | undefined) ?? "") : (header.subtitle ?? "");
  const setSubtitle = (text: string) => {
    if (!translated) return onChange({ subtitle: text || undefined });
    const all = { ...(header.translations ?? {}) };
    const mine = { ...(all[lang] ?? {}) } as Record<string, unknown>;
    if (text) mine.subtitle = text;
    else delete mine.subtitle;
    if (Object.keys(mine).length) all[lang] = mine as (typeof all)[string];
    else delete all[lang];
    onChange({ translations: Object.keys(all).length ? all : undefined });
  };
  return (
    <div className="flex flex-col gap-2.5" data-studio-chrome-controls="">
      <span className="font-bold">{t("studio.chromeStyleLabel")}</span>
      <div className="grid grid-cols-2 gap-1.5">
        {STUDIO_HEADER_STYLES.map((s) => (
          <button key={s} type="button" aria-pressed={style === s} onClick={() => onChange({ style: s })} className="rounded-lg bg-white px-2.5 py-1.5 text-start" style={style === s ? { border: "2px solid #3D63FF", color: "#1F3FB8", fontWeight: 700 } : FIELD}>
            {t(STYLE_NAMES[s])}
          </button>
        ))}
        <button type="button" aria-pressed={!style} onClick={() => onChange({ style: undefined })} className="rounded-lg bg-white px-2.5 py-1.5 text-start" style={!style ? { border: "2px solid #3D63FF", color: "#1F3FB8", fontWeight: 700 } : FIELD}>
          {t("studio.chromeStyleNone")}
        </button>
      </div>
      <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
        {t("studio.chromeStyleHint")}
      </span>
      {style ? (
        <>
          {style !== "glass" && style !== "search" ? (
            <label className="flex flex-col gap-1">
              {t("studio.chromeSubtitle")}
              <input value={subtitle} maxLength={80} onChange={(e) => setSubtitle(e.target.value)} className="h-9 rounded-lg px-2" style={FIELD} />
            </label>
          ) : null}
          {style === "photo" ? (
            <div className="flex flex-wrap items-center gap-2">
              <MediaPicker kind="image" share library onPick={(url) => onChange({ image_url: url })} label={t("studio.chromePhoto")} />
              {header.image_url ? (
                <button type="button" onClick={() => onChange({ image_url: undefined })} className="rounded-md bg-white px-2 py-0.5" style={FIELD}>
                  {t("studio.removePicture")}
                </button>
              ) : null}
              <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
                {t("studio.chromePhotoHint")}
              </span>
            </div>
          ) : null}
          {style === "large" || style === "photo" || style === "search" ? (
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={header.collapse !== false} onChange={(e) => onChange({ collapse: e.target.checked ? undefined : false })} style={{ accentColor: "#1F8A4C" }} />
              {t("studio.chromeCollapse")}
            </label>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function SystemLookControl({ look, onLook, busy }: { look: SystemLook | null; onLook: (look: SystemLook | null) => void; busy?: boolean }) {
  const t = useDashT();
  return (
    <label className="flex flex-col gap-1 font-bold" data-studio-system-look="">
      {t("studio.chromeSystemLook")}
      <select value={look ?? ""} disabled={busy} onChange={(e) => onLook((e.target.value || null) as SystemLook | null)} className="h-9 rounded-lg px-2 font-normal" style={FIELD}>
        <option value="">{t("studio.chromeLookClassic")}</option>
        {SYSTEM_LOOKS.map((l) => (
          <option key={l} value={l}>
            {t(LOOK_NAMES[l])}
          </option>
        ))}
      </select>
      <span className="text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
        {t("studio.chromeSystemLookHint")}
      </span>
    </label>
  );
}
