import { describe, expect, it } from "vitest";
import { categoryOrder, changedPrices, isBulkOp, orderedImages, parsePercent } from "@/lib/catalog/bulk";
import { renameCourseCategory, reorderCourseCategories, reorderItems, reorderTopics } from "@/lib/courses/reorder";
import { topicItems } from "@/lib/courses/learning";
import { MemoryStore } from "@/lib/data/memory";
import type { Course, CourseSetup } from "@/lib/data/types";

/** 132.10–132.15 Products and Courses, each job on its own page: the orders, bulk changes and photos behind them. */

describe("132.12 the categories' order", () => {
  it("puts the ids asked for first, once each, and keeps the others after them", () => {
    const cats = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    expect(categoryOrder(cats, [3, 1])).toEqual([3, 1, 2, 4]);
    expect(categoryOrder(cats, [4, 4, 9, 2, 1, 3])).toEqual([4, 2, 1, 3]);
    expect(categoryOrder(cats, [])).toEqual([1, 2, 3, 4]);
  });

  it("is saved by the store, for the app's own categories only", async () => {
    const store = new MemoryStore();
    const now = new Date();
    const a = await store.createCatalogCategory({ appId: "app-1", name: "Bouquets", now });
    const b = await store.createCatalogCategory({ appId: "app-1", name: "Gifts", now });
    const c = await store.createCatalogCategory({ appId: "app-1", name: "Vases", now });
    const other = await store.createCatalogCategory({ appId: "app-2", name: "Not mine", now });
    await store.reorderCatalogCategories("app-1", [c.id, a.id, other.id]);
    expect((await store.listCatalogCategories("app-1")).map((x) => x.name)).toEqual(["Vases", "Bouquets", "Gifts"]);
    expect((await store.listCatalogCategories("app-2")).map((x) => x.name)).toEqual(["Not mine"]);
    expect(b.position).toBe(1);
  });
});

describe("132.11 the Products list's bulk actions", () => {
  it("knows its actions", () => {
    expect(["publish", "hide", "delete", "category", "price"].every(isBulkOp)).toBe(true);
    expect(isBulkOp("archive")).toBe(false);
  });

  it("reads a percent within -90 and 500, never 0", () => {
    expect(parsePercent("10")).toBe(10);
    expect(parsePercent("+7,5")).toBe(7.5);
    expect(parsePercent("-15")).toBe(-15);
    expect(parsePercent("0")).toBeNull();
    expect(parsePercent("-95")).toBeNull();
    expect(parsePercent("501")).toBeNull();
    expect(parsePercent("ten")).toBeNull();
  });

  it("changes the price, the sale price and each variation's prices by the same share", () => {
    const variants = {
      attributes: [{ name: "Size", values: ["S", "L"] }],
      items: [
        { id: 1, values: ["S"], priceCents: null, salePriceCents: null, stock: null, sku: null, active: true },
        { id: 2, values: ["L"], priceCents: 50_000, salePriceCents: 45_000, stock: 3, sku: "L", active: true },
      ],
    };
    const up = changedPrices({ priceCents: 40_000, salePriceCents: 35_000, variants }, 10)!;
    expect(up.priceCents).toBe(44_000);
    expect(up.salePriceCents).toBe(38_500);
    expect(up.variants!.items.map((v) => [v.priceCents, v.salePriceCents])).toEqual([
      [null, null],
      [55_000, 49_500],
    ]);
    expect(changedPrices({ priceCents: 999, salePriceCents: null, variants: null }, -15)).toEqual({ priceCents: 849, salePriceCents: null, variants: null });
    // Never over the highest price the form takes.
    expect(changedPrices({ priceCents: 900_000_000, salePriceCents: null, variants: null }, 20)).toBeNull();
    // A sale rounding made as high as the price is no sale.
    expect(changedPrices({ priceCents: 7, salePriceCents: 6, variants: null }, -90)).toMatchObject({ priceCents: 1, salePriceCents: null });
  });

  it("keeps the photos in the editor's order, the first the cover", () => {
    expect(orderedImages(["a", "b", "c"], ["c", "a", "b"])).toEqual(["c", "a", "b"]);
    expect(orderedImages(["a", "b", "c"], ["b"])).toEqual(["b", "a", "c"]);
    expect(orderedImages(["a", "b"], [])).toEqual(["a", "b"]);
    expect(orderedImages(["a", "b"], ["x", "b"])).toEqual(["b", "a"]);
  });
});

describe("132.14 the curriculum's order and 132.15 the course categories", () => {
  const course: Course = {
    id: 1,
    title: "Turkish",
    description: "",
    priceCents: 0,
    instructorName: null,
    level: null,
    categoryIds: [],
    imageAssetId: null,
    active: true,
    createdAt: "2026-11-01T00:00:00.000Z",
    topics: [
      { id: 10, title: "Hello", lessons: [{ id: 11, title: "Greetings", videoUrl: null, text: "Merhaba", durationMinutes: null, preview: false }], quizzes: [{ id: 12, title: "Check", passPercent: 70, attemptsAllowed: null, timeLimitMinutes: null, questions: [] }] },
      { id: 20, title: "Numbers", lessons: [] },
    ],
  } as unknown as Course;
  const setup: CourseSetup = { currency: "TRY", categories: [{ id: 30, name: "Languages" }, { id: 31, name: "Design" }], courses: [course], nextId: 40 };

  it("moves sections, and leaves the setup alone when nothing changes", () => {
    expect(reorderTopics(setup, 1, [20, 10])!.courses[0]!.topics.map((t) => t.id)).toEqual([20, 10]);
    expect(reorderTopics(setup, 1, [10, 20])).toBeNull();
    expect(reorderTopics(setup, 9, [20, 10])).toBeNull();
  });

  it("moves a section's items, kept in its order", () => {
    const moved = reorderItems(setup, 1, 10, [12, 11])!;
    const topic = moved.courses[0]!.topics[0]!;
    expect(topic.order).toEqual([12, 11]);
    expect(topicItems(topic).map((it) => it.id)).toEqual([12, 11]);
    expect(reorderItems(setup, 1, 10, [11, 12])).toBeNull();
  });

  it("renames and moves the course categories", () => {
    expect(renameCourseCategory(setup, 31, "UX")!.categories).toEqual([{ id: 30, name: "Languages" }, { id: 31, name: "UX" }]);
    expect(renameCourseCategory(setup, 99, "UX")).toBeNull();
    expect(reorderCourseCategories(setup, [31])!.categories.map((c) => c.id)).toEqual([31, 30]);
    expect(reorderCourseCategories(setup, [30, 31])).toBeNull();
  });
});
