import type { Metadata } from "next";
import { AdminPage, adminContext } from "@/components/community/site/admin";
import { pointsTable } from "@/components/community/site/next";
import { PageNote } from "@/components/community/site/next-ui";
import { CM_WORDS2 } from "@/components/community/site/words2";
import { pointsAction } from "../../next-actions";

export const metadata: Metadata = { title: "Points and levels", robots: { index: false } };

/** 233 The points for each action and their daily caps (abuse limits), and the levels with their names; audit-logged. */
export default async function AdminPointsPage({ searchParams }: { searchParams: Promise<{ error?: string; done?: string }> }) {
  const sp = await searchParams;
  const { lang, w } = await adminContext("points");
  const w2 = CM_WORDS2[lang];
  const t = await pointsTable();
  const levels = [...(t?.levels ?? []), { key: "", min_points: 0, name: { en: "", ar: "", tr: "" } }];
  return (
    <AdminPage w={w} tab="points">
      <PageNote sp={sp} w2={w2} />
      <form action={pointsAction} className="cm-card" style={{ overflowX: "auto" }}>
        <h2>{w2.adminPoints}</h2>
        <table className="cm-table">
          <thead><tr><th>{w2.action}</th><th>{w2.pointsWord}</th><th>{w2.dailyCap}</th></tr></thead>
          <tbody>
            {(t?.actions ?? []).map((a) => (
              <tr key={a.action}>
                <td><code>{a.action}</code><input type="hidden" name="action" value={a.action} /></td>
                <td><input className="cm-num-in" type="number" name="points" defaultValue={a.points} step={1} aria-label={`${a.action} ${w2.pointsWord}`} /></td>
                <td><input className="cm-num-in" type="number" name="daily_cap" defaultValue={a.daily_cap ?? ""} min={0} step={1} aria-label={`${a.action} ${w2.dailyCap}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2 style={{ marginTop: 20 }}>{w2.levels}</h2>
        <table className="cm-table">
          <thead><tr><th>Key</th><th>{w2.fromPoints}</th><th>English</th><th>العربية</th><th>Türkçe</th></tr></thead>
          <tbody>
            {levels.map((l, i) => (
              <tr key={l.key || `new-${i}`}>
                <td><input className="cm-num-in" name="level_key" defaultValue={l.key} aria-label={`Key ${i + 1}`} /></td>
                <td><input className="cm-num-in" type="number" name="level_min" defaultValue={l.min_points} min={0} aria-label={`${w2.fromPoints} ${i + 1}`} /></td>
                <td><input name="level_en" defaultValue={l.name.en} aria-label={`English ${i + 1}`} /></td>
                <td><input name="level_ar" defaultValue={l.name.ar} dir="rtl" aria-label={`العربية ${i + 1}`} /></td>
                <td><input name="level_tr" defaultValue={l.name.tr} aria-label={`Türkçe ${i + 1}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.saveChanges}</button></div>
      </form>
    </AdminPage>
  );
}
