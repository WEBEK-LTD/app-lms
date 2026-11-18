"use client";

import Link from "next/link";
import { useDashT } from "@/components/dashboard-i18n";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { StoriesSource, StudioNode } from "@/lib/pages/types";
import { storiesSourceOf, storyElementKind } from "@/lib/stories/elements";
import { storyLive } from "@/lib/stories/serve";
import { storyOfView } from "@/lib/stories/view";
import { eachNode } from "@/lib/studio/tree";

const FIELD = { border: "1px solid var(--sf-line)" } as const;

/** 165 The story element's parent in the page (look B's chips are known by theirs). */
function parentOf(body: StudioNode, id: string): StudioNode | null {
  let found: StudioNode | null = null;
  eachNode(body, (n, parent) => {
    if (n.id === id) found = parent;
  });
  return found;
}

/** 165 Whether a node shows stories: the story rings, a slider of story slides, a row of story chips (with the page, to know Leqaa's). */
export function isStoryElement(node: StudioNode, body: StudioNode): boolean {
  return storyElementKind(node, parentOf(body, node.id)) !== null;
}

/** 165 Whether this story element's stories come from Dashboard › Stories. */
export function fromDashboard(node: StudioNode, body: StudioNode): boolean {
  return storiesSourceOf(node, parentOf(body, node.id)) === "dashboard";
}

/**
 * 165 The inspector's part for a story element: where its stories come from
 * (Dashboard › Stories or as designed here), and with the dashboard, a note
 * with a link to it (and whether a story shows now).
 */
export function StoriesSourceControls({ node, body, pickable, onChange }: { node: StudioNode; body: StudioNode; pickable: Pickable; onChange: (patch: Partial<StudioNode>) => void }) {
  const t = useDashT();
  const kind = storyElementKind(node, parentOf(body, node.id));
  if (!kind) return null;
  const source = storiesSourceOf(node, parentOf(body, node.id));
  const now = new Date();
  const shown = (pickable.stories ?? []).filter((s) => storyLive(storyOfView(s), now)).length;
  return (
    <div className="flex flex-col gap-2 rounded-lg p-2" style={FIELD} data-studio-stories-source={source}>
      <label className="flex flex-col gap-1 font-bold">
        {t("stories.studioSource")}
        <select value={source} onChange={(e) => onChange({ stories_source: e.target.value as StoriesSource })} className="h-9 rounded-lg px-1.5 font-normal" style={FIELD}>
          <option value="dashboard">{t("stories.studioFromDashboard")}</option>
          <option value="studio">{t("stories.studioFromDesign")}</option>
        </select>
      </label>
      {source === "dashboard" ? (
        <>
          <p className="m-0 text-[13px] font-semibold" role="note">
            {t("stories.studioNote")}{" "}
            <Link href="/dashboard/stories" target="_blank" className="underline">
              {t("stories.studioOpen")}
            </Link>
          </p>
          {kind !== "rings" ? (
            <p className="m-0 text-xs" style={{ color: "var(--sf-muted)" }}>
              {t("stories.studioDesignNote")}
            </p>
          ) : null}
          {pickable.stories && !shown ? (
            <p className="m-0 text-xs" style={{ color: "var(--sf-muted)" }}>
              {t("stories.studioNone")}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
