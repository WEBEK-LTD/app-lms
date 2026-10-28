import type { Dish, DishChoice, RestaurantMenu } from "../data/types";

/**
 * 105.1 A restaurant's menu: sections of dishes, each with its choice groups
 * (a size to pick, extras up to a number). IDs are unique within the
 * restaurant and never reused, so an order's lines keep pointing at the
 * dish they were.
 */

export const EMPTY_MENU: RestaurantMenu = { sections: [], nextId: 1 };

/** Every dish's name in lower case, one per line: what the restaurants list searches. */
export function dishNamesOf(menu: RestaurantMenu): string {
  return menu.sections
    .flatMap((s) => s.dishes.map((d) => d.name.toLowerCase()))
    .join("\n")
    .slice(0, 60_000);
}

/** The dish with this ID, wherever it is in the menu. */
export function findDish(menu: RestaurantMenu, id: number): Dish | null {
  for (const section of menu.sections) {
    const dish = section.dishes.find((d) => d.id === id);
    if (dish) return dish;
  }
  return null;
}

/** The choice with this ID among the dish's groups, with its group's name. */
export function findChoice(dish: Dish, id: number): { group: string; choice: DishChoice } | null {
  for (const group of dish.choiceGroups) {
    const choice = group.choices.find((c) => c.id === id);
    if (choice) return { group: group.name, choice };
  }
  return null;
}
