import type { ReactNode } from "react";
import { Icon } from "../icon";
import type { IconName } from "../icon-names";
import { KitSwitch } from "./client";

/**
 * 132.145 Payments' own piece of the kit, in the console's look (132.180):
 * one way customers pay (a card gateway, bank transfer, the owner's own
 * way) as a setting row, as KitSettingRow draws one: its icon, its name and
 * state, a quiet line, its control at the end (Connect or Edit, an on/off
 * KitSwitch), and its details under it only while `open` (on, or being
 * edited), kept in the page while closed so a form still sends them. A
 * region named by its title. Rows sit one under the other, a hairline
 * between them, in a card (KitSettings, or a KitSection's body).
 *
 * `inline`: the control stays at the row's end on a phone too (a switch);
 * else it goes under the name there, as KitSettingRow's action does.
 */
export function KitWayRow({
  id,
  titleId,
  title,
  icon,
  status,
  description,
  control,
  inline = false,
  open = false,
  bodyId,
  level = 3,
  children,
  ...data
}: {
  id?: string;
  titleId: string;
  title: ReactNode;
  icon: IconName;
  status?: ReactNode;
  description?: ReactNode;
  control?: ReactNode;
  inline?: boolean;
  open?: boolean;
  bodyId?: string;
  level?: 2 | 3;
  children?: ReactNode;
} & { [key: `data-${string}`]: string | number | undefined }) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section {...data} id={id} aria-labelledby={titleId} className="flex scroll-mt-24 flex-col border-t border-(--sp-line) first-of-type:border-t-0">
      <div className="flex items-center gap-x-4 gap-y-3 py-5 max-sm:flex-wrap sm:py-6">
        <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--sp-cell) transition-colors ${open ? "text-accent" : "text-(--sp-ink-2)"}`}>
          <Icon name={icon} size={21} />
        </span>
        <div className={`flex min-w-0 flex-col gap-1 ${inline ? "flex-1" : "flex-[1_1_220px]"}`}>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Heading id={titleId} className="m-0 text-[15px] leading-snug font-bold text-(--sp-ink)">
              {title}
            </Heading>
            {status}
          </div>
          {description ? (
            <div className="text-[13.5px] leading-relaxed break-words text-(--sp-muted)" dir="auto">
              {description}
            </div>
          ) : null}
        </div>
        {control ? <div className={inline ? "flex shrink-0 items-center" : "flex shrink-0 flex-wrap items-center gap-2 max-sm:basis-full max-sm:ps-14"}>{control}</div> : null}
      </div>
      {children ? (
        <div id={bodyId} hidden={!open} className="kit-reveal flex min-w-0 flex-col gap-4 pb-6 sm:ps-14">
          {children}
        </div>
      ) : null}
    </section>
  );
}

/**
 * The console's KitSwitch as a form's field: named by the row's title
 * (`labelledBy`), it sends `name`="on" while on (a hidden field beside it),
 * nothing while off, as a checkbox would.
 */
export function KitWaySwitch({ name, checked, onChange, labelledBy, describedBy, disabled }: { name: string; checked: boolean; onChange: (next: boolean) => void; labelledBy: string; describedBy?: string; disabled?: boolean }) {
  return (
    <>
      <KitSwitch checked={checked} onChange={onChange} labelledBy={labelledBy} describedBy={describedBy} disabled={disabled} />
      {checked ? <input type="hidden" name={name} value="on" /> : null}
    </>
  );
}
