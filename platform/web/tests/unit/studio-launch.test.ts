import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { contrast, darkBackground, glow, launchColors } from "@/lib/studio/launch";
import { launchPictures, parseLaunchLook, parseStudioScreens, screensConfig, withLaunchPictures } from "@/lib/studio/screens";
import { withLook } from "@/app/dashboard/screens/launch-section";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const brand = { main: "#1D2B4F", second: "#B8893A" };

/** 124.15 The launch screen chosen and made the owner's own in Studio › Screens. */
describe("124.15 the launch screen", () => {
  it("fills in each look's own defaults", () => {
    const problems: string[] = [];
    const sig = parseLaunchLook({ look: "signature" }, problems)!;
    expect(sig).toMatchObject({ look: "signature", background: { type: "color", color: null, direction: "diagonal", overlay: null }, background_dark: null, logo: "logo", logo_size: "l", logo_shape: "rounded", loader: "bar", theme: "system", main_color: null, second_color: null });
    expect(parseLaunchLook({ look: "cinema" }, problems)).toMatchObject({ loader: "bar", background: { type: "photo" } });
    expect(parseLaunchLook({ look: "aurora" }, problems)).toMatchObject({ loader: "dots", background: { type: "color" } });
    expect(parseLaunchLook({ look: "editorial" }, problems)).toMatchObject({ loader: "steps", background: { type: "photo" } });
    expect(parseLaunchLook({ look: "monogram" }, problems)).toMatchObject({ loader: "ring", background: { type: "color" } });
    // Unknown values: the look's own.
    expect(parseLaunchLook({ look: "vapor", loader: "spinner", theme: "sepia", logo_size: "xxl", logo_shape: "star", background: { type: "video", direction: "spiral" } }, problems)).toMatchObject({
      look: "signature",
      loader: "bar",
      theme: "system",
      logo_size: "l",
      logo_shape: "rounded",
      background: { type: "color", direction: "diagonal" },
    });
    expect(problems).toEqual([]);
  });

  it("keeps the owner's background in light and in dark, and their colours", () => {
    const { screens, problems } = parseStudioScreens({
      launch: {
        look: "cinema",
        background: { type: "gradient", from: "#112233", to: "#aabbcc", direction: "radial", text_color: "#ffffff" },
        background_dark: { type: "photo", image_url: "https://yallapp.test/m/night.jpg", overlay: 62 },
        logo: "picture",
        logo_url: "https://yallapp.test/m/mark.png",
        logo_size: "xl",
        logo_shape: "as_is",
        title: { en: " Ufuq Academy ", ar: "أكاديمية أفق", tr: "" },
        subtitle: { en: "Learn what changes your path." },
        loader: "none",
        theme: "dark",
        main_color: "#1d2b4f",
        second_color: "#B8893A",
      },
    });
    expect(problems).toEqual([]);
    expect(screens.launch).toEqual({
      look: "cinema",
      background: { type: "gradient", color: null, from: "#112233", to: "#AABBCC", direction: "radial", image_url: null, overlay: null, text_color: "#FFFFFF" },
      background_dark: { type: "photo", color: null, from: null, to: null, direction: "diagonal", image_url: "https://yallapp.test/m/night.jpg", overlay: 62, text_color: null },
      logo: "picture",
      logo_url: "https://yallapp.test/m/mark.png",
      logo_size: "xl",
      logo_shape: "as_is",
      title: { en: "Ufuq Academy", ar: "أكاديمية أفق" },
      subtitle: { en: "Learn what changes your path." },
      loader: "none",
      theme: "dark",
      main_color: "#1D2B4F",
      second_color: "#B8893A",
    });
  });

  it("says what to fix: colours, addresses, the photo's darkness and the lengths", () => {
    const fix = (launch: unknown) => parseStudioScreens({ launch }).problems;
    expect(fix({ look: "signature", background: { type: "color", color: "navy" } })).toEqual(["A launch screen colour must be like #1D2B4F."]);
    expect(fix({ look: "signature", main_color: "#12345" })).toEqual(["A launch screen colour must be like #1D2B4F."]);
    expect(fix({ look: "cinema", background: { type: "photo", image_url: "http://insecure.example/a.jpg" } })).toEqual(["The launch screen photo's address isn't one the app can open."]);
    expect(fix({ look: "cinema", background_dark: { type: "photo", image_url: "javascript:alert(1)" } })).toEqual(["The launch screen photo's address isn't one the app can open."]);
    expect(fix({ look: "cinema", background: { type: "photo", overlay: 81 } })).toEqual(["The photo's darkness must be 0 to 80%."]);
    expect(fix({ look: "cinema", background: { type: "photo", overlay: -1 } })).toEqual(["The photo's darkness must be 0 to 80%."]);
    expect(fix({ look: "cinema", background: { type: "photo", overlay: "dark" } })).toEqual(["The photo's darkness must be 0 to 80%."]);
    expect(fix({ look: "signature", logo: "picture" })).toEqual(["Choose the picture for the launch screen."]);
    expect(fix({ look: "signature", logo: "picture", logo_url: "ftp://x.example/a.png" })).toEqual(["The launch screen picture's address isn't one the app can open.", "Choose the picture for the launch screen."]);
    expect(fix({ look: "signature", title: { en: "x".repeat(41) } })).toEqual(["The launch screen's title can have up to 40 characters."]);
    expect(fix({ look: "signature", subtitle: { en: "x".repeat(81) } })).toEqual(["The line under the launch screen's title can have up to 80 characters."]);
    expect(fix({ look: "signature", title: { ar: "أ".repeat(40) }, subtitle: { en: "x".repeat(80) }, background: { type: "photo", overlay: 80 } })).toEqual([]);
    // A picture is kept only for `picture`; the overlay is rounded.
    const { screens } = parseStudioScreens({ launch: { look: "signature", logo: "icon", logo_url: "https://ok.example/a.png", background: { type: "photo", overlay: 33.4 } } });
    expect(screens.launch?.logo_url).toBeNull();
    expect(screens.launch?.background.overlay).toBe(33);
  });

  it("is served with the other screens, and checks against the contract", async () => {
    const { store } = await setupClient();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const { screens } = parseStudioScreens({ launch: { look: "aurora", background: { type: "photo", image_url: "https://yallapp.test/m/a.jpg", overlay: 40 }, background_dark: null, title: { en: "Ufuq" } } });
    const app: App = {
      ...newApp(client.id, null, NOW, "lms"),
      backend: "hosted",
      section: "studio",
      appName: "Ufuq",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      hostedSettings: { signupAllowed: true, signupFields: [], defaultCountryCode: "+90", deviceLimit: 2, supportWhatsapp: null, termsUrl: null, reviewPhone: null, reviewCode: null, studioScreens: screens },
    };
    expect(screensConfig(app)).toEqual({ screens: { launch: screens.launch } });
    await store.createApp(app);
    const ctx: HostedContext = { store, app, active: true, now: NOW, ip: "203.0.113.40", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" };
    const result = await handleHosted(ctx, { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }), body: undefined, token: null });
    expectContract("GET", "/config", result);
    expect((result.body as { screens: { launch: unknown } }).screens.launch).toMatchObject({ look: "aurora", background: { type: "photo", image_url: "https://yallapp.test/m/a.jpg", overlay: 40 }, loader: "dots" });
  });

  it("carries its pictures in a project's file, at their new addresses", () => {
    const launch = parseLaunchLook({ look: "editorial", background: { type: "photo", image_url: "https://a.example/p.jpg" }, background_dark: { type: "photo", image_url: "https://a.example/n.jpg" }, logo: "picture", logo_url: "https://a.example/l.png" }, [])!;
    expect(launchPictures(launch)).toEqual(["https://a.example/p.jpg", "https://a.example/n.jpg", "https://a.example/l.png"]);
    expect(launchPictures(null)).toEqual([]);
    const moved = withLaunchPictures({ ...launch, logo_url: "blob:x" }, new Map([["https://a.example/p.jpg", "https://yallapp.test/m/1.jpg"]]));
    expect(moved.background.image_url).toBe("https://yallapp.test/m/1.jpg");
    expect(moved.background_dark?.image_url).toBe("https://a.example/n.jpg");
    // A picture without an address goes back to the logo.
    expect(moved).toMatchObject({ logo: "logo", logo_url: null });
  });

  it("switches the words for contrast unless the owner chose their colour", () => {
    const sig = parseLaunchLook({ look: "signature" }, [])!;
    // Light: dark words on the page, the second colour as it is; dark: light words, the second colour lighter.
    const light = launchColors(sig, brand, false);
    expect(light).toMatchObject({ onDark: false, accent: "#B8893A", tile: "brand", text: "#0E0D24" });
    // The initials on the navy tile in the lighter gold, as the designs have them.
    expect(light.onTile).toBe(glow("#B8893A"));
    const dark = launchColors(sig, brand, true);
    expect(dark).toMatchObject({ onDark: true, tile: "card", text: "#F4EFE6" });
    expect(contrast(dark.accent, "#0B0A1C")).toBeGreaterThan(contrast("#B8893A", "#0B0A1C"));
    expect(glow("#B8893A")).toMatch(/^#E[0-9A-F]{5}$/);
    // Monogram: the main colour in light, light words on it.
    expect(launchColors(parseLaunchLook({ look: "monogram" }, [])!, brand, false)).toMatchObject({ screen: { kind: "color", color: "#1D2B4F" }, onDark: true });
    // A light colour of the owner's: dark words; a dark one: light words.
    expect(launchColors(parseLaunchLook({ look: "aurora", background: { type: "color", color: "#FFF4D6" } }, [])!, brand, false).onDark).toBe(false);
    expect(launchColors(parseLaunchLook({ look: "aurora", background: { type: "color", color: "#202020" } }, [])!, brand, false)).toMatchObject({ onDark: true, tile: "glass" });
    // A gradient reads as its middle; a photo by how dark it is made.
    expect(launchColors(parseLaunchLook({ look: "signature", background: { type: "gradient" } }, [])!, brand, false)).toMatchObject({ screen: { kind: "gradient", from: "#1D2B4F", to: "#B8893A" }, onDark: true });
    expect(launchColors(parseLaunchLook({ look: "signature", background: { type: "photo", image_url: "https://a.example/p.jpg" } }, [])!, brand, false)).toMatchObject({ screen: { kind: "photo", overlay: 40 }, onDark: true });
    // The owner's words colour wins.
    expect(launchColors(parseLaunchLook({ look: "signature", background: { type: "color", color: "#202020", text_color: "#FFCC00" } }, [])!, brand, false).text).toBe("#FFCC00");
    // The launch screen's own colours over the project's.
    expect(launchColors(parseLaunchLook({ look: "monogram", main_color: "#FFFFFF" }, [])!, brand, false)).toMatchObject({ main: "#FFFFFF", onDark: false });
  });

  it("puts Cinema's and Editorial's photo in its frame, the gradient until there is one, and keeps it darker in dark", () => {
    const cinema = parseLaunchLook({ look: "cinema", background: { type: "photo", image_url: "https://a.example/p.jpg" } }, [])!;
    expect(launchColors(cinema, brand, false)).toMatchObject({ picture: { kind: "photo", overlay: 0 }, screen: { kind: "color", color: "#F4EFE6" }, onDark: false });
    expect(darkBackground(cinema)).toMatchObject({ type: "photo", image_url: "https://a.example/p.jpg", overlay: null });
    expect(launchColors(cinema, brand, true)).toMatchObject({ picture: { kind: "photo", overlay: 25 }, onDark: true });
    const editorial = parseLaunchLook({ look: "editorial" }, [])!;
    expect(launchColors(editorial, brand, false).picture).toEqual({ kind: "gradient", from: "#1D2B4F", to: "#B8893A", direction: "diagonal" });
    // The dark one set on its own.
    const own = parseLaunchLook({ look: "editorial", background_dark: { type: "color", color: "#331100" } }, [])!;
    expect(launchColors(own, brand, true)).toMatchObject({ picture: null, screen: { kind: "color", color: "#331100" } });
  });

  it("a look chosen brings its own loading sign and background, unless the owner changed them", () => {
    const sig = parseLaunchLook({ look: "signature" }, [])!;
    expect(withLook(sig, "editorial")).toMatchObject({ look: "editorial", loader: "steps", background: { type: "photo" } });
    const changed = { ...sig, loader: "ring" as const, background: { ...sig.background, color: "#101010" } };
    expect(withLook(changed, "editorial")).toMatchObject({ look: "editorial", loader: "ring", background: { type: "color", color: "#101010" } });
  });
});
