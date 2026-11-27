import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage, adminContext } from "@/components/community/site/admin";
import { cmLinks } from "@/components/community/site/links";
import { event, events, type CmEvent } from "@/components/community/site/next";
import { ApiButton, ApiForm, PageNote, When } from "@/components/community/site/next-ui";
import { CM_WORDS2, type CmWords2 } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Events", robots: { index: false } };

const ZONES = ["Europe/Istanbul", "Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Europe/London", "UTC"];

function EventFields({ w2, e }: { w2: CmWords2; e?: CmEvent }) {
  const tz = e?.time_zone ?? "Europe/Istanbul";
  // The stored UTC time, shown in the event's own zone for editing.
  const local = (iso: string | null | undefined) => {
    if (!iso) return "";
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  };
  return (
    <>
      <label className="cm-field">{w2.title}<input name="title" required maxLength={140} defaultValue={e?.title ?? ""} /></label>
      <label className="cm-field">{w2.description}<textarea name="description" maxLength={8000} defaultValue={e?.description ?? ""} /></label>
      <div className="cm-row" style={{ gap: 14 }}>
        <label className="cm-field" style={{ flex: 1 }}>{w2.eventKind}<select name="kind" defaultValue={e?.kind ?? "live"}><option value="live">{w2.live}</option><option value="online">{w2.online}</option><option value="in_person">{w2.inPerson}</option></select></label>
        <label className="cm-field" style={{ flex: 1 }}>{w2.timeZone}<select name="time_zone" defaultValue={tz}>{ZONES.map((z) => <option key={z} value={z}>{z}</option>)}</select></label>
        <label className="cm-field" style={{ flex: 1 }}>{w2.startsAt}<input type="datetime-local" name="d:starts_at" required defaultValue={local(e?.starts_at)} /></label>
        <label className="cm-field" style={{ flex: 1 }}>{w2.endsAt}<input type="datetime-local" name="d:ends_at" defaultValue={local(e?.ends_at)} /></label>
      </div>
      <div className="cm-row" style={{ gap: 14 }}>
        <label className="cm-field" style={{ flex: 2 }}>{w2.embedUrl}<input type="url" name="embed_url" defaultValue={e?.embed_url ?? ""} placeholder="https://www.youtube.com/live/…" /></label>
        <label className="cm-field" style={{ flex: 2 }}>{w2.joinUrl}<input type="url" name="join_url" defaultValue={e?.join_url ?? ""} placeholder="https://" /></label>
      </div>
      <div className="cm-row" style={{ gap: 14 }}>
        <label className="cm-field" style={{ flex: 2 }}>{w2.location}<input name="location" maxLength={200} defaultValue={e?.location ?? ""} /></label>
        <label className="cm-field" style={{ flex: 1 }}>{w2.capacity}<input type="number" name="n:capacity" min={1} defaultValue={e?.capacity ?? ""} /></label>
        <label className="cm-field" style={{ flex: 2 }}>{w2.replayUrl}<input type="url" name="replay_url" defaultValue={e?.replay_url ?? ""} placeholder="https://" /></label>
      </div>
      <label className="cm-field">{w2.cover}<input type="url" name="cover_url" defaultValue={e?.cover_url ?? ""} placeholder="https://" /></label>
    </>
  );
}

/** 234 The admin's events and live sessions (an embed link; no streaming of our own): create, change (the replay link after), cancel. */
export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ id?: string; error?: string; done?: string }> }) {
  const sp = await searchParams;
  const { lang, w } = await adminContext("events");
  const w2 = CM_WORDS2[lang];
  const back = cmLinks.admin("events");
  const [upcoming, past, open] = await Promise.all([events({ when: "upcoming" }), events({ when: "past" }), sp.id ? event(sp.id) : Promise.resolve(null)]);
  return (
    <AdminPage w={w} tab="events">
      <PageNote sp={sp} w2={w2} />
      {open ? (
        <ApiForm call={{ m: "PATCH", p: `/admin/events/${encodeURIComponent(open.id)}`, back: `${back}?id=${encodeURIComponent(open.id)}`, done: "saved" }} className="cm-card">
          <h2>{open.title}</h2>
          <EventFields w2={w2} e={open} />
          <div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.saveChanges}</button><Link href={back} className="cm-btn g">{w2.cancel}</Link></div>
        </ApiForm>
      ) : (
        <details className="cm-card">
          <summary className="cm-btn o" style={{ display: "inline-flex" }}><span className="ms" aria-hidden="true">add</span>{w2.newEvent}</summary>
          <ApiForm call={{ m: "POST", p: "/admin/events", back, done: "saved" }}>
            <EventFields w2={w2} />
            <div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.newEvent}</button></div>
          </ApiForm>
        </details>
      )}
      <div className="cm-card" style={{ overflowX: "auto" }}>
        <table className="cm-table">
          <thead><tr><th>{w2.title}</th><th>{w2.startsAt}</th><th>{w2.going}</th><th /></tr></thead>
          <tbody>
            {[...upcoming.items, ...past.items].map((e) => (
              <tr key={e.id} className={e.status === "cancelled" ? "off" : ""}>
                <td><Link href={cmLinks.event(e.id)}>{e.title}</Link></td>
                <td><When at={e.starts_at} lang={lang} /></td>
                <td>{e.going_count}</td>
                <td className="cm-row" style={{ gap: 10 }}>
                  <Link href={`${back}?id=${encodeURIComponent(e.id)}`} className="cm-link">{w2.edit}</Link>
                  {e.status !== "cancelled" ? <ApiButton call={{ m: "DELETE", p: `/admin/events/${encodeURIComponent(e.id)}`, back }} className="cm-link" label={w2.cancel} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}
