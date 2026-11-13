"use client";

import { useState, type ReactNode } from "react";
import { useDashT } from "@/components/dashboard-i18n";
import { MediaPicker } from "@/components/media-picker";
import { btn } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { RTL_CODES } from "@/lib/i18n/locales";
import { darkBackground, launchColors } from "@/lib/studio/launch";
import {
  defaultLaunchBackground,
  LAUNCH_BACKGROUNDS,
  LAUNCH_DEFAULT_BACKGROUND,
  LAUNCH_DEFAULT_LOADER,
  LAUNCH_DEFAULT_OVERLAY,
  LAUNCH_DIRECTIONS,
  LAUNCH_LIMITS,
  LAUNCH_LOADERS,
  LAUNCH_LOGO_SHAPES,
  LAUNCH_LOGO_SIZES,
  LAUNCH_LOGOS,
  LAUNCH_LOOKS,
  LAUNCH_THEMES,
  type LaunchBackground,
  type LaunchLook,
  type LaunchStyle,
} from "@/lib/studio/screens";
import { LaunchPreview, type LaunchBrand } from "./launch-preview";

/** 124.15 A new launch screen: the Signature look, everything its own. */
export function newLaunch(look: LaunchStyle = "signature"): LaunchLook {
  return {
    look,
    background: defaultLaunchBackground(look),
    background_dark: null,
    logo: "logo",
    logo_url: null,
    logo_size: "l",
    logo_shape: "rounded",
    title: {},
    subtitle: {},
    loader: LAUNCH_DEFAULT_LOADER[look],
    theme: "system",
    main_color: null,
    second_color: null,
  };
}

/** A look chosen: the loading sign and the background follow it while they are the last look's own. */
export function withLook(launch: LaunchLook, look: LaunchStyle): LaunchLook {
  const before = launch.look;
  const bgOwn = (b: LaunchBackground) => b.type === LAUNCH_DEFAULT_BACKGROUND[before] && !b.color && !b.from && !b.to && !b.image_url && b.overlay === null && !b.text_color;
  return {
    ...launch,
    look,
    loader: launch.loader === LAUNCH_DEFAULT_LOADER[before] ? LAUNCH_DEFAULT_LOADER[look] : launch.loader,
    background: bgOwn(launch.background) ? defaultLaunchBackground(look) : launch.background,
  };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function Chips<T extends string>({ label, options, value, onChange, word, name, hideLabel = false }: { label: string; hideLabel?: boolean; options: readonly T[]; value: T; onChange: (v: T) => void; word: (v: T) => string; name: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-1.5">
      {hideLabel ? null : <span className="text-sm font-bold">{label}</span>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} data-launch={`${name}-${o}`} onClick={() => onChange(o)} className={`h-8 rounded-lg px-2.5 text-[13px] ${value === o ? "bg-[#F0F2FF] font-bold text-[#3D63FF] ring-1 ring-[#3D63FF]" : "bg-[#F3F4F8] text-muted"}`}>
            {word(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorField({ label, value, fallback, onChange, own }: { label: string; value: string | null; fallback: string; onChange: (v: string | null) => void; own: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-2">
        <input type="color" value={value ?? (HEX.test(fallback) ? fallback : "#000000")} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded border border-line bg-white" />
        <span className="font-semibold">{label}</span>
      </label>
      {value ? (
        <button type="button" className="text-[13px] text-[#3D63FF] underline" onClick={() => onChange(null)}>
          {own}
        </button>
      ) : (
        <span className="text-[13px] text-muted">{own}</span>
      )}
    </div>
  );
}

function Box({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-3 rounded-2xl border border-line p-4 ${className}`}>{children}</div>;
}

/**
 * 124.15 Studio › Screens › Launch screen: the look, its background in
 * light and in dark (a colour, a gradient or a photo made darker), the
 * logo, the words in each language, the loading sign, light and dark and
 * the colours, with the screen moving beside them as the app draws it.
 */
export function LaunchSection({ launch, onChange, brand, languages, previewLang }: { launch: LaunchLook; onChange: (l: LaunchLook) => void; brand: LaunchBrand; languages: { code: string; name: string }[]; previewLang: string }) {
  const t = useDashT();
  const [dark, setDark] = useState(false);
  const [editDark, setEditDark] = useState(false);
  const set = (change: Partial<LaunchLook>) => onChange({ ...launch, ...change });
  const bg = editDark ? (launch.background_dark ?? darkBackground(launch)) : launch.background;
  const setBg = (change: Partial<LaunchBackground>) => (editDark ? set({ background_dark: { ...bg, ...change } }) : set({ background: { ...bg, ...change } }));
  const colors = launchColors(launch, { main: brand.main, second: brand.second }, editDark);
  const title = launch.title[previewLang] || Object.values(launch.title)[0] || brand.appName || "App";
  const subtitle = launch.subtitle[previewLang] ?? Object.values(launch.subtitle)[0] ?? "";
  const shownDark = launch.theme === "light" ? false : launch.theme === "dark" ? true : dark;
  const darkOwn = editDark && !launch.background_dark;

  return (
    <section aria-labelledby="h-launch" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6" data-testid="launch-section">
      <div className="flex flex-col gap-1">
        <h2 id="h-launch" className="m-0 text-lg font-bold">
          {t("studio.launchTitle")}
        </h2>
        <p className="m-0 text-sm text-muted">{t("studio.launchText")}</p>
      </div>
      <div className="flex flex-col gap-5 xl:flex-row">
        <div className="flex flex-col items-center gap-3 xl:w-[250px] xl:flex-none">
          <LaunchPreview launch={launch} brand={brand} dark={shownDark} title={title} subtitle={subtitle} welcome={t("studio.launchWelcome")} rtl={RTL_CODES.includes(previewLang.split("-")[0]!)} />
          <div role="group" aria-label={t("studio.previewMode")} className="flex gap-1 rounded-xl border border-line bg-white p-1 text-[12px]">
            {[false, true].map((d) => (
              <button key={String(d)} type="button" aria-pressed={shownDark === d} disabled={launch.theme !== "system"} onClick={() => setDark(d)} className={`h-8 rounded-[9px] px-3.5 ${shownDark === d ? "bg-midnight text-white" : "text-muted"}`}>
                {t(d ? "studio.previewDark" : "studio.previewLight")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div role="radiogroup" aria-label={t("studio.launchLook")} className="flex flex-col gap-2">
            <span className="text-[15px] font-bold">{t("studio.launchLook")}</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {LAUNCH_LOOKS.map((look) => (
                <button
                  key={look}
                  type="button"
                  role="radio"
                  aria-checked={launch.look === look}
                  data-launch={`look-${look}`}
                  onClick={() => onChange(withLook(launch, look))}
                  className={`h-16 rounded-xl text-[13px] ${launch.look === look ? "border-2 border-[#3D63FF] bg-[#FAF7F1] font-bold" : "border border-line text-muted"}`}
                >
                  {t(`studio.launch_${look}` as DashKey)}
                </button>
              ))}
            </div>
          </div>

          <Box>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[15px] font-bold">{t("studio.launchBackground")}</span>
              <div role="group" aria-label={t("studio.launchBackground")} className="flex gap-1 rounded-lg border border-line p-0.5 text-[13px]">
                {[false, true].map((d) => (
                  <button
                    key={String(d)}
                    type="button"
                    aria-pressed={editDark === d}
                    onClick={() => {
                      setEditDark(d);
                      if (launch.theme === "system") setDark(d);
                    }}
                    className={`h-8 rounded-md px-2.5 ${editDark === d ? "bg-midnight font-bold text-white" : ""}`}
                  >
                    {t(d ? "studio.launchInDark" : "studio.launchInLight")}
                  </button>
                ))}
              </div>
            </div>
            {editDark ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={darkOwn} onChange={(e) => set({ background_dark: e.target.checked ? null : { ...darkBackground(launch) } })} />
                {t("studio.launchDarkOwn")}
              </label>
            ) : null}
            {darkOwn ? null : (
              <>
                <Chips name="background" hideLabel label={t("studio.launchBackground")} options={LAUNCH_BACKGROUNDS} value={bg.type} onChange={(type) => setBg({ type })} word={(v) => t(`studio.launchBg_${v}` as DashKey)} />
                {bg.type === "color" ? <ColorField label={t("studio.launchColor")} value={bg.color} fallback={colors.screen.kind === "color" ? colors.screen.color : brand.main} onChange={(color) => setBg({ color })} own={t("studio.launchLookOwn")} /> : null}
                {bg.type === "gradient" ? (
                  <div className="flex flex-col gap-2">
                    <ColorField label={t("studio.launchFrom")} value={bg.from} fallback={colors.main} onChange={(from) => setBg({ from })} own={t("studio.launchMain")} />
                    <ColorField label={t("studio.launchTo")} value={bg.to} fallback={colors.second} onChange={(to) => setBg({ to })} own={t("studio.launchSecond")} />
                    <Chips name="direction" label={t("studio.launchDirection")} options={LAUNCH_DIRECTIONS} value={bg.direction} onChange={(direction) => setBg({ direction })} word={(v) => t(`studio.launchDir_${v}` as DashKey)} />
                  </div>
                ) : null}
                {bg.type === "photo" ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      {bg.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={bg.image_url} alt="" className="h-20 w-14 rounded-lg object-cover" />
                      ) : null}
                      <MediaPicker kind="image" library onPick={(url) => setBg({ image_url: url })} label={t("studio.launchPhoto")} />
                      {bg.image_url ? (
                        <button type="button" className={`${btn.ghost} h-10 text-sm`} onClick={() => setBg({ image_url: null })}>
                          {t("studio.removePhoto")}
                        </button>
                      ) : null}
                    </div>
                    {bg.image_url ? null : <span className="text-[13px] text-muted">{t("studio.launchNoPhoto")}</span>}
                    <label className="flex flex-col gap-1 text-sm font-bold">
                      {t("studio.launchOverlay")}
                      <input
                        type="range"
                        min={0}
                        max={LAUNCH_LIMITS.overlay}
                        step={5}
                        data-launch="overlay"
                        value={bg.overlay ?? LAUNCH_DEFAULT_OVERLAY[launch.look][editDark ? "dark" : "light"]}
                        onChange={(e) => setBg({ overlay: Number(e.target.value) })}
                        aria-valuetext={`${bg.overlay ?? LAUNCH_DEFAULT_OVERLAY[launch.look][editDark ? "dark" : "light"]}%`}
                      />
                    </label>
                  </div>
                ) : null}
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold">{t("studio.launchTextColor")}</span>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!bg.text_color} onChange={(e) => setBg({ text_color: e.target.checked ? null : colors.text.toUpperCase() })} />
                    {t("studio.launchTextAuto")}
                  </label>
                  {bg.text_color ? <ColorField label={t("studio.launchTextColor")} value={bg.text_color} fallback={colors.text} onChange={(text_color) => setBg({ text_color })} own={t("studio.launchTextAuto")} /> : null}
                </div>
              </>
            )}
          </Box>

          <Box>
            <Chips name="logo" label={t("studio.launchLogo")} options={LAUNCH_LOGOS} value={launch.logo} onChange={(logo) => set({ logo })} word={(v) => t(`studio.launchLogo_${v}` as DashKey)} />
            {launch.logo === "picture" ? (
              <div className="flex flex-wrap items-center gap-3">
                {launch.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={launch.logo_url} alt="" className="h-14 w-14 rounded-lg object-contain" />
                ) : null}
                <MediaPicker kind="image" library onPick={(url) => set({ logo_url: url })} label={t("studio.launchPicture")} />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-5">
              <Chips name="size" label={t("studio.launchSize")} options={LAUNCH_LOGO_SIZES} value={launch.logo_size} onChange={(logo_size) => set({ logo_size })} word={(v) => v.toUpperCase()} />
              <Chips name="shape" label={t("studio.launchShape")} options={LAUNCH_LOGO_SHAPES} value={launch.logo_shape} onChange={(logo_shape) => set({ logo_shape })} word={(v) => t(`studio.launchShape_${v}` as DashKey)} />
            </div>
          </Box>

          <Box>
            <span className="text-sm text-muted">{t("studio.launchTitleHint")}</span>
            {languages.map((l) => (
              <div key={l.code} className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold">{t("studio.launchTitleIn", { language: l.name })}</span>
                  <input className="h-11 rounded-[10px] border border-line-strong px-3" maxLength={LAUNCH_LIMITS.title} placeholder={brand.appName} value={launch.title[l.code] ?? ""} onChange={(e) => set({ title: { ...launch.title, [l.code]: e.target.value } })} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold">{t("studio.launchLineIn", { language: l.name })}</span>
                  <input className="h-11 rounded-[10px] border border-line-strong px-3" maxLength={LAUNCH_LIMITS.subtitle} value={launch.subtitle[l.code] ?? ""} onChange={(e) => set({ subtitle: { ...launch.subtitle, [l.code]: e.target.value } })} />
                </label>
              </div>
            ))}
          </Box>

          <Box className="sm:flex-row sm:flex-wrap sm:gap-6">
            <Chips name="loader" label={t("studio.launchLoader")} options={LAUNCH_LOADERS} value={launch.loader} onChange={(loader) => set({ loader })} word={(v) => t(`studio.launchLoader_${v}` as DashKey)} />
            <Chips name="theme" label={t("studio.launchTheme")} options={LAUNCH_THEMES} value={launch.theme} onChange={(theme) => set({ theme })} word={(v) => t(`studio.launchTheme_${v}` as DashKey)} />
          </Box>

          <Box>
            <span className="text-sm font-bold">{t("studio.launchColors")}</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!launch.main_color && !launch.second_color} onChange={(e) => set(e.target.checked ? { main_color: null, second_color: null } : { main_color: brand.main.toUpperCase(), second_color: colors.second.toUpperCase() })} />
              {t("studio.launchProjectColors")}
            </label>
            {launch.main_color || launch.second_color ? (
              <div className="flex flex-col gap-2">
                <ColorField label={t("studio.launchMain")} value={launch.main_color} fallback={brand.main} onChange={(main_color) => set({ main_color })} own={t("studio.launchProjectColors")} />
                <ColorField label={t("studio.launchSecond")} value={launch.second_color} fallback={colors.second} onChange={(second_color) => set({ second_color })} own={t("studio.launchProjectColors")} />
              </div>
            ) : null}
          </Box>
          <p className="m-0 text-[13px] leading-relaxed text-muted">{t("studio.launchNote")}</p>
        </div>
      </div>
    </section>
  );
}
