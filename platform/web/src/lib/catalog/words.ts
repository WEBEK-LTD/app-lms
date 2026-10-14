import type { AppVertical } from "../data/types";

/**
 * 26 The dashboard's words for a shop managed here, by vertical: a
 * restaurant's menu, dishes and kitchen; everyone else's products and orders.
 */
export function catalogWords(vertical: AppVertical | null | undefined) {
  return vertical === "restaurant"
    ? {
        page: "Menu",
        intro: "Your dishes, their options, and when and how customers get them. Changes show in the app right away.",
        item: "dish",
        items: "dishes",
        add: "Add dish",
        save: "Save dish",
        new: "New dish",
        none: "No dishes yet.",
        noneText: "Choose Add dish to add your first one: its name, price, photos and options. It shows in your app right away.",
        categoriesHint: 'Your menu\'s sections, like "Breakfast" or "Drinks". They\'re the tabs at the top of the menu in the app.',
        orders: "Kitchen",
      }
    : {
        page: "Products",
        intro: "What your app sells. Changes show in the app right away.",
        item: "product",
        items: "products",
        add: "Add product",
        save: "Save product",
        new: "New product",
        none: "No products yet.",
        noneText: "Choose Add product to add your first one: its name, price, photos and stock. It shows in your app right away.",
        categoriesHint: 'Group your products, like "Bouquets" or "Gifts".',
        orders: "Orders",
      };
}
