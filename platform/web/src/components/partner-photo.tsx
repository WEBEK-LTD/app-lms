"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Icon } from "./icon";
import type { PanelWords } from "@/lib/market/panel-words";
import { fill } from "@/lib/market/panel-words";
import type { BulkPhotoOutcome } from "@/lib/market/photos";
import { photoBatches, photosInZip, ZIP_PHOTO_NAME } from "@/lib/market/zip-browser";

const MAX_PHOTO = 5 * 1024 * 1024;
/** Under the server actions' 6 MB. */
const BATCH_BYTES = 4.5 * 1024 * 1024;

/**
 * 115 One product's photo, from the panel's Menu & stock: dropped or chosen,
 * shown before it is sent, then uploaded as the main photo or one more.
 */
export function PhotoDrop({ action, id, page, as, w, label }: { action: (f: FormData) => Promise<void>; id: number; page: number; as: "main" | "extra"; w: PanelWords; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  // Only a picture file is shown, drawn on a canvas: nothing from the file goes into the page as text or as an address.
  const show = (file: File | undefined) => setPreview(file && /^image\/(jpeg|png|webp)$/.test(file.type) ? file : null);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (!file || !input.current) return;
    const list = new DataTransfer();
    list.items.add(file);
    input.current.files = list.files;
    show(file);
  };
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="page" value={page} />
      <input type="hidden" name="as" value={as} />
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-3 py-3 text-[13px] font-semibold ${over ? "border-ember bg-peach" : "border-line-strong bg-white"} text-ink-2`}
      >
        {preview ? (
          <PhotoPreview file={preview} />
        ) : (
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-sand">
            <Icon name="photo_camera" size={22} className="text-accent" />
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="text-ink">{label}</span>
          <span className="text-[12px] font-medium text-muted">{w.photoRules}</span>
        </span>
        <input ref={input} type="file" name="photo" accept="image/jpeg,image/png,image/webp" required className="sr-only" onChange={(e) => show(e.target.files?.[0])} />
      </label>
      {preview ? (
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-midnight px-4 text-sm font-bold text-white hover:bg-ink-3">
          <Icon name="upload" size={17} />
          {w.uploadPhoto}
        </button>
      ) : null}
    </form>
  );
}

/** The chosen picture, decoded by the browser and drawn on a small canvas (cropped to a square). */
function PhotoPreview({ file }: { file: File }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    void createImageBitmap(file)
      .then((bitmap) => {
        const c = canvas.current;
        const ctx = c?.getContext("2d");
        if (cancelled || !c || !ctx) return bitmap.close();
        const side = Math.min(bitmap.width, bitmap.height);
        ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, c.width, c.height);
        bitmap.close();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [file]);
  return <canvas ref={canvas} width={96} height={96} aria-hidden className="h-12 w-12 flex-none rounded-xl bg-sand" />;
}

type Summary = { placed: number; unmatched: string[]; failed: { name: string; error: string }[] };

/**
 * 115 Bulk photos on the Import page: many pictures or a ZIP, read here in
 * the browser and sent a few at a time, each placed by its name (SKU or
 * barcode); and the picture links from imports, fetched on request.
 */
export function BulkPhotos({
  upload,
  fetchLinks,
  waiting,
  w,
}: {
  upload: (f: FormData) => Promise<BulkPhotoOutcome[] | { error: string }>;
  fetchLinks: () => Promise<{ fetched: number; failed: number; left: number } | { error: string }>;
  waiting: number;
  w: PanelWords;
}) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(waiting);
  const [fetched, setFetched] = useState<number | null>(null);

  const choose = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    setSummary(null);
    const files: { name: string; data: Uint8Array }[] = [];
    const tooBig: string[] = [];
    try {
      for (const file of Array.from(list)) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (/\.zip$/i.test(file.name)) {
          const inZip = await photosInZip(bytes, MAX_PHOTO);
          files.push(...inZip.files);
          tooBig.push(...inZip.skipped);
        } else if (ZIP_PHOTO_NAME.test(file.name)) {
          if (bytes.length > MAX_PHOTO) tooBig.push(file.name);
          else files.push({ name: file.name, data: bytes });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    const result: Summary = { placed: 0, unmatched: [], failed: tooBig.map((name) => ({ name, error: w.photoRules })) };
    const batches = photoBatches(files, BATCH_BYTES, 20);
    let done = 0;
    setProgress({ done, total: files.length });
    for (const batch of batches) {
      const form = new FormData();
      for (const f of batch) form.append("photos", new File([f.data as BlobPart], f.name));
      const answer = await upload(form).catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }));
      if ("error" in answer) {
        setError(answer.error);
        break;
      }
      for (const o of answer) {
        if (o.status === "main" || o.status === "extra") result.placed++;
        else if (o.status === "no_match") result.unmatched.push(o.name);
        else result.failed.push({ name: o.name, error: o.error ?? "" });
      }
      done += batch.length;
      setProgress({ done, total: files.length });
    }
    setProgress(null);
    setSummary(result);
  };

  const fetchAll = async () => {
    let total = 0;
    setFetched(0);
    for (let round = 0; round < 50; round++) {
      const answer = await fetchLinks().catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }));
      if ("error" in answer) {
        setError(answer.error);
        break;
      }
      total += answer.fetched;
      setFetched(total);
      setLeft(answer.left);
      if (answer.left === 0 || answer.fetched + answer.failed === 0) break;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[20px] border-2 border-dashed border-line-strong bg-sand px-6 py-8 text-center hover:border-ember">
        <Icon name="photo_library" size={32} className="text-accent" />
        <span className="text-sm font-bold text-ink-2">{w.choosePhotos}</span>
        <span className="text-[12px] text-muted">{w.photoRules}</span>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,.zip,application/zip" className="sr-only" disabled={progress !== null} onChange={(e) => void choose(e.target.files)} />
      </label>
      {progress ? <p className="m-0 text-sm font-semibold text-ink-2">{fill(w.sendingPhotos, { done: progress.done, total: progress.total })}</p> : null}
      {error ? <p className="m-0 rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      {summary ? (
        <div className="flex flex-col gap-2 text-sm">
          <p className="m-0 rounded-xl bg-success-bg px-4 py-2 font-bold text-success">{fill(w.photosPlaced, { n: summary.placed })}</p>
          {summary.unmatched.length ? (
            <p className="m-0 rounded-xl bg-peach px-4 py-2 font-semibold text-accent">
              {fill(w.photosUnmatched, { n: summary.unmatched.length })}: {summary.unmatched.slice(0, 12).join(", ")}
            </p>
          ) : null}
          {summary.failed.length ? (
            <ul className="m-0 flex list-none flex-col gap-1 rounded-xl bg-danger-bg px-4 py-2 text-[13px] text-danger">
              <li className="font-bold">{fill(w.photosFailed, { n: summary.failed.length })}</li>
              {summary.failed.slice(0, 8).map((f) => (
                <li key={f.name}>
                  <b>{f.name}</b>: {f.error}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="rounded-[20px] border border-line-soft bg-white p-4">
        <p className="m-0 text-sm font-extrabold text-midnight">{w.linkedTitle}</p>
        <p className="mt-1 mb-3 text-[13px] text-muted">{w.linkedText}</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-ink-2">{left ? fill(w.linkedWaiting, { n: left >= 1000 ? "1000+" : left }) : w.linkedNone}</span>
          {left ? (
            <button type="button" onClick={() => void fetchAll()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong px-4 text-sm font-bold text-ink hover:border-ember">
              <Icon name="download" size={17} />
              {fetched === null ? w.fetchNow : fill(w.fetching, { n: fetched })}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
