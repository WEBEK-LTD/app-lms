import { Logo } from "@/components/brand";
import type { StudioNodeType } from "@/lib/pages/types";
import type { PremiumMapId } from "@/lib/studio/premium-maps";

/** 103R What is being dragged in the editor: a new element, a ready section, or an element of the page. */
export type DragPayload =
  | { kind: "new"; type: StudioNodeType }
  | { kind: "section"; id: string }
  | { kind: "move"; id: string }
  // Editor audit 3.3: a picture from the pictures panel; `share` is the project's file to make public first.
  | { kind: "picture"; url: string; share?: string }
  // 129.21–129.24 One of the Premium group's maps (lib/studio/premium-maps.ts).
  | { kind: "premium_map"; id: PremiumMapId };

export const DRAG_TYPE = "application/x-yallapp-studio";

/** A Material Symbols (Rounded) glyph; `flip` mirrors arrows in right-to-left. */
export function Glyph({ name, size = 20, flip = false, className = "" }: { name: string; size?: number; flip?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-rounded flex-none ${flip ? "icon-flip" : ""} ${className}`} style={{ fontSize: size, lineHeight: 1 }}>
      {name}
    </span>
  );
}

/** The editor's colours, from the approved design. */
export const STUDIO_COLORS = {
  ink: "#0E0D24",
  ivory: "#F4EFE6",
  board: "#E9E5DC",
  dot: "#CFC9BC",
  line: "#DDD8CC",
  muted: "#5E5B70",
  accent: "#FF5A1F",
  select: "#3D63FF",
  barSoft: "#1E1C3A",
  barMuted: "#A7A3C2",
  barLine: "#3A3760",
} as const;

/** Yallapp's logo, then "Studio": the mark on the dark bar of every Studio screen. */
export function StudioMark() {
  return (
    <>
      <Logo height={24} reversed alt="Yallapp" />{" "}
      <span dir="ltr" className="text-[17px] font-extrabold tracking-[0.2px]">
        Studio
      </span>
    </>
  );
}
