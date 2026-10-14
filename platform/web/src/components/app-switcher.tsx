"use client";

/* eslint-disable @next/next/no-img-element -- app icons are small uploaded PNGs served by our own route. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { switchAppAction } from "@/app/actions/dashboard";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";

export interface SwitcherApp {
  id: string;
  label: string;
  /** "Academy · Pending activation", for example. */
  detail: string;
}

export interface SwitcherCurrent {
  label: string;
  /** "Store", "Academy"… */
  typeName: string;
  typeIcon: IconName;
  iconUrl: string | null;
  state: "active" | "pending" | "expired" | "suspended";
  stateLabel: string;
}

const DOT: Record<SwitcherCurrent["state"], string> = {
  active: "bg-success",
  pending: "bg-warn",
  expired: "bg-danger",
  suspended: "bg-danger",
};

/**
 * The app switcher at the top of the sidebar: the current app's icon, name,
 * type and state, on a card that is the app list itself (a native select laid
 * over it, so it works with the keyboard and screen readers). Choosing
 * another app makes the whole dashboard work on it. Without JavaScript, the
 * "Switch" button sends the choice.
 */
export function AppSwitcher({
  apps,
  current,
  currentApp,
  canAdd,
}: {
  apps: SwitcherApp[];
  current: string | null;
  currentApp: SwitcherCurrent | null;
  canAdd: boolean;
}) {
  const pathname = usePathname();
  const form = useRef<HTMLFormElement>(null);
  const several = apps.length > 1;
  return (
    <div className="flex flex-col gap-2">
      <form ref={form} action={switchAppAction} className="flex flex-col gap-2">
        <input type="hidden" name="from" value={pathname} />
        <div className="relative flex items-center gap-3 rounded-xl border border-line bg-sand p-2.5 has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-midnight has-[select:hover]:border-line-strong">
          {currentApp?.iconUrl ? (
            <img src={currentApp.iconUrl} alt="" width={40} height={40} className="h-10 w-10 flex-none rounded-[10px] border border-line object-cover" />
          ) : (
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-peach text-accent">
              <Icon name={currentApp?.typeIcon ?? "smartphone"} size={22} />
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px] font-bold">{currentApp?.label ?? "No app yet"}</span>
            {currentApp ? (
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-full ${DOT[currentApp.state]}`} />
                <span className="truncate">
                  {currentApp.typeName} · {currentApp.stateLabel}
                </span>
              </span>
            ) : null}
          </span>
          {several ? <Icon name="unfold_more" size={20} className="text-muted" /> : null}
          {/* The label has its own element (not wrapping the list), so the list's name is only "Current app". */}
          <label htmlFor="app-switcher" className="sr-only">
            Current app
          </label>
          <select
            id="app-switcher"
            name="appId"
            defaultValue={current ?? ""}
            key={current ?? ""}
            onChange={() => form.current?.requestSubmit()}
            className={`absolute inset-0 h-full w-full appearance-none rounded-xl opacity-0 ${several ? "cursor-pointer" : "cursor-default"}`}
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
          <button type="submit" className="h-10 w-full rounded-[10px] border border-line-strong bg-white px-3 text-sm font-semibold">
            Switch
          </button>
        </noscript>
      </form>
      {canAdd ? (
        <Link href="/dashboard/app-type?new=1" className="flex h-9 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold no-underline">
          <Icon name="add" size={18} />
          Add an app
        </Link>
      ) : null}
    </div>
  );
}
