import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";

/**
 * 132.147 A picture, video or voice message opens right on the page: shown,
 * played in the page's own player. (Opened on its own, a video from the gate
 * stayed at 0:00 in Chromium: the gate served it sandboxed. The gate no
 * longer does, but a gate not yet updated on its server still plays here.)
 * 132.160 In the file's inspector, as the console shows an entry's picture;
 * a PDF or a document as its icon on a soft tile.
 */
export function MediaPreview({ kind, src, name, icon }: { kind: "image" | "video" | "audio" | "pdf" | "file"; src: string | null; name: string; icon: IconName }) {
  if (src && kind === "image") {
    return (
      <div data-media-viewer={kind}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a signed link to the media gate, not an optimisable asset */}
        <img src={src} alt={name} className="block aspect-[16/10] w-full rounded-[14px] bg-(--sp-soft) object-contain" />
      </div>
    );
  }
  if (src && kind === "video") {
    return (
      <div data-media-viewer={kind}>
        <video src={src} controls playsInline preload="metadata" className="block aspect-video w-full rounded-[14px] bg-black" aria-label={name} />
      </div>
    );
  }
  if (src && kind === "audio") {
    return (
      <div data-media-viewer={kind} className="flex flex-col gap-3 rounded-[14px] bg-(--sp-soft) p-4">
        <Icon name="mic" size={28} className="text-(--sp-muted)" />
        <audio src={src} controls preload="metadata" className="block w-full" aria-label={name} />
      </div>
    );
  }
  return (
    <span aria-hidden="true" className="flex aspect-[16/10] w-full items-center justify-center rounded-[14px] bg-(--sp-tile) text-(--sp-muted)">
      <Icon name={icon} size={44} />
    </span>
  );
}
