import type { Languages } from "../../pages/types";
import { DESIGN_FILE_FORMAT, DESIGN_FILE_VERSION, type DesignFile, type DesignFilePicture } from "../design-file";
import { frameToPage, type DesignFrame } from "./frame";

/**
 * 108.3 Screens read from another tool's file, made into a design like
 * Yallapp's own file: one page per screen, in the project's languages,
 * with the file's pictures (the drawings already drawn as pictures).
 */

export interface ReadScreens {
  frames: DesignFrame[];
  pictures: Record<string, DesignFilePicture>;
}

export interface ScreensDesign {
  design: DesignFile;
  /** Elements left out to stay within what a page can hold. */
  cut: number;
  /** The tab bar's labels of the first screen that has one. */
  tabs: string[];
}

export function screensToDesign(read: ReadScreens, name: string, languages: Languages, newId: () => string): ScreensDesign {
  const rtl = languages.default === "ar";
  let cut = 0;
  let tabs: string[] = [];
  const pages = read.frames.map((frame, i) => {
    const page = frameToPage(frame, { rtl, newId });
    cut += page.cut;
    if (!tabs.length) tabs = page.tabs;
    return { slug: `screen-${i + 1}`, title: (frame.name || `Screen ${i + 1}`).slice(0, 60), studio: page.studio };
  });
  return {
    design: { format: DESIGN_FILE_FORMAT, version: DESIGN_FILE_VERSION, kind: pages.length > 1 ? "project" : "page", name, made_at: "", languages, pages, pictures: read.pictures, fonts: [] },
    cut,
    tabs,
  };
}
