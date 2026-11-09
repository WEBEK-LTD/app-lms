import { describe, expect, it } from "vitest";
import { resized, snapped } from "@/lib/studio/resize";

const start = { width: 200, height: 100, room: 320 };

describe("108.1 resizing by a corner in the editor's phone", () => {
  it("changes only the side dragged", () => {
    expect(resized(start, { dx: 2, dy: 1, keepRatio: false })).toEqual({});
    expect(resized(start, { dx: 40, dy: 1, keepRatio: false })).toEqual({ width: 240 });
    expect(resized(start, { dx: 0, dy: -30.4, keepRatio: false })).toEqual({ height: 70 });
    expect(resized(start, { dx: -50, dy: 20, keepRatio: false })).toEqual({ width: 150, height: 120 });
  });

  it("fills what holds it when it reaches it, and never gets too small", () => {
    expect(resized(start, { dx: 116, dy: 0, keepRatio: false })).toEqual({ width: "fill" });
    expect(resized(start, { dx: 400, dy: 0, keepRatio: false })).toEqual({ width: "fill" });
    expect(resized(start, { dx: -500, dy: -500, keepRatio: false })).toEqual({ width: 8, height: 8 });
  });

  it("keeps the shape with Shift", () => {
    expect(resized(start, { dx: 40, dy: 3, keepRatio: true })).toEqual({ width: 240, height: 120 });
    expect(resized(start, { dx: 0, dy: -50, keepRatio: true })).toEqual({ width: 100, height: 50 });
  });
});

describe("Editor audit 3.3: snapping while resizing", () => {
  it("takes a half, a third or two thirds of what holds it when close, and says which", () => {
    expect(snapped({ width: 157 }, start, false)).toEqual({ size: { width: 160 }, guide: { share: "half", width: 160 } });
    expect(snapped({ width: 110 }, start, false)).toEqual({ size: { width: 107 }, guide: { share: "third", width: 107 } });
    expect(snapped({ width: 211 }, start, false)).toEqual({ size: { width: 213 }, guide: { share: "two_thirds", width: 213 } });
  });

  it("puts other sizes on the 4-pixel grid, leaves fill alone, and lets Alt go anywhere", () => {
    expect(snapped({ width: 243, height: 70 }, start, false)).toEqual({ size: { width: 244, height: 72 }, guide: null });
    expect(snapped({ width: "fill" }, start, false)).toEqual({ size: { width: "fill" }, guide: null });
    expect(snapped({ height: 9 }, start, false)).toEqual({ size: { height: 8 }, guide: null });
    expect(snapped({ width: 157, height: 70 }, start, true)).toEqual({ size: { width: 157, height: 70 }, guide: null });
  });
});
