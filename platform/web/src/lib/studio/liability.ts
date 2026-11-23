import type { App, LiabilityAcceptance } from "../data/types";
import { shopTypeOfDesign, type LiabilityKind, type ShopType } from "./shop-types";

/**
 * 208 The liability notice (the owner's planning doc): the customer is fully
 * responsible for their app. The dashboard shows a project made from one of
 * Studio's shop types (lib/studio/shop-types.ts) its type's notice ONCE,
 * and the owner presses "I read it and agree" ("قرأت وموافق"); the
 * acceptance is kept on the app (`App.liabilityAccepted`, by notice: when
 * and who) and the notice never shows again. The wording is generic,
 * because laws differ by country: one per kind (`LiabilityKind`), its words
 * in the dashboard's three languages (i18n/dashboard/shop-types.ts,
 * Egyptian Arabic). Other projects never see one.
 */

/** The notice a project must accept, or null (not a shop type, or accepted already). */
export function liabilityDue(app: Pick<App, "design" | "liabilityAccepted" | "section"> | null | undefined): { type: ShopType; kind: LiabilityKind } | null {
  if (!app || app.section !== "studio") return null;
  const type = shopTypeOfDesign(app.design);
  if (!type) return null;
  return app.liabilityAccepted?.[type.liability] ? null : { type, kind: type.liability };
}

/** The app's acceptances with this notice accepted now by this user (an earlier acceptance is kept as it was). */
export function withAcceptance(had: LiabilityAcceptance | null | undefined, kind: LiabilityKind, userId: string, now: Date): LiabilityAcceptance {
  if (had?.[kind]) return { ...had };
  return { ...(had ?? {}), [kind]: { at: now.toISOString(), userId } };
}
