import type { Metadata } from "next";
import { ActionForm } from "@/components/community/site/action-form";
import { AdminPage, adminContext, Pager, StatusTabs, When, Who } from "@/components/community/site/admin";
import { cmLinks } from "@/components/community/site/links";
import { adminVerifications } from "@/components/community/site/source";
import { decideVerificationAction } from "../../trust-actions";

export const metadata: Metadata = { title: "Verification requests", robots: { index: false } };

const STATUSES = ["pending", "approved", "rejected"] as const;

/** 231 Pro Developer requests: the ID, the portfolio and the apps; approve, or reject with a reason the member is told. */
export default async function VerificationsPage({ searchParams }: { searchParams: Promise<{ status?: string; offset?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await adminContext();
  const status = STATUSES.find((s) => s === sp.status) ?? "pending";
  const offset = Math.max(0, Number(sp.offset) || 0);
  const list = await adminVerifications(viewer.id, { status, offset });
  const base = cmLinks.admin("verifications");
  return (
    <AdminPage w={w} tab="verifications">
      <StatusTabs base={base} value={status} options={[{ value: "pending", label: w.statusPending }, { value: "approved", label: w.statusApproved }, { value: "rejected", label: w.statusRejected }]} />
      {list.items.length ? (
        list.items.map((r) => (
          <article key={r.id} className="cm-card cm-adm">
            <div className="cm-row" style={{ justifyContent: "space-between" }}>
              <div><Who m={r.member} /> · <b>{r.fullName}</b></div>
              <span className="cm-muted"><When at={r.createdAt} lang={lang} /></span>
            </div>
            <dl>
              <dt>{w.idProof}</dt>
              <dd>{r.idProofUrl ? <a href={r.idProofUrl} target="_blank" rel="noopener noreferrer">{w.openFile}</a> : "—"}</dd>
              <dt>{w.portfolio}</dt>
              <dd>{r.portfolio.length ? r.portfolio.map((u) => <div key={u}><a href={u} target="_blank" rel="noopener noreferrer nofollow">{u}</a></div>) : "—"}</dd>
              <dt>{w.yourApps}</dt>
              <dd className="num">{r.apps.length} · {r.apps.map((a) => a.name).join(", ")}</dd>
            </dl>
            {r.status === "pending" ? (
              <ActionForm action={decideVerificationAction} className="cm-decide">
                <input type="hidden" name="id" value={r.id} />
                <label className="cm-field">
                  {w.reasonToMember}
                  <input name="reason" maxLength={500} />
                </label>
                <div className="cm-row" style={{ marginTop: 10 }}>
                  <button type="submit" name="decision" value="approve" className="cm-btn o"><span className="ms">check</span>{w.approve}</button>
                  <button type="submit" name="decision" value="reject" className="cm-btn g"><span className="ms">close</span>{w.reject}</button>
                </div>
              </ActionForm>
            ) : (
              <p className="cm-muted">{r.reason}</p>
            )}
          </article>
        ))
      ) : (
        <div className="cm-empty"><span className="ms f">inbox</span>{w.queueEmpty}</div>
      )}
      <Pager w={w} base={`${base}?status=${status}`} offset={offset} total={list.total} />
    </AdminPage>
  );
}
