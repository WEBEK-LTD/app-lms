"use client";

import { Icon } from "@/components/icon";
import { KitDrawer } from "@/components/studio-page/client";
import { btn } from "@/components/ui";

/**
 * 132.147 A picture, video or voice message opens right on the page: the
 * drawer shows it, plays it in the page's own player, and has its download.
 * (Opened on its own, a video from the gate stayed at 0:00 in Chromium: the
 * gate served it sandboxed. The gate no longer does, but a gate not yet
 * updated on its server still plays here.)
 */
export function MediaViewer({
  kind,
  src,
  download,
  name,
  openLabel,
  closeLabel,
  downloadLabel,
}: {
  kind: "image" | "video" | "audio";
  src: string;
  download: string;
  name: string;
  openLabel: string;
  closeLabel: string;
  downloadLabel: string;
}) {
  return (
    <KitDrawer
      title={<span className="break-all">{name}</span>}
      closeLabel={closeLabel}
      triggerClassName={`${btn.secondary} h-9 px-3.5 text-sm`}
      trigger={
        <>
          <Icon name="open_in_new" size={18} />
          {openLabel}
        </>
      }
    >
      <div className="flex flex-col gap-4" data-media-viewer={kind}>
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- a signed link to the media gate, not an optimisable asset
          <img src={src} alt={name} className="block h-auto max-h-[70dvh] w-full rounded-2xl bg-(--sp-soft) object-contain" />
        ) : kind === "video" ? (
          <video src={src} controls playsInline preload="metadata" className="block max-h-[70dvh] w-full rounded-2xl bg-black" aria-label={name} />
        ) : (
          <audio src={src} controls preload="metadata" className="block w-full" aria-label={name} />
        )}
        <a href={download} className={`${btn.secondary} h-10 self-start px-4 text-sm`} download>
          <Icon name="download" size={18} />
          {downloadLabel}
        </a>
      </div>
    </KitDrawer>
  );
}
