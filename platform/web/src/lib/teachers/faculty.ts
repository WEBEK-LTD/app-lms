import type { Course, Teacher } from "../data/types";
import type { Layout, StudioNode, StudioStory } from "../pages/types";
import { APP_WORDS } from "../studio/app-words";

/**
 * 179 Rawaq's faculty is the academy's own teachers. The Signature looks of
 * the academy with many teachers (lib/studio/demo-designs/rawaq-signature.ts)
 * wrote its teachers as words: look A's index of four (initials, name,
 * subjects, the one "teaching live"), look B's slides on air (each with a
 * course's name and line) and its rings. Those were the demo's people
 * ("Hannah Clarke", "Deniz Kaya", "Salma Nasser", "Omar Farouk", and in
 * Arabic names the sample teachers don't even have), so every academy made
 * from them showed them, whoever it taught with. Served, each of those
 * entries is one of the academy's active teachers (Dashboard › Teachers,
 * featured first, as the Teachers screen lists them): their initials, name
 * and subjects, on B their newest published course; an entry with no
 * teacher left for it goes (with the hairline before it), and the faculty's
 * heading with the last of them. An entry whose name the owner changed in
 * Studio is the owner's and stays.
 */

type Role = "name" | "initials" | "subjects" | "title" | "line" | "liveBadge" | "liveKicker";

const KEYS: Record<Role, readonly string[]> = {
  name: ["raT1", "raT2", "raT3", "raT4"],
  initials: ["rqP2i", "rqP1i", "raT3i", "rqP3i"],
  subjects: ["raT1s", "raT2s", "raT3s", "raT4s"],
  title: ["raS1", "raS2", "raS3"],
  line: ["raS1Line", "raS2Line", "raS3Line"],
  liveBadge: ["raLiveBadge"],
  liveKicker: ["raLiveKicker"],
};

type Lang = keyof typeof APP_WORDS;
const LANGS = Object.keys(APP_WORDS) as Lang[];
const word = (lang: Lang, key: string): string => (APP_WORDS[lang] as Record<string, string>)[key] ?? "";

let roles: Map<string, { role: Role; lang: Lang }> | null = null;
/** The template's words of the faculty, in each of Studio's languages. */
function roleOf(text: unknown): { role: Role; lang: Lang } | null {
  if (!roles) {
    roles = new Map();
    for (const role of Object.keys(KEYS) as Role[]) for (const key of KEYS[role]) for (const lang of LANGS) if (word(lang, key)) roles.set(word(lang, key), { role, lang });
  }
  return typeof text === "string" ? (roles.get(text.trim()) ?? null) : null;
}

/** One teacher as the faculty shows them. */
export interface FacultyMember {
  name: string;
  subjects: string[];
  /** Their newest published course, for look B's slides. */
  course: { title: string; line: string | null } | null;
  /** The first line of their bio. */
  headline: string | null;
}

/** "HC" for Hannah Clarke, "ه س" for هبة السيد: the first letters of the first two words. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const arabic = /[؀-ۿ]/.test(name);
  return words.map((w) => [...w][0]!.toLocaleUpperCase()).join(arabic ? " " : "");
}

const firstLine = (text: string): string | null => {
  const line = text.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  if (!line) return null;
  return line.length > 120 ? `${line.slice(0, 119).trimEnd()}…` : line;
};

/** The academy's active teachers in the Teachers screen's order (featured first, then by name), each with their newest published course. */
export function facultyOf(teachers: readonly Teacher[], courses: readonly Course[], isPublished: (c: Course) => boolean): FacultyMember[] {
  return teachers
    .filter((t) => t.status === "active")
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name))
    .map((t) => {
      const own = courses.filter((c) => c.teacherId === t.id && isPublished(c)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      const course = own[0] ? { title: own[0].title, line: firstLine(own[0].description) } : null;
      return { name: t.name, subjects: t.subjects, course, headline: firstLine(t.bio) };
    });
}

/** Whether a node holds (as its own words or in what it holds) one of the template's teachers' names. */
function holdsTemplateName(node: StudioNode): boolean {
  if (roleOf(node.text)?.role === "name") return true;
  return (node.children ?? []).some(holdsTemplateName);
}

/** A faculty entry: look A's row named after its teacher, look B's slide named after its course, holding the template's teacher. */
const isEntry = (node: StudioNode): boolean => {
  const named = roleOf(node.name)?.role;
  return ((node.type === "row" && named === "name") || (node.type === "photo_hero" && named === "title")) && holdsTemplateName(node);
};

/** 179 Whether the element `id` is one of the template's faculty entries, in one, or the rings of them (Studio's inspector says what it shows). */
export function inTemplateFaculty(body: StudioNode, id: string): boolean {
  const walk = (node: StudioNode, inside: boolean): boolean => {
    const here = inside || isEntry(node) || (node.type === "stories" && (node.slides ?? []).some((s) => roleOf(s.heading)?.role === "name"));
    if (node.id === id) return here;
    return (node.children ?? []).some((c) => walk(c, here));
  };
  return walk(body, false);
}

/** Whether a Studio page body still has one of the template's faculty entries. */
export function hasTemplateFaculty(body: StudioNode): boolean {
  if (isEntry(body)) return true;
  if (body.type === "stories" && (body.slides ?? []).some((s) => roleOf(s.heading)?.role === "name")) return true;
  return (body.children ?? []).some(hasTemplateFaculty);
}

/** `node` with `text` in place of its words, without the template's translations of them. */
function said(node: StudioNode, text: string): StudioNode {
  const { translations: _t, ...rest } = node;
  void _t;
  return { ...rest, text };
}

/** A faculty entry as `member`; null for a part to leave out. */
function asMember(node: StudioNode, member: FacultyMember, lang: Lang): StudioNode | null {
  const role = roleOf(node.text)?.role;
  if (role === "name") return said(node, member.name);
  if (role === "initials") return said(node, initialsOf(member.name));
  if (role === "subjects") return member.subjects.length ? said(node, member.subjects.slice(0, 3).join(" · ")) : null;
  if (role === "title") return said(node, member.course?.title ?? member.name);
  if (role === "line") {
    const line = member.course ? member.course.line : member.headline;
    return line ? said(node, line) : null;
  }
  // The template's teacher teaching live: a real teacher is from the teacher, an arrow as the others'.
  if (role === "liveKicker") {
    const { translations: _t, ...rest } = node;
    void _t;
    return { ...rest, text: word(lang, "raNewKicker"), translations: Object.fromEntries(LANGS.filter((l) => l !== lang).map((l) => [l, { text: word(l, "raNewKicker") }])) } as StudioNode;
  }
  if (role === "liveBadge") return { id: node.id, type: "icon", icon: "north_east", icon_size: 22, ...(node.color ? { color: "#6B7570" } : {}), ...(node.dark_color ? { dark_color: "#9AA59F" } : {}) };
  const { border_color: _b, border_width: _w, ...plain } = node;
  void _b;
  void _w;
  // The live teacher's avatar ring goes with it (an avatar: a round row holding only the initials).
  const avatar = node.type === "row" && node.border_color === "#E5484D" && (node.children ?? []).length === 1 && roleOf(node.children![0]!.text)?.role === "initials";
  const base = avatar ? plain : node;
  if (!node.children) return base;
  return { ...base, children: node.children.map((c) => asMember(c, member, lang)).filter((c): c is StudioNode => c !== null) };
}

/**
 * The body with the template's faculty as `faculty`: in each element that
 * holds such entries, the first is the first teacher, and so on; an entry
 * with nobody left goes with the hairline before it, and the faculty's
 * heading (named "The faculty") when none is left. The same body when it has none.
 */
export function withFaculty(body: StudioNode, faculty: readonly FacultyMember[]): StudioNode {
  const walk = (node: StudioNode): StudioNode | null => {
    if (node.type === "stories" && node.slides?.some((s) => roleOf(s.heading)?.role === "name")) {
      let i = 0;
      const slides: StudioStory[] = [];
      for (const slide of node.slides) {
        if (roleOf(slide.heading)?.role !== "name") {
          slides.push(slide);
          continue;
        }
        const member = faculty[i++];
        if (!member) continue;
        const { translations: _t, ...rest } = slide as StudioStory & { translations?: unknown };
        void _t;
        slides.push({ ...rest, heading: member.name, label: initialsOf(member.name).replace(/\s/g, "").slice(0, 3), ring: "plain", ring_color: "#B8893A" });
      }
      return slides.length ? { ...node, slides } : null;
    }
    if (!node.children) return node;
    const kids = node.children;
    if (!kids.some(isEntry)) {
      const children = kids.map(walk);
      if (children.every((c, i) => c === kids[i])) return node;
      const kept = children.filter((c): c is StudioNode => c !== null);
      // A slider with none of its slides left goes too.
      if (node.type === "slider" && !kept.length) return null;
      return { ...node, children: kept };
    }
    let i = 0;
    const out: StudioNode[] = [];
    let kept = 0;
    for (const child of kids) {
      if (!isEntry(child)) {
        out.push(walk(child) ?? child);
        continue;
      }
      const member = faculty[i++];
      if (!member) {
        // The hairline before it goes with it.
        if (out.length && out[out.length - 1]!.type === "divider") out.pop();
        continue;
      }
      const lang = roleOf(child.name)!.lang;
      const made = asMember(child, member, lang);
      if (made) {
        out.push({ ...made, name: roleOf(child.name)!.role === "title" ? (member.course?.title ?? member.name) : member.name });
        kept++;
      }
    }
    // With no teacher, the faculty's heading too.
    const shown = kept ? out : out.filter((c) => !(c.type === "row" && roleOf(c.name) === null && LANGS.some((l) => c.name === word(l, "raFaculty"))));
    if (node.type === "slider" && !kept) return null;
    return { ...node, children: shown };
  };
  return walk(body) ?? { ...body, children: [] };
}

/** A layout's Studio pages with the academy's own faculty; the same layout when none has the template's (no server code here: Studio's inspector reads this file too). */
export function withAcademyFaculty<T extends Pick<Layout, "pages">>(layout: T, faculty: readonly FacultyMember[]): T {
  if (!layout.pages.some((p) => p.studio && hasTemplateFaculty(p.studio.body))) return layout;
  const pages = layout.pages.map((p) => (p.studio && hasTemplateFaculty(p.studio.body) ? { ...p, studio: { ...p.studio, body: withFaculty(p.studio.body, faculty) } } : p));
  return { ...layout, pages };
}
