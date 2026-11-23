import type { StudioMapDrawing, StudioNode } from "../pages/types";
import { APP_WORDS, type AppWord } from "./app-words";

/**
 * 178 A drawn map's words in the language the app asks for. A template's
 * map (Masar's living map, Lamha's two-ink streets) labels its saved places
 * (Home, Office, Airport), its districts (Zamalek, Downtown, Maadi), its
 * route's chips ("Pickup", "3 min") and a roof sign with the template's
 * words, written in the dashboard's language when the page was made, with
 * no translations (a map's words have none): an Arabic or Turkish customer
 * saw them in English. A word that is still one of the templates' (in any of
 * Studio's languages) is served in the language asked for; one the owner
 * wrote stays as they wrote it.
 */

type Lang = keyof typeof APP_WORDS;
const LANGS = Object.keys(APP_WORDS) as Lang[];
const norm = (text: string) => text.normalize("NFC").replace(/\s+/g, " ").trim();

/** The words the templates' maps write, read first: "Home" on a map is the saved place (المنزل), not the Home tab (الرئيسية). */
const MAP_WORDS = ["rideHome", "rideOffice", "rideAirport", "sigPickup", "sigThreeMin", "sigZamalek", "sigDowntown", "sigTahrir", "sigGardenCity", "sigMaadi", "sigNile", "sigMohandessin", "sigAgouza", "sahEta"] as const satisfies readonly AppWord[];

let words: Map<string, AppWord> | null = null;
/** Each app word in every language, to the word: the maps' own first, then the first one written so, for words two share. */
function wordsByText(): Map<string, AppWord> {
  if (words) return words;
  const out = new Map<string, AppWord>();
  for (const word of MAP_WORDS) for (const lang of LANGS) if (!out.has(norm(APP_WORDS[lang][word]))) out.set(norm(APP_WORDS[lang][word]), word);
  for (const lang of LANGS) for (const [word, text] of Object.entries(APP_WORDS[lang]) as [AppWord, string][]) if (typeof text === "string" && !out.has(norm(text))) out.set(norm(text), word);
  return (words = out);
}

/** `text` in `lang` when it is a template's word, else as it is. */
export function mapWordIn(text: string, lang: string): string;
export function mapWordIn(text: string | null | undefined, lang: string): string | null | undefined;
export function mapWordIn(text: string | null | undefined, lang: string): string | null | undefined {
  if (typeof text !== "string" || !text.trim()) return text;
  const word = wordsByText().get(norm(text));
  if (!word || !(LANGS as string[]).includes(lang)) return text;
  return APP_WORDS[lang as Lang][word] ?? text;
}

/** A drawn map with its template words in `lang`. */
export function mapDrawingIn(drawing: StudioMapDrawing, lang: string): StudioMapDrawing {
  const route = drawing.route;
  return {
    ...drawing,
    ...(drawing.sign ? { sign: mapWordIn(drawing.sign, lang) } : {}),
    ...(drawing.places ? { places: drawing.places.map((p) => ({ ...p, label: mapWordIn(p.label, lang) })) } : {}),
    ...(drawing.labels ? { labels: drawing.labels.map((l) => ({ ...l, text: mapWordIn(l.text, lang) })) } : {}),
    ...(route
      ? {
          route: {
            ...route,
            ...(route.from_label ? { from_label: mapWordIn(route.from_label, lang) } : {}),
            ...(route.to_label ? { to_label: mapWordIn(route.to_label, lang) } : {}),
            ...(route.eta ? { eta: mapWordIn(route.eta, lang) } : {}),
          },
        }
      : {}),
  };
}

/** An element with its drawn map's words in `lang`; any other element as it is. */
export function withMapWordsIn(node: StudioNode, lang: string): StudioNode {
  return node.map_drawing ? { ...node, map_drawing: mapDrawingIn(node.map_drawing, lang) } : node;
}
