"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 132.14 On a lesson's own page: the form ends in the sticky save bar
 * (`saveBar`, with its way back), and a new one goes to `afterSave` once added.
 */
export interface ItemPage {
  saveBar?: { cancel: { href: string; label: string } };
  afterSave?: string;
}

/** A new item added from its own page: back to the curriculum. */
export function useAfterSave(state: { ok?: boolean }, isNew: boolean, afterSave?: string) {
  const router = useRouter();
  useEffect(() => {
    if (afterSave && isNew && state.ok) router.push(afterSave);
  }, [state, isNew, afterSave, router]);
}
