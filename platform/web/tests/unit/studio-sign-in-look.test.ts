import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { parseStudioScreens, screensConfig, SIGN_IN_STYLES, type StudioScreens } from "@/lib/studio/screens";
import { SYSTEM_LOOKS } from "@/lib/studio/premium-chrome";
import { authLookOf, followedLook, withOwnScreens, withOwnSignIn, withSignInFollowing } from "@/lib/studio/sign-in-look";
import { demoStudioScreens } from "@/lib/demo/screens";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 132.6 Every option of Studio › Screens' sign-in reaches the app: the look
 * (sign-in's own, or the system screens' look it follows), the photo, the
 * words and the logo are saved, served in `Config.screens` (hosted, and in
 * the license status a WordPress site serves) and read the way the app
 * reads them (mobile/lib/modules/shared/auth/auth_look.dart).
 */

const PHOTO = "https://yallapp.test/media/garden.jpg";
const signIn = (style: string, extra: Record<string, unknown> = {}) => ({ style, image_url: PHOTO, title: { en: "Fresh flowers, today", ar: "ورود طازجة اليوم" }, subtitle: { en: "Sign in to send a bouquet." }, show_logo: false, ...extra });

describe("132.6 what the app draws sign-in in", () => {
  it("sign-in's own look without a system screens' look", () => {
    for (const style of SIGN_IN_STYLES) {
      expect(authLookOf({ sign_in: parseStudioScreens({ sign_in: signIn(style) }).screens.sign_in })).toEqual({ kind: "own", style, image: style === "classic" || style === "minimal" ? null : PHOTO });
    }
    // A photo or card look without its photo is the classic one, as the app reads it.
    expect(authLookOf({ sign_in: { ...signIn("card"), image_url: null } as never })).toEqual({ kind: "own", style: "classic", image: null });
    expect(authLookOf(null)).toEqual({ kind: "own", style: "classic", image: null });
  });

  it("the system screens' look wins, with its photo, unless sign-in is given its own", () => {
    for (const look of SYSTEM_LOOKS) {
      const screens: StudioScreens = { sign_in: parseStudioScreens({ sign_in: signIn("card") }).screens.sign_in, system: { look } };
      expect(authLookOf(screens)).toEqual({ kind: "system", look, image: PHOTO });
      expect(authLookOf(screens, "code")).toEqual({ kind: "system", look, image: PHOTO });
      // Its own: the card, on sign-in and the code screen; the account keeps the look.
      const own = withOwnSignIn(screens, "card");
      expect(authLookOf(own)).toEqual({ kind: "own", style: "card", image: PHOTO });
      expect(authLookOf(own, "code")).toEqual({ kind: "own", style: "card", image: PHOTO });
      expect(own.system).toEqual({ look, screens: { sign_in: "classic", code: "classic" } });
      // And back.
      expect(withSignInFollowing(own).system).toEqual({ look });
    }
    // The look's own photo first.
    expect(authLookOf({ sign_in: signIn("classic") as never, system: { look: "photo", image_url: "https://yallapp.test/media/hero.jpg" } }).image).toBe("https://yallapp.test/media/hero.jpg");
    // A screen given another premium look keeps it when sign-in follows again.
    const other = withOwnScreens({ look: "glass", screens: { sign_in: "photo", account: "classic" } }, { sign_in: null, account: null });
    expect(other).toEqual({ look: "glass", screens: { sign_in: "photo" } });
    expect(followedLook(other, "sign_in")).toBe("photo");
    expect(followedLook(other, "settings")).toBe("glass");
  });

  it("a Signature template's sign-in follows its system look until the owner gives it its own", () => {
    const screens = demoStudioScreens("flowers", "https://yallapp.test");
    expect(screens.system?.look).toBe("petal");
    expect(authLookOf(screens).kind).toBe("system");
    const own = withOwnSignIn(screens, "minimal");
    expect(authLookOf(own)).toMatchObject({ kind: "own", style: "minimal" });
    // The account and settings keep the petal look.
    expect(own.system?.look).toBe("petal");
    expect(own.system?.screens?.account).toBeUndefined();
  });
});

describe("132.6 saved, then served to the app", () => {
  let store: MemoryStore;
  let app: App;

  const save = async (input: unknown, backend: App["backend"] = "hosted") => {
    const { screens, problems } = parseStudioScreens(input);
    expect(problems).toEqual([]);
    app = { ...app, backend, hostedSettings: { ...app.hostedSettings!, studioScreens: screens } };
    await store.updateApp(app.id, { backend, hostedSettings: app.hostedSettings }, NOW);
    return (await store.getAppById(app.id))!;
  };

  const config = async (saved: App) => {
    const ctx: HostedContext = {
      store,
      app: saved,
      active: true,
      now: NOW,
      ip: "203.0.113.41",
      secret: "test-hosted-secret",
      sender: new LogSender(),
      push: false,
      assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
      platformUrl: "https://yallapp.test",
    };
    const result = await handleHosted(ctx, { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }), body: undefined, token: null });
    expectContract("GET", "/config", result);
    return (result.body as { screens?: StudioScreens }).screens;
  };

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "store"),
      backend: "hosted",
      section: "studio",
      appName: "Leqaa",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      hostedSettings: { signupAllowed: true, signupFields: [], defaultCountryCode: "+90", deviceLimit: 2, supportWhatsapp: null, termsUrl: null, reviewPhone: null, reviewCode: null },
    };
    await store.createApp(app);
  });

  it.each(SIGN_IN_STYLES)("sign-in's own %s look, its words and logo", async (style) => {
    const served = await config(await save({ sign_in: signIn(style), system: { look: "glass", screens: { sign_in: "classic", code: "classic" } } }));
    expect(served?.sign_in).toEqual({ style, image_url: style === "classic" || style === "minimal" ? null : PHOTO, title: { en: "Fresh flowers, today", ar: "ورود طازجة اليوم" }, subtitle: { en: "Sign in to send a bouquet." }, show_logo: false });
    expect(served?.system).toEqual({ look: "glass", screens: { sign_in: "classic", code: "classic" } });
    expect(authLookOf(served)).toMatchObject({ kind: "own", style });
  });

  it.each(SYSTEM_LOOKS)("following the %s look, with its photo", async (look) => {
    const served = await config(await save({ sign_in: signIn("classic"), system: { look, image_url: PHOTO } }));
    expect(served?.system).toEqual({ look, image_url: PHOTO });
    expect(authLookOf(served)).toEqual({ kind: "system", look, image: PHOTO });
  });

  it("a WordPress site gets the same in its license status", async () => {
    const saved = await save({ sign_in: signIn("premium"), system: { look: "petal", screens: { sign_in: "classic", code: "classic" } } }, "wordpress");
    expect(screensConfig(saved).screens).toEqual({ sign_in: signIn("premium"), system: { look: "petal", screens: { sign_in: "classic", code: "classic" } } });
  });
});
