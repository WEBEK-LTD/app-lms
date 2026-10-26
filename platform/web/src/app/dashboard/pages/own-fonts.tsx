"use client";

import { useRef, useState } from "react";
import { deleteOwnFontAction, uploadOwnFontAction } from "@/app/actions/pages";
import { useDashT } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import type { OwnFontView } from "@/lib/fonts/own";
import { formatBytes } from "@/lib/media/quota";

/**
 * 97.2 The owner's own fonts in Pages & look: upload one (with its licence
 * confirmed), see its weights and size, delete it. A deleted font that the
 * draft used goes back to the bundled font.
 */
export function OwnFonts({ fonts, onChange }: { fonts: OwnFontView[]; onChange: (fonts: OwnFontView[], removed?: string) => void }) {
  const t = useDashT();
  const form = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  async function upload(data: FormData) {
    setBusy(true);
    setStatus(null);
    try {
      const result = await uploadOwnFontAction(data);
      if (result.ok) {
        onChange(result.fonts);
        form.current?.reset();
        setStatus({ ok: true, text: t("pages.ownFontAdded") });
      } else {
        setStatus({ ok: false, text: t(`pages.ownFontErr_${result.error}`, { file: result.file ?? "" }) });
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(font: OwnFontView) {
    const result = await deleteOwnFontAction(font.id);
    if (result.ok) {
      onChange(result.fonts, font.family);
      setStatus({ ok: true, text: t("pages.ownFontDeleted") });
    }
  }

  return (
    <section aria-labelledby="own-fonts-title" className="flex flex-col gap-3 border-t border-line pt-4">
      <h3 id="own-fonts-title" className="m-0 text-[15px] font-bold">
        {t("pages.ownFonts")}
      </h3>
      <p className="m-0 text-sm text-muted">{t("pages.ownFontsIntro")}</p>
      {fonts.length ? (
        <ul aria-label={t("pages.ownFonts")} className="m-0 flex list-none flex-col gap-2 p-0">
          {fonts.map((font) => (
            <li key={font.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{font.family}</span>
                <span className="block text-xs text-muted">
                  {font.weights.includes(null) ? t("pages.ownFontVariable") : t("pages.ownFontWeights", { weights: font.weights.join(", ") })} · {formatBytes(font.sizeBytes)}
                </span>
              </span>
              <button type="button" className={`${btn.ghost} h-9 px-2`} aria-label={t("pages.ownFontDelete", { name: font.family })} onClick={() => void remove(font)}>
                <Icon name="delete" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {/* Sent by hand: a form action would empty the fields after an error too. */}
      <form
        ref={form}
        onSubmit={(e) => {
          e.preventDefault();
          void upload(new FormData(e.currentTarget));
        }}
        className="flex flex-col gap-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="own-font-name" className="text-sm font-semibold">
              {t("pages.ownFontName")}
            </label>
            <input id="own-font-name" name="family" maxLength={40} autoComplete="off" className="input input-sm" dir="ltr" />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="own-font-files" className="text-sm font-semibold">
              {t("pages.ownFontFiles")}
            </label>
            <input id="own-font-files" name="files" type="file" multiple accept=".ttf,.otf,font/ttf,font/otf" className="text-sm" />
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-[15px]">
          <input type="checkbox" name="licence" className="mt-1 h-4 w-4 accent-midnight" />
          {t("pages.ownFontLicence")}
        </label>
        {status ? (
          <p role={status.ok ? "status" : "alert"} className={`m-0 text-sm ${status.ok ? "text-success" : "text-danger"}`}>
            {status.text}
          </p>
        ) : null}
        <div>
          <button type="submit" disabled={busy} className={`${btn.secondary} h-9 px-3 text-sm`}>
            {busy ? t("pages.ownFontUploading") : t("pages.ownFontUpload")}
          </button>
        </div>
      </form>
    </section>
  );
}
