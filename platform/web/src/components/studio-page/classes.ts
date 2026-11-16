import { btn } from "../ui";

/** Class names of the kit's controls and surfaces. */
export const kit = {
  /** The page's one main action (Ember, as Studio's "New project"); full width beside "⋯" on phones. */
  main: `${btn.main} h-[42px] gap-[7px] rounded-xl ps-3.5 pe-[18px] text-[14.5px] shadow-[inset_0_-2px_0_rgba(14,13,36,0.12)] max-sm:h-[46px] max-sm:flex-1`,
  /** A secondary action with a box (a toolbar's Filters, a form's second button). */
  quiet:
    "inline-flex h-[38px] cursor-pointer items-center justify-center gap-[7px] rounded-[11px] border border-(--sp-line) bg-transparent px-3.5 text-[13.5px] font-semibold whitespace-nowrap text-(--sp-ink-2) no-underline transition-colors hover:bg-(--sp-soft) hover:text-(--sp-ink) disabled:cursor-not-allowed disabled:opacity-60",
  /** The rest: words and an icon, a soft fill only when hovered. */
  ghost:
    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[11px] border-0 bg-transparent px-3.5 text-sm font-semibold text-(--sp-ink) no-underline transition-colors hover:bg-(--sp-soft) hover:text-(--sp-ink) disabled:cursor-not-allowed disabled:opacity-60",
  /** A row's one trailing action: a small outlined pill (`btn.pill`, for a SubmitButton's `variant="pill"`). */
  row: `${btn.pill} h-9 cursor-pointer`,
  /** A square icon button (give it an aria-label). */
  icon: "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent text-(--sp-ink-2) transition-colors hover:bg-(--sp-soft) hover:text-(--sp-ink) disabled:opacity-50",
  /** The page's "⋯" beside its main action: a square with a hairline. */
  square:
    "flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-(--sp-line) bg-transparent p-0 text-(--sp-ink-2) transition-colors hover:bg-(--sp-soft) hover:text-(--sp-ink) max-sm:h-[46px] max-sm:w-[46px]",
  /** An entry of a "⋯" menu (a link or a button). */
  menuItem:
    "flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-3 text-start text-sm font-semibold whitespace-nowrap text-(--sp-ink) no-underline transition-colors hover:bg-(--sp-soft) hover:text-(--sp-ink)",
  /** A card: the kit's surface, told apart by a hairline. */
  card: "rounded-[18px] border border-(--sp-line) bg-(--sp-surface)",
  /** A field of a toolbar (a select). */
  field:
    "h-10 min-w-0 cursor-pointer rounded-[11px] border border-(--sp-line) bg-(--sp-surface) ps-3 pe-8 text-sm text-(--sp-ink) transition-colors hover:border-(--sp-muted) focus:border-(--sp-ink) focus:outline-2 focus:outline-offset-0 focus:outline-(--sp-ink)",
  /** A filter chip, on or off (with aria-pressed). */
  chip: (on: boolean) =>
    `inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border px-3 text-[13px] transition-colors ${
      on ? "border-(--sp-ink) bg-(--sp-ink) font-bold text-(--sp-surface)" : "border-(--sp-line) bg-(--sp-surface) font-semibold text-(--sp-ink) hover:border-(--sp-muted)"
    }`,
  /** A chip's count. */
  chipCount: (on: boolean) => `rounded-md px-1.5 text-xs tabular-nums ${on ? "bg-white/20" : "bg-(--sp-soft) text-(--sp-muted)"}`,
} as const;
