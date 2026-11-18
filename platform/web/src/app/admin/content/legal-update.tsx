"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Badge, Notice, btn } from "@/components/ui";
import { sentences, type LegalChange } from "@/lib/content/legal-diff";

/** What the admin's form gets of lib/content/legal-updates.ts › LegalUpdate. */
export interface LegalUpdateView {
  updatedOn: string;
  updated: string;
  hash: string;
  baseUpdated: string | null;
  changes: (LegalChange & { pending: boolean })[];
}

/** The heading of a change's section, without its #. */
function sectionName(section: string | null): string {
  return section ? section.replace(/^#+\s*/, "") : "Before the first section";
}

function Change({ change }: { change: LegalUpdateView["changes"][number] }) {
  const label = change.type === "added" ? "New paragraph" : change.type === "changed" ? "Changed paragraph" : "Removed paragraph";
  return (
    <li data-legal-change={change.type} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-4">
      <span className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-[0.5px] text-muted">
        <span>{sectionName(change.section).toUpperCase()}</span>
        <span aria-hidden="true">·</span>
        <span>{label}</span>
        {change.type !== "removed" ? (
          change.pending ? <Badge tone="warn">Not in your version</Badge> : <Badge tone="success">Already in your version</Badge>
        ) : null}
      </span>
      {change.type === "added" ? (
        <p dir="auto" className="m-0 rounded-lg bg-success-bg px-3 py-2 text-[15px] leading-relaxed">
          <ins className="no-underline">{change.text}</ins>
        </p>
      ) : change.type === "changed" ? (
        <p dir="auto" className="m-0 text-[15px] leading-relaxed text-ink-2">
          {sentences(change.to).map((s, i) => {
            const added = change.added.some((a) => a.text === s);
            return (
              <span key={i}>
                {i > 0 ? " " : ""}
                {added ? <ins className="rounded bg-success-bg px-0.5 font-semibold no-underline">{s}</ins> : s}
              </span>
            );
          })}
          {change.removed.map((s, i) => (
            <span key={`r${i}`}>
              {" "}
              <del className="rounded bg-danger-bg px-0.5">{s}</del>
            </span>
          ))}
        </p>
      ) : (
        <p dir="auto" className="m-0 text-[15px] leading-relaxed">
          <del className="rounded bg-danger-bg px-0.5">{change.text}</del>
        </p>
      )}
    </li>
  );
}

/**
 * 172 The notice on a legal page whose saved version lacks changes made to
 * Yallapp's default text since, with "Review the changes" and "Add the new
 * text". Adding only changes the form: nothing is saved until Save.
 */
export function LegalUpdatePanel({
  update,
  onAdd,
  result,
}: {
  update: LegalUpdateView;
  onAdd: () => void;
  result: { placed: number; unplaced: string[] } | null;
}) {
  const [open, setOpen] = useState(false);
  const pending = update.changes.filter((c) => c.pending).length;
  return (
    <section aria-label="Changes to Yallapp's default text" data-legal-update="" className="flex flex-col gap-3">
      <Notice tone="warn" icon="new_releases" role="status">
        <span className="flex flex-col gap-1">
          <strong>
            Yallapp&apos;s default text for this page was updated on {update.updatedOn}. Your saved version doesn&apos;t have the changes.
          </strong>
          <span>
            {pending === 1 ? "1 paragraph" : `${pending} paragraphs`} of the default {pending === 1 ? "is" : "are"} new or changed
            {update.baseUpdated ? ` since the version of ${update.baseUpdated} your text started from` : ""}. Review them, add them to your text, then save.
          </span>
        </span>
      </Notice>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={`${btn.secondary} h-10`} aria-expanded={open} aria-controls="legal-changes" onClick={() => setOpen((o) => !o)}>
          <Icon name="visibility" size={18} />
          {open ? "Hide the changes" : "Review the changes"}
        </button>
        <button type="button" className={`${btn.secondary} h-10`} onClick={onAdd} disabled={result !== null}>
          <Icon name="history" size={18} />
          Add the new text
        </button>
      </div>
      {open ? (
        <ol id="legal-changes" aria-label="What the default added or changed" className="m-0 flex list-none flex-col gap-3 p-0">
          {update.changes.map((c, i) => (
            <Change key={i} change={c} />
          ))}
        </ol>
      ) : null}
      {result ? (
        result.unplaced.length ? (
          <Notice tone="warn" icon="warning" role="alert">
            {result.placed ? `${result.placed} of the changes ${result.placed === 1 ? "is" : "are"} in the text below, where the default has them. ` : ""}
            {result.unplaced.length === 1 ? "One part" : `${result.unplaced.length} parts`} of the new text couldn&apos;t be placed: {result.unplaced.length === 1 ? "it's" : "they're"} between the
            two ==== lines, at the end of {result.unplaced.length === 1 ? "its" : "their"} section. Move {result.unplaced.length === 1 ? "it" : "them"} to {result.unplaced.length === 1 ? "its" : "their"} place
            and delete the ==== lines, then click Save and publish. Nothing is published until you save.
          </Notice>
        ) : (
          <Notice tone="info" icon="info" role="status">
            The new text is in the text below, where the default has it, and the last updated date is {update.updated}. Check it, then click Save and publish. Nothing is
            published until you save.
          </Notice>
        )
      ) : null}
    </section>
  );
}
