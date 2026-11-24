import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/community/site/action-form";
import { AdminPage, adminContext, Pager, StatusTabs, When, Who } from "@/components/community/site/admin";
import { cmLinks } from "@/components/community/site/links";
import { adminReports } from "@/components/community/site/source";
import { resolveReportAction } from "../../trust-actions";

export const metadata: Metadata = { title: "Reports", robots: { index: false } };

const STATUSES = ["open", "upheld", "dismissed"] as const;

/** 231 What members reported: uphold (and hide the post) or dismiss, with a note for the record. */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; offset?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await adminContext();
  const status = STATUSES.find((s) => s === sp.status) ?? "open";
  const offset = Math.max(0, Number(sp.offset) || 0);
  const list = await adminReports(viewer.id, { status, offset });
  const base = cmLinks.admin("reports");
  return (
    <AdminPage w={w} tab="reports">
      <StatusTabs base={base} value={status} options={[{ value: "open", label: w.statusOpen }, { value: "upheld", label: w.statusUpheld }, { value: "dismissed", label: w.statusDismissed }]} />
      {list.items.length ? (
        list.items.map((r) => (
          <article key={r.id} className="cm-card cm-adm">
            <div className="cm-row" style={{ justifyContent: "space-between" }}>
              <div>
                <span className="pill p-or">{w[`reason_${r.reason}` as keyof typeof w] ?? r.reason}</span> <span className="pill p-gy">{r.target}</span>{" "}
                {r.link ? <Link href={r.link} className="cm-strong">{w.openPost}</Link> : null}
              </div>
              <span className="cm-muted"><When at={r.createdAt} lang={lang} /></span>
            </div>
            <dl>
              <dt>{w.reportedBy}</dt>
              <dd><Who m={r.reporter} /></dd>
              <dt>{w.about}</dt>
              <dd><Who m={r.targetMember} /></dd>
              {r.details ? (<><dt>{w.reportNote}</dt><dd>{r.details}</dd></>) : null}
            </dl>
            {r.status === "open" ? (
              <ActionForm action={resolveReportAction} className="cm-decide">
                <input type="hidden" name="id" value={r.id} />
                <label className="cm-field">
                  {w.noteForRecord}
                  <input name="note" maxLength={500} />
                </label>
                <label className="cm-check" style={{ marginTop: 10 }}><input type="checkbox" name="hide" value="1" defaultChecked /> {w.hidePost}</label>
                <div className="cm-row" style={{ marginTop: 10 }}>
                  <button type="submit" name="decision" value="uphold" className="cm-btn o"><span className="ms">gavel</span>{w.uphold}</button>
                  <button type="submit" name="decision" value="dismiss" className="cm-btn g"><span className="ms">close</span>{w.dismiss}</button>
                </div>
              </ActionForm>
            ) : null}
          </article>
        ))
      ) : (
        <div className="cm-empty"><span className="ms f">flag</span>{w.queueEmpty}</div>
      )}
      <Pager w={w} base={`${base}?status=${status}`} offset={offset} total={list.total} />
    </AdminPage>
  );
}
