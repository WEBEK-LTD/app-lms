import type { App } from "../data/types";

/**
 * 83.3 Switches per app for modules and new features, set by the Yallapp
 * team in the admin (the client's page, each app) and read by the app at
 * every start (`Config.switches`): no new build. Each is on unless the team
 * turned it off for the app. Modules turn a whole part of the app off (its
 * screens and its API); a new feature can be turned off for an app while it
 * settles. The platform also applies them to what it serves (the chat, the
 * pages), so an app too old to know a switch follows it as well.
 */

export const APP_SWITCHES = ["chat", "side_menu", "block_looks", "own_icons"] as const;
export type AppSwitch = (typeof APP_SWITCHES)[number];
export type AppSwitches = Record<AppSwitch, boolean>;

export const SWITCH_INFO: Record<AppSwitch, { kind: "module" | "feature"; label: string; description: string }> = {
  chat: { kind: "module", label: "Chat", description: "Chat with the business in the app (when the plan has it and the owner turned it on)." },
  side_menu: { kind: "feature", label: "Side menu", description: "82.5 The side menu built on Pages & look." },
  block_looks: { kind: "feature", label: "Block backgrounds and spacing", description: "82.5 Each block's background and spacing." },
  own_icons: { kind: "feature", label: "Own icons", description: "82.5 The owner's own pictures for tabs, menu entries and quick links." },
};

export function isAppSwitch(value: unknown): value is AppSwitch {
  return typeof value === "string" && (APP_SWITCHES as readonly string[]).includes(value);
}

/** Every switch for the app: what the team set, else on. */
export function appSwitches(app: Pick<App, "switches">): AppSwitches {
  const set = app.switches ?? {};
  return Object.fromEntries(APP_SWITCHES.map((name) => [name, set[name] !== false])) as AppSwitches;
}

export function switchOn(app: Pick<App, "switches">, name: AppSwitch): boolean {
  return app.switches?.[name] !== false;
}

/** What to store: only the switches turned off (null when none is), so a new switch starts on everywhere. */
export function storedSwitches(switches: Partial<Record<string, boolean>>): Partial<AppSwitches> | null {
  const off = Object.fromEntries(APP_SWITCHES.filter((name) => switches[name] === false).map((name) => [name, false]));
  return Object.keys(off).length ? (off as Partial<AppSwitches>) : null;
}
