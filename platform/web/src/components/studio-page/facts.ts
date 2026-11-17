import type { ReactNode } from "react";

/** 132.170 The facts for KitInspectorFacts (parts.tsx), leaving out the ones an entry doesn't have. */
export function factsOf(facts: readonly ([ReactNode, ReactNode] | null | false | undefined)[]): [ReactNode, ReactNode][] {
  return facts.filter((fact): fact is [ReactNode, ReactNode] => Boolean(fact));
}
