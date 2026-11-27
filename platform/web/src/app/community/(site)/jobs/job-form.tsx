import type { Job } from "@/components/community/site/next";
import type { CmWords2 } from "@/components/community/site/words2";

export const JOB_TYPES = ["full_time", "part_time", "contract", "freelance", "internship"] as const;

/** A job's fields (posting or changing one). */
export function JobFields({ w2, job }: { w2: CmWords2; job?: Job }) {
  return (
    <>
      <label className="cm-field">{w2.jobTitle}<input name="title" required minLength={5} maxLength={120} defaultValue={job?.title ?? ""} /></label>
      <div className="cm-row" style={{ gap: 14 }}>
        <label className="cm-field" style={{ flex: 1 }}>{w2.jobType}<select name="type" defaultValue={job?.type ?? "freelance"}>{JOB_TYPES.map((t) => <option key={t} value={t}>{w2[`jt_${t}`]}</option>)}</select></label>
        <label className="cm-field" style={{ flex: 1 }}>{w2.location}<input name="location" maxLength={120} defaultValue={job?.location ?? ""} /></label>
        <label className="cm-field" style={{ flex: 1 }}>{w2.budget}<input name="budget" maxLength={80} defaultValue={job?.budget ?? ""} /></label>
      </div>
      <input type="hidden" name="b:remote" value="0" />
      <label className="cm-check" style={{ marginTop: 12 }}><input type="checkbox" name="b:remote" value="1" defaultChecked={job?.remote ?? true} /> {w2.remote}</label>
      <label className="cm-field">{w2.skills}<input name="l:skills" maxLength={600} defaultValue={job?.skills.join(", ") ?? ""} /></label>
      <label className="cm-field">{w2.description}<textarea name="description" required minLength={30} maxLength={8000} defaultValue={job?.description ?? ""} style={{ minHeight: 200 }} /></label>
      <p className="cm-muted cm-small">{w2.noMoneyNote}</p>
    </>
  );
}
