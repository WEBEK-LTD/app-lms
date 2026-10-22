"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { listMediaAction, shareMediaAction, type PickableMedia } from "@/app/actions/media";
import type { MediaKind } from "@/lib/data/types";
import { Icon } from "./icon";
import { btn } from "./ui";
import { useDashT } from "./dashboard-i18n";
import { richText } from "@/i18n/rich";
import type { DashKey } from "@/i18n/dashboard";

/** The kinds pages and lessons use (77: not the chat's voice messages and documents). */
type PickKind = Exclude<MediaKind, "audio" | "file">;

const KIND_WORDS: Record<PickKind, { yours: DashKey; none: DashKey; icon: "smart_display" | "image" | "assignment" }> = {
  video: { yours: "media.yourVideos", none: "media.noneVideos", icon: "smart_display" },
  image: { yours: "media.yourPictures", none: "media.nonePictures", icon: "image" },
  pdf: { yours: "media.yourPdfs", none: "media.nonePdfs", icon: "assignment" },
};

/**
 * 51 "Choose from Media": the app's ready files of one kind in a dialog;
 * choosing one hands its Yallapp link to `onPick`. With `share`, a video
 * chosen for a page opens for anyone with the app (its link is public).
 */
export function MediaPicker({ kind, onPick, label, share = false }: { kind: PickKind; onPick: (link: string) => void; label?: string; share?: boolean }) {
  const t = useDashT();
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<PickableMedia[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [pending, start] = useTransition();
  const words = KIND_WORDS[kind];

  const open = () => {
    dialog.current?.showModal();
    start(async () => {
      const result = await listMediaAction({ kind });
      setItems(result.items);
      setAvailable(result.available);
    });
  };
  const pick = (item: PickableMedia) => {
    start(async () => {
      if (share && !item.public) await shareMediaAction({ id: item.id });
      onPick(item.link);
      dialog.current?.close();
    });
  };

  return (
    <>
      <button type="button" onClick={open} className={`${btn.secondary} h-9 self-start px-3 text-sm`}>
        <Icon name="photo_library" size={18} />
        {label ?? t("media.chooseFrom")}
      </button>
      <dialog
        ref={dialog}
        aria-label={t(words.yours)}
        className="m-auto w-[min(560px,calc(100vw-32px))] rounded-2xl border border-line bg-white p-0 backdrop:bg-midnight/40"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-lg font-bold">{t(words.yours)}</h2>
            <button type="button" onClick={() => dialog.current?.close()} className={`${btn.ghost} h-9 px-2`} aria-label={t("common.close")}>
              <Icon name="close" size={20} />
            </button>
          </div>
          {items === null ? (
            <p className="m-0 text-sm text-muted">{pending ? t("media.loading") : ""}</p>
          ) : items.length === 0 ? (
            <p className="m-0 text-[15px] text-ink-4">
              {richText(available ? t(words.none) : t("media.unavailable"), {
                link: (chunk) => (
                  <Link href="/dashboard/media" target="_blank">
                    {chunk}
                  </Link>
                ),
              })}
            </p>
          ) : (
            <ul className="m-0 flex max-h-[60vh] list-none flex-col gap-1.5 overflow-y-auto p-0">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => pick(item)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2 text-start hover:border-midnight"
                    aria-label={t("media.use", { name: item.name })}
                  >
                    {item.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbUrl} alt="" className="h-11 w-11 flex-none rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-ivory">
                        <Icon name={words.icon} size={22} />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-semibold">{item.name}</span>
                      <span className="text-[13px] text-muted">{item.size}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
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
