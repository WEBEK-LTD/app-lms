import { kindById } from "../app/kinds";
import { templatesFor } from "./sections";

/**
 * 124.6 The choices of /studio/new's first step that are a kind with its
 * template already picked: the premium academy is the Academy kind (lms)
 * starting from the `academy_premium` template. The choice has its own id;
 * the form sends the real kind's id, so the project is made as any other.
 */

export interface PresetChoice {
  id: string;
  /** The real kind's id (lib/app/kinds.ts), when the choice's own id isn't one. */
  kind?: string;
  /** The template step 3 starts on. */
  template?: string;
}

export const PREMIUM_ACADEMY_CHOICE = "academy_premium";

/** The premium academy's choice, made from the Academy kind's; null when that kind has no such template. */
export function premiumAcademyChoice<T extends { id: string; icon: string; name: string }>(academy: T, name: string, text: string): (T & PresetChoice & { text: string; soon: false }) | null {
  const info = kindById(academy.id);
  if (!info || !templatesFor({ type: info.engine, vertical: info.vertical }).some((t) => t.id === "academy_premium" && t.project)) return null;
  return { ...academy, id: PREMIUM_ACADEMY_CHOICE, kind: academy.id, template: "academy_premium", name, icon: "workspace_premium", text, soon: false };
}

/** The kind a choice makes: its own id, or the kind it presets. */
export function kindOfChoice(choice: PresetChoice | null | undefined): string | null {
  return choice ? (choice.kind ?? choice.id) : null;
}

/** The template once a choice is made: the one it presets; none when the choice before had preset one; else as it was. */
export function templateAfterChoice(next: PresetChoice, previous: PresetChoice | null | undefined, template: string | null): string | null {
  if (next.template) return next.template;
  return previous?.template ? null : template;
}
