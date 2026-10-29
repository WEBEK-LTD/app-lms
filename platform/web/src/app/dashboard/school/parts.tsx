import Link from "next/link";
import type { ReactNode } from "react";
import type { DashT } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import type { App } from "@/lib/data/types";
import { hasFeature, type PlanInfo } from "@/lib/plans";

export { PageHead } from "../rides/parts";

/** 105.4 What the school pages share. */

export const isSchool = (app: App | null): app is App => app?.connector?.kind === "school";

/** The page for apps that aren't schools. */
export function NotSchool({ title, t }: { title: string; t: DashT }) {
  return (
    <div className="flex max-w-[620px] flex-col gap-3">
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{title}</h1>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("school.notHere")}</p>
    </div>
  );
}

/** Schools aren't in the plan yet: everything can be set up, the app opens the school once they are. */
export function SchoolPlanNotice({ plan, demo, t }: { plan: PlanInfo | null; demo: boolean; t: DashT }) {
  if (!plan || demo || hasFeature(plan, "school")) return null;
  return (
    <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
      {richText(t("school.notOnPlan"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}
    </p>
  );
}

/** A note that sends to another school page first. */
export function FirstNote({ text, href }: { text: string; href: string }) {
  return (
    <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
      {richText(text, { link: (chunk) => <Link href={href}>{chunk}</Link> })}
    </p>
  );
}

export function Panel({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="m-0 text-lg font-bold">
          {title}
        </h2>
        {intro ? <p className="m-0 text-[15px] leading-relaxed text-muted">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** A class picker as links (`?class=`), for pages about one class. */
export function ClassTabs({ classes, current, base, label, extra = "" }: { classes: { id: number; name: string }[]; current: number | null; base: string; label: string; extra?: string }) {
  return (
    <nav aria-label={label} className="flex max-w-[860px] flex-wrap gap-1.5">
      {classes.map((c) => (
        <Link
          key={c.id}
          href={`${base}?class=${c.id}${extra}`}
          aria-current={c.id === current ? "page" : undefined}
          className={`flex h-9 items-center rounded-full border px-3.5 text-sm no-underline ${
            c.id === current ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-ink-3 hover:border-midnight hover:text-midnight"
          }`}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}

export const WEEKDAY_KEYS = ["school.mon", "school.tue", "school.wed", "school.thu", "school.fri", "school.sat", "school.sun"] as const;
