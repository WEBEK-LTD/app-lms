"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { switchAppAction } from "@/app/actions/dashboard";
import { Icon } from "./icon";

export interface SwitcherApp {
  id: string;
  label: string;
  /** "Academy · Pending activation", for example. */
  detail: string;
}

/**
 * The dashboard header's app switcher: every app of the account, the current
 * one selected. Choosing another one makes the whole dashboard work on it.
 * Without JavaScript, the "Switch" button sends the choice.
 */
export function AppSwitcher({ apps, current, canAdd }: { apps: SwitcherApp[]; current: string | null; canAdd: boolean }) {
  const pathname = usePathname();
  const form = useRef<HTMLFormElement>(null);
  return (
    <div className="flex flex-col gap-2 px-2">
      <form ref={form} action={switchAppAction} className="flex items-end gap-2">
        <input type="hidden" name="from" value={pathname} />
        {/* A label of its own (not wrapping the list), so its name is only "Current app". */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="app-switcher" className="text-xs font-semibold text-muted">
            Current app
          </label>
          <select
            id="app-switcher"
            name="appId"
            defaultValue={current ?? ""}
            key={current ?? ""}
            onChange={() => form.current?.requestSubmit()}
            className="input input-sm h-10 min-w-0 truncate pr-8 text-sm font-semibold"
          >
            {current === null ? (
              <option value="" disabled>
                No app yet
              </option>
            ) : null}
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.label} ({app.detail})
              </option>
            ))}
          </select>
        </div>
        <noscript>
          <button type="submit" className="h-10 rounded-[10px] border border-line-strong bg-white px-3 text-sm font-semibold">
            Switch
          </button>
        </noscript>
      </form>
      {canAdd ? (
        <Link href="/dashboard/app-type?new=1" className="flex items-center gap-1.5 text-sm font-semibold no-underline">
          <Icon name="add" size={18} />
          Add an app
        </Link>
      ) : null}
    </div>
  );
}
