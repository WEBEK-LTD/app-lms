import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { ChipLinks } from "@/components/page-kit-c";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { PageHeader, Section } from "@/components/ui";
import type { DashT } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import type { App } from "@/lib/data/types";
import { hasFeature, type PlanInfo } from "@/lib/plans";

/** The page kit's header: the page's name, a line about it, its one main action and the page above it. */
export function PageHead({ title, intro, actions, back }: { title: string; intro: ReactNode; actions?: ReactNode; back?: { href: string; label: ReactNode } }) {
  return <PageHeader title={title} description={intro} actions={actions} back={back} />;
}

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
    <p role="note" className="m-0 flex gap-2.5 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
      <Icon name="workspace_premium" size={22} className="shrink-0 text-accent" />
      <span>{richText(t("school.notOnPlan"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}</span>
    </p>
  );
}

/** A note that sends to another school page first. */
export function FirstNote({ text, href }: { text: string; href: string }) {
  return (
    <p role="note" className="m-0 flex gap-2.5 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
      <Icon name="info" size={22} className="shrink-0 text-accent" />
      <span>{richText(text, { link: (chunk) => <Link href={href}>{chunk}</Link> })}</span>
    </p>
  );
}

/** A part of a school page: the kit's Section (`flush` for a list that runs to its edges). */
export function Panel({ id, title, intro, actions, flush = false, className = "", children }: { id: string; title: ReactNode; intro?: ReactNode; actions?: ReactNode; flush?: boolean; className?: string; children?: ReactNode }) {
  return (
    <Section titleId={id} title={title} description={intro} actions={actions} flush={flush} className={className}>
      {children}
    </Section>
  );
}

/** A class picker as links (`?class=`), for pages about one class: the kit's chips. */
export function ClassTabs({ classes, current, base, label, extra = "" }: { classes: { id: number; name: string }[]; current: number | null; base: string; label: string; extra?: string }) {
  return <ChipLinks label={label} items={classes.map((c) => ({ href: `${base}?class=${c.id}${extra}`, label: c.name, current: c.id === current }))} />;
}

/** A Sheet's id from its title (each entry's title names it, so each is its own). */
function sheetId(title: string): string {
  let h = 5381;
  for (const ch of title) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return `sheet-${h.toString(36)}`;
}

/** The page kit: an entry's edit form in a Sheet, opened by a button named as the Sheet. */
export function EditSheet({ title, children }: { title: string; children: ReactNode }) {
  const id = sheetId(title);
  return (
    <>
      <SheetButton target={id} icon="edit" variant="secondary" className="h-9 w-fit px-3.5 text-sm">
        {title}
      </SheetButton>
      <Sheet id={id} title={title}>
        {children}
      </Sheet>
    </>
  );
}

/** The page kit: an add form in a Sheet, in place (`inline`) while there is nothing yet. */
export function AddSheet({ title, inline, children }: { title: string; inline: boolean; children: ReactNode }) {
  const id = sheetId(title);
  return (
    <>
      {inline ? null : (
        <SheetButton target={id} icon="add" variant="secondary" className="h-10 w-fit px-4 text-sm">
          {title}
        </SheetButton>
      )}
      <Sheet id={id} inline={inline} title={title}>
        {children}
      </Sheet>
    </>
  );
}

export const WEEKDAY_KEYS = ["school.mon", "school.tue", "school.wed", "school.thu", "school.fri", "school.sat", "school.sun"] as const;
