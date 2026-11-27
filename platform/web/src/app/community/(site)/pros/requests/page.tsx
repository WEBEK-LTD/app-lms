import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { cmTarget } from "@/components/community/site/redirect";
import { hireRequests } from "@/components/community/site/next";
import { ApiButton, ApiForm, Empty, PageHead, PageNote, Who } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { ago } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Hire requests" };

/** 234 Hire requests, received (as the pro: accept, decline, done) or sent (as the client: cancel, done, then a review). */
export default async function HireRequestsPage({ searchParams }: { searchParams: Promise<{ side?: string; error?: string; done?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(cmLinks.hireRequests())));
  const w2 = CM_WORDS2[lang];
  const box = sp.side === "sent" ? "sent" : "received";
  const list = await hireRequests(box);
  const back = cmLinks.hireRequests(box === "sent" ? "sent" : undefined);
  const st = { pending: w2.status_pending, accepted: w2.status_accepted, declined: w2.status_declined, done: w2.status_done, cancelled: w2.status_cancelled };
  return (
    <SitePage active="pros">
      <PageHead title={w2.hireRequests} intro={w2.noMoneyNote} />
      <PageNote sp={sp} w2={w2} doneText={{ hired: w2.hireSent }} />
      <div className="cm-tabs">
        <Link href={cmLinks.hireRequests()} className={box === "received" ? "on" : ""}>{w2.received}</Link>
        <Link href={cmLinks.hireRequests("sent")} className={box === "sent" ? "on" : ""}>{w2.sent}</Link>
      </div>
      {list.items.length ? (
        list.items.map((r) => {
          const p = `/pros/requests/${encodeURIComponent(r.id)}`;
          const other = box === "sent" ? r.pro : r.client;
          return (
            <article key={r.id} className="cm-card">
              <div className="cm-row">
                <div style={{ flex: 1, minWidth: 0 }}><Who member={other} w={w} sub={`${r.service ? `${r.service} · ` : ""}${ago(w, r.created_at)}`} size={36} /></div>
                <span className={`pill ${r.status === "done" ? "p-gr" : "p-gy"}`}>{st[r.status]}</span>
              </div>
              <p className="cm-body">{r.message}</p>
              <div className="cm-row">
                <Link href={cmLinks.conversation(r.conversation_id)} className="cm-btn g"><span className="ms" aria-hidden="true">chat_bubble</span>{w2.message}</Link>
                {box === "received" && r.status === "pending" ? (
                  <>
                    <ApiButton call={{ m: "PATCH", p, back }} fields={{ status: "accepted" }} className="cm-btn o" label={w2.accept} />
                    <ApiButton call={{ m: "PATCH", p, back }} fields={{ status: "declined" }} className="cm-btn g" label={w2.decline} />
                  </>
                ) : null}
                {r.status === "accepted" ? <ApiButton call={{ m: "PATCH", p, back }} fields={{ status: "done" }} className="cm-btn o" label={w2.markDone} /> : null}
                {box === "sent" && r.status === "pending" ? <ApiButton call={{ m: "PATCH", p, back }} fields={{ status: "cancelled" }} className="cm-link" label={w2.cancelRequest} /> : null}
              </div>
              {box === "sent" && r.status === "done" ? (
                <ApiForm call={{ m: "PUT", p: `${p}/review`, back, done: "saved" }} className="cm-review-form">
                  <h3>{w2.writeReview}</h3>
                  <fieldset className="cm-radios cm-stars-in">
                    <legend className="cm-sr">{w2.rating}</legend>
                    {[1, 2, 3, 4, 5].map((n) => <label key={n}><input type="radio" name="n:rating" value={n} required defaultChecked={r.review?.rating === n} /> {n}★</label>)}
                  </fieldset>
                  <textarea name="text" maxLength={2000} rows={3} defaultValue={r.review?.text ?? ""} aria-label={w2.writeReview} />
                  <button type="submit" className="cm-btn g">{w2.saveChanges}</button>
                </ApiForm>
              ) : null}
            </article>
          );
        })
      ) : <Empty icon="inbox" text={w2.noRequests} />}
    </SitePage>
  );
}
