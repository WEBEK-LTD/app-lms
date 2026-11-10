import Link from "next/link";
import type { ReactNode } from "react";

/** The two pages of Admin › Bot dictionary: the dictionary, and what owners typed that the bot didn't understand. */
export function BotHeader({ current, open }: { current: "dictionary" | "unmatched"; open: number }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">{current === "dictionary" ? "Bot dictionary" : "Unmatched phrases"}</h1>
        <span className="text-[15px] text-muted">
          {current === "dictionary"
            ? "The words the app-builder bot understands on each of its questions, in English, Turkish, Modern Standard Arabic and the Arabic dialects. Add your own, and switch off a built-in one that misleads it."
            : "What owners typed that the bot didn't understand, with the button they chose next. Add a phrase to an intent in one click, and the bot understands it from then on; who typed it isn't kept, and rows go after 180 days."}
        </span>
      </div>
      <div role="tablist" aria-label="Bot dictionary pages" className="flex flex-wrap gap-1 border-b border-line">
        {(
          [
            ["dictionary", "Dictionary", "/admin/bot"],
            ["unmatched", `Unmatched phrases (${open})`, "/admin/bot/unmatched"],
          ] as const
        ).map(([key, label, href]) => (
          <TabLink key={key} href={href} on={key === current}>
            {label}
          </TabLink>
        ))}
      </div>
    </>
  );
}

export function TabLink({ href, on, children }: { href: string; on: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={on}
      className={`flex h-10 items-center px-4 text-sm no-underline ${on ? "border-b-2 border-midnight font-bold text-ink" : "border-b-2 border-transparent text-muted"}`}
    >
      {children}
    </Link>
  );
}

/** Smaller links to narrow a page: a question, a language. */
export function FilterLinks({ label, items }: { label: string; items: { href: string; label: string; on: boolean }[] }) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="me-1 text-sm font-semibold">{label}:</span>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.on ? "page" : undefined}
          className={`rounded-full border px-3 py-1 text-[13px] no-underline ${item.on ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line text-ink hover:border-midnight"}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function Card({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3.5 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id={id} className="m-0 text-[19px] font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}
