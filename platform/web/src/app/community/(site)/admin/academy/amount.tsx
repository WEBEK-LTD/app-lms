import { ACADEMY_WORDS } from "@/components/community/site/academy-words";
import type { CmLang } from "@/components/community/site/words";
import { getCommunityStore } from "@/lib/community/store/server";
import { YALLAPP_TENANT } from "@/lib/community/types";
import { coursePriceAction } from "../../next-actions";

/** 233 A course's price in US dollars (the gateway converts it at the team's rate), set by the admin; bought on the website only (the API the app reads never carries it). */
export async function PriceForm({ courseId, lang, save }: { courseId: string; lang: CmLang; save: string }) {
  const wa = ACADEMY_WORDS[lang];
  const c = await (await getCommunityStore(YALLAPP_TENANT)).qa.academy.getCourse(courseId).catch(() => null);
  return (
    <form action={coursePriceAction} className="cm-card">
      <h2>{wa.coursePrice}</h2>
      <input type="hidden" name="course_id" value={courseId} />
      <div className="cm-row" style={{ gap: 14 }}>
        <label className="cm-field" style={{ flex: 1 }}>{wa.coursePrice} (USD)<input name="amount" inputMode="decimal" defaultValue={c?.priceMinor != null ? (c.priceMinor / 100).toFixed(2) : ""} placeholder="29.00" /></label>
      </div>
      <div className="cm-row" style={{ marginTop: 14 }}><button type="submit" className="cm-btn o">{save}</button></div>
    </form>
  );
}
