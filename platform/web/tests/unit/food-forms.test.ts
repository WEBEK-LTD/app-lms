import { describe, expect, it } from "vitest";
import { addSection, choicesText, moveInMenu, parseChoices, parseHoursForm, parseRestaurantForm, removeDish, saveDish, setDishAvailable } from "@/lib/food/forms";
import { EMPTY_MENU } from "@/lib/food/menu";

describe("105.1 the dashboard's restaurant forms", () => {
  it("reads a dish's choices as lines of text, and writes them back the same way", () => {
    const read = parseChoices("Size (1-1): Regular, Large +15\nExtras (0-2): Onions +5, Hot sauce, Chickpeas +3 (sold out)\nSauce: Tahini", [], 10);
    expect(read).toEqual({
      nextId: 19,
      groups: [
        { id: 12, name: "Size", min: 1, max: 1, choices: [{ id: 10, name: "Regular", extraCents: 0, available: true }, { id: 11, name: "Large", extraCents: 15_00, available: true }] },
        {
          id: 16,
          name: "Extras",
          min: 0,
          max: 2,
          choices: [
            { id: 13, name: "Onions", extraCents: 5_00, available: true },
            { id: 14, name: "Hot sauce", extraCents: 0, available: true },
            { id: 15, name: "Chickpeas", extraCents: 3_00, available: false },
          ],
        },
        { id: 18, name: "Sauce", min: 0, max: 1, choices: [{ id: 17, name: "Tahini", extraCents: 0, available: true }] },
      ],
    });
    const groups = (read as { groups: Parameters<typeof choicesText>[0] }).groups;
    expect(choicesText(groups)).toBe("Size (1-1): Regular, Large +15.00\nExtras (0-2): Onions +5.00, Hot sauce, Chickpeas +3.00 (sold out)\nSauce (0-1): Tahini");
    // Saved again, the groups and choices keep their IDs.
    expect(parseChoices(choicesText(groups), groups, 19)).toMatchObject({ nextId: 19, groups: [{ id: 12 }, { id: 16 }, { id: 18 }] });
    expect(parseChoices("No colon here", [], 1)).toMatchObject({ error: expect.stringContaining("No colon here") });
    expect(parseChoices("Size (2-1): A, B", [], 1)).toMatchObject({ error: expect.stringContaining("Size") });
    expect(parseChoices("Size (1-3): A, B", [], 1)).toMatchObject({ error: expect.stringContaining("from 0 to 2") });
    expect(parseChoices("Size: A, a", [], 1)).toMatchObject({ error: '"a" is there twice in Size.' });
    expect(parseChoices("Size (1-x): A", [], 1)).toMatchObject({ error: expect.any(String) });
  });

  it("changes the menu: sections, dishes, sold out, order", () => {
    let menu = (addSection(EMPTY_MENU, " Mains ") as { menu: typeof EMPTY_MENU }).menu;
    expect(menu.sections).toEqual([{ id: 1, name: "Mains", dishes: [] }]);
    const saved = saveDish(menu, 1, null, { name: "Koshari", description: null, priceCents: 50_00, available: true, popular: false, choices: "Size (1-1): Regular, Large +15" }, undefined);
    expect(saved.ok).toBe(true);
    menu = (saved as { menu: typeof EMPTY_MENU }).menu;
    const dish = menu.sections[0]!.dishes[0]!;
    expect(dish).toMatchObject({ id: 5, name: "Koshari", choiceGroups: [{ id: 4, choices: [{ id: 2 }, { id: 3 }] }] });
    menu = (saveDish(menu, 1, null, { name: "Om Ali", description: null, priceCents: 40_00, available: true, popular: false, choices: "" }, null) as { menu: typeof EMPTY_MENU }).menu;
    menu = moveInMenu(menu, { section: 1, dish: 6 }, -1);
    expect(menu.sections[0]!.dishes.map((d) => d.name)).toEqual(["Om Ali", "Koshari"]);
    menu = setDishAvailable(menu, 5, false);
    expect(menu.sections[0]!.dishes[1]!.available).toBe(false);
    expect(removeDish(menu, 5).sections[0]!.dishes.map((d) => d.id)).toEqual([6]);
    expect(saveDish(menu, 9, null, { name: "X", description: null, priceCents: 1, available: true, popular: false, choices: "" }, null)).toMatchObject({ ok: false });
  });

  it("reads a restaurant and its hours", () => {
    const form = { name: "Abou Tarek", address: "16 Maarouf", map: "https://www.google.com/maps/place/x/@30.0505,31.241,17z", prepMinutes: "20", commission: "12.5", "cuisine-c1": "on" };
    expect(parseRestaurantForm(form, ["c1", "c2"], () => null)).toMatchObject({ ok: true, value: { address: { lat: 30.0505, lng: 31.241 }, cuisines: ["c1"], commissionBp: 1250, prepMinutes: 20, maxKm: null } });
    expect(parseRestaurantForm({ ...form, commission: "60" }, [], () => null)).toMatchObject({ ok: false, errors: { commission: expect.any(String) } });
    expect(parseRestaurantForm({ ...form, map: "nowhere" }, [], () => null)).toMatchObject({ ok: false, errors: { map: expect.any(String) } });
    expect(parseHoursForm({ "mon-opens": "10:00", "mon-closes": "02:00", "fri-opens": "13:00", "fri-closes": "23:00" })).toEqual({
      ok: true,
      value: [
        { day: "mon", opens: "10:00", closes: "02:00" },
        { day: "fri", opens: "13:00", closes: "23:00" },
      ],
    });
    expect(parseHoursForm({ "tue-opens": "10:00" })).toMatchObject({ ok: false, errors: { "tue-opens": expect.any(String) } });
  });
});
