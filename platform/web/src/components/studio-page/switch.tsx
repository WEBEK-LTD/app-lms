/**
 * 132.143 A setting's on/off switch for the premium kit: a real checkbox
 * (`role="switch"`, named by `label`) drawn as a track and a knob that moves
 * to the end side when on, right to left in Arabic. Inside a form, it sends
 * `name` like any checkbox.
 */
export function KitSwitch({ name, defaultChecked, label, disabled = false }: { name: string; defaultChecked: boolean; label: string; disabled?: boolean }) {
  return (
    <span className="relative inline-flex h-7 w-12 shrink-0">
      <input
        type="checkbox"
        role="switch"
        name={name}
        defaultChecked={defaultChecked}
        aria-label={label}
        disabled={disabled}
        className="peer m-0 h-7 w-12 cursor-pointer appearance-none rounded-full bg-(--sp-line) transition-colors checked:bg-success focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sp-ink) disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute start-1 top-1 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(14,13,36,0.3)] transition-transform peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5"
      />
    </span>
  );
}
