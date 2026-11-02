import { describe, expect, it } from "vitest";
import { DraftSaves } from "@/lib/pages/draft-saves";
import { moveById, rebased } from "@/lib/pages/model";
import type { LayoutBlock } from "@/lib/pages/types";

/** 82.4 The Pages & look editor keeps every change: its saves, a form's changes on the draft as it is now, and moves. */

describe("82.4 the editor's saves", () => {
  it("is saved once the save carrying the last change is answered", () => {
    const saves = new DraftSaves();
    expect(saves.dirty).toBe(false);
    saves.change();
    const first = saves.send();
    saves.change();
    // The first save's answer: a later change is still to save.
    expect(saves.answer(first, true)).toBe("earlier");
    expect(saves.dirty).toBe(true);
    expect(saves.answer(saves.send(), true)).toBe("last");
    expect(saves.dirty).toBe(false);
  });

  it("leaves out an answer behind a later one", () => {
    const saves = new DraftSaves();
    saves.change();
    const older = saves.send();
    saves.change();
    const newer = saves.send();
    expect(saves.answer(newer, true)).toBe("last");
    // The older draft's answer comes after: it changes nothing, its errors included.
    expect(saves.answer(older, false)).toBe("behind");
    expect(saves.dirty).toBe(false);
  });

  it("an invalid draft or a save that didn't get through is still to save", () => {
    const saves = new DraftSaves();
    saves.change();
    expect(saves.answer(saves.send(), false)).toBe("last");
    expect(saves.dirty).toBe(true);
    saves.change();
    const sent = saves.send();
    // No answer (the request failed): sent again later, as it is then.
    expect(saves.dirty).toBe(true);
    expect(saves.answer(sent, true)).toBe("last");
    expect(saves.dirty).toBe(false);
  });

  it("a call that replaces the draft makes the saves sent before it count no more", () => {
    const saves = new DraftSaves();
    saves.change();
    const autosave = saves.send();
    const discard = saves.sendReplace();
    expect(saves.answer(autosave, true)).toBe("earlier");
    // A change while the discard is on its way: the server's draft is the editor's, nothing is left to save.
    saves.change();
    expect(saves.answer(discard, true)).toBe("earlier");
    saves.replaced();
    expect(saves.dirty).toBe(false);
    saves.change();
    expect(saves.dirty).toBe(true);
    expect(saves.answer(saves.send(), true)).toBe("last");
  });

  it("a publish replaces the draft only when nothing changed since", () => {
    const saves = new DraftSaves();
    saves.change();
    const publish = saves.send();
    expect(saves.isLast(publish)).toBe(true);
    saves.change();
    expect(saves.isLast(publish)).toBe(false);
    expect(saves.answer(publish, true)).toBe("earlier");
    expect(saves.dirty).toBe(true);
  });
});

describe("82.4 a form's change on the draft as it is now", () => {
  const button: LayoutBlock = { id: "b1", type: "button", visibility: "everyone", label: "Button", style: "filled", action: { type: "screen", screen: "account" } };

  it("is the form's own when nothing changed since", () => {
    const next = { ...button, label: "See courses" };
    expect(rebased(button, next, button)).toBe(next);
  });

  it("takes the fields the form changed and keeps a change made since", () => {
    // The text was typed; the screen was chosen in a form still showing the block from before.
    const current = { ...button, label: "See courses" };
    const next = { ...button, action: { type: "screen" as const, screen: "courses" as const } };
    expect(rebased(button, next, current)).toEqual({ ...button, label: "See courses", action: { type: "screen", screen: "courses" } });
  });

  it("removes a field the form removed", () => {
    const shown = { ...button, icon: "star" };
    const { icon: _icon, ...next } = shown;
    void _icon;
    const current = { ...shown, label: "See courses" };
    const out = rebased(shown, next, current);
    expect(out).not.toHaveProperty("icon");
    expect(out.label).toBe("See courses");
  });
});

describe("82.4 moving an entry by its ID", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("moves it from where it is in the list now", () => {
    expect(moveById(list, "c", -1).map((x) => x.id)).toEqual(["a", "c", "b"]);
    expect(moveById(list, "a", 1).map((x) => x.id)).toEqual(["b", "a", "c"]);
  });

  it("leaves the list as it is past its ends or for an entry not in it", () => {
    expect(moveById(list, "a", -1)).toBe(list);
    expect(moveById(list, "c", 1)).toBe(list);
    expect(moveById(list, "x", 1)).toBe(list);
  });
});
