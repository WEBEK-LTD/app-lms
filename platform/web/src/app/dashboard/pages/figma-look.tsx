"use client";

import { useState } from "react";
import { importFigmaFramesAction, importFigmaPagesAction, readFigmaLinkAction, uploadFigmaImageAction, type FigmaLinkError } from "@/app/actions/pages";
import { useDashFormat, useDashT, useKnownText } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import type { FigmaFrame } from "@/lib/figma/api";
import { FIGMA_PAGE_LIMITS, type FigmaImportedPage } from "@/lib/figma/pages";
import { readTokens, suggestLook, TOKEN_LIMITS, type FigmaTokens } from "@/lib/figma/tokens";
import { CORNER_LABELS } from "@/lib/pages/labels";
import { CORNERS, type Corners, type FigmaLook, type FigmaPicture, type LookMode } from "@/lib/pages/types";

const MAX_PICTURES = 12;

interface Draft {
  file: string;
  /** 97.4 Read from a link (its frames to choose from), or from exported files. */
  source: "files" | "link";
  frames: FigmaFrame[];
  tokens: FigmaTokens;
  primary: string;
  secondary: string | null;
  font: string | null;
  corners: Corners;
}

/** Whether a font can be used in the look: one of the owner's own, or a free font (asked of the catalog). */
async function usableFont(family: string, own: readonly string[]): Promise<boolean> {
  if (own.some((f) => f.toLowerCase() === family.toLowerCase())) return true;
  const found = await fetch(`/api/v1/fonts?${new URLSearchParams({ q: family, limit: "5" })}`)
    .then((r) => (r.ok ? (r.json() as Promise<{ fonts: { family: string }[] }>) : { fonts: [] }))
    .catch(() => ({ fonts: [] }));
  return found.fonts.some((f) => f.family.toLowerCase() === family.toLowerCase());
}

/**
 * 97.3 The Figma look, apart from the standard one: the switch between the
 * two, what the Figma look holds, and its import from files exported from
 * Figma (design tokens, logo, pictures) with a preview to choose from. What
 * is chosen goes into the draft; publishing shows it in the app. 97.5 With
 * `onAddPages`, frames read from a link can also become pages.
 */
export function FigmaLookPanel({
  mode,
  look,
  ownFonts,
  onChange,
  onAddPages,
}: {
  mode: LookMode;
  look: FigmaLook | undefined;
  ownFonts: readonly string[];
  onChange: (patch: { look_mode?: LookMode; figma_look?: FigmaLook | undefined }) => void;
  /** 97.5 Adds the pages (and the tab bar's labels as tabs) to the draft; the titles added, or null when there's no room. */
  onAddPages?: (pages: FigmaImportedPage[], tabs: string[] | null) => string[] | null;
}) {
  const t = useDashT();
  const known = useKnownText();
  const { date } = useDashFormat();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fontOk, setFontOk] = useState(true);
  const [logo, setLogo] = useState<FigmaPicture | null>(null);
  const [pictures, setPictures] = useState<FigmaPicture[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  // 97.4 The token stays in this page only, for the read and the import, and is cleared once the look is saved.
  const [link, setLink] = useState("");
  const [token, setToken] = useState("");
  const [logoFrame, setLogoFrame] = useState<string | null>(null);
  const [pictureFrames, setPictureFrames] = useState<string[]>([]);
  const [pageFrames, setPageFrames] = useState<string[]>([]);
  const [useTabs, setUseTabs] = useState(true);

  function figmaError(error: FigmaLinkError, retryAfterSeconds?: number): string {
    if (error === "limit") return t("pages.figmaErrLimit", { minutes: Math.max(1, Math.ceil((retryAfterSeconds ?? 60) / 60)) });
    const keys = {
      link: "pages.figmaErrLink",
      token: "pages.figmaErrToken",
      not_found: "pages.figmaErrNotFound",
      unreachable: "pages.figmaErrUnreachable",
      too_big: "pages.figmaErrTooBig",
      empty: "pages.figmaErrEmpty",
      busy: "pages.figmaErrBusy",
    } as const;
    return t(keys[error]);
  }

  function choose(tokens: FigmaTokens, file: string, source: Draft["source"], frames: FigmaFrame[]) {
    const suggested = suggestLook(tokens);
    setDraft({ file, source, frames, tokens, primary: suggested.primary ?? "#0E0D24", secondary: suggested.secondary, font: suggested.font, corners: suggested.corners ?? "soft" });
    setLogoFrame(null);
    setPictureFrames([]);
    setPageFrames([]);
    return checkFont(suggested.font);
  }

  async function readLink() {
    setStatus(null);
    setBusy(true);
    try {
      const result = await readFigmaLinkAction(link, token);
      if (!result.ok) return setStatus({ ok: false, text: figmaError(result.error, result.retryAfterSeconds) });
      await choose(result.file.tokens, result.file.name, "link", result.file.frames);
    } finally {
      setBusy(false);
    }
  }

  async function checkFont(family: string | null) {
    setFontOk(family === null || (await usableFont(family, ownFonts)));
  }

  async function readFile(file: File) {
    setStatus(null);
    if (file.size > TOKEN_LIMITS.bytes) return setStatus({ ok: false, text: t("pages.figmaTooBig") });
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      return setStatus({ ok: false, text: t("pages.figmaBadJson") });
    }
    const tokens = readTokens(json);
    if (!tokens) return setStatus({ ok: false, text: t("pages.figmaEmpty") });
    await choose(tokens, file.name.slice(0, 120), "files", []);
  }

  async function upload(file: File): Promise<FigmaPicture | null> {
    const data = new FormData();
    data.set("file", file);
    const result = await uploadFigmaImageAction(data);
    if (result.ok) return { asset_id: result.assetId, name: result.name };
    setStatus({ ok: false, text: t(result.error === "size" ? "pages.figmaImageSize" : "pages.figmaImageType", { file: file.name }) });
    return null;
  }

  async function addPictures(files: File[]) {
    setBusy(true);
    setStatus(null);
    try {
      const added: FigmaPicture[] = [];
      for (const file of files.slice(0, MAX_PICTURES - pictures.length)) {
        const picture = await upload(file);
        if (picture) added.push(picture);
      }
      setPictures((all) => [...all, ...added].slice(0, MAX_PICTURES));
    } finally {
      setBusy(false);
    }
  }

  async function addLogo(file: File) {
    setBusy(true);
    setStatus(null);
    try {
      setLogo(await upload(file));
    } finally {
      setBusy(false);
    }
  }

  /** 97.5 The frames marked Page, read from Figma and added to the draft as pages. */
  async function addPages() {
    if (!draft || !onAddPages) return;
    const frames = pageFrames.map((id) => draft.frames.find((f) => f.id === id)).filter((f): f is FigmaFrame => Boolean(f));
    if (!frames.length) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await importFigmaPagesAction(
        link,
        token,
        frames.map((f) => ({ id: f.id, name: f.name })),
      );
      if (!result.ok) return setStatus({ ok: false, text: figmaError(result.error, result.retryAfterSeconds) });
      if (!result.pages.length) return setStatus({ ok: false, text: t("pages.figmaPagesNone", { frames: frames.map((f) => f.name).join(", ") }) });
      const added = onAddPages(result.pages, useTabs ? result.tabs : null);
      if (!added) return setStatus({ ok: false, text: t("pages.figmaPagesFull") });
      setPageFrames([]);
      const failed = result.failed.length ? ` ${t("pages.figmaPagesNone", { frames: result.failed.join(", ") })}` : "";
      setStatus({ ok: true, text: `${t("pages.figmaPagesAdded", { pages: added.join(", ") })}${failed}` });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!draft) return;
    let chosenLogo = logo;
    let chosenPictures = pictures;
    let failed: string[] = [];
    // 97.4 The frames chosen, brought from Figma as pictures first.
    const frames = [...(logoFrame ? [logoFrame] : []), ...pictureFrames.filter((id) => id !== logoFrame)]
      .map((id) => draft.frames.find((f) => f.id === id))
      .filter((f): f is FigmaFrame => Boolean(f));
    if (draft.source === "link" && frames.length) {
      setBusy(true);
      setStatus(null);
      try {
        const result = await importFigmaFramesAction(
          link,
          token,
          frames.map((f) => ({ id: f.id, name: f.name })),
        );
        if (!result.ok) return setStatus({ ok: false, text: figmaError(result.error, result.retryAfterSeconds) });
        const fromLogo = result.pictures.find((p) => p.frameId === logoFrame);
        if (fromLogo) chosenLogo = { asset_id: fromLogo.assetId, name: fromLogo.name };
        chosenPictures = [...pictures, ...result.pictures.filter((p) => p.frameId !== logoFrame || pictureFrames.includes(p.frameId)).map((p) => ({ asset_id: p.assetId, name: p.name }))].slice(0, MAX_PICTURES);
        failed = result.failed;
      } finally {
        setBusy(false);
      }
    }
    onChange({
      look_mode: "figma",
      figma_look: {
        primary_color: draft.primary,
        secondary_color: draft.secondary,
        font_family: fontOk ? draft.font : null,
        corners: draft.corners,
        logo_asset_id: chosenLogo?.asset_id ?? null,
        pictures: chosenPictures,
        source: { kind: draft.source, name: draft.file, imported_at: new Date().toISOString() },
      },
    });
    setDraft(null);
    setLogo(null);
    setPictures([]);
    setLogoFrame(null);
    setPictureFrames([]);
    setToken("");
    setStatus(failed.length ? { ok: false, text: `${t("pages.figmaSaved")} ${t("pages.figmaFramesFailed", { frames: failed.join(", ") })}` } : { ok: true, text: t("pages.figmaSaved") });
  }

  const picturesLeft = MAX_PICTURES - pictures.length;

  const colorOption = (c: { name: string; hex: string }) => ({ value: c.hex, label: `${c.name} · ${c.hex}` });

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 p-0 text-sm font-semibold">{t("pages.lookMode")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["standard", t("pages.lookStandard"), t("pages.lookStandardHint")],
              ["figma", t("pages.lookFigma"), look ? t("pages.lookFigmaHint") : t("pages.figmaNone")],
            ] as const
          ).map(([value, label, hint]) => (
            <div
              key={value}
              className="flex flex-col gap-1 rounded-xl border border-line p-3 has-[:checked]:border-2 has-[:checked]:border-midnight has-[:checked]:p-[11px] has-[:disabled]:opacity-60"
            >
              <label className="flex cursor-pointer items-center gap-2 text-[15px] font-bold has-[:disabled]:cursor-not-allowed">
                <input
                  type="radio"
                  name="look-mode"
                  checked={mode === value}
                  disabled={value === "figma" && !look}
                  aria-describedby={`look-mode-${value}-hint`}
                  onChange={() => onChange({ look_mode: value })}
                  className="h-4 w-4 accent-midnight"
                />
                {label}
              </label>
              <span id={`look-mode-${value}-hint`} className="text-xs text-muted">
                {hint}
              </span>
            </div>
          ))}
        </div>
      </fieldset>

      {look ? (
        <section aria-labelledby="figma-current" className="flex flex-col gap-2 rounded-xl border border-line p-3">
          <h3 id="figma-current" className="m-0 text-[15px] font-bold">
            {t("pages.figmaCurrent", { file: look.source.name || "Figma", date: date(new Date(look.source.imported_at)) })}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {[look.primary_color, look.secondary_color].filter((c): c is string => Boolean(c)).map((c) => (
              <span key={c} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="inline-block h-5 w-5 rounded-md border border-line" style={{ background: c }} />
                <bdi dir="ltr">{c}</bdi>
              </span>
            ))}
            <span>{look.font_family ?? t("pages.figmaFontDefault")}</span>
            <span>{known(CORNER_LABELS[look.corners])}</span>
            {look.pictures.length ? <span>{t("pages.figmaPictureCount", { count: look.pictures.length })}</span> : null}
          </div>
          {look.logo_asset_id ? (
            // eslint-disable-next-line @next/next/no-img-element -- the owner's own logo, on Yallapp
            <img src={`/api/v1/assets/${look.logo_asset_id}`} alt={t("pages.figmaLogo")} className="h-10 max-w-[160px] self-start object-contain" />
          ) : null}
          {look.pictures.length ? <p className="m-0 text-xs text-muted">{t("pages.figmaPicturesHint")}</p> : null}
          <div>
            <button type="button" className={`${btn.ghost} h-9 px-3 text-sm`} onClick={() => onChange({ look_mode: "standard", figma_look: undefined })}>
              {t("pages.figmaRemove")}
            </button>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="figma-link-import" className="flex flex-col gap-3 rounded-xl border border-dashed border-line-strong p-3">
        <h3 id="figma-link-import" className="m-0 text-[15px] font-bold">
          {t("pages.figmaLinkImport")}
        </h3>
        <p className="m-0 text-sm text-muted">{t("pages.figmaLinkIntro")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="figma-link" className="text-sm font-semibold">
              {t("pages.figmaLink")}
            </label>
            <input id="figma-link" type="url" dir="ltr" inputMode="url" autoComplete="off" placeholder="https://www.figma.com/design/…" value={link} onChange={(e) => setLink(e.target.value)} className="input" />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="figma-token" className="text-sm font-semibold">
              {t("pages.figmaToken")}
            </label>
            <input
              id="figma-token"
              type="password"
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="figma-token-hint"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <p id="figma-token-hint" className="m-0 text-xs text-muted">
          {t("pages.figmaTokenHint")}
        </p>
        <div>
          <button type="button" className={`${btn.ghost} h-10`} disabled={busy || !link.trim() || !token.trim()} onClick={() => void readLink()}>
            {t("pages.figmaRead")}
          </button>
        </div>
      </section>

      <section aria-labelledby="figma-import" className="flex flex-col gap-3 rounded-xl border border-dashed border-line-strong p-3">
        <h3 id="figma-import" className="m-0 text-[15px] font-bold">
          {t("pages.figmaImport")}
        </h3>
        <p className="m-0 text-sm text-muted">{t("pages.figmaImportIntro")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="figma-tokens" className="text-sm font-semibold">
              {t("pages.figmaTokens")}
            </label>
            <input id="figma-tokens" type="file" accept=".json,application/json" className="text-sm" onChange={(e) => e.target.files?.[0] && void readFile(e.target.files[0])} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="figma-logo" className="text-sm font-semibold">
              {t("pages.figmaLogo")}
            </label>
            <input id="figma-logo" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" disabled={busy} onChange={(e) => e.target.files?.[0] && void addLogo(e.target.files[0])} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="figma-pictures" className="text-sm font-semibold">
              {t("pages.figmaPictures")}
            </label>
            <input id="figma-pictures" type="file" multiple accept="image/png,image/jpeg,image/webp" className="text-sm" disabled={busy} onChange={(e) => e.target.files && void addPictures([...e.target.files])} />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        {busy ? (
          <p role="status" className="m-0 text-sm text-muted">
            {t("pages.figmaUploading")}
          </p>
        ) : null}

        {draft ? (
          <section aria-labelledby="figma-found" className="flex flex-col gap-3">
            <h4 id="figma-found" className="m-0 text-sm font-bold">
              {t("pages.figmaFound", { file: draft.file })}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice id="figma-main" label={t("pages.figmaMain")} value={draft.primary} options={draft.tokens.colors.map(colorOption)} onChange={(primary) => setDraft({ ...draft, primary })} swatch />
              <Choice
                id="figma-second"
                label={t("pages.figmaSecond")}
                value={draft.secondary ?? ""}
                options={[{ value: "", label: t("pages.figmaNoSecond") }, ...draft.tokens.colors.map(colorOption)]}
                onChange={(secondary) => setDraft({ ...draft, secondary: secondary || null })}
                swatch
              />
              <Choice
                id="figma-font"
                label={t("pages.figmaFont")}
                value={draft.font ?? ""}
                options={[{ value: "", label: t("pages.figmaFontDefault") }, ...draft.tokens.fonts.map((f) => ({ value: f.family, label: `${f.family} · ${f.name}` }))]}
                onChange={(font) => {
                  setDraft({ ...draft, font: font || null });
                  void checkFont(font || null);
                }}
              />
              <Choice id="figma-corners" label={t("pages.figmaCorners")} value={draft.corners} options={CORNERS.map((c) => ({ value: c, label: known(CORNER_LABELS[c]) }))} onChange={(corners) => setDraft({ ...draft, corners: corners as Corners })} />
            </div>
            {!fontOk && draft.font ? (
              <p role="alert" className="m-0 text-sm text-danger">
                {t("pages.figmaFontMissing", { font: draft.font })}
              </p>
            ) : null}
            {draft.frames.length ? (
              <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="mb-1 p-0 text-sm font-bold">{t("pages.figmaFrames", { file: draft.file })}</legend>
                <p className="m-0 text-xs text-muted">{t("pages.figmaFramesHint")}</p>
                {onAddPages ? <p className="m-0 text-xs text-muted">{t("pages.figmaPagesHint")}</p> : null}
                <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-4">
                  {draft.frames.map((f) => {
                    const asPicture = pictureFrames.includes(f.id);
                    const asPage = pageFrames.includes(f.id);
                    return (
                      <li key={f.id} className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-line p-2 text-sm">
                        <span className="flex h-24 items-center justify-center overflow-hidden rounded-md bg-ivory">
                          {f.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element -- rendered by Figma for the owner's own file
                            <img src={f.thumbnail} alt="" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <Icon name="image" size={28} className="text-muted" />
                          )}
                        </span>
                        <span className="truncate font-semibold" title={f.name}>
                          {f.name}
                        </span>
                        <span className="truncate text-xs text-muted">{f.page}</span>
                        <span className="flex flex-wrap gap-x-3 gap-y-1">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={logoFrame === f.id}
                              aria-label={t("pages.figmaUseLogo", { name: f.name })}
                              onChange={(e) => setLogoFrame(e.target.checked ? f.id : null)}
                              className="h-4 w-4 accent-midnight"
                            />
                            <span aria-hidden="true">{t("pages.figmaLogo")}</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={asPicture}
                              disabled={!asPicture && pictureFrames.length >= picturesLeft}
                              aria-label={t("pages.figmaUsePicture", { name: f.name })}
                              onChange={(e) => setPictureFrames((all) => (e.target.checked ? [...all, f.id] : all.filter((id) => id !== f.id)))}
                              className="h-4 w-4 accent-midnight"
                            />
                            <span aria-hidden="true">{t("pages.figmaPicture")}</span>
                          </label>
                          {onAddPages ? (
                            <label className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={asPage}
                                disabled={!asPage && pageFrames.length >= FIGMA_PAGE_LIMITS.frames}
                                aria-label={t("pages.figmaUsePage", { name: f.name })}
                                onChange={(e) => setPageFrames((all) => (e.target.checked ? [...all, f.id] : all.filter((id) => id !== f.id)))}
                                className="h-4 w-4 accent-midnight"
                              />
                              <span aria-hidden="true">{t("pages.figmaPage")}</span>
                            </label>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {onAddPages ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" className={`${btn.secondary} h-10`} disabled={!pageFrames.length || busy} onClick={() => void addPages()}>
                      <Icon name="add" size={18} />
                      {t("pages.figmaAddPages")}
                    </button>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={useTabs} onChange={(e) => setUseTabs(e.target.checked)} className="h-4 w-4 accent-midnight" />
                      {t("pages.figmaUseTabs")}
                    </label>
                  </div>
                ) : null}
              </fieldset>
            ) : null}
          </section>
        ) : null}

        {logo || pictures.length ? (
          <ul aria-label={`${t("pages.figmaLogo")} · ${t("pages.figmaPictures")}`} className="m-0 flex list-none flex-wrap gap-2 p-0">
            {[...(logo ? [{ ...logo, logo: true }] : []), ...pictures.map((p) => ({ ...p, logo: false }))].map((p) => (
              <li key={p.asset_id} className="flex items-center gap-2 rounded-lg border border-line px-2 py-1 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element -- the owner's own picture, on Yallapp */}
                <img src={`/api/v1/assets/${p.asset_id}`} alt="" className="h-8 w-8 rounded object-cover" />
                <span>{p.logo ? t("pages.figmaLogo") : p.name}</span>
                <button
                  type="button"
                  className={`${btn.ghost} h-7 px-1`}
                  aria-label={t("pages.figmaRemovePicture", { name: p.logo ? t("pages.figmaLogo") : p.name })}
                  onClick={() => (p.logo ? setLogo(null) : setPictures((all) => all.filter((x) => x.asset_id !== p.asset_id)))}
                >
                  <Icon name="close" size={18} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {status ? (
          <p role={status.ok ? "status" : "alert"} className={`m-0 text-sm ${status.ok ? "text-success" : "text-danger"}`}>
            {status.text}
          </p>
        ) : null}
        <div>
          <button type="button" className={`${btn.primary} h-10`} disabled={!draft || busy} onClick={() => void save()}>
            {t("pages.figmaSave")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Choice({
  id,
  label,
  value,
  options,
  onChange,
  swatch = false,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  swatch?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <span className="flex items-center gap-2">
        {swatch && value ? <span aria-hidden="true" className="inline-block h-7 w-7 shrink-0 rounded-md border border-line" style={{ background: value }} /> : null}
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input input-sm min-w-0 flex-1">
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
}
