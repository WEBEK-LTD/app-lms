import type { IconName } from "./icon-names";

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
      className={`material-symbols-rounded flex-none ${filled ? "filled" : ""} ${className}`}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  );
}
