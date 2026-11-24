import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/community/site/action-form";
import { AdminPage, adminContext, Pager, StatusTabs, When, Who } from "@/components/community/site/admin";
import { cmLinks } from "@/components/community/site/links";
import { adminModeration } from "@/components/community/site/source";
import { decideModerationAction } from "../../trust-actions";

export const metadata: Metadata = { title: "Moderation queue", robots: { index: false } };

const STATUSES = ["pending", "approved", "rejected"] as const;

/** 231 Posts held for review (a new member's first posts, too many or blocked links, repeated text): approve or reject. */
export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ status?: string; offset?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await adminContext();
  const status = STATUSES.find((s) => s === sp.status) ?? "pending";
  const offset = Math.max(0, Number(sp.offset) || 0);
  const list = await adminModeration(viewer.id, { status, offset });
  const base = cmLinks.admin("moderation");
  return (
    <AdminPage w={w} tab="moderation">
      <StatusTabs base={base} value={status} options={[{ value: "pending", label: w.statusPending }, { value: "approved", label: w.statusApproved }, { value: "rejected", label: w.statusRejected }]} />
      {list.items.length ? (
        list.items.map((m) => (
          <article key={m.id} className="cm-card cm-adm">
            <div className="cm-row" style={{ justifyContent: "space-between" }}>
              <div><span className="pill p-gy">{m.kind}</span> <Who m={m.member} /></div>
              <span className="cm-muted"><When at={m.createdAt} lang={lang} /></span>
            </div>
            {m.title ? <h3 style={{ marginTop: 8 }}>{m.link ? <Link href={m.link}>{m.title}</Link> : m.title}</h3> : null}
            <blockquote className="cm-quote">{m.excerpt}</blockquote>
            <div className="cm-row" style={{ gap: 6 }}>
              {m.reasons.map((r) => <span key={r} className="pill p-or">{r}</span>)}
            </div>
            {m.status === "pending" ? (
              <ActionForm action={decideModerationAction} className="cm-decide">
                <input type="hidden" name="id" value={m.id} />
                <label className="cm-field">
                  {w.reasonToMember}
                  <input name="reason" maxLength={500} />
                </label>
                <div className="cm-row" style={{ marginTop: 10 }}>
                  <button type="submit" name="decision" value="approve" className="cm-btn o"><span className="ms">check</span>{w.approve}</button>
                  <button type="submit" name="decision" value="reject" className="cm-btn g"><span className="ms">close</span>{w.reject}</button>
                </div>
              </ActionForm>
            ) : null}
          </article>
        ))
      ) : (
        <div className="cm-empty"><span className="ms f">task_alt</span>{w.queueEmpty}</div>
      )}
      <Pager w={w} base={`${base}?status=${status}`} offset={offset} total={list.total} />
    </AdminPage>
  );
}
