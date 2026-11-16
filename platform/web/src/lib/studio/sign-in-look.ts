import { systemLookFor, type SystemLook, type SystemScreenKey, type SystemScreensLook } from "./premium-chrome";
import type { SignInStyle, StudioScreens } from "./screens";

/**
 * 132.6 The look the app draws sign-in in, and the screens that go with it
 * (the code screen and a new account): the system screens' look where the
 * project has one for them (`Config.screens.system`, 130.24), else
 * sign-in's own style (`Config.screens.sign_in`, 118.3 and 123). The app
 * decides the same way (mobile/lib/modules/shared/auth/auth_look.dart,
 * `AuthLook.of`), so Studio › Screens' preview draws what the app draws.
 */
export type AuthLook = { kind: "system"; look: SystemLook; image: string | null } | { kind: "own"; style: SignInStyle; image: string | null };

/** What the app draws `screen` in ("sign_in" for sign-in and a new account, "code" for the code screen). */
export function authLookOf(screens: StudioScreens | null | undefined, screen: "sign_in" | "code" = "sign_in"): AuthLook {
  const look = systemLookFor(screens?.system, screen);
  const signIn = screens?.sign_in ?? null;
  if (look) return { kind: "system", look, image: screens?.system?.image_url ?? signIn?.image_url ?? null };
  const style = signIn?.style ?? "classic";
  // A photo or card look without its photo is the classic one, as the app reads it (SignInLook.fromJson).
  if ((style === "photo" || style === "card") && !signIn?.image_url) return { kind: "own", style: "classic", image: null };
  return { kind: "own", style, image: signIn?.image_url ?? null };
}

/** The look a screen follows when it follows the system screens' look: its own premium look where it has one, else the project's. */
export function followedLook(system: SystemScreensLook, key: SystemScreenKey): SystemLook {
  const own = system.screens?.[key];
  return own && own !== "classic" ? own : system.look;
}

/**
 * The system screens' look with some screens given their own (`classic`:
 * what Studio › Screens designs for them) or back to the look (null; a
 * screen given another premium look keeps it).
 */
export function withOwnScreens(system: SystemScreensLook, change: Partial<Record<SystemScreenKey, "classic" | null>>): SystemScreensLook {
  const screens = { ...(system.screens ?? {}) };
  for (const [key, value] of Object.entries(change) as [SystemScreenKey, "classic" | null][]) {
    if (value === "classic") screens[key] = "classic";
    else if (screens[key] === "classic") delete screens[key];
  }
  const out: SystemScreensLook = { ...system };
  if (Object.keys(screens).length) out.screens = screens;
  else delete out.screens;
  return out;
}

/** Sign-in given its own style: with a system screens' look, sign-in and the code screen leave it (the account and the rest keep it). */
export function withOwnSignIn(screens: StudioScreens, style: SignInStyle): StudioScreens {
  const sign_in = { ...(screens.sign_in ?? { image_url: null, title: {}, subtitle: {}, show_logo: true }), style };
  return { ...screens, sign_in, ...(screens.system && systemLookFor(screens.system, "sign_in") ? { system: withOwnScreens(screens.system, { sign_in: "classic", code: "classic" }) } : {}) };
}

/** Sign-in back in the system screens' look, the code screen too. */
export function withSignInFollowing(screens: StudioScreens): StudioScreens {
  return screens.system ? { ...screens, system: withOwnScreens(screens.system, { sign_in: null, code: null }) } : screens;
}
