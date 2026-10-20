"use client";

import { useRef } from "react";
import { switchBusinessAction } from "@/app/actions/team";
import { useDashT } from "./dashboard-i18n";
import { Icon } from "./icon";

export interface SwitcherBusiness {
  clientId: string;
  name: string;
  /** "Staff", "Owner"… in the dashboard's language. */
  role: string;
}

/**
 * 60 For someone who works on more than one business (their own and teams
 * they joined): which one the dashboard is on, as a native list that sends
 * the choice when it changes ("Switch" without JavaScript).
 */
export function BusinessSwitcher({ businesses, current }: { businesses: SwitcherBusiness[]; current: string }) {
  const t = useDashT();
  const form = useRef<HTMLFormElement>(null);
  const now = businesses.find((b) => b.clientId === current);
  return (
    <form ref={form} action={switchBusinessAction} className="flex flex-col gap-1.5">
      <div className="relative flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2 has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-midnight">
        <Icon name="storefront" size={20} className="text-muted" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{t("team.business.label")}</span>
          <span className="truncate text-sm font-semibold">{now ? t("team.business.option", { name: now.name, role: now.role }) : ""}</span>
        </span>
        <Icon name="unfold_more" size={18} className="text-muted" />
        <label htmlFor="business-switcher" className="sr-only">
          {t("team.business.current")}
        </label>
        <select
          id="business-switcher"
          name="clientId"
          defaultValue={current}
          key={current}
          onChange={() => form.current?.requestSubmit()}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-xl opacity-0"
        >
          {businesses.map((b) => (
            <option key={b.clientId} value={b.clientId}>
              {t("team.business.option", { name: b.name, role: b.role })}
            </option>
          ))}
        </select>
      </div>
      <noscript>
        <button type="submit" className="h-10 w-full rounded-[10px] border border-line-strong bg-white px-3 text-sm font-semibold">
          {t("nav.switch")}
        </button>
      </noscript>
    </form>
  );
}
