"use client";

import { useState } from "react";
import { Icon } from "./icon";

/** 56 The dashboard passes its words; elsewhere English. */
export function CopyButton({ value, label = "Copy", copiedLabel = "Copied" }: { value: string; label?: string; copiedLabel?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3.5 text-sm font-semibold text-midnight hover:border-midnight"
    >
      <Icon name={copied ? "check" : "content_copy"} size={18} />
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
