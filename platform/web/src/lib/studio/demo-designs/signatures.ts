import { NAKHLA_A, NAKHLA_B } from "./nakhla-signature";
import { signatureTemplate, type SignatureLook } from "./signature";

/**
 * 130 The Signature looks, each demo's in its own file of this folder
 * (./signature.ts says what a look is). Each is a template of its demo's
 * kind (lib/studio/sections.ts TEMPLATES, first among the kind's own).
 */
export const SIGNATURE_LOOKS: readonly SignatureLook[] = [
  // ——— 130.13–130.18 Nakhla School, Rawaq Academy and Ufuq Academy ———
  NAKHLA_A,
  NAKHLA_B,
  // ——— end 130.13–130.18 ———
];

/** The look of this id, if there is one. */
export function signatureLook(id: string): SignatureLook | undefined {
  return SIGNATURE_LOOKS.find((l) => l.id === id);
}

/** The demo's looks, A then B. */
export function signatureLooksOf(demo: string): SignatureLook[] {
  return SIGNATURE_LOOKS.filter((l) => l.demo === demo).sort((a, b) => a.letter.localeCompare(b.letter));
}

export const SIGNATURE_TEMPLATES = SIGNATURE_LOOKS.map(signatureTemplate);
