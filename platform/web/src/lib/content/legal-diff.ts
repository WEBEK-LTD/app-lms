/**
 * 172 What Yallapp's default text of a legal page added or changed between
 * two of its versions, paragraph by paragraph, and how to bring those
 * changes into the team's own saved version. Pure: the admin's form runs the
 * merge in the browser, and nothing is saved until the team clicks Save.
 *
 * A "paragraph" is a Markdown block: a heading, a list item or a paragraph.
 * Paragraphs and sentences are compared with their spacing evened out.
 */

export interface Paragraph {
  text: string;
  kind: "heading" | "item" | "para";
  start: number;
  end: number;
}

/** A sentence the default added to a paragraph, and the sentences around it there, to find its place. */
export interface AddedSentence {
  text: string;
  prev: string | null;
  next: string | null;
}

interface ChangeBase {
  /** The heading of the section it's in (in the newer default), or null before the first heading. */
  section: string | null;
}

export type LegalChange =
  | (ChangeBase & {
      type: "added";
      text: string;
      kind: Paragraph["kind"];
      /** The paragraphs just before and after it in the newer default (and, when one of them changed, its older text), nearest first. */
      after: string[];
      before: string[];
    })
  | (ChangeBase & { type: "changed"; from: string; to: string; added: AddedSentence[]; removed: string[] })
  | (ChangeBase & { type: "removed"; text: string });

const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+/;
const HEADING = /^\s*#{1,6}\s+/;
/** Where the merge puts what it couldn't place; a save is refused while they're in the text. */
export const UNPLACED_START = "==== New text from Yallapp's default: move it to its place, then delete this line ====";
export const UNPLACED_END = "==== End of the new text: delete this line ====";

export function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** The text's paragraphs, with where each is in it. */
export function paragraphs(body: string): Paragraph[] {
  const out: Paragraph[] = [];
  let current: Paragraph | null = null;
  let offset = 0;
  for (const line of body.split("\n")) {
    const start = offset;
    const end = offset + line.length;
    offset = end + 1;
    if (line.trim() === "") {
      current = null;
      continue;
    }
    const kind: Paragraph["kind"] = HEADING.test(line) ? "heading" : LIST_ITEM.test(line) ? "item" : "para";
    if (current && kind === "para" && current.kind !== "heading") {
      // A line that carries on the paragraph or list item above it.
      current.text = body.slice(current.start, end);
      current.end = end;
      continue;
    }
    current = { text: line, kind, start, end };
    out.push(current);
    if (kind === "heading") current = null;
  }
  return out;
}

/** The sentences of a paragraph (its list marker or # left out). */
export function sentences(text: string): string[] {
  const plain = normalize(text.replace(LIST_ITEM, "").replace(HEADING, ""));
  if (!plain) return [];
  return plain
    .split(/(?<=[.!?؟…:](?:\*\*|\*|_|\)|")?)\s+(?=[^\s])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The longest common subsequence's pairs of indexes. */
function lcs(a: string[], b: string[]): [number, number][] {
  const n = a.length;
  const m = b.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) i++;
    else j++;
  }
  return pairs;
}

/** How alike two paragraphs are, 0 to 1: the words they have in common (Dice's coefficient, punctuation left out). */
function likeness(a: string, b: string): number {
  const words = (t: string) => new Set(t.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return 0;
  let common = 0;
  for (const w of x) if (y.has(w)) common++;
  return (2 * common) / (x.size + y.size);
}

function sentenceChanges(from: string, to: string): { added: AddedSentence[]; removed: string[] } {
  const a = sentences(from);
  const b = sentences(to);
  const pairs = lcs(a, b);
  const keptA = new Set(pairs.map(([i]) => i));
  const keptB = new Set(pairs.map(([, j]) => j));
  return {
    added: b.flatMap((text, j) => (keptB.has(j) ? [] : [{ text, prev: b[j - 1] ?? null, next: b[j + 1] ?? null }])),
    removed: a.filter((_, i) => !keptA.has(i)),
  };
}

/** What the default's newer version added, changed or removed since the older one, in the newer one's order. */
export function legalChanges(older: string, newer: string): LegalChange[] {
  const a = paragraphs(older);
  const b = paragraphs(newer);
  const pairs = lcs(
    a.map((p) => normalize(p.text)),
    b.map((p) => normalize(p.text)),
  );
  const sectionOf = (j: number): string | null => {
    for (let k = j; k >= 0; k--) if (b[k]!.kind === "heading") return normalize(b[k]!.text);
    return null;
  };
  // The older text of each changed paragraph of the newer version, to find the paragraph in the saved one.
  const olderOf = new Map<number, string>();
  const changes: { at: number; change: LegalChange }[] = [];
  const bounds: [number, number][] = [...pairs, [a.length, b.length]];
  let i0 = 0;
  let j0 = 0;
  for (const [i1, j1] of bounds) {
    const removed = a.slice(i0, i1).map((p, k) => ({ p, k: i0 + k }));
    const added = b.slice(j0, j1).map((p, k) => ({ p, k: j0 + k }));
    // A removed and an added paragraph that are alike are one paragraph that changed.
    const used = new Set<number>();
    for (const { p, k } of added) {
      let best = -1;
      let score = 0.35;
      removed.forEach(({ p: r }, idx) => {
        if (used.has(idx) || r.kind !== p.kind) return;
        const s = likeness(r.text, p.text);
        if (s > score) {
          score = s;
          best = idx;
        }
      });
      if (best >= 0) {
        used.add(best);
        const from = removed[best]!.p.text;
        olderOf.set(k, from);
        changes.push({ at: k, change: { type: "changed", section: sectionOf(k), from, to: p.text, ...sentenceChanges(from, p.text) } });
      }
    }
    for (const { p, k } of added) {
      if (olderOf.has(k)) continue;
      changes.push({ at: k, change: { type: "added", section: sectionOf(k), text: p.text, kind: p.kind, after: [], before: [] } });
    }
    removed.forEach(({ p }, idx) => {
      if (!used.has(idx)) changes.push({ at: j1 - 0.25, change: { type: "removed", section: sectionOf(j0 - 1), text: p.text } });
    });
    i0 = i1 + 1;
    j0 = j1 + 1;
  }
  const addedAt = new Set(changes.filter((c) => c.change.type === "added").map((c) => c.at));
  for (const { at, change } of changes) {
    if (change.type !== "added") continue;
    // Nearest first, up to the first paragraph that isn't new itself (new ones are placed in order, so the one before is in by then).
    const near = (list: string[], k: number) => {
      list.push(b[k]!.text, ...(olderOf.has(k) ? [olderOf.get(k)!] : []));
      return !addedAt.has(k);
    };
    for (let k = at - 1; k >= 0; k--) if (near(change.after, k)) break;
    for (let k = at + 1; k < b.length; k++) if (near(change.before, k)) break;
  }
  return changes.sort((x, y) => x.at - y.at).map((c) => c.change);
}

/** Whether the saved text has this sentence or paragraph (spacing evened out). */
export function hasText(saved: string, text: string): boolean {
  const needle = normalize(text.replace(LIST_ITEM, "").replace(HEADING, ""));
  return needle === "" || normalize(saved).includes(needle);
}

/** Whether the saved text still lacks this change: a sentence the default added that it doesn't have. */
export function isPending(saved: string, change: LegalChange): boolean {
  if (change.type === "added") return sentences(change.text).some((s) => !hasText(saved, s));
  if (change.type === "changed") return change.added.some((s) => !hasText(saved, s.text));
  return false;
}

/** Where a text is in the raw text when spacing is evened out: its start and end in the raw text. */
function locate(raw: string, needle: string, from = 0, to = raw.length): { start: number; end: number } | null {
  const target = normalize(needle);
  if (!target) return null;
  // The evened-out text, with each of its characters' place in the raw text.
  let flat = "";
  const at: number[] = [];
  let space = false;
  for (let i = from; i < to; i++) {
    const ch = raw[i]!;
    if (/\s/.test(ch)) {
      space = flat.length > 0;
      continue;
    }
    if (space) {
      flat += " ";
      at.push(i);
      space = false;
    }
    flat += ch;
    at.push(i);
  }
  const idx = flat.indexOf(target);
  if (idx < 0) return null;
  return { start: at[idx]!, end: at[idx + target.length - 1]! + 1 };
}

/** The saved paragraph that is the given one (the same text), else the one most like it. */
function findParagraph(saved: string, texts: string[], kind?: Paragraph["kind"]): Paragraph | null {
  const ps = paragraphs(saved);
  for (const t of texts) {
    const n = normalize(t);
    const same = ps.find((p) => normalize(p.text) === n);
    if (same) return same;
  }
  let best: Paragraph | null = null;
  let score = 0.6;
  for (const t of texts) {
    for (const p of ps) {
      if (kind && p.kind !== kind) continue;
      const s = likeness(p.text, t);
      if (s > score) {
        score = s;
        best = p;
      }
    }
  }
  return best;
}

function insert(text: string, at: number, piece: string): string {
  return text.slice(0, at) + piece + text.slice(at);
}

export interface MergeResult {
  text: string;
  /** Changes put in place. */
  placed: number;
  /** Paragraphs or sentences it couldn't place: they're between UNPLACED_START and UNPLACED_END in the text. */
  unplaced: string[];
}

/**
 * The saved text with the default's pending changes: each new paragraph after
 * the paragraph it follows in the default (or before the one it precedes),
 * each new sentence after the sentence it follows in its paragraph (or before
 * the one it precedes). A changed paragraph the saved text has as it was is
 * replaced by its new text. What can't be placed so goes, together, at the
 * end of its section between UNPLACED_START and UNPLACED_END, for the team
 * to move. The team's own wording is never changed.
 */
export function mergeLegalChanges(saved: string, changes: LegalChange[]): MergeResult {
  let text = saved;
  let placed = 0;
  const unplaced: { section: string | null; text: string }[] = [];
  for (const change of changes) {
    if (!isPending(text, change)) continue;
    if (change.type === "removed") continue;
    if (change.type === "changed") {
      const same = paragraphs(text).find((p) => normalize(p.text) === normalize(change.from));
      if (same) {
        text = text.slice(0, same.start) + change.to + text.slice(same.end);
        placed++;
        continue;
      }
      const para = findParagraph(text, [change.from, change.to]);
      if (!para) {
        unplaced.push({ section: change.section, text: change.to });
        continue;
      }
      const start = para.start;
      let end = para.end;
      let any = false;
      for (const s of change.added) {
        if (hasText(text.slice(start, end), s.text)) continue;
        const prev = s.prev ? locate(text, s.prev, start, end) : null;
        const next = !prev && s.next ? locate(text, s.next, start, end) : null;
        if (prev) {
          text = insert(text, prev.end, ` ${s.text}`);
          end += s.text.length + 1;
        } else if (next) {
          text = insert(text, next.start, `${s.text} `);
          end += s.text.length + 1;
        } else if (!s.prev && !s.next) {
          text = insert(text, end, ` ${s.text}`);
          end += s.text.length + 1;
        } else {
          unplaced.push({ section: change.section, text: s.text });
          continue;
        }
        any = true;
      }
      if (any) placed++;
      continue;
    }
    // A new paragraph: after the one before it, else before the one after it.
    const after = change.after.length ? findParagraph(text, change.after) : null;
    if (after) {
      const sep = change.kind === "item" && after.kind === "item" ? "\n" : "\n\n";
      text = insert(text, after.end, `${sep}${change.text}`);
      placed++;
      continue;
    }
    const before = change.before.length ? findParagraph(text, change.before) : null;
    if (before) {
      const sep = change.kind === "item" && before.kind === "item" ? "\n" : "\n\n";
      text = insert(text, before.start, `${change.text}${sep}`);
      placed++;
      continue;
    }
    unplaced.push({ section: change.section, text: change.text });
  }
  // What couldn't be placed: one block at the end of the section it's in (the end of the text when the section isn't there).
  const bySection = new Map<string | null, string[]>();
  for (const u of unplaced) bySection.set(u.section, [...(bySection.get(u.section) ?? []), u.text]);
  for (const [section, texts] of bySection) {
    const block = [UNPLACED_START, ...texts, UNPLACED_END].join("\n\n");
    const ps = paragraphs(text);
    const heading = section ? ps.findIndex((p) => p.kind === "heading" && normalize(p.text) === section) : -1;
    const nextHeading = heading >= 0 ? ps.slice(heading + 1).find((p) => p.kind === "heading") : undefined;
    if (nextHeading) text = insert(text, nextHeading.start, `${block}\n\n`);
    else text = `${text.replace(/\s+$/, "")}\n\n${block}\n`;
  }
  return { text, placed, unplaced: unplaced.map((u) => u.text) };
}

/** Whether the text still has a block of new text the merge couldn't place. */
export function hasUnplacedBlock(text: string): boolean {
  return text.includes(UNPLACED_START) || text.includes(UNPLACED_END);
}
