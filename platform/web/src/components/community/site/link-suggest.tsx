import { dismissSuggestionAction, linkSuggestedAction } from "@/app/community/(site)/link-actions";
import { YallappMark } from "./auth-buttons";
import type { Viewer } from "./data";
import type { CmWords } from "./words";

/** 231 "Link your Yallapp account?": only whether there is one is known before the member says yes. */
export function LinkSuggestion({ w, viewer, back }: { w: CmWords; viewer: Viewer | null; back: string }) {
  if (!viewer?.linkSuggestion) return null;
  return (
    <section className="cm-card cm-set" aria-labelledby="cm-link-suggest">
      <h2 id="cm-link-suggest" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <YallappMark />
        {w.linkSuggestTitle}
      </h2>
      <p className="cm-muted">{w.linkSuggestBody}</p>
      <div className="cm-row">
        <form action={linkSuggestedAction}>
          <button type="submit" className="cm-btn n"><span className="ms" aria-hidden="true">link</span>{w.linkSuggestButton}</button>
        </form>
        <form action={dismissSuggestionAction}>
          <input type="hidden" name="back" value={back} />
          <button type="submit" className="cm-btn g">{w.linkSuggestDismiss}</button>
        </form>
      </div>
    </section>
  );
}
