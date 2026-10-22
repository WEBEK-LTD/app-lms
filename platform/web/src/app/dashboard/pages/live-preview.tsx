"use client";

import { useState, type RefObject } from "react";
import { PhoneFrame } from "@/components/device-frame";
import { useDashT } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";

/**
 * 82.1 The real app beside the editor: the app preview (public/preview-app)
 * with the Pages & look draft. The editor tells it after each save
 * (`notifyDraftSaved`); the app reloads its tabs and pages in place
 * (mobile/lib/modules/shared/pages/draft_reload.dart).
 */
export function LivePreview({ src, appName, frameRef }: { src: string; appName: string; frameRef: RefObject<HTMLIFrameElement | null> }) {
  const t = useDashT();
  const [reloads, setReloads] = useState(0);
  return (
    <div className="flex flex-col items-center gap-3">
      <PhoneFrame className="w-[340px] max-w-full" screenClassName="h-[min(680px,78vh)] bg-white" island={false} dir="ltr">
        <iframe
          key={reloads}
          ref={frameRef}
          src={`${src}&r=${reloads}`}
          title={t("pages.previewFrame", { app: appName })}
          className="block h-full w-full border-0"
          referrerPolicy="no-referrer"
          data-testid="editor-preview"
        />
      </PhoneFrame>
      <p className="m-0 max-w-[340px] text-center text-[13px] leading-snug text-muted">{t("pages.previewLiveNote")}</p>
      <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} onClick={() => setReloads((n) => n + 1)}>
        <Icon name="refresh" size={18} />
        {t("pages.previewReload")}
      </button>
    </div>
  );
}

/** Tells the app preview in the frame that the draft was saved: same origin only. */
export function notifyDraftSaved(frame: HTMLIFrameElement | null): void {
  frame?.contentWindow?.postMessage({ yallappPreview: "draft-saved" }, window.location.origin);
}
