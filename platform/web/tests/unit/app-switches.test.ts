import { describe, expect, it } from "vitest";
import { APP_SWITCHES, appSwitches, isAppSwitch, storedSwitches, SWITCH_INFO, switchOn } from "@/lib/app/switches";
import { chatAvailable } from "@/lib/chat/access";
import { PLAN_INFO } from "@/lib/plans";

/** 83.3 Switches per app for modules and new features. */
describe("83.3 app switches", () => {
  it("are on unless the team turned them off, and only those off are stored", () => {
    expect(appSwitches({ switches: null })).toEqual({ chat: true, side_menu: true, block_looks: true, own_icons: true });
    expect(appSwitches({ switches: { side_menu: false, unknown: false } })).toEqual({ chat: true, side_menu: false, block_looks: true, own_icons: true });
    expect(switchOn({ switches: { chat: false } }, "chat")).toBe(false);
    expect(storedSwitches({ chat: true, side_menu: false, made_up: false })).toEqual({ side_menu: false });
    expect(storedSwitches({ chat: true })).toBeNull();
    expect(isAppSwitch("own_icons")).toBe(true);
    expect(isAppSwitch("payments")).toBe(false);
    for (const name of APP_SWITCHES) expect(SWITCH_INFO[name].label, name).toBeTruthy();
  });

  it("the chat module switched off means no chat, whatever the plan and the owner say", () => {
    const app = { backend: "hosted" as const, hostedSettings: null, chatSettings: { enabled: true, courseGroups: false } } as Parameters<typeof chatAvailable>[0];
    const pro = { ...PLAN_INFO.pro } as Parameters<typeof chatAvailable>[1];
    const before = chatAvailable(app, pro);
    expect(before).toBe(true);
    expect(chatAvailable({ ...app, switches: { chat: false } }, pro)).toBe(false);
    // On, it's whatever it was.
    expect(chatAvailable({ ...app, switches: { chat: true } }, pro)).toBe(before);
  });
});
