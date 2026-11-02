"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PhoneFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { useDashT } from "@/components/dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";

type Look = "app" | "light" | "dark";

const LOOKS: { value: Look; label: DashKey }[] = [
  { value: "app", label: "preview.appSetting" },
  { value: "light", label: "preview.light" },
  { value: "dark", label: "preview.dark" },
];

/**
 * 17 The live app in a phone frame, with switches for light or dark and for
 * the app's languages, and "Reload after changes" (a new preview link, so the
 * frame reads the saved setup again).
 */
export function PreviewPanel({
  src,
  appName,
  languages,
  defaultLanguage,
  apps,
}: {
  /** The app preview's address with this app's preview link. */
  src: string;
  appName: string;
  languages: { code: string; label: string }[];
  defaultLanguage: string;
  /** 112.3 A delivery, food, ride or taxi project's two apps, each with its own preview link: a switch between them. */
  apps?: { key: string; label: string; src: string; name: string }[];
}) {
  const t = useDashT();
  const router = useRouter();
  const [look, setLook] = useState<Look>("app");
  const [which, setWhich] = useState(apps?.[0]?.key ?? "");
  const shown = apps?.find((a) => a.key === which);
  const [language, setLanguage] = useState(defaultLanguage);
  const [reloads, setReloads] = useState(0);
  const [pending, startTransition] = useTransition();

  const params = new URLSearchParams();
  if (look !== "app") params.set("theme", look);
  if (languages.length > 1) params.set("lang", language);
  params.set("r", String(reloads));
  const frameSrc = `${shown?.src ?? src}&${params.toString()}`;

  const reload = () => {
    setReloads((n) => n + 1);
    // A fresh link from the server too, so an hour-old page keeps working.
    startTransition(() => router.refresh());
  };

  return (
    <div className="flex min-w-0 flex-col items-center gap-4">
      <div className="flex w-full flex-wrap items-end justify-center gap-3">
        {apps && apps.length > 1 ? (
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0" data-preview-apps="">
            <legend className="mb-1.5 p-0 text-sm font-semibold">{t("preview.whichApp")}</legend>
            <div className="flex rounded-[10px] border border-line-strong bg-white p-0.5">
              {apps.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={which === option.key}
                  onClick={() => setWhich(option.key)}
                  className={`h-9 cursor-pointer rounded-lg px-3 text-sm font-semibold ${which === option.key ? "bg-midnight text-white" : "text-midnight hover:bg-ivory"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-1.5 p-0 text-sm font-semibold">{t("preview.look")}</legend>
          <div className="flex rounded-[10px] border border-line-strong bg-white p-0.5">
            {LOOKS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={look === option.value}
                onClick={() => setLook(option.value)}
                className={`h-9 cursor-pointer rounded-lg px-3 text-sm font-semibold ${look === option.value ? "bg-midnight text-white" : "text-midnight hover:bg-ivory"}`}
              >
                {t(option.label)}
              </button>
            ))}
          </div>
        </fieldset>
        {languages.length > 1 ? (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t("preview.language")}
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="h-10 rounded-[10px] border border-line-strong bg-white px-3 text-[15px] font-normal"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="button" onClick={reload} disabled={pending} className={`${btn.secondary} h-10 px-4 text-sm`}>
          <Icon name="refresh" size={18} />
          {t("preview.reload")}
        </button>
      </div>
      {/* 19 No camera pill: the app on the web draws no status bar, so it would cover the app's top bar. */}
      <PhoneFrame className="w-[380px]" screenClassName="h-[min(720px,80vh)] bg-white" island={false} dir="ltr">
        <iframe
          key={frameSrc}
          src={frameSrc}
          title={t("preview.frameTitle", { app: shown?.name ?? appName })}
          className="block h-full w-full border-0"
          referrerPolicy="no-referrer"
          data-testid="app-preview"
        />
      </PhoneFrame>
      <p className="m-0 max-w-[380px] text-center text-[13px] leading-snug text-muted">
        {t("preview.note")}
      </p>
    </div>
  );
}
