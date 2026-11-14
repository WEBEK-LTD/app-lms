import type { CSSProperties } from "react";

/**
 * 128 The icons that point along the reading direction, mirrored right to left as the app mirrors them (Material
 * Symbols' own matchTextDirection, mobile/lib/core/theme/app_icons.dart): an arrow forward points left in Arabic.
 * The canvas's icon and text elements (view.tsx) and 129.11–129.20 the premium elements' icons (premium/shared.tsx).
 */
const MIRRORED = new Set(["arrow_forward", "arrow_back", "arrow_forward_ios", "arrow_back_ios", "arrow_back_ios_new", "chevron_right", "chevron_left", "navigate_next", "navigate_before", "keyboard_arrow_right", "keyboard_arrow_left", "arrow_right_alt", "send", "reply", "last_page", "first_page", "logout", "login", "trending_flat"]);

/** The flip of an icon that points along the reading direction, in Arabic. */
export function mirrored(icon: string | null | undefined, rtl: boolean): CSSProperties {
  return rtl && icon && MIRRORED.has(icon) ? { transform: "scaleX(-1)" } : {};
}
