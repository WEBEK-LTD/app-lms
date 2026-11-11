import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { parseStudioScreens, screensConfig } from "@/lib/studio/screens";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/** 118.3 Studio's sign-in screen look and account menu. */
describe("118.3 Studio's sign-in screen and account menu", () => {
  it("keep what the app can show, and never hide what the stores ask for", () => {
    const { screens, problems } = parseStudioScreens({
      sign_in: { style: "photo", image_url: "https://yallapp.test/media/a.jpg", title: { en: " Welcome to Safra ", ar: "أهلًا بك", xx_bad: "?" }, subtitle: {}, show_logo: false },
      account_menu: {
        header: "card",
        items: [
          { key: "settings", hidden: true },
          { key: "orders", hidden: true, label: { en: "My trips" }, icon: "flight" },
          { key: "orders", hidden: false },
          { key: "nope", hidden: false },
          { key: "link", hidden: false, label: { en: "Our blog" }, url: "https://safra.example/blog" },
          { key: "link", hidden: false, label: { en: "Offers" }, page_slug: "offers" },
          { key: "privacy", hidden: true },
        ],
      },
    });
    expect(problems).toEqual([]);
    expect(screens.sign_in).toEqual({ style: "photo", image_url: "https://yallapp.test/media/a.jpg", title: { en: "Welcome to Safra", ar: "أهلًا بك" }, subtitle: {}, show_logo: false });
    expect(screens.account_menu?.header).toBe("card");
    expect(screens.account_menu?.items).toEqual([
      { key: "settings", hidden: false, label: {}, icon: null },
      { key: "orders", hidden: true, label: { en: "My trips" }, icon: "flight" },
      { key: "link", hidden: false, label: { en: "Our blog" }, icon: "link", url: "https://safra.example/blog" },
      { key: "link", hidden: false, label: { en: "Offers" }, icon: "link", page_slug: "offers" },
      { key: "privacy", hidden: false, label: {}, icon: null },
    ]);
  });

  it("say what to fix", () => {
    expect(parseStudioScreens({ sign_in: { style: "card" } }).problems).toEqual(["Choose a photo for this look."]);
    expect(parseStudioScreens({ sign_in: { style: "photo", image_url: "javascript:alert(1)" } }).problems).toContain("The photo's address isn't one the app can open.");
    expect(parseStudioScreens({ sign_in: { style: "classic", title: { en: "x".repeat(61) } } }).problems).toEqual(["The welcome can have up to 60 characters."]);
    expect(parseStudioScreens({ account_menu: { items: [{ key: "link", label: { en: "Blog" }, url: "http://insecure.example" }] } }).problems).toEqual([
      "Give each of your own entries an https address or one of your pages.",
    ]);
    expect(parseStudioScreens({ account_menu: { items: [{ key: "link", url: "https://ok.example" }] } }).problems).toEqual(["Give each of your own entries a name."]);
    const many = Array.from({ length: 9 }, (_, i) => ({ key: "link", label: { en: `L${i}` }, url: "https://ok.example" }));
    expect(parseStudioScreens({ account_menu: { items: many } }).problems).toEqual(["Keep at most 8 of your own entries."]);
    // A classic look keeps no photo.
    expect(parseStudioScreens({ sign_in: { style: "classic", image_url: "https://ok.example/a.jpg" } }).screens.sign_in?.image_url).toBeNull();
  });

  it("keep the new looks and the night card's colour", () => {
    for (const header of ["cover", "tiles", "night"] as const) {
      expect(parseStudioScreens({ account_menu: { header, items: [] } }).screens.account_menu?.header).toBe(header);
    }
    expect(parseStudioScreens({ account_menu: { header: "night", accent: "#c9ced6", items: [] } }).screens.account_menu).toEqual({ header: "night", accent: "#C9CED6", items: [] });
    // Only the night look has a card colour, and only a #RRGGBB one.
    expect(parseStudioScreens({ account_menu: { header: "cover", accent: "#C9CED6", items: [] } }).screens.account_menu).toEqual({ header: "cover", items: [] });
    expect(parseStudioScreens({ account_menu: { header: "night", accent: "red", items: [] } }).screens.account_menu).toEqual({ header: "night", items: [] });
    expect(parseStudioScreens({ account_menu: { header: "glass", items: [] } }).screens.account_menu?.header).toBe("plain");
  });

  it("are served only to Studio apps on the hosted API, or on their own API Yallapp signs people in to", () => {
    const studioScreens = parseStudioScreens({ sign_in: { style: "minimal" } }).screens;
    const app = (over: Partial<App>) => ({ ...newApp("c", null, NOW, "store"), backend: "hosted", hostedSettings: { studioScreens }, ...over }) as App;
    expect(screensConfig(app({ section: "studio" }))).toEqual({ screens: { sign_in: studioScreens.sign_in } });
    expect(screensConfig(app({ section: "regular" }))).toEqual({});
    expect(screensConfig(app({ section: "studio", backend: "wordpress" }))).toEqual({});
    expect(screensConfig(app({ section: "studio", hostedSettings: {} as App["hostedSettings"] }))).toEqual({});
    const own = (signInBy: "yallapp" | "api") => app({ section: "studio", backend: "custom_api", hostedSettings: { studioScreens, signInBy } as App["hostedSettings"] });
    expect(screensConfig(own("yallapp"))).toEqual({ screens: { sign_in: studioScreens.sign_in } });
    expect(screensConfig(own("api"))).toEqual({});
  });
});

describe("118.3 Config.screens", () => {
  let store: MemoryStore;
  let app: App;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const { screens } = parseStudioScreens({
      sign_in: { style: "card", image_url: "https://yallapp.test/media/hotel.jpg", title: { en: "Stay somewhere unforgettable" }, subtitle: { en: "Sign in to see your trips." }, show_logo: true },
      account_menu: { header: "night", accent: "#C9CED6", items: [{ key: "notifications", hidden: true }, { key: "link", label: { en: "Our blog" }, url: "https://safra.example/blog" }] },
    });
    app = {
      ...newApp(client.id, null, NOW, "store"),
      backend: "hosted",
      section: "studio",
      appName: "Safra",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      hostedSettings: { signupAllowed: true, signupFields: [], defaultCountryCode: "+90", deviceLimit: 2, supportWhatsapp: null, termsUrl: null, reviewPhone: null, reviewCode: null, studioScreens: screens },
    };
    await store.createApp(app);
  });

  it("carries the owner's design in the contract's shape", async () => {
    const ctx: HostedContext = {
      store,
      app,
      active: true,
      now: NOW,
      ip: "203.0.113.40",
      secret: "test-hosted-secret",
      sender: new LogSender(),
      push: false,
      assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
      platformUrl: "https://yallapp.test",
    };
    const result = await handleHosted(ctx, { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }), body: undefined, token: null });
    expectContract("GET", "/config", result);
    expect((result.body as { screens: unknown }).screens).toMatchObject({
      sign_in: { style: "card", image_url: "https://yallapp.test/media/hotel.jpg", title: { en: "Stay somewhere unforgettable" }, show_logo: true },
      account_menu: { header: "night", accent: "#C9CED6", items: [{ key: "notifications", hidden: true }, { key: "link", url: "https://safra.example/blog" }] },
    });
  });
});
