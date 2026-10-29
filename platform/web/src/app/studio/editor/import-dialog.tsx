"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { uploadOwnFontAction } from "@/app/actions/pages";
import { useDashT } from "@/components/dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";
import type { Languages, StudioPage } from "@/lib/pages/types";
import { fontsIn, picturesIn, withPictures, type DesignFile, type DesignFilePicture, type DesignPlace } from "@/lib/studio/design-file";
import { IMPORT_FORMATS, readImport, type ImportError, type ImportRead } from "@/lib/studio/import/read";
import type { SvgVector } from "@/lib/studio/import/svg";
import { fromBase64, isFreeFont, sizeText, toBase64, type OwnFontFiles } from "./design-io";
import { Glyph, STUDIO_COLORS as C } from "./shared";

/**
 * 108.2 "Import a design", as the owner approved it: over the editor, two
 * steps. The file (dropped or chosen), then what was found in it: the pages
 * to take, where they go, the fonts they need, the pictures saved with them.
 */

export type FontState = "free" | "own" | "in_file" | "missing";

export interface ImportChoice {
  design: DesignFile;
  /** The file's pages taken, by their index. */
  pages: number[];
  place: DesignPlace;
  /** Fonts to show in the app's font instead. */
  appFont: string[];
  /** The file's own fonts to add to the project (their licence confirmed). */
  addFonts: string[];
  takeLook: boolean;
}

const ERRORS: Record<ImportError, DashKey> = {
  format: "studio.importNotOurs",
  not_ours: "studio.importNotOurs",
  too_new: "studio.importTooNew",
  broken: "studio.importBroken",
  empty: "studio.importEmpty",
  too_big: "studio.importTooBig",
  mixed: "studio.importMixed",
};

/** 108.3 A drawing of an SVG drawn as a picture by the browser, twice as sharp. */
async function drawVector(vector: SvgVector): Promise<DesignFilePicture | null> {
  const w = Math.max(1, Math.ceil(vector.w * 2));
  const h = Math.max(1, Math.ceil(vector.h * 2));
  if (w * h > 4096 * 4096) return null;
  try {
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(vector.svg)}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(image, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return blob ? { type: "image/png", data: toBase64(new Uint8Array(await blob.arrayBuffer())) } : null;
  } catch {
    return null;
  }
}

export function ImportDialog(props: {
  onClose: () => void;
  onImport: (choice: ImportChoice) => void;
  /** A page drawn small, as the app draws it. */
  preview: (page: StudioPage) => ReactNode;
  ownFonts: readonly OwnFontFiles[];
  onFontsAdded: (families: string[]) => void;
  /** Whether a page is open to put the design in. */
  hasOpenPage: boolean;
  /** The project's languages: designs from other tools are in its main one. */
  languages: Languages;
}) {
  const t = useDashT();
  const [read, setRead] = useState<ImportRead | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  async function take(files: FileList | null | undefined) {
    if (!files?.length) return;
    setBusy(true);
    setProblem(null);
    const result = await readImport(Array.from(files), { languages: props.languages, draw: drawVector });
    setBusy(false);
    if (!result.ok) {
      setRead(null);
      setProblem(t(ERRORS[result.error], { formats: IMPORT_FORMATS.join(", ") }));
      return;
    }
    setRead(result.read);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(14,13,36,0.45)" }} onClick={props.onClose}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[18px] bg-white text-[13px] outline-none"
        style={{ maxWidth: step === 1 ? 640 : 880, boxShadow: "0 30px 70px rgba(14,13,36,0.35)", color: C.ink }}
      >
        <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: `1px solid ${C.line}` }}>
          <Glyph name="upload" size={22} className="text-[#3D63FF]" />
          <h2 id="import-title" className="m-0 flex-1 text-lg font-bold">
            {t("studio.importTitle")}
          </h2>
          <Steps step={step} />
          <button type="button" aria-label={t("studio.close")} onClick={props.onClose} className="flex size-8 items-center justify-center rounded-lg border-0 bg-transparent">
            <Glyph name="close" />
          </button>
        </div>

        {step === 1 ? (
          <>
            <div className="flex gap-1 px-5" style={{ borderBottom: `1px solid ${C.line}` }}>
              <span className="px-3.5 py-2.5 font-bold" style={{ borderBottom: `2px solid ${C.ink}` }}>
                {t("studio.importFromFile")}
              </span>
            </div>
            <div className="flex flex-col gap-3.5 overflow-auto p-5">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(false);
                  void take(e.dataTransfer.files);
                }}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl px-6 py-8 text-center"
                style={{ border: `2px dashed ${over ? C.select : "#CFC9BC"}`, background: "#FBF8F2" }}
              >
                <Glyph name="cloud_upload" size={40} className="text-[#5E5B70]" />
                <b className="text-base">{busy ? t("studio.importReading") : read ? read.file : t("studio.importDrop")}</b>
                <span style={{ color: C.muted }}>{t("studio.importTools")}</span>
                <span className="flex flex-wrap justify-center gap-1.5" dir="ltr">
                  {IMPORT_FORMATS.map((f) => (
                    <span key={f} className="rounded-full bg-white px-2.5 py-0.5 text-xs" style={{ border: `1px solid ${C.line}` }}>
                      {f}
                    </span>
                  ))}
                </span>
                <input ref={input} type="file" multiple accept={IMPORT_FORMATS.join(",")} aria-label={t("studio.importChoose")} className="sr-only" onChange={(e) => void take(e.target.files)} />
              </label>
              {problem ? (
                <p role="alert" className="m-0 rounded-xl px-3 py-2" style={{ background: "#FDECEA", color: "#B3261E" }}>
                  {problem}
                </p>
              ) : null}
              <OwnFontBox onAdded={(family) => props.onFontsAdded([family])} />
              <p className="m-0 text-xs" style={{ color: C.muted }}>
                {t("studio.importNote")}
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3.5" style={{ borderTop: `1px solid ${C.line}` }}>
              <Button onClick={props.onClose}>{t("studio.importCancel")}</Button>
              <Button primary disabled={!read || busy} onClick={() => setStep(2)}>
                {t("studio.importNext")}
              </Button>
            </div>
          </>
        ) : read ? (
          <Found read={read} {...props} onBack={() => setStep(1)} />
        ) : null}
      </div>
    </div>
  );
}

function Steps({ step }: { step: 1 | 2 }) {
  const t = useDashT();
  const dot = (n: 1 | 2) => (
    <span className="inline-flex size-[22px] items-center justify-center rounded-full font-extrabold" style={n === step ? { background: C.ink, color: "#FFFFFF" } : { background: C.ivory, border: `1px solid ${C.line}` }}>
      {n}
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }} aria-hidden="true">
      {dot(1)}
      <span style={step === 1 ? { color: C.ink, fontWeight: 700 } : undefined}>{t("studio.importStepFile")}</span>
      <Glyph name="arrow_forward" size={14} flip />
      {dot(2)}
      <span style={step === 2 ? { color: C.ink, fontWeight: 700 } : undefined}>{t("studio.importStepFound")}</span>
    </span>
  );
}

function Button(props: { children: ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; icon?: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className="inline-flex h-10 items-center gap-1.5 rounded-[10px] px-[18px] text-sm font-bold disabled:opacity-50"
      style={props.primary ? { background: C.ink, color: C.ivory, border: `1px solid ${C.ink}` } : { background: "#FFFFFF", color: C.ink, border: `1px solid ${C.line}` }}
    >
      {props.icon ? <Glyph name={props.icon} size={18} /> : null}
      {props.children}
    </button>
  );
}

function Found(props: Parameters<typeof ImportDialog>[0] & { read: ImportRead; onBack: () => void }) {
  const t = useDashT();
  const { design } = props.read;
  const section = design.kind === "section";
  const [chosen, setChosen] = useState<number[]>(() => design.pages.map((_, i) => i));
  const [place, setPlace] = useState<DesignPlace>(section ? "section" : "new_pages");
  const [takeLook, setTakeLook] = useState(false);
  const [states, setStates] = useState<Record<string, FontState>>({});
  const [appFont, setAppFont] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [licence, setLicence] = useState(false);
  const [fontProblem, setFontProblem] = useState<string | null>(null);

  const pages = useMemo(() => (section ? [{ studio: { body: design.section! } as StudioPage }] : design.pages.filter((_, i) => chosen.includes(i))), [design, chosen, section]);
  const families = useMemo(() => {
    const all = new Set(pages.flatMap((p) => fontsIn(p.studio)));
    if (takeLook && design.look?.font) all.add(design.look.font);
    return [...all];
  }, [pages, takeLook, design.look]);
  const pictures = useMemo(() => [...new Set(pages.flatMap((p) => picturesIn(p.studio)))].filter((url) => design.pictures[url]), [pages, design.pictures]);
  const pictureBytes = pictures.reduce((sum, url) => sum + Math.floor((design.pictures[url]!.data.length * 3) / 4), 0);

  // Where each font comes from: Google Fonts, the project's own, the file, or nowhere.
  useEffect(() => {
    let live = true;
    void (async () => {
      const next: Record<string, FontState> = {};
      for (const family of families) {
        if (props.ownFonts.some((f) => f.family.toLowerCase() === family.toLowerCase())) next[family] = "own";
        else if (design.fonts.some((f) => f.family.toLowerCase() === family.toLowerCase())) next[family] = "in_file";
        else next[family] = (await isFreeFont(family)) ? "free" : "missing";
      }
      if (live) setStates(next);
    })();
    return () => {
      live = false;
    };
  }, [families, props.ownFonts, design.fonts]);

  // Pictures shown in the previews from the file itself.
  const shown = useMemo(() => {
    const map = new Map<string, string>();
    for (const page of design.pages) for (const url of picturesIn(page.studio)) map.set(url, design.pictures[url] ? `data:${design.pictures[url]!.type};base64,${design.pictures[url]!.data}` : url);
    return map;
  }, [design]);

  const needLicence = families.some((f) => states[f] === "in_file" && !appFont.includes(f));
  const ready = (section || chosen.length > 0) && (place !== "this_page" || chosen.length === 1 || section) && (!needLicence || licence);
  const count = section ? 1 : chosen.length;

  async function addFont(family: string, files: FileList | null) {
    if (!files?.length) return;
    setFontProblem(null);
    if (!licence) {
      setFontProblem(t("studio.importNeedLicence"));
      return;
    }
    const form = new FormData();
    form.set("family", family);
    form.set("licence", "on");
    for (const file of Array.from(files)) form.append("files", file);
    const r = await uploadOwnFontAction(form);
    if (!r.ok) {
      setFontProblem(`${t("studio.importFontFailed", { family })} ${t(`pages.ownFontErr_${r.error}` as DashKey, { file: r.file ?? "" })}`);
      return;
    }
    setAdded((list) => [...list, family]);
    setAppFont((list) => list.filter((f) => f !== family));
    props.onFontsAdded([family]);
  }

  return (
    <>
      <div className="flex min-h-0 flex-wrap gap-[18px] overflow-auto px-5 py-[18px]">
        <div className="flex min-w-[280px] flex-[1_1_380px] flex-col gap-2.5">
          <b>{section ? t("studio.importFoundOne", { file: props.read.file }) : design.pages.length === 1 ? t("studio.importFoundOnePage", { file: props.read.file }) : t("studio.importFound", { count: design.pages.length, file: props.read.file })}</b>
          <span className="text-xs" style={{ color: C.muted }}>
            {t("studio.importFoundHint")}
          </span>
          {props.read.cut ? (
            <span className="text-xs" style={{ color: "#B3261E" }}>
              {t("studio.importCut", { count: props.read.cut })}
            </span>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {(section ? [{ title: design.name, studio: { body: design.section! } as StudioPage }] : design.pages).map((page, i) => {
              const on = section || chosen.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  disabled={section}
                  onClick={() => setChosen((list) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i].sort((a, b) => a - b)))}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-white p-2"
                  style={on ? { outline: `2px solid ${C.select}`, border: "1px solid transparent" } : { border: `1px solid ${C.line}` }}
                >
                  <MiniPhone>{props.preview({ ...page.studio, body: withPictures(page.studio.body, shown) })}</MiniPhone>
                  <span className="flex items-center gap-1">
                    <Glyph name={on ? "check_circle" : "radio_button_unchecked"} size={18} className={on ? "text-[#3D63FF]" : "text-[#5E5B70]"} />
                    {page.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-[260px] flex-[0_1_300px] flex-col gap-3">
          <fieldset className="m-0 flex flex-col gap-2 rounded-xl p-3" style={{ border: `1px solid ${C.line}` }}>
            <legend className="sr-only">{t("studio.importWhere")}</legend>
            <b aria-hidden="true">{t("studio.importWhere")}</b>
            {(section ? (["section"] as const) : (["new_pages", "this_page", "section"] as const)).map((p) => (
              <label key={p} className="flex cursor-pointer items-center gap-1.5" style={place === p ? undefined : { color: C.muted }}>
                <input type="radio" name="import-place" checked={place === p} disabled={p !== "new_pages" && !props.hasOpenPage} onChange={() => setPlace(p)} className="accent-[#3D63FF]" />
                {t(p === "new_pages" ? "studio.importNewPages" : p === "this_page" ? "studio.importThisPage" : "studio.importSection")}
              </label>
            ))}
            {place === "this_page" && chosen.length !== 1 && !section ? (
              <span className="text-xs" style={{ color: "#B3261E" }}>
                {t("studio.importOneForThisPage")}
              </span>
            ) : null}
            {design.kind === "project" && design.look ? (
              <label className="mt-1 flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={takeLook} onChange={(e) => setTakeLook(e.target.checked)} className="accent-[#3D63FF]" />
                {t("studio.importLook")}
              </label>
            ) : null}
          </fieldset>

          {families.length ? (
            <div className="flex flex-col gap-2 rounded-xl p-3" style={{ border: `1px solid ${C.line}` }}>
              <b>{t("studio.importFonts")}</b>
              {families.map((family) => {
                const state = added.includes(family) ? "own" : states[family];
                const swapped = appFont.includes(family) || state === "missing";
                return (
                  <div key={family} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ fontWeight: 600 }}>{family}</span>
                      {state ? <FontTag state={state} swapped={swapped} added={added.includes(family)} /> : <span style={{ color: C.muted }}>…</span>}
                    </div>
                    {state === "missing" || state === "in_file" ? (
                      <div className="flex flex-wrap gap-1.5">
                        <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-bold" style={{ border: `1px solid ${C.line}` }}>
                          <Glyph name="add" size={16} />
                          {t("studio.importAddFont")}
                          <input type="file" multiple accept=".ttf,.otf" className="sr-only" aria-label={`${family}: ${t("studio.importAddFont")}`} onChange={(e) => void addFont(family, e.target.files)} />
                        </label>
                        {state === "in_file" ? (
                          <button
                            type="button"
                            aria-pressed={appFont.includes(family)}
                            onClick={() => setAppFont((list) => (list.includes(family) ? list.filter((f) => f !== family) : [...list, family]))}
                            className="inline-flex h-8 items-center rounded-lg bg-white px-2.5 text-xs font-bold"
                            style={{ border: `1px solid ${appFont.includes(family) ? C.select : C.line}` }}
                          >
                            {t("studio.importUseAppFont")}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {families.some((f) => states[f] === "in_file" || states[f] === "missing") ? (
                <label className="mt-1 flex cursor-pointer items-start gap-1.5 text-xs">
                  <input type="checkbox" checked={licence} onChange={(e) => setLicence(e.target.checked)} className="mt-0.5 accent-[#3D63FF]" />
                  {t("studio.importFontLicence")}
                </label>
              ) : null}
              {needLicence && !licence ? (
                <span className="text-xs" style={{ color: C.muted }}>
                  {t("studio.importNeedLicence")}
                </span>
              ) : null}
              {fontProblem ? (
                <span role="alert" className="text-xs" style={{ color: "#B3261E" }}>
                  {fontProblem}
                </span>
              ) : null}
            </div>
          ) : null}

          {pictures.length ? (
            <div className="flex gap-1.5 text-xs" style={{ color: C.muted }}>
              <Glyph name="photo_library" size={18} />
              {pictures.length === 1 ? t("studio.importPicturesOne", { size: sizeText(pictureBytes) }) : t("studio.importPictures", { count: pictures.length, size: sizeText(pictureBytes) })}
            </div>
          ) : null}
          <div className="flex gap-1.5 text-xs" style={{ color: C.muted }}>
            <Glyph name="info" size={18} />
            {t("studio.importBars")}
          </div>
        </div>
      </div>
      <div className="flex justify-between gap-2 px-5 py-3.5" style={{ borderTop: `1px solid ${C.line}` }}>
        <Button onClick={props.onBack}>{t("studio.importBack")}</Button>
        <Button
          primary
          icon="upload"
          disabled={!ready}
          onClick={() =>
            props.onImport({
              design,
              pages: section ? [] : chosen,
              place,
              appFont: families.filter((f) => appFont.includes(f) || (states[f] === "missing" && !added.includes(f))),
              addFonts: families.filter((f) => states[f] === "in_file" && !appFont.includes(f) && !added.includes(f)),
              takeLook,
            })
          }
        >
          {count === 1 ? t("studio.importDoOne") : t("studio.importDo", { count })}
        </Button>
      </div>
    </>
  );
}

function FontTag({ state, swapped, added }: { state: FontState; swapped: boolean; added: boolean }) {
  const t = useDashT();
  const ok = !swapped && (state === "free" || state === "own" || state === "in_file");
  const label = added ? t("studio.importFontAdded") : swapped && state !== "missing" ? t("studio.importFontAppFont") : t(state === "free" ? "studio.importFontFree" : state === "own" ? "studio.importFontOwn" : state === "in_file" ? "studio.importFontInFile" : "studio.importFontMissing");
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs" style={{ border: `1px solid ${C.line}`, color: ok ? "#1F8A4C" : state === "missing" ? "#B3261E" : C.muted }}>
      <Glyph name={ok ? "check" : state === "missing" ? "warning" : "text_fields"} size={16} />
      {label}
    </span>
  );
}

/** 108.3 A font of the owner's own added before importing: its name, its files and its licence. */
function OwnFontBox({ onAdded }: { onAdded: (family: string) => void }) {
  const t = useDashT();
  const [open, setOpen] = useState(false);
  const [family, setFamily] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [licence, setLicence] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function add() {
    if (!files?.length) return;
    setBusy(true);
    const form = new FormData();
    form.set("family", family);
    if (licence) form.set("licence", "on");
    for (const file of Array.from(files)) form.append("files", file);
    const r = await uploadOwnFontAction(form).catch(() => null);
    setBusy(false);
    if (r?.ok) {
      onAdded(family.trim());
      setMessage({ ok: true, text: t("studio.importFontAddedNamed", { family: family.trim() }) });
      setFamily("");
      setFiles(null);
      setOpen(false);
    } else setMessage({ ok: false, text: r ? t(`pages.ownFontErr_${r.error}` as DashKey, { file: r.file ?? "" }) : t("studio.importBroken") });
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl px-3 py-2.5" style={{ border: `1px solid ${C.line}` }}>
      <div className="flex items-center gap-2.5">
        <Glyph name="title" />
        <div className="flex-1">
          <b>{t("studio.importOwnFonts")}</b>
          <div className="text-xs" style={{ color: C.muted }}>
            {t("studio.importOwnFontsHint")}
          </div>
        </div>
        {open ? null : <Button onClick={() => setOpen(true)}>{t("studio.importAddFontButton")}</Button>}
      </div>
      {open ? (
        <div className="flex flex-col gap-2">
          <input aria-label={t("studio.importFontName")} placeholder={t("studio.importFontName")} value={family} maxLength={40} onChange={(e) => setFamily(e.target.value)} className="h-9 rounded-lg px-2.5" style={{ border: `1px solid ${C.line}` }} />
          <input type="file" multiple accept=".ttf,.otf" aria-label={t("studio.importFontFiles")} onChange={(e) => setFiles(e.target.files)} />
          <label className="flex cursor-pointer items-start gap-1.5 text-xs">
            <input type="checkbox" checked={licence} onChange={(e) => setLicence(e.target.checked)} className="mt-0.5 accent-[#3D63FF]" />
            {t("studio.importFontLicence")}
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>{t("studio.importCancel")}</Button>
            <Button primary disabled={busy || !family.trim() || !files?.length} onClick={() => void add()}>
              {t("studio.importAddFontButton")}
            </Button>
          </div>
        </div>
      ) : null}
      {message ? (
        <span role={message.ok ? "status" : "alert"} className="text-xs" style={{ color: message.ok ? "#1F8A4C" : "#B3261E" }}>
          {message.text}
        </span>
      ) : null}
    </div>
  );
}

/** A page drawn small in a phone. */
function MiniPhone({ children }: { children: ReactNode }) {
  const scale = 0.3;
  return (
    <span aria-hidden="true" className="block overflow-hidden" style={{ width: 360 * scale, height: 640 * scale, borderRadius: 14, border: `5px solid ${C.ink}`, background: "#FBF8F2", pointerEvents: "none" }}>
      <span className="block" style={{ width: 360, height: 640, transform: `scale(${scale})`, transformOrigin: "top left", overflow: "hidden" }}>
        {children}
      </span>
    </span>
  );
}

/** The file's own fonts, ready for the font upload (name and files). */
export function fontUpload(design: DesignFile, family: string): FormData | null {
  const font = design.fonts.find((f) => f.family.toLowerCase() === family.toLowerCase());
  if (!font) return null;
  const form = new FormData();
  form.set("family", font.family);
  form.set("licence", "on");
  font.files.forEach((file, i) => form.append("files", new File([fromBase64(file.data)], `${font.family}-${file.weight ?? "variable"}-${i}.${file.kind}`, { type: file.kind === "otf" ? "font/otf" : "font/ttf" })));
  return form;
}
