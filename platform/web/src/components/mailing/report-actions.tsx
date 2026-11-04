"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { archiveMailCampaignAction, cancelMailCampaignAction, duplicateMailCampaignAction, pauseMailCampaignAction, resumeMailCampaignAction } from "@/app/actions/admin-mail";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import type { MailCampaignStatus } from "@/lib/mailing/types";

/** 114 A campaign's report: pause, resume, cancel, duplicate, archive. */
export function CampaignActions({ id, status, archived, canSend, canEdit }: { id: string; status: MailCampaignStatus; archived: boolean; canSend: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: true; id?: string } | { ok: false; error: string }>, after?: (r: { ok: true; id?: string }) => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error);
      else {
        after?.(r);
        router.refresh();
      }
    });
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {canSend && status === "sending" ? (
          <button type="button" disabled={pending} onClick={() => run(() => pauseMailCampaignAction(id))} className={`${btn.secondary} h-10 cursor-pointer`} data-testid="pause">
            <Icon name="pause_circle" size={19} />
            Pause
          </button>
        ) : null}
        {canSend && status === "paused" ? (
          <button type="button" disabled={pending} onClick={() => run(() => resumeMailCampaignAction(id))} className={`${btn.primary} h-10 cursor-pointer`} data-testid="resume">
            <Icon name="play_circle" size={19} />
            Resume
          </button>
        ) : null}
        {canSend && (status === "sending" || status === "paused") ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Cancel the campaign? Nobody else gets it; the emails already sent stay sent.")) run(() => cancelMailCampaignAction(id));
            }}
            className={`${btn.danger} h-10 cursor-pointer`}
            data-testid="cancel"
          >
            <Icon name="cancel" size={19} />
            Cancel
          </button>
        ) : null}
        {canEdit ? (
          <button type="button" disabled={pending} onClick={() => run(() => duplicateMailCampaignAction(id), (r) => r.id && router.push(`/admin/email-campaigns/${r.id}`))} className={`${btn.secondary} h-10 cursor-pointer`} data-testid="duplicate">
            <Icon name="content_copy" size={19} />
            Duplicate
          </button>
        ) : null}
        {canEdit && (status === "sent" || status === "cancelled") ? (
          <button type="button" disabled={pending} onClick={() => run(() => archiveMailCampaignAction(id, !archived))} className={`${btn.ghost} h-10 cursor-pointer`}>
            <Icon name={archived ? "restore_from_trash" : "bookmark"} size={19} />
            {archived ? "Restore" : "Archive"}
          </button>
        ) : null}
      </div>
      {error ? <span className="text-[13px] font-semibold text-danger" role="alert">{error}</span> : null}
    </div>
  );
}

/** The report follows a campaign that is sending (every 10 seconds). */
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <p className="m-0 inline-flex w-fit items-center gap-2 rounded-xl border border-line bg-white px-3 py-1.5 text-[13px] font-bold text-success">
      <span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-success" />
      Live: the numbers update as it sends
    </p>
  );
}
