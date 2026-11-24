import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/community/site/action-form";
import { BadgePill } from "@/components/community/site/badge";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { goldStatus } from "@/components/community/site/source";
import { fill } from "@/components/community/site/words";
import { verifyAction } from "../trust-actions";

export const metadata: Metadata = { title: "Pro Developer verification", robots: { index: false } };

/**
 * 231 The Gold badge's ("Pro Developer") request: full name, an ID, portfolio
 * links, and the apps of the linked Yallapp account, filled in from it. The
 * form shows only to a member with 5 or more apps.
 */
export default async function VerifyPage() {
  const { w, viewer } = await siteContext();
  if (!viewer) redirect(cmLinks.signIn(cmLinks.verify()));
  const g = await goldStatus(viewer.id);
  const count = g.apps.length;
  return (
    <SitePage active="none">
      <div style={{ maxWidth: 760 }}>
        <section className="cm-card">
          <BadgePill kind="gold" w={w} />
          <h1 style={{ marginTop: 10 }}>{w.verifyTitle}</h1>
          <p className="cm-muted" style={{ marginTop: 6 }}>{fill(w.verifyIntro, { n: g.minApps })}</p>
          <div className="cm-meter" role="progressbar" aria-valuemin={0} aria-valuemax={g.minApps} aria-valuenow={Math.min(count, g.minApps)} aria-label={w.appsMade}>
            <i style={{ width: `${Math.min(100, (count / g.minApps) * 100)}%` }} />
          </div>
          <div className="cm-muted num" style={{ fontSize: 13, marginTop: 6 }}>{fill(w.appsCount, { n: count, min: g.minApps })}</div>
        </section>
        {g.request ? (
          <div className={`cm-note ${g.request.status === "rejected" ? "err" : g.request.status === "approved" ? "ok" : ""}`} role="status" style={{ marginBottom: 16 }}>
            <span className="ms f">{g.request.status === "pending" ? "hourglass_top" : g.request.status === "approved" ? "check_circle" : "cancel"}</span>
            <div>
              <b>{g.request.status === "pending" ? w.verifyPending : g.request.status === "approved" ? w.verifyApproved : w.verifyRejected}</b>
              {g.request.reason ? <div>{g.request.reason}</div> : null}
            </div>
          </div>
        ) : null}
        {g.blocked === "no_linked_account" ? (
          <div className="cm-card cm-row">
            <span style={{ flex: 1 }}>{w.linkFirst}</span>
            <Link href={cmLinks.settings()} className="cm-btn n"><span className="ms">link</span>{w.linkAccount}</Link>
          </div>
        ) : null}
        {g.blocked === "not_enough_apps" ? <div className="cm-card cm-muted">{fill(w.needMoreApps, { n: g.minApps - count })}</div> : null}
        {g.canApply ? (
          <ActionForm action={verifyAction} className="cm-card">
            <h2>{w.verifyForm}</h2>
            <label className="cm-field">
              {w.fullName}
              <input name="fullName" required minLength={3} maxLength={120} autoComplete="name" />
            </label>
            <label className="cm-field">
              {w.idProof}
              <input name="idProof" type="file" required accept="image/png,image/jpeg,image/webp,application/pdf" />
              <small>{w.idProofHint}</small>
            </label>
            <div className="cm-field">
              {w.portfolio}
              {[0, 1, 2, 3, 4].map((i) => (
                <input key={i} name="portfolio" type="url" inputMode="url" placeholder={i === 0 ? "https://" : undefined} aria-label={`${w.portfolio} ${i + 1}`} pattern="https://.+" />
              ))}
              <small>{w.portfolioHint}</small>
            </div>
            <div className="cm-field">
              {w.yourApps}
              <ul className="cm-applist">
                {g.apps.map((a) => (
                  <li key={a.id}>
                    <span className="ms">{a.template ? "storefront" : "apps"}</span>
                    {a.name}
                    {a.template ? <span className="pill p-vi">{w.template}</span> : null}
                  </li>
                ))}
              </ul>
              <small>{w.appsAutoFilled}</small>
            </div>
            <div className="cm-row" style={{ marginTop: 18 }}>
              <button type="submit" className="cm-btn o"><span className="ms">workspace_premium</span>{w.apply}</button>
            </div>
          </ActionForm>
        ) : null}
      </div>
    </SitePage>
  );
}
