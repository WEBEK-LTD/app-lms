"use client";

import { useEffect, useState, type DragEvent } from "react";
import { listMediaAction, type PickableMedia } from "@/app/actions/media";
import { useDashT } from "@/components/dashboard-i18n";
import type { LibraryPicture } from "@/lib/pages/picture-library";
import { Glyph, type DragPayload } from "./shared";

/**
 * Editor audit 3.3: the project's pictures and Yallapp's, always beside the
 * canvas. Drag one onto the phone to place it there, or click it to add it
 * after what's selected. The pictures are the media picker's (same list).
 */
export function PicturesPanel({ query, onAdd, onDragStart }: { query: string; onAdd: (payload: DragPayload) => void; onDragStart: (e: DragEvent, payload: DragPayload) => void }) {
  const t = useDashT();
  const [items, setItems] = useState<PickableMedia[] | null>(null);
  const [library, setLibrary] = useState<LibraryPicture[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    listMediaAction({ kind: "image", library: true })
      .then((r) => {
        if (!live) return;
        setItems(r.items);
        setLibrary(r.library);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  if (failed) return <p className="px-3 text-[13px]" style={{ color: "var(--studio-muted)" }}>{t("studio.picturesFailed")}</p>;
  if (!items) return <p className="px-3 text-[13px]" style={{ color: "var(--studio-muted)" }}>{t("studio.picturesLoading")}</p>;

  const q = query.trim().toLowerCase();
  const own = items.filter((i) => !q || i.name.toLowerCase().includes(q));
  const tile = (key: string, src: string, alt: string, payload: DragPayload) => (
    <li key={key}>
      <button
        type="button"
        draggable
        onDragStart={(e) => onDragStart(e, payload)}
        onClick={() => onAdd(payload)}
        title={alt}
        aria-label={`${t("studio.addPicture")}: ${alt}`}
        className="studio-tile block w-full overflow-hidden rounded-[10px] bg-white p-0"
        style={{ border: "1px solid var(--studio-line)", cursor: "grab" }}
        data-studio-picture=""
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed links and Yallapp's pictures, shown as they are */}
        <img src={src} alt="" className="block aspect-square w-full object-cover" loading="lazy" draggable={false} />
      </button>
    </li>
  );

  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      <p className="m-0 text-xs" style={{ color: "var(--studio-muted)" }}>
        {t("studio.picturesHint")}
      </p>
      <div className="text-xs font-bold" style={{ color: "var(--studio-muted)" }}>
        {t("studio.picturesMine")}
      </div>
      {own.length ? (
        <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">{own.map((i) => tile(i.id, i.thumbUrl ?? i.link, i.name, { kind: "picture", url: i.link, ...(i.public ? {} : { share: i.id }) }))}</ul>
      ) : (
        <p className="m-0 flex items-center gap-1.5 text-[13px]" style={{ color: "var(--studio-muted)" }}>
          <Glyph name="photo_library" size={18} />
          {t("studio.picturesNone")}
        </p>
      )}
      {library.length && !q ? (
        <>
          <div className="pt-1 text-xs font-bold" style={{ color: "var(--studio-muted)" }}>
            {t("studio.picturesYallapp")}
          </div>
          <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">{library.map((p) => tile(p.url, p.url, `${p.palette} ${p.shape}`, { kind: "picture", url: p.url }))}</ul>
        </>
      ) : null}
    </div>
  );
}
