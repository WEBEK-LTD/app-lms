import { PALETTES } from "./designs/build";

/**
 * 84.2 Yallapp's picture library for the designs (33.8): plain shapes in
 * the palettes' colours (public/design-pictures, made by
 * scripts/design-pictures.py), offered in "Choose from Media" for slides,
 * banners and images. Nothing in them looks like a photo of a person.
 */

export const PICTURE_SHAPES = ["waves", "circles", "blocks"] as const;
export type PictureShape = (typeof PICTURE_SHAPES)[number];

export interface LibraryPicture {
  id: string;
  /** The palette's name and the shape, in English (the dashboard translates both). */
  palette: string;
  shape: PictureShape;
  url: string;
}

export const SHAPE_NAMES: Record<PictureShape, string> = { waves: "Waves", circles: "Circles", blocks: "Blocks" };

/** Every picture, at its address on the platform (`base`, the platform's https address). */
export function pictureLibrary(base: string): LibraryPicture[] {
  const root = base.replace(/\/+$/, "");
  return PALETTES.flatMap((p) => PICTURE_SHAPES.map((shape) => ({ id: `${p.id}-${shape}`, palette: p.name, shape, url: `${root}/design-pictures/${p.id}-${shape}.jpg` })));
}
