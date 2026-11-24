import type { Metadata } from "next";
import { ActionForm } from "@/components/community/site/action-form";
import { AdminPage, adminContext, When, Who } from "@/components/community/site/admin";
import { BadgePill } from "@/components/community/site/badge";
import { cmLinks } from "@/components/community/site/links";
import { adminFindMember } from "@/components/community/site/source";
import { grantAction, revokeAction } from "../../trust-actions";

export const metadata: Metadata = { title: "Badges", robots: { index: false } };

/**
 * 231 A member's badges, by username: grant any badge with a private reason
 * and an optional end date, or take one away with a reason. A badge an
 * admin grants never ends on its own unless given a date; every change goes
 * in the audit log.
 */
export default async function BadgesPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const sp = await searchParams;
  const { lang, w } = await adminContext("badges");
  const handle = (sp.member ?? "").trim().replace(/^@/, "").toLowerCase();
  const found = handle ? await adminFindMember(handle) : null;
  const held = found ? found.badges.filter((b) => !b.revokedAt) : [];
  return (
    <AdminPage w={w} tab="badges">
      <form className="cm-card cm-row" action={cmLinks.admin("badges")}>
        <label className="cm-field" style={{ flex: 1, marginTop: 0 }}>
          {w.username}
          <input name="member" defaultValue={handle} placeholder="@username" required />
        </label>
        <button type="submit" className="cm-btn n" style={{ alignSelf: "flex-end" }}><span className="ms">search</span>{w.find}</button>
      </form>
      {handle && !found ? <div className="cm-empty"><span className="ms f">person_off</span>{w.noMember}</div> : null}
      {found ? (
        <>
          <section className="cm-card" style={{ overflowX: "auto" }}>
            <h2><Who m={found} /> <span className="cm-muted">@{found.handle}</span></h2>
            {found.badges.length ? (
              <table className="cm-table">
                <thead><tr><th>{w.badges}</th><th>{w.source}</th><th>{w.privateReason}</th><th>{w.by}</th><th>{w.since}</th><th>{w.ends}</th></tr></thead>
                <tbody>
                  {found.badges.map((b) => (
                    <tr key={b.id} className={b.revokedAt ? "off" : ""}>
                      <td><BadgePill kind={b.badge} w={w} /></td>
                      <td>{w[`source_${b.source}`]}</td>
                      <td>{b.revokedAt ? `${w.removed}: ${b.revokeReason ?? ""}` : (b.reason ?? "—")}</td>
                      <td>{b.grantedBy ? <Who m={b.grantedBy} /> : <span className="cm-muted">{w.automatic}</span>}</td>
                      <td><When at={b.grantedAt} lang={lang} /></td>
                      <td>{b.expiresAt ? <When at={b.expiresAt} lang={lang} /> : w.never}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="cm-muted">{w.noBadges}</p>
            )}
          </section>
          <div className="cm-two">
            <ActionForm action={grantAction} className="cm-card">
              <h2>{w.grantBadge}</h2>
              <input type="hidden" name="memberId" value={found.id} />
              <label className="cm-field">
                {w.badges}
                <select name="badge" required defaultValue="">
                  <option value="" disabled>—</option>
                  <option value="gold">{w.badgeGold}</option>
                  <option value="green">{w.badgeGreen}</option>
                  <option value="blue">{w.badgeBlue}</option>
                </select>
              </label>
              <label className="cm-field">
                {w.privateReason}
                <input name="reason" required minLength={3} maxLength={1000} />
                <small>{w.privateReasonHint}</small>
              </label>
              <label className="cm-field">
                {w.endsOptional}
                <input name="expiresAt" type="date" />
              </label>
              <button type="submit" className="cm-btn o" style={{ marginTop: 14 }}><span className="ms">workspace_premium</span>{w.grant}</button>
            </ActionForm>
            {held.length ? (
              <ActionForm action={revokeAction} className="cm-card">
                <h2>{w.revokeBadge}</h2>
                <input type="hidden" name="memberId" value={found.id} />
                <label className="cm-field">
                  {w.badges}
                  <select name="badge" required defaultValue="">
                    <option value="" disabled>—</option>
                    {held.map((b) => (
                      <option key={b.id} value={b.badge}>{b.badge === "gold" ? w.badgeGold : b.badge === "green" ? w.badgeGreen : w.badgeBlue}</option>
                    ))}
                  </select>
                </label>
                <label className="cm-field">
                  {w.privateReason}
                  <input name="reason" required minLength={3} maxLength={1000} />
                </label>
                <button type="submit" className="cm-btn g" style={{ marginTop: 14 }}><span className="ms">remove_moderator</span>{w.revoke}</button>
              </ActionForm>
            ) : null}
          </div>
        </>
      ) : null}
    </AdminPage>
  );
}
