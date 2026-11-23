import { assetUrl } from "../assets";
import type { DataStore } from "../data/store";
import type { TemplateDesigner } from "../data/types";
import { demoClientId } from "../demo/apps";
import { appUrl } from "../env";
import { seededUuid } from "./assets";
import { publicProfile } from "./designer-page";
import { HOUSE_PHOTO_PATH, safePhotoUrl } from "./photo-url";

/**
 * 218 The photo of Yallapp's own designer (190, the demo account's profile
 * that lists Yallapp's free templates): the one the team uploaded in Admin ›
 * Studio Market › Designers, else Yallapp's own logo, never initials. Every
 * place a designer's photo shows (the market's cards, /designers/yallapp,
 * its JSON-LD and link previews) reads it from here. Another designer's is
 * their approved photo, or null (their initials show).
 */

export const HOUSE_DESIGNER_ID = seededUuid("yallapp:studio-market:designer");

export function isHouseDesigner(designer: Pick<TemplateDesigner, "id">): boolean {
  return designer.id === HOUSE_DESIGNER_ID;
}

/** Yallapp's logo as a full address (the platform's own). */
export function houseLogoUrl(): string {
  return safePhotoUrl(`${appUrl()}${HOUSE_PHOTO_PATH}`) ?? HOUSE_PHOTO_PATH;
}

/** The photo the public pages show: the approved one, else Yallapp's logo for Yallapp's own page, else null. */
export function designerPhotoUrl(designer: Pick<TemplateDesigner, "id" | "photoAssetId" | "bio" | "profileReview">): string | null {
  const photo = publicProfile(designer).photoAssetId;
  if (photo) return safePhotoUrl(assetUrl(photo));
  return isHouseDesigner(designer) ? houseLogoUrl() : null;
}

/** Yallapp's own designer as it is kept: its fixed id, else the demo account's profile (house.ts `houseDesigner`); null before the demo apps are made. */
export async function findHouseDesigner(store: DataStore): Promise<TemplateDesigner | null> {
  const own = await store.getTemplateDesigner(HOUSE_DESIGNER_ID);
  if (own) return own;
  const clientId = await demoClientId(store);
  return clientId ? store.getTemplateDesignerByClient(clientId) : null;
}

/** 218 What Yallapp's own page card says back (English, like the rest of /admin). */
export const HOUSE_PAGE_MESSAGES = {
  none: "Yallapp's own page isn't made yet: create the demo apps in Admin › Demo apps first.",
  saved: "Saved. Yallapp's page shows it now.",
  logo: "The uploaded photo is removed: Yallapp's page shows the Yallapp logo.",
} as const;
