import type { Metadata } from "next";
import { AdminPage, adminContext, Pager, When, Who } from "@/components/community/site/admin";
import { cmLinks } from "@/components/community/site/links";
import { adminAudit } from "@/components/community/site/source";

export const metadata: Metadata = { title: "Audit log", robots: { index: false } };

/** 231 Every badge granted or taken away, every decision and settings change: who, what, about whom, why and when. */
export default async function AuditPage({ searchParams }: { searchParams: Promise<{ offset?: string }> }) {
  const offset = Math.max(0, Number((await searchParams).offset) || 0);
  const { lang, w, viewer } = await adminContext();
  const list = await adminAudit(viewer.id, { offset });
  return (
    <AdminPage w={w} tab="audit">
      {list.items.length ? (
        <div className="cm-card" style={{ overflowX: "auto" }}>
          <table className="cm-table">
            <thead><tr><th>{w.when}</th><th>{w.by}</th><th>{w.action}</th><th>{w.members}</th><th>{w.privateReason}</th></tr></thead>
            <tbody>
              {list.items.map((e) => (
                <tr key={e.id}>
                  <td><When at={e.at} lang={lang} /></td>
                  <td>{e.actor ? <Who m={e.actor} /> : <span className="cm-muted">{w.automatic}</span>}</td>
                  <td><code>{e.action}</code>{e.badge ? ` · ${e.badge}` : ""}{e.subject ? ` · ${e.subject}` : ""}</td>
                  <td><Who m={e.member} /></td>
                  <td>{e.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="cm-empty"><span className="ms f">history</span>{w.nothingYet}</div>
      )}
      <Pager w={w} base={cmLinks.admin("audit")} offset={offset} total={list.total} />
    </AdminPage>
  );
}
