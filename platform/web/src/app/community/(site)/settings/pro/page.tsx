import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { cmTarget } from "@/components/community/site/redirect";
import { myPro, showcase } from "@/components/community/site/next";
import { ApiButton, PageHead, PageNote } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { CM_WORDS2 } from "@/components/community/site/words2";
import { proAction } from "../../next-actions";

export const metadata: Metadata = { title: "Pro profile" };

/** 234 Open or change one's pro profile; up to ten services, rates as text only. */
export default async function ProEditPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const { lang, viewer } = await siteContext();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(cmLinks.proEdit())));
  const w2 = CM_WORDS2[lang];
  const [p, apps] = await Promise.all([myPro(), showcase({ member: `@${viewer.handle}` })]);
  const services = [...(p?.services ?? []), { title: "", rate: "", description: "" }, { title: "", rate: "", description: "" }].slice(0, 10);
  const chosen = new Set(p?.portfolio.map((s) => s.id) ?? []);
  return (
    <SitePage active="pros">
      <PageHead title={p ? w2.editPro : w2.openPro} intro={w2.noMoneyNote} />
      <PageNote sp={sp} w2={w2} />
      <form action={proAction} className="cm-card">
        <label className="cm-field">{w2.headline}<input name="headline" required minLength={3} maxLength={120} defaultValue={p?.headline ?? ""} /></label>
        <label className="cm-field">{w2.about}<textarea name="about" maxLength={4000} defaultValue={p?.about ?? ""} /></label>
        <fieldset className="cm-field">
          <legend>{w2.services}</legend>
          {services.map((s, i) => (
            <div key={i} className="cm-service-row">
              <input name="service_title" placeholder={w2.serviceTitle} maxLength={120} defaultValue={s.title} aria-label={`${w2.serviceTitle} ${i + 1}`} />
              <input name="service_rate" placeholder={w2.rate} maxLength={80} defaultValue={s.rate ?? ""} aria-label={`${w2.rate} ${i + 1}`} />
              <input name="service_description" placeholder={w2.description} maxLength={1000} defaultValue={s.description ?? ""} aria-label={`${w2.description} ${i + 1}`} />
            </div>
          ))}
        </fieldset>
        <label className="cm-field">{w2.skills}<input name="skills" maxLength={800} defaultValue={p?.skills.join(", ") ?? ""} /></label>
        <label className="cm-field">{w2.availability}
          <select name="availability" defaultValue={p?.availability ?? "available"}>
            <option value="available">{w2.available}</option><option value="busy">{w2.busy}</option><option value="unavailable">{w2.unavailable}</option>
          </select>
        </label>
        {apps.items.length ? (
          <fieldset className="cm-field cm-radios">
            <legend>{w2.portfolio}</legend>
            {apps.items.map((a) => <label key={a.id}><input type="checkbox" name="showcase_ids" value={a.id} defaultChecked={chosen.has(a.id)} /> {a.title}</label>)}
          </fieldset>
        ) : null}
        <div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.saveChanges}</button></div>
      </form>
      {p ? <div className="cm-row"><ApiButton call={{ m: "DELETE", p: "/me/pro", back: cmLinks.proEdit(), to: cmLinks.pros() }} className="cm-link" icon="close" label={w2.closePro} /></div> : null}
    </SitePage>
  );
}
