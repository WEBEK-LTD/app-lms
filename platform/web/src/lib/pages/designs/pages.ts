import type { FaqEntry, LayoutBlock, Person } from "../types";
import { contact, faq, field, form, gallery, person, place, stats, team, text, type DesignPage } from "./build";

/**
 * 110.3 The pages every ready-made design has besides its home page, made
 * the same way for each: About us (its story, its people, numbers and
 * photos), Contact (how to reach it, where it is, its hours and a form)
 * and Questions; and the people its teams are made of. Each kind of app
 * writes its own texts (academy.ts, store.ts...), in the business's voice.
 */

/** Invented people, with a drawn picture each (lib/demo/design-art.ts). */
const PEOPLE = {
  leyla: ["Leyla Aksoy", "art-person-1.png"],
  omar: ["Omar Haddad", "art-person-2.png"],
  selin: ["Selin Kaya", "art-person-3.png"],
  karim: ["Karim Mansour", "art-person-4.png"],
  nadia: ["Nadia Farouk", "art-person-5.png"],
  emre: ["Emre Demir", "art-person-6.png"],
  zeynep: ["Zeynep Arslan", "art-person-7.png"],
  yusuf: ["Yusuf Rahman", "art-person-8.png"],
  mariam: ["Mariam Saleh", "art-person-9.png"],
  deniz: ["Deniz Yıldız", "art-person-10.png"],
  tarek: ["Tarek Aziz", "art-person-11.png"],
  can: ["Can Öztürk", "art-person-12.png"],
  rania: ["Dr. Rania Khalil", "art-doctor-1.png"],
  murat: ["Dr. Murat Şen", "art-doctor-2.png"],
  huda: ["Dr. Huda Nasser", "art-doctor-3.png"],
  ali: ["Dr. Ali Karaca", "art-doctor-4.png"],
  ece: ["Ece Tan", "art-coach-selin.png"],
  kerem: ["Kerem Aydın", "art-coach-can.png"],
  mira: ["Mira Haddad", "art-coach-mira.png"],
} as const;

export type Who = keyof typeof PEOPLE;

/** One of the invented people, with their picture. */
export const who = (id: Who, role: string, bio: string | null = null): Person => person(PEOPLE[id][0], role, bio, PEOPLE[id][1]);

/** The form on every Contact page; its answers are emailed to the business. */
export const messageForm = (): LayoutBlock =>
  form(
    "message",
    "Send us a message",
    [field("name", "text", "Your name", true), field("phone", "phone", "Phone number"), field("email", "email", "Email"), field("message", "long_text", "Your message", true)],
    "Send",
    "Thank you. We'll get back to you within a working day.",
  );

/** About us: the business's story, its people, numbers and photos, then anything of its own. */
export function aboutPage(parts: { title?: string; story: string; people: { title: string; list: Person[] }; numbers: LayoutBlock["stats"]; photos: { title: string; files: (string | [string, string])[] }; more?: LayoutBlock[] }): DesignPage {
  return {
    slug: "about",
    title: parts.title ?? "About us",
    show_title: true,
    blocks: [
      text("story", parts.story),
      team(parts.people.title, parts.people.list, "grid"),
      stats(parts.numbers!, null),
      gallery("photos", parts.photos.title, parts.photos.files),
      ...(parts.more ?? []),
    ],
  };
}

/** Contact: a few words, the map, the hours (where the kind has them), the form and the business's own details. */
export function contactPage(words: string, hours: LayoutBlock | null, more: LayoutBlock[] = []): DesignPage {
  return {
    slug: "contact",
    title: "Contact",
    show_title: true,
    blocks: [text("reach", words), place("Find us"), ...(hours ? [hours] : []), messageForm(), ...more, contact("Call or write")],
  };
}

/** Questions: six to eight, with a line above them. */
export function questionsPage(intro: string, questions: FaqEntry[], more: LayoutBlock[] = []): DesignPage {
  return { slug: "faq", title: "Questions", show_title: true, blocks: [text("intro", intro), faq("Questions and answers", questions), ...more] };
}

/** Another page of the design's own. */
export const otherPage = (slug: string, title: string, blocks: LayoutBlock[]): DesignPage => ({ slug, title, show_title: true, blocks });
