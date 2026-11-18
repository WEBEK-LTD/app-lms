"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { listMediaAction, shareMediaAction, type PickableMedia } from "@/app/actions/media";
import type { MediaKind } from "@/lib/data/types";
import { Icon } from "./icon";
import { btn } from "./ui";
import { useDashT, useKnownText } from "./dashboard-i18n";
import { SHAPE_NAMES, type LibraryPicture } from "@/lib/pages/picture-library";
import { richText } from "@/i18n/rich";
import type { DashKey } from "@/i18n/dashboard";

/** The kinds pages and lessons use (77: not the chat's voice messages and documents). */
type PickKind = Exclude<MediaKind, "audio" | "file">;

const KIND_WORDS: Record<PickKind, { yours: DashKey; none: DashKey; icon: "smart_display" | "image" | "assignment" }> = {
  video: { yours: "media.yourVideos", none: "media.noneVideos", icon: "smart_display" },
  image: { yours: "media.yourPictures", none: "media.nonePictures", icon: "image" },
  pdf: { yours: "media.yourPdfs", none: "media.nonePdfs", icon: "assignment" },
};

type Loaded = Awaited<ReturnType<typeof listMediaAction>>;

/**
 * 192 What the picker last found, per kind (and pages' extras), for this
 * tab: opening it again shows them at once while it looks for new uploads.
 */
const found = new Map<string, { at: number; data: Loaded }>();
/** How long a find stays fresh enough not to be fetched again when only hovered. */
const FRESH_MS = 60_000;

/**
 * 51 "Choose from Media": the app's ready files of one kind in a dialog;
 * choosing one hands its Yallapp link to `onPick`. With `share`, a video
 * chosen for a page opens for anyone with the app (its link is public).
 * 192 Quick: it starts looking when the pointer reaches the button (or it
 * gets the focus), shows what it found last time at once, and pictures
 * show as pictures, with tiles in their place while they come.
 */
export function MediaPicker({ kind, onPick, label, share = false, library = false }: { kind: PickKind; onPick: (link: string) => void; label?: string; share?: boolean; library?: boolean }) {
  const t = useDashT();
  const known = useKnownText();
  const dialog = useRef<HTMLDialogElement>(null);
  const key = `${kind}:${library ? 1 : 0}`;
  const cached = found.get(key)?.data;
  const [items, setItems] = useState<PickableMedia[] | null>(cached?.items ?? null);
  // 84.2 Yallapp's pictures, for pictures on pages.
  const [pictures, setPictures] = useState<LibraryPicture[]>(cached?.library ?? []);
  // 97.3 The pictures of the draft's Figma look.
  const [figma, setFigma] = useState<{ name: string; url: string }[]>(cached?.figma ?? []);
  // 174 The shop's own product photos.
  const [products, setProducts] = useState<{ name: string; url: string }[]>(cached?.products ?? []);
  const [available, setAvailable] = useState(cached?.available ?? true);
  const [loading, startLoading] = useTransition();
  const [pending, start] = useTransition();
  const asking = useRef(false);
  const words = KIND_WORDS[kind];

  const show = (data: Loaded) => {
    setItems(data.items);
    setPictures(data.library);
    setFigma(data.figma);
    setProducts(data.products);
    setAvailable(data.available);
  };
  const load = () => {
    if (asking.current) return;
    asking.current = true;
    startLoading(async () => {
      try {
        const data = await listMediaAction({ kind, library });
        found.set(key, { at: Date.now(), data });
        show(data);
      } finally {
        asking.current = false;
      }
    });
  };
  /** The pointer on the button, or the focus: start looking unless what's found is fresh. */
  const prefetch = () => {
    const last = found.get(key);
    if (!last || Date.now() - last.at > FRESH_MS) load();
  };
  const open = () => {
    const last = found.get(key);
    if (last) show(last.data);
    dialog.current?.showModal();
    // Shown at once from last time; new uploads join when they're found.
    load();
  };
  // 174 Uploading from the picker: Media in a new tab (Studio's, in Studio), then the new files here.
  const mediaHref = usePathname()?.startsWith("/studio") ? "/studio/project/media" : "/dashboard/media";
  const pick = (item: PickableMedia) => {
    start(async () => {
      if (share && !item.public) await shareMediaAction({ id: item.id });
      onPick(item.link);
      dialog.current?.close();
    });
  };
  const pictureGrid = kind === "image";

  return (
    <>
      <button type="button" onClick={open} onPointerEnter={prefetch} onFocus={prefetch} className={`${btn.secondary} h-9 self-start px-3 text-sm`}>
        <Icon name="photo_library" size={18} />
        {label ?? t("media.chooseFrom")}
      </button>
      <dialog
        ref={dialog}
        aria-label={t(words.yours)}
        className="m-auto w-[min(640px,calc(100vw-32px))] rounded-2xl border border-line bg-white p-0 backdrop:bg-midnight/40"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="flex max-h-[min(86vh,820px)] flex-col gap-4 overflow-y-auto p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 flex items-center gap-2 text-lg font-bold">
              {t(words.yours)}
              {loading && items !== null ? <Icon name="progress_activity" size={18} className="animate-spin text-muted" /> : null}
            </h2>
            <button type="button" onClick={() => dialog.current?.close()} className={`${btn.ghost} h-9 px-2`} aria-label={t("common.close")}>
              <Icon name="close" size={20} />
            </button>
          </div>
          {items === null ? (
            // 192 Tiles where the pictures will be, while they come.
            <div aria-busy="true" className="flex flex-col gap-2" data-picker-loading="">
              <span className="sr-only">{t("media.loading")}</span>
              <ul aria-hidden="true" className={`m-0 list-none p-0 ${pictureGrid ? "grid grid-cols-3 gap-2 sm:grid-cols-4" : "flex flex-col gap-1.5"}`}>
                {Array.from({ length: pictureGrid ? 8 : 4 }, (_, i) => (
                  <li key={i} className={`rounded-xl bg-ivory motion-safe:animate-pulse ${pictureGrid ? "aspect-square" : "h-[60px]"}`} />
                ))}
              </ul>
            </div>
          ) : items.length === 0 ? (
            <p className="m-0 text-[15px] text-ink-4">
              {richText(available ? t(words.none) : t("media.unavailable"), {
                link: (chunk) => (
                  <Link href={mediaHref} target="_blank">
                    {chunk}
                  </Link>
                ),
              })}
            </p>
          ) : pictureGrid ? (
            // 192 The app's own pictures as pictures, the newest first, each with its name.
            <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4" data-picker-mine="">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => pick(item)}
                    className="group flex w-full cursor-pointer flex-col gap-1 rounded-xl border border-line bg-white p-1 text-start hover:border-midnight focus-visible:border-midnight"
                    aria-label={t("media.use", { name: item.name })}
                    title={item.name}
                  >
                    <span className="block aspect-square w-full overflow-hidden rounded-lg bg-ivory">
                      {item.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- the app's own picture, on Yallapp
                        <img src={item.thumbUrl} alt="" loading="lazy" decoding="async" className="block h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-muted">
                          <Icon name={words.icon} size={26} />
                        </span>
                      )}
                    </span>
                    <span className="truncate px-1 text-[12px] font-semibold">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => pick(item)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2 text-start hover:border-midnight"
                    aria-label={t("media.use", { name: item.name })}
                  >
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-ivory">
                      <Icon name={words.icon} size={22} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-semibold">{item.name}</span>
                      <span className="text-[13px] text-muted">{item.size}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {library && available ? (
            <div className="flex flex-wrap items-center gap-2" data-picker-upload="">
              <a href={mediaHref} target="_blank" rel="noopener" className={`${btn.secondary} h-9 px-3 text-sm no-underline`}>
                <Icon name="upload" size={18} />
                {t("studio.pickerUpload")}
                <span className="sr-only">{t("common.opensInNewTab")}</span>
              </a>
              <button type="button" onClick={load} disabled={loading} className={`${btn.ghost} h-9 px-3 text-sm`}>
                <Icon name="refresh" size={18} />
                {t("studio.pickerRefresh")}
              </button>
            </div>
          ) : null}
          {products.length ? (
            <section aria-labelledby="h-product-pictures" className="flex flex-col gap-2 border-t border-line-soft pt-3">
              <h3 id="h-product-pictures" className="m-0 text-[15px] font-bold">
                {t("studio.pickerProducts")}
              </h3>
              <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
                {products.map((picture) => (
                  <li key={picture.url}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(picture.url);
                        dialog.current?.close();
                      }}
                      className="block w-full cursor-pointer overflow-hidden rounded-lg border border-line p-0 hover:border-midnight"
                      aria-label={t("media.use", { name: picture.name })}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- the shop's own product photo, on Yallapp */}
                      <img src={picture.url} alt="" className="block aspect-video w-full object-cover" loading="lazy" decoding="async" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {figma.length ? (
            <section aria-labelledby="h-figma-pictures" className="flex flex-col gap-2 border-t border-line-soft pt-3">
              <h3 id="h-figma-pictures" className="m-0 text-[15px] font-bold">
                {t("media.figmaPictures")}
              </h3>
              <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
                {figma.map((picture) => (
                  <li key={picture.url}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(picture.url);
                        dialog.current?.close();
                      }}
                      className="block w-full cursor-pointer overflow-hidden rounded-lg border border-line p-0 hover:border-midnight"
                      aria-label={t("media.use", { name: picture.name || t("media.figmaPictures") })}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- the owner's own picture, on Yallapp */}
                      <img src={picture.url} alt="" className="block aspect-video w-full object-cover" loading="lazy" decoding="async" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {pictures.length ? (
            <section aria-labelledby="h-picture-library" className="flex flex-col gap-2 border-t border-line-soft pt-3">
              <h3 id="h-picture-library" className="m-0 text-[15px] font-bold">
                {t("media.library")}
              </h3>
              <p className="m-0 text-[13px] text-muted">{t("media.libraryText")}</p>
              <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
                {pictures.map((picture) => {
                  const name = `${known(picture.palette)} · ${known(SHAPE_NAMES[picture.shape])}`;
                  return (
                    <li key={picture.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onPick(picture.url);
                          dialog.current?.close();
                        }}
                        className="block w-full cursor-pointer overflow-hidden rounded-lg border border-line p-0 hover:border-midnight"
                        aria-label={t("media.use", { name })}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- a small, ready picture of ours */}
                        <img src={picture.url} alt="" className="block aspect-video w-full object-cover" loading="lazy" decoding="async" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
          {share ? <p className="m-0 text-[13px] text-muted">{t("media.sharedVideo")}</p> : null}
        </div>
      </dialog>
    </>
  );
}

/**
 * 51 Photos chosen from the Media library for a product or a listing: sent
 * with the form as `mediaImage` fields (the server keeps only the app's own
 * ready pictures), after the photos it already has.
 */
export function MediaImagesPicker() {
  const t = useDashT();
  const [chosen, setChosen] = useState<string[]>([]);
  return (
    <div className="flex flex-col gap-2">
      {chosen.length ? (
        <ul aria-label={t("media.photosFrom")} className="m-0 flex list-none flex-wrap gap-3 p-0">
          {chosen.map((id, i) => (
            <li key={id} className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/m/${id}`} alt={t("media.photoN", { n: i + 1 })} className="h-20 w-20 rounded-lg border border-line object-cover" />
              <input type="hidden" name="mediaImage" value={id} />
              <button type="button" onClick={() => setChosen((list) => list.filter((x) => x !== id))} className="text-[13px] text-danger">
                {t("common.remove")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <MediaPicker
        kind="image"
        label={t("media.addPhoto")}
        onPick={(link) => {
          const id = link.split("/").pop() ?? "";
          setChosen((list) => (list.includes(id) ? list : [...list, id]));
        }}
      />
    </div>
  );
}

/** 51 The picker next to an ordinary form field: the chosen file's link goes into the field `inputId`. */
export function MediaPickButton({ kind, inputId, label }: { kind: PickKind; inputId: string; label?: string }) {
  return (
    <MediaPicker
      kind={kind}
      label={label}
      onPick={(link) => {
        const input = document.getElementById(inputId) as HTMLInputElement | null;
        if (!input) return;
        input.value = link;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
      }}
    />
  );
}
