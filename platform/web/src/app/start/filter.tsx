"use client";

import { useState, type ReactNode } from "react";

export type PickerShow = "all" | "editor" | "studio";

/**
 * 127 The switch at the top of /start: All apps | App editor | Studio. It
 * shows one product's section or both; the sections are the server's.
 */
export function PickerFilter({
  initial,
  labels,
  editor,
  studio,
  after,
}: {
  initial: PickerShow;
  labels: { group: string; all: string; editor: string; studio: string };
  editor: ReactNode;
  studio: ReactNode;
  after?: ReactNode;
}) {
  const [show, setShow] = useState<PickerShow>(initial);
  const choices: { value: PickerShow; label: string }[] = [
    { value: "all", label: labels.all },
    { value: "editor", label: labels.editor },
    { value: "studio", label: labels.studio },
  ];
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label={labels.group} className="flex max-w-full gap-1 overflow-x-auto rounded-[18px] bg-[var(--pk-seg)] p-1 text-[15px] font-semibold" data-picker-switch="">
          {choices.map((c) => {
            const on = show === c.value;
            return (
              <button
                key={c.value}
                type="button"
                aria-pressed={on}
                onClick={() => setShow(c.value)}
                className={`flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-[14px] border-0 px-[18px] font-[inherit] text-[15px] ${on ? "bg-[var(--pk-surface)] font-bold text-[var(--pk-ink)]" : "bg-transparent font-semibold text-[var(--pk-ink2)]"}`}
              >
                {c.value === "studio" ? <span aria-hidden="true" className="size-2 rounded-full bg-[#C9A24B]" /> : null}
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
      <div hidden={show === "studio"}>
        {editor}
      </div>
      <div hidden={show === "editor"}>
        {studio}
      </div>
      {after}
    </>
  );
}
