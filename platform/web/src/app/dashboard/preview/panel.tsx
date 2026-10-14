"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PhoneFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";

type Look = "app" | "light" | "dark";

const LOOKS: { value: Look; label: string }[] = [
  { value: "app", label: "App setting" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
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
}: {
  /** The app preview's address with this app's preview link. */
  src: string;
  appName: string;
  languages: { code: string; label: string }[];
  defaultLanguage: string;
}) {
  const router = useRouter();
  const [look, setLook] = useState<Look>("app");
  const [language, setLanguage] = useState(defaultLanguage);
  const [reloads, setReloads] = useState(0);
  const [pending, startTransition] = useTransition();

  const params = new URLSearchParams();
  if (look !== "app") params.set("theme", look);
  if (languages.length > 1) params.set("lang", language);
  params.set("r", String(reloads));
  const frameSrc = `${src}&${params.toString()}`;

  const reload = () => {
    setReloads((n) => n + 1);
    // A fresh link from the server too, so an hour-old page keeps working.
    startTransition(() => router.refresh());
  };

  return (
    <div className="flex min-w-0 flex-col items-center gap-4">
      <div className="flex w-full flex-wrap items-end justify-center gap-3">
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-1.5 p-0 text-sm font-semibold">Look</legend>
          <div className="flex rounded-[10px] border border-line-strong bg-white p-0.5">
            {LOOKS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={look === option.value}
                onClick={() => setLook(option.value)}
                className={`h-9 cursor-pointer rounded-lg px-3 text-sm font-semibold ${look === option.value ? "bg-midnight text-white" : "text-midnight hover:bg-ivory"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
        {languages.length > 1 ? (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Language
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
          Reload after changes
        </button>
      </div>
      <PhoneFrame screenClassName="h-[min(720px,80vh)] w-[360px] max-w-[calc(100vw-52px)] bg-white">
        <iframe
          key={frameSrc}
          src={frameSrc}
          title={`Preview of ${appName}`}
          className="block h-full w-full border-0"
          referrerPolicy="no-referrer"
          data-testid="app-preview"
        />
      </PhoneFrame>
      <p className="m-0 max-w-[380px] text-center text-[13px] leading-snug text-muted">
        The preview runs your app as it is now. Some things work only in the installed app; the preview shows a short note there.
      </p>
    </div>
  );
}
