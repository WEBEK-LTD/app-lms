import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/community/site/action-form";
import { AdminPage, adminContext, Pager, StatusTabs, When, Who } from "@/components/community/site/admin";
import { cmLinks } from "@/components/community/site/links";
import { adminModeration } from "@/components/community/site/source";
import { fill } from "@/components/community/site/words";
import { decideModerationAction } from "../../trust-actions";

export const metadata: Metadata = { title: "Moderation queue", robots: { index: false } };

const STATUSES = ["open", "approved", "removed"] as const;

/** 231 Posts held for review (a new member's first posts, the spam filter, reports): approve or remove. */
export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ status?: string; cursor?: string }> }) {
  const sp = await searchParams;
  const { lang, w } = await adminContext();
  const status = STATUSES.find((s) => s === sp.status) ?? "open";
  const list = await adminModeration({ status, cursor: sp.cursor });
  const base = cmLinks.admin("moderation");
  return (
    <AdminPage w={w} tab="moderation">
      <StatusTabs base={base} value={status} options={[{ value: "open", label: w.statusPending }, { value: "approved", label: w.statusApproved }, { value: "removed", label: w.statusRemoved }]} />
      {list.items.length ? (
        list.items.map((m) => (
          <article key={m.id} className="cm-card cm-adm">
            <div className="cm-row" style={{ justifyContent: "space-between" }}>
              <div className="cm-row" style={{ gap: 6 }}>
                <span className="pill p-gy">{m.targetType}</span>
                <span className="pill p-or">{w[`cause_${m.cause}`]}</span>
                {m.reportCount ? <span className="pill p-or">{fill(w.reportsCount, { n: m.reportCount })}</span> : null}
                <Who m={m.author} />
              </div>
              <span className="cm-muted"><When at={m.createdAt} lang={lang} /></span>
            </div>
            <blockquote className="cm-quote">{m.preview}</blockquote>
            {m.link ? <Link href={m.link} className="cm-link"><span className="ms">open_in_new</span>{w.openPost}</Link> : null}
            {m.status === "open" ? (
              <ActionForm action={decideModerationAction} className="cm-decide">
                <input type="hidden" name="id" value={m.id} />
                <label className="cm-field">
                  {w.note}
                  <input name="note" maxLength={1000} />
                </label>
                <div className="cm-row" style={{ marginTop: 10 }}>
                  <button type="submit" name="decision" value="approve" className="cm-btn o"><span className="ms">check</span>{w.approve}</button>
                  <button type="submit" name="decision" value="remove" className="cm-btn g"><span className="ms">delete</span>{w.removePost}</button>
                </div>
              </ActionForm>
            ) : m.note ? (
              <p className="cm-muted">{m.note}</p>
            ) : null}
          </article>
        ))
      ) : (
        <div className="cm-empty"><span className="ms f">task_alt</span>{w.queueEmpty}</div>
      )}
      <Pager w={w} base={`${base}?status=${status}`} cursor={sp.cursor} next={list.next} />
    </AdminPage>
  );
}
