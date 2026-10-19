import type { IconName } from "./icon-names";

/**
 * 55 Symbols that point along the line of text: on right-to-left pages they
 * are mirrored (globals.css, `.icon-flip:dir(rtl)`), so "next" points left.
 */
const DIRECTIONAL = new Set<string>([
  "arrow_forward",
  "arrow_back",
  "arrow_right_alt",
  "chevron_right",
  "chevron_left",
  "navigate_next",
  "navigate_before",
  "keyboard_arrow_right",
  "keyboard_arrow_left",
  "first_page",
  "last_page",
  "east",
  "west",
  "read_more",
  "login",
  "logout",
  "undo",
  "redo",
]);

/** A decorative Material Symbols (Rounded) icon. Give meaning with nearby text or an aria-label on the control. */
export function Icon({
  name,
  size = 24,
  filled = false,
  className = "",
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-rounded flex-none ${filled ? "filled" : ""} ${DIRECTIONAL.has(name) ? "icon-flip" : ""} ${className}`}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  );
}
