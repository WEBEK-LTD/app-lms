import type { Metadata } from "next";
import { ActionForm } from "@/components/community/site/action-form";
import { AdminPage, adminContext } from "@/components/community/site/admin";
import { adminSettings } from "@/components/community/site/source";
import { settingsAction } from "../../trust-actions";

export const metadata: Metadata = { title: "Community settings", robots: { index: false } };

/** 231 The Blue badge's rules, who may create groups (phase 2's groups read it), and moderation. */
export default async function AdminSettingsPage() {
  const { w } = await adminContext("settings");
  const s = await adminSettings();
  if (!s) return <AdminPage w={w} tab="settings"><div className="cm-empty">{w.errorGeneric}</div></AdminPage>;
  const n = (name: string, label: string, value: number, min = 0, max = 100000) => (
    <label className="cm-field">
      {label}
      <input name={name} type="number" min={min} max={max} step={1} required defaultValue={value} />
    </label>
  );
  return (
    <AdminPage w={w} tab="settings">
      <ActionForm action={settingsAction}>
        <section className="cm-card">
          <h2>{w.blueRules}</h2>
          <p className="cm-muted">{w.blueRulesHint}</p>
          <div className="cm-grid2">
            {n("minAccountDays", w.minAccountDays, s.blue.minAccountDays, 0, 3650)}
            {n("minPoints", w.minPoints, s.blue.minPoints)}
            {n("minAcceptedAnswers", w.minAcceptedAnswers, s.blue.minAcceptedAnswers)}
            {n("minApprovedTutorials", w.minApprovedTutorials, s.blue.minApprovedTutorials)}
            {n("violationFreeDays", w.violationFreeDays, s.blue.violationFreeDays, 0, 3650)}
            {n("inactiveDays", w.inactiveDays, s.blue.inactiveDays, 1, 3650)}
          </div>
        </section>
        <section className="cm-card">
          <h2>{w.whoCreatesGroups}</h2>
          <p className="cm-muted">{w.whoCreatesGroupsHint}</p>
          <fieldset className="cm-radios">
            <legend className="cm-sr">{w.whoCreatesGroups}</legend>
            <label><input type="radio" name="creators" value="everyone" defaultChecked={s.groups.policy === "everyone"} /> {w.creatorsEveryone}</label>
            <label><input type="radio" name="creators" value="badge_holders" defaultChecked={s.groups.policy === "badge_holders"} /> {w.creatorsBadges}</label>
            <label><input type="radio" name="creators" value="chosen" defaultChecked={s.groups.policy === "chosen"} /> {w.creatorsChosen}</label>
          </fieldset>
          <label className="cm-field">
            {w.chosenPeople}
            <textarea name="chosen" style={{ minHeight: 70 }} defaultValue={s.groups.chosen.map((m) => m.handle ?? m.id).join("\n")} placeholder="username" />
            <small>{w.chosenPeopleHint}</small>
          </label>
        </section>
        <section className="cm-card">
          <h2>{w.adminModeration}</h2>
          <label className="cm-check" style={{ marginTop: 10 }}>
            <input type="checkbox" name="spamEnabled" value="1" defaultChecked={s.spam.enabled} />
            {w.spamEnabled}
          </label>
          <div className="cm-grid2">
            {n("firstPostsReviewed", w.reviewFirstPosts, s.firstPostsReviewed, 0, 50)}
            {n("maxLinks", w.maxLinks, s.spam.maxLinks, 0, 50)}
            {n("hideAfterReports", w.hideAfterReports, s.spam.hideAfterReports, 1, 100)}
          </div>
          <label className="cm-field">
            {w.blockedDomains}
            <textarea name="blockedDomains" style={{ minHeight: 80 }} defaultValue={s.spam.blockedDomains.join("\n")} placeholder="example.com" />
          </label>
          <label className="cm-field">
            {w.blockedWords}
            <textarea name="blockedWords" style={{ minHeight: 80 }} defaultValue={s.spam.blockedWords.join("\n")} />
            <small>{w.onePerLine}</small>
          </label>
          <button type="submit" className="cm-btn o" style={{ marginTop: 16 }}><span className="ms">save</span>{w.saveChanges}</button>
        </section>
      </ActionForm>
    </AdminPage>
  );
}
