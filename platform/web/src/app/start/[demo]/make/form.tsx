"use client";

/* eslint-disable @next/next/no-img-element -- the owner's logo, just uploaded, and the demo's screenshot. */
import { useRef, useState, useTransition } from "react";
import { uploadAssetAction } from "@/app/actions/dashboard";
import { startFromDemoAction } from "@/app/actions/start";
import { useDashT } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { browserDeflate, dominantColour, encodeRgbPng, isDark, swatchesFor } from "@/lib/brand-colour";

interface Swatch {
  hex: string;
  name: string;
}

interface Logo {
  id: string;
  url: string;
  file: string;
}

const ICON = 1024;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = url;
  });
}

/** The logo's main colour and how light it is, read from a small copy of it. */
async function readLogo(url: string): Promise<{ colour: string | null; light: boolean }> {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { colour: null, light: false };
  const scale = Math.min(96 / (img.naturalWidth || 96), 96 / (img.naturalHeight || 96));
  ctx.drawImage(img, 0, 0, (img.naturalWidth || 96) * scale, (img.naturalHeight || 96) * scale);
  const data = ctx.getImageData(0, 0, 96, 96).data;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    sum += (0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!) / 255;
    n += 1;
  }
  return { colour: dominantColour(data), light: n > 0 && sum / n > 0.75 };
}

/**
 * The app icon, 1024 × 1024 with no transparency: the logo on white (on the
 * colour when the logo is light), else the name's first letter on the colour.
 */
async function makeIcon(colour: string, name: string, logo: Logo | null, lightLogo: boolean): Promise<Blob | null> {
  if (typeof CompressionStream === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = ICON;
  canvas.height = ICON;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (logo) {
    const img = await loadImage(logo.url);
    ctx.fillStyle = lightLogo ? (isDark(colour) ? colour : "#0E0D24") : "#FFFFFF";
    ctx.fillRect(0, 0, ICON, ICON);
    const box = ICON * 0.68;
    const w = img.naturalWidth || box;
    const h = img.naturalHeight || box;
    const scale = Math.min(box / w, box / h);
    ctx.drawImage(img, (ICON - w * scale) / 2, (ICON - h * scale) / 2, w * scale, h * scale);
  } else {
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, ICON, ICON);
    ctx.fillStyle = isDark(colour) ? "#F4EFE6" : "#0E0D24";
    ctx.font = `800 ${ICON * 0.56}px "Bricolage Grotesque", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Array.from(name.trim())[0]?.toUpperCase() ?? "", ICON / 2, ICON * 0.54);
  }
  const png = await encodeRgbPng(ctx.getImageData(0, 0, ICON, ICON).data, ICON, ICON, browserDeflate);
  return new Blob([png as BlobPart], { type: "image/png" });
}

/** 127 "Make it yours": the form, its swatches and the live preview phone. */
export function MakeForm({
  demo,
  screen,
  look,
  swatches,
  maxName,
  error,
  comes,
}: {
  demo: { slug: string; name: string; colour: string; product: "editor" | "studio" };
  screen: string;
  /** 130 A Studio demo's chosen look and its words ("In the look: Look B · Horizon"). */
  look?: { id: "a" | "b"; words: string } | null;
  swatches: Swatch[];
  maxName: number;
  error: string | null;
  comes: string[];
}) {
  const t = useDashT();
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<Logo | null>(null);
  const [logoColour, setLogoColour] = useState<string | null>(null);
  const [lightLogo, setLightLogo] = useState(false);
  const [colour, setColour] = useState(demo.colour);
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(error);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);
  const shown: Swatch[] = logoColour
    ? swatchesFor(logoColour).map((hex, i) => ({ hex, name: i === 0 ? t("start.colours.logo") : (swatches.find((s) => s.hex === hex)?.name ?? hex) }))
    : swatches;
  const own = !shown.some((s) => s.hex.toUpperCase() === colour.toUpperCase());
  const letter = Array.from(name.trim() || demo.name)[0]?.toUpperCase() ?? "";
  const onBar = isDark(colour) ? "#F4EFE6" : "#0E0D24";

  async function upload(chosen: File) {
    setUploading(true);
    setProblem(null);
    try {
      const data = new FormData();
      data.set("kind", "logo");
      data.set("file", chosen);
      const result = await uploadAssetAction(data);
      if (!result.ok || !result.id || !result.url) {
        setProblem(result.error ?? t("start.errors.logo"));
        return;
      }
      setLogo({ id: result.id, url: result.url, file: chosen.name });
      try {
        const read = await readLogo(result.url);
        setLightLogo(read.light);
        setLogoColour(read.colour);
        if (read.colour) setColour(read.colour);
      } catch {
        setLogoColour(null);
      }
    } finally {
      setUploading(false);
    }
  }

  function submit(data: FormData) {
    const typed = name.trim().replace(/\s+/g, " ");
    if (!typed || typed.length > maxName) {
      setProblem(t("start.errors.name"));
      return;
    }
    setProblem(null);
    start(async () => {
      try {
        const icon = await makeIcon(colour, typed, logo, lightLogo);
        if (icon) {
          const up = new FormData();
          up.set("kind", "icon");
          up.set("file", new File([icon], "icon.png", { type: "image/png" }));
          const result = await uploadAssetAction(up);
          if (result.ok && result.id) data.set("iconAssetId", result.id);
        }
      } catch {
        // Without an icon all the same: Branding asks for one later.
      }
      await startFromDemoAction(data);
    });
  }

  return (
    <div className="flex flex-wrap items-start gap-12">
      <form action={submit} className="flex min-w-0 flex-[1_1_520px] flex-col gap-6" noValidate>
        <input type="hidden" name="demo" value={demo.slug} />
        <input type="hidden" name="colour" value={colour} />
        <input type="hidden" name="logoAssetId" value={logo?.id ?? ""} />
        {look ? <input type="hidden" name="look" value={look.id} /> : null}
        <div className="flex flex-col gap-2.5">
          <h1 className="m-0 text-[36px] leading-[1.02] font-extrabold tracking-[-0.03em] sm:text-[48px]">{t("start.makeTitle")}</h1>
          <p className="m-0 text-lg leading-normal text-[var(--pk-ink2)]">{t("start.makeText")}</p>
          <span className="flex min-h-8 items-center gap-1.5 self-start rounded-2xl border-2 border-[var(--pk-ink)] px-3.5 text-[13px] font-extrabold" data-product={demo.product}>
            {t(demo.product === "studio" ? "start.fromStudio" : "start.fromEditor", { demo: demo.name })}
          </span>
          {look ? (
            <span className="flex min-h-8 items-center gap-1.5 self-start rounded-2xl bg-[var(--pk-surface)] px-3.5 text-[13px] font-bold" data-look={look.id}>
              {look.words}
            </span>
          ) : null}
        </div>
        {problem ? (
          <p role="alert" className="m-0 rounded-[14px] bg-[var(--pk-surface)] px-4 py-3 text-[15px] font-semibold text-[#B3261E]">
            {problem}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <label htmlFor="app-name" className="text-[15px] font-bold">
            {t("start.name")}
          </label>
          <input
            id="app-name"
            name="name"
            value={name}
            maxLength={maxName}
            required
            autoComplete="organization"
            onChange={(e) => setName(e.target.value)}
            placeholder={demo.name}
            className="box-border h-[58px] rounded-2xl border-2 border-[var(--pk-ink)] bg-[var(--pk-surface)] px-[18px] font-[inherit] text-lg text-[var(--pk-ink)]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <span id="logo-label" className="text-[15px] font-bold">
            {t("start.logo")}
          </span>
          <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--pk-line)] bg-[var(--pk-surface)] p-3.5">
            <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-extrabold" style={logo ? { background: lightLogo ? colour : "#FFFFFF" } : { background: colour, color: onBar }} aria-hidden="true">
              {logo ? <img src={logo.url} alt="" className="max-h-[80%] max-w-[80%] object-contain" /> : letter}
            </span>
            <div className="min-w-0 grow">
              <div className="truncate text-[15px] font-semibold">{logo ? logo.file : t("start.logoTypes")}</div>
              <div className="text-[13px] text-[var(--pk-ink2)]">{logo ? t("start.logoMade") : t("start.logoSkip")}</div>
            </div>
            <input
              ref={file}
              id="logo-file"
              type="file"
              accept="image/png,image/svg+xml"
              className="sr-only"
              aria-labelledby="logo-label"
              onChange={(e) => {
                const chosen = e.target.files?.[0];
                if (chosen) void upload(chosen);
                e.target.value = "";
              }}
            />
            <button type="button" onClick={() => file.current?.click()} disabled={uploading} className="h-11 shrink-0 cursor-pointer rounded-[14px] border border-[var(--pk-line)] bg-transparent px-4 font-[inherit] text-sm font-semibold text-[var(--pk-ink)]">
              {uploading ? t("start.logoUploading") : logo ? t("start.logoChange") : t("start.logoUpload")}
            </button>
          </div>
          {logo ? <div className="text-[13px] text-[var(--pk-ink2)]">{t("start.logoSkip")}</div> : null}
        </div>
        <div className="flex flex-col gap-2.5">
          <div id="colour-label" className="text-[15px] font-bold">
            {t("start.colour")} <span className="font-medium text-[var(--pk-ink2)]">{logoColour ? t("start.colourLogo") : t("start.colourDemo")}</span>
          </div>
          <div role="radiogroup" aria-labelledby="colour-label" className="flex flex-wrap gap-2.5">
            {shown.map((s) => {
              const on = s.hex.toUpperCase() === colour.toUpperCase();
              return (
                <button
                  key={s.hex}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={on ? t("start.colourChosen", { colour: s.name }) : s.name}
                  data-colour={s.hex}
                  onClick={() => setColour(s.hex)}
                  className="size-12 cursor-pointer rounded-full"
                  style={{ background: s.hex, border: on ? "3px solid var(--pk-ink)" : "0" }}
                />
              );
            })}
            <label
              className="relative flex size-12 cursor-pointer items-center justify-center rounded-full text-[var(--pk-ink)]"
              style={own ? { background: colour, border: "3px solid var(--pk-ink)" } : { border: "1px dashed var(--pk-line)" }}
              title={t("start.colourMore")}
            >
              <span className="sr-only">{own ? t("start.colourChosen", { colour: t("start.colours.own") }) : t("start.colourMore")}</span>
              {own ? null : <Icon name="add" size={22} />}
              <input type="color" value={colour.toLowerCase()} onChange={(e) => setColour(e.target.value.toUpperCase())} className="absolute inset-0 size-full cursor-pointer opacity-0" />
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-[var(--pk-ok-soft)] p-[18px]">
          <div className="text-[15px] font-bold">{t("start.comes")}</div>
          <ul className="m-0 grid list-none grid-cols-1 gap-x-4 gap-y-2 p-0 text-sm sm:grid-cols-2" data-comes="">
            {comes.map((line) => (
              <li key={line} className="flex items-center gap-2">
                <span className="text-[var(--pk-ok)]">
                  <Icon name="check" size={18} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
        <button type="submit" disabled={pending || uploading} className="flex h-[60px] cursor-pointer items-center justify-center rounded-[18px] border-0 bg-[var(--pk-ink)] font-[inherit] text-lg font-bold text-[var(--pk-on-ink)] disabled:cursor-wait disabled:opacity-80">
          {pending ? t("start.creating") : t("start.create")}
        </button>
      </form>
      <div className="flex min-w-0 flex-[0_1_360px] flex-col items-center gap-3.5 rounded-[32px] bg-[var(--pk-hero)] px-5 py-7 max-sm:basis-full" aria-label={t("start.preview")} role="figure">
        <div className="text-[13px] font-bold tracking-[0.14em] text-[var(--pk-ink2)] uppercase">{t("start.preview")}</div>
        <div className="relative h-[563px] w-[260px] max-w-full overflow-hidden rounded-[38px] border-8 border-solid border-[#0E0D24] bg-[#0E0D24] shadow-[0_30px_60px_rgba(14,13,36,0.25)]" data-preview="">
          <img src={screen} alt={t("start.previewAlt", { demo: demo.name })} className="block h-full w-full object-cover object-top" />
          <div className="absolute inset-x-0 top-0 box-border flex h-[74px] items-end gap-2.5 px-3.5 pb-3" style={{ background: colour }} data-preview-bar={colour}>
            <span className="flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] text-[15px] font-extrabold" style={{ background: logo && !lightLogo ? "#FFFFFF" : onBar, color: colour }}>
              {logo ? <img src={logo.url} alt="" className="max-h-[80%] max-w-[80%] object-contain" /> : letter}
            </span>
            <span className="truncate text-base font-bold" style={{ color: onBar }}>
              {name.trim() || demo.name}
            </span>
          </div>
        </div>
        <div className="max-w-[260px] text-center text-[13px] text-[var(--pk-ink2)]">{t("start.previewNote", { demo: demo.name })}</div>
      </div>
    </div>
  );
}
