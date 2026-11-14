"use client";

import { useDashT } from "@/components/dashboard-i18n";
import { MediaPicker } from "@/components/media-picker";
import type { DashKey } from "@/i18n/dashboard";
import { SYSTEM_LOOKS, SYSTEM_SCREENS, type SystemLook, type SystemScreenKey, type SystemScreenLook, type SystemScreensLook } from "@/lib/studio/premium-chrome";

/**
 * 130.21 Studio › Screens: the premium look of the app's system screens,
 * for the whole project (the account, settings, notifications, the
 * language, editing the profile, help and the legal pages, the lists of
 * orders, bookings and trips, sign-in and the code screen, the empty and
 * loading states), another look for one of them, and the `photo` look's
 * photo. "The app's own" keeps every screen as it is.
 */

const LOOK_NAMES: Record<SystemLook, DashKey> = {
  large: "studio.chromeLook_large",
  glass: "studio.chromeLook_glass",
  photo: "studio.chromeLook_photo",
  brand: "studio.chromeLook_brand",
};
const LOOK_HINTS: Record<SystemLook, DashKey> = {
  large: "studio.chromeLookHint_large",
  glass: "studio.chromeLookHint_glass",
  photo: "studio.chromeLookHint_photo",
  brand: "studio.chromeLookHint_brand",
};
const SCREEN_NAMES: Record<SystemScreenKey, DashKey> = {
  account: "studio.chromeScreen_account",
  settings: "studio.chromeScreen_settings",
  notifications: "studio.chromeScreen_notifications",
  language: "studio.chromeScreen_language",
  edit_profile: "studio.chromeScreen_edit_profile",
  help: "studio.chromeScreen_help",
  lists: "studio.chromeScreen_lists",
  sign_in: "studio.chromeScreen_sign_in",
  code: "studio.chromeScreen_code",
  states: "studio.chromeScreen_states",
};

const FIELD = "h-10 rounded-lg border border-line bg-white px-2";

export function SystemSection({ value, onChange }: { value: SystemScreensLook | null; onChange: (next: SystemScreensLook | null) => void }) {
  const t = useDashT();
  const look = value?.look ?? null;
  const setScreen = (key: SystemScreenKey, own: SystemScreenLook | "") => {
    if (!value) return;
    const screens = { ...(value.screens ?? {}) };
    if (own === "" || own === value.look) delete screens[key];
    else screens[key] = own;
    onChange({ ...value, screens: Object.keys(screens).length ? screens : undefined });
  };
  return (
    <section aria-labelledby="h-system-look" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6" data-system-section="">
      <div className="flex flex-col gap-1">
        <h2 id="h-system-look" className="m-0 text-lg font-bold">
          {t("studio.chromeSystemTitle")}
        </h2>
        <p className="m-0 text-sm text-muted">{t("studio.chromeSystemText")}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 ${look === null ? "border-ink" : "border-line"}`}>
          <input type="radio" name="system_look" checked={look === null} onChange={() => onChange(null)} />
          <span className="flex flex-col">
            <b>{t("studio.chromeLookClassic")}</b>
            <span className="text-sm text-muted">{t("studio.chromeLookClassicHint")}</span>
          </span>
        </label>
        {SYSTEM_LOOKS.map((l) => (
          <label key={l} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 ${look === l ? "border-ink" : "border-line"}`}>
            <input type="radio" name="system_look" checked={look === l} onChange={() => onChange({ ...(value ?? {}), look: l })} />
            <span className="flex flex-col">
              <b>{t(LOOK_NAMES[l])}</b>
              <span className="text-sm text-muted">{t(LOOK_HINTS[l])}</span>
            </span>
          </label>
        ))}
      </div>
      {value ? (
        <>
          {value.look === "photo" || Object.values(value.screens ?? {}).includes("photo") ? (
            <div className="flex flex-wrap items-center gap-2">
              <MediaPicker kind="image" share library onPick={(url) => onChange({ ...value, image_url: url })} label={t("studio.chromePhoto")} />
              {value.image_url ? (
                <button type="button" className="rounded-md border border-line px-2 py-1 text-sm" onClick={() => onChange({ ...value, image_url: null })}>
                  {t("studio.removePicture")}
                </button>
              ) : null}
              <span className="text-sm text-muted">{t("studio.chromeSystemPhotoHint")}</span>
            </div>
          ) : null}
          <details>
            <summary className="cursor-pointer font-semibold">{t("studio.chromeSystemEach")}</summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SYSTEM_SCREENS.map((key) => (
                <label key={key} className="flex flex-col gap-1 text-sm">
                  {t(SCREEN_NAMES[key])}
                  <select className={FIELD} value={value.screens?.[key] ?? ""} onChange={(e) => setScreen(key, e.target.value as SystemScreenLook | "")} data-system-screen={key}>
                    <option value="">{t("studio.chromeSystemSame")}</option>
                    <option value="classic">{t("studio.chromeLookClassic")}</option>
                    {SYSTEM_LOOKS.filter((l) => l !== value.look).map((l) => (
                      <option key={l} value={l}>
                        {t(LOOK_NAMES[l])}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}
