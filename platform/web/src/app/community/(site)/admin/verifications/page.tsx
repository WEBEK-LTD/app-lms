import type { Metadata } from "next";
import { ActionForm } from "@/components/community/site/action-form";
import { AdminPage, adminContext, Pager, StatusTabs, When, Who } from "@/components/community/site/admin";
import { cmLinks } from "@/components/community/site/links";
import { adminVerifications } from "@/components/community/site/source";
import { decideVerificationAction, idProofAction } from "../../trust-actions";

export const metadata: Metadata = { title: "Verification requests", robots: { index: false } };

const STATUSES = ["pending", "approved", "rejected"] as const;

/** 231 Pro Developer requests: the ID (a link that lasts minutes), the portfolio and the apps; approve or reject with a reason the member is told. */
export default async function VerificationsPage({ searchParams }: { searchParams: Promise<{ status?: string; cursor?: string }> }) {
  const sp = await searchParams;
  const { lang, w } = await adminContext("verifications");
  const status = STATUSES.find((s) => s === sp.status) ?? "pending";
  const list = await adminVerifications({ status, cursor: sp.cursor });
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
              <dd>
                <form action={idProofAction} target="_blank">
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="cm-link"><span className="ms" aria-hidden="true">open_in_new</span>{w.openFile}</button>
                </form>
              </dd>
              <dt>{w.portfolio}</dt>
              <dd>{r.portfolio.length ? r.portfolio.map((u) => <div key={u}><a href={u} target="_blank" rel="noopener noreferrer nofollow">{u}</a></div>) : "—"}</dd>
              <dt>{w.yourApps}</dt>
              <dd><span className="num">{r.apps.length}</span> · {r.apps.map((a) => a.name).join(", ")}</dd>
            </dl>
            {r.status === "pending" ? (
              <ActionForm action={decideVerificationAction} className="cm-decide">
                <input type="hidden" name="id" value={r.id} />
                <label className="cm-field">
                  {w.reasonToMember}
                  <input name="reason" required minLength={3} maxLength={1000} />
                </label>
                <div className="cm-row" style={{ marginTop: 10 }}>
                  <button type="submit" name="decision" value="approve" className="cm-btn o"><span className="ms" aria-hidden="true">check</span>{w.approve}</button>
                  <button type="submit" name="decision" value="reject" className="cm-btn g"><span className="ms" aria-hidden="true">close</span>{w.reject}</button>
                </div>
              </ActionForm>
            ) : r.reason ? (
              <p className="cm-muted" style={{ marginTop: 8 }}>{r.reason}</p>
            ) : null}
          </article>
        ))
      ) : (
        <div className="cm-empty"><span className="ms f" aria-hidden="true">inbox</span>{w.queueEmpty}</div>
      )}
      <Pager w={w} base={`${base}?status=${status}`} cursor={sp.cursor} next={list.next} />
    </AdminPage>
  );
}
