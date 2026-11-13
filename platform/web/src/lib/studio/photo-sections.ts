import type { Action, StudioNode, StudioScrim } from "../pages/types";
import { newNodeId } from "./elements";
import { yallappPhoto } from "./photo-food";
import type { SectionContext, SectionWord } from "./sections";

/**
 * 128 Photo sections every project can use, each made of Studio's own
 * elements so every part of it can be changed in the editor: a photo hero
 * (a tall photo under a scrim, its words at its foot), photo tiles with a
 * caption on each (side by side, scrolling) and people in circles with
 * their names (a team, the teachers). The approved Studio demos' homes are
 * made from them (lib/studio/school-home.ts, lib/studio/teachers-home.ts).
 */

const pad = (top: number, end: number, bottom: number, start: number) => ({ top, end, bottom, start });

/**
 * One of Yallapp's photos under public/ (`/stories/school/school-gate.jpg`)
 * at the address the context gives its pictures (public/design-pictures);
 * none when the context has no pictures.
 */
export function photoOf(ctx: SectionContext, path: string): string | null {
  return yallappPhoto(ctx, `/${path.replace(/^\/+/, "")}`);
}

/** A scrim over a photo (`StudioScrim`, lib/studio/scrim.ts): dark at its top for the buttons, light 40% of the way down, darkest at its foot for the words. */
export function scrim(color: string, top = 0.5, middle = 0.15, bottom = 0.9): StudioScrim {
  return { color, from: top, middle, at: 40, to: bottom };
}

export interface PhotoHero {
  photo: string | null;
  height: number;
  /** The scrim's colour (a dark one of the brand's). */
  shade: string;
  /** The words at the photo's foot, top to bottom. */
  words: StudioNode[];
  radius?: number;
  margin?: StudioNode["margin"];
}

/** A tall photo under a scrim, its words at its foot (a page's top, under a transparent header). */
export function photoHero(ctx: SectionContext, hero: PhotoHero, name: string): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  return {
    id: id(),
    type: "stack",
    name,
    height: hero.height,
    ...(hero.radius ? { radius: hero.radius } : {}),
    ...(hero.margin ? { margin: hero.margin } : {}),
    background: hero.shade,
    image_background_url: hero.photo,
    scrim: scrim(hero.shade),
    children: [
      {
        id: id(),
        type: "column",
        // As tall as the photo, so its words sit at its foot in the app too (a layer's first element is as tall as what it holds).
        height: hero.height,
        align: "end",
        gap: 4,
        padding: pad(22, 18, 20, 18),
        color: "#FFFFFF",
        children: hero.words,
      },
    ],
  };
}

export interface PhotoTile {
  photo: string | null;
  caption: SectionWord;
  action?: Action | null;
}

/** Photo tiles side by side, scrolling, a caption at the foot of each over a scrim. */
export function photoTiles(ctx: SectionContext, tiles: readonly PhotoTile[], name: string, size = { width: 210, height: 128, radius: 20 }): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  return {
    id: id(),
    type: "row",
    name,
    gap: 10,
    scroll: true,
    padding: pad(0, 16, 0, 16),
    children: tiles.map(
      (tile): StudioNode => ({
        id: id(),
        type: "stack",
        width: size.width,
        height: size.height,
        radius: size.radius,
        background: "#1B2430",
        image_background_url: tile.photo,
        scrim: scrim("#000000", 0, 0.12, 0.78),
        ...(tile.action ? { action: tile.action } : {}),
        children: [
          {
            id: id(),
            type: "column",
            height: size.height,
            align: "end",
            padding: pad(10, 12, 10, 12),
            children: [{ id: id(), type: "text", text: ctx.w(tile.caption), max_lines: 2, color: "#FFFFFF", font: { size: 14, weight: 800, line_height: 1.25 } }],
          },
        ],
      }),
    ),
  };
}

export interface Person {
  initials: SectionWord;
  name: SectionWord;
  /** The circle's colour. */
  color: string;
}

/** People in circles (their initials on their colour) with their names under them, side by side, scrolling. */
export function peopleRow(ctx: SectionContext, people: readonly Person[], name: string, look: { action?: Action | null } = {}): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  return {
    id: id(),
    type: "row",
    name,
    gap: 14,
    scroll: true,
    padding: pad(0, 16, 0, 16),
    children: people.map(
      (person): StudioNode => ({
        id: id(),
        type: "column",
        width: 70,
        gap: 6,
        cross: "center",
        ...(look.action ? { action: look.action } : {}),
        children: [
          {
            id: id(),
            type: "column",
            width: 62,
            height: 62,
            radius: 31,
            align: "center",
            cross: "center",
            background: person.color,
            children: [{ id: id(), type: "text", text: ctx.w(person.initials), color: "#FFFFFF", text_align: "center", font: { size: 18, weight: 800 } }],
          },
          { id: id(), type: "text", text: ctx.w(person.name), max_lines: 1, text_align: "center", font: { size: 12, weight: 700 } },
        ],
      }),
    ),
  };
}

/** A section's title with a link beside it ("At school this week · All news"). */
export function titleWithLink(ctx: SectionContext, title: SectionWord, link: SectionWord | null, action: Action | null, colors: { link: string; darkLink: string }, margin = pad(16, 16, 8, 16)): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    padding: margin,
    children: [
      { id: id(), type: "text", text: ctx.w(title), width: "fill", font: { size: 17, weight: 800 } },
      ...(link ? [{ id: id(), type: "text" as const, text: ctx.w(link), color: colors.link, dark_color: colors.darkLink, font: { size: 13, weight: 700 as const }, ...(action ? { action } : {}) }] : []),
    ],
  };
}
