"use client";

import { useEffect } from "react";

/**
 * 154 A link to a fold on the pricing page (`/pricing#compare`, "Compare
 * plans" above the app's plans) opens it as it scrolls to it, on arriving
 * and on a click on the page alike. Without the page's script the fold is
 * still there to open by hand.
 */
export function OpenOnHash({ ids }: { ids: string[] }) {
  const folds = ids.join(" ");
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!folds.split(" ").includes(id)) return;
      const fold = document.getElementById(id);
      if (fold instanceof HTMLDetailsElement && !fold.open) {
        fold.open = true;
        fold.scrollIntoView();
      }
    };
    open();
    addEventListener("hashchange", open);
    return () => removeEventListener("hashchange", open);
  }, [folds]);
  return null;
}
