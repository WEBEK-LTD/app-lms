import { describe, expect, it } from "vitest";
import { resized } from "@/lib/studio/resize";

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
