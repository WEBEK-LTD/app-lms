import { STUDIO_DEMO_TYPES } from "./constants";
import { demoStudioScreens } from "./screens";
import { SIGNATURE_LOOKS } from "../studio/demo-designs/signature";
import { TEMPLATES } from "../studio/sections";
import type { WordForms } from "../pages/template-translations";

/**
 * 156 The words Studio's templates write on Studio › Screens (each demo's
 * and each Signature look's sign-in welcome, launch title, account menu
 * names, checkout title), as words in Studio's languages: the ones that
 * stop applying once the owner changes the text in the app's main language
 * (lib/pages/template-translations.ts `withoutStaleScreenTexts`).
 */
let forms: WordForms[] | null = null;

export function screenTextForms(): readonly WordForms[] {
  if (forms) return forms;
  const out: WordForms[] = [];
  const collect = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(collect);
    if (!value || typeof value !== "object") return;
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 1 && entries.every(([k, v]) => ["en", "ar", "tr"].includes(k) && typeof v === "string")) {
      out.push(value as WordForms);
      return;
    }
    for (const [, v] of entries) collect(v);
  };
  const url = "https://yallapp.com.tr";
  for (const demo of STUDIO_DEMO_TYPES) {
    collect(demoStudioScreens(demo, url));
    for (const look of SIGNATURE_LOOKS) collect(demoStudioScreens(demo, url, look));
  }
  for (const template of TEMPLATES) if (template.project) collect(template.project.screens(url));
  forms = out;
  return out;
}
