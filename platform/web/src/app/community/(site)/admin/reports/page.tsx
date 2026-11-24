import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/community/site/action-form";
import { AdminPage, adminContext, Pager, StatusTabs, When, Who } from "@/components/community/site/admin";
import { cmLinks } from "@/components/community/site/links";
import { adminReports } from "@/components/community/site/source";
import { resolveReportAction } from "../../trust-actions";

export const metadata: Metadata = { title: "Reports", robots: { index: false } };

const STATUSES = ["open", "actioned", "dismissed"] as const;

/** 231 What members reported: take action or dismiss, with a note for the record. */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; cursor?: string }> }) {
  const sp = await searchParams;
  const { lang, w } = await adminContext("reports");
  const status = STATUSES.find((s) => s === sp.status) ?? "open";
  const list = await adminReports({ status, cursor: sp.cursor });
  const base = cmLinks.admin("reports");
  return (
    <AdminPage w={w} tab="reports">
      <StatusTabs base={base} value={status} options={[{ value: "open", label: w.statusOpen }, { value: "actioned", label: w.statusActioned }, { value: "dismissed", label: w.statusDismissed }]} />
      {list.items.length ? (
        list.items.map((r) => (
          <article key={r.id} className="cm-card cm-adm">
            <div className="cm-row" style={{ justifyContent: "space-between" }}>
              <div className="cm-row" style={{ gap: 6 }}>
                <span className="pill p-or">{(w as Record<string, string>)[`reason_${r.reason}`] ?? r.reason}</span>
                <span className="pill p-gy">{r.targetType}</span>
                {r.link ? <Link href={r.link} className="cm-link"><span className="ms">open_in_new</span>{w.openPost}</Link> : null}
              </div>
              <span className="cm-muted"><When at={r.createdAt} lang={lang} /></span>
            </div>
            <dl>
              <dt>{w.reportedBy}</dt>
              <dd><Who m={r.reporter} /></dd>
              {r.note ? (<><dt>{w.reportNote}</dt><dd>{r.note}</dd></>) : null}
            </dl>
            {r.status === "open" ? (
              <ActionForm action={resolveReportAction} className="cm-decide">
                <input type="hidden" name="id" value={r.id} />
                <label className="cm-field">
                  {w.noteForRecord}
                  <input name="note" maxLength={1000} />
                </label>
                <div className="cm-row" style={{ marginTop: 10 }}>
                  <button type="submit" name="status" value="actioned" className="cm-btn o"><span className="ms">gavel</span>{w.actioned}</button>
                  <button type="submit" name="status" value="dismissed" className="cm-btn g"><span className="ms">close</span>{w.dismiss}</button>
                </div>
              </ActionForm>
            ) : null}
          </article>
        ))
      ) : (
        <div className="cm-empty"><span className="ms f">flag</span>{w.queueEmpty}</div>
      )}
      <Pager w={w} base={`${base}?status=${status}`} cursor={sp.cursor} next={list.next} />
    </AdminPage>
  );
}
