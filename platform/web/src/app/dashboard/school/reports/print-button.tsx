"use client";

import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";

/** 112.5 Prints the report card (or keeps it as a PDF from the print window). */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${btn.secondary} h-10 gap-1.5 px-4 text-sm print:hidden`}>
      <Icon name="description" size={18} />
      {label}
    </button>
  );
}
