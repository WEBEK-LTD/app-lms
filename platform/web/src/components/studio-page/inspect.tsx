"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { KitInspector } from "./client";

/**
 * 132.171 Entries that open in the inspector without a table (a page's
 * tiles: Publishing's stores), beside KitTable (table.tsx) for lists: one
 * open at a time, each a button of its own look (`className`) with its
 * details in the inspector (docked beside the page from 1280 px, a drawer
 * below that).
 */

const GroupContext = createContext<{ open: string | null; setOpen: (key: string | null) => void; closeLabel: string } | null>(null);

export function KitInspectGroup({ closeLabel, children }: { closeLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  return <GroupContext.Provider value={{ open, setOpen, closeLabel }}>{children}</GroupContext.Provider>;
}

/** One entry of a KitInspectGroup: the button that opens it (`children` its words) and its details (`details`). */
export function KitInspectButton({
  id,
  className,
  children,
  inspector,
  details,
  ...data
}: {
  id: string;
  className: string;
  children: ReactNode;
  inspector: { label: string; title: ReactNode; actions?: ReactNode; footer?: ReactNode };
  details: ReactNode;
} & { [key: `data-${string}`]: string | number | undefined }) {
  const group = useContext(GroupContext);
  const open = group?.open === id;
  return (
    <>
      <button {...data} type="button" aria-haspopup="dialog" aria-expanded={open} data-open={open ? "" : undefined} onClick={() => group?.setOpen(id)} className={className}>
        {children}
      </button>
      <KitInspector open={open} onClose={() => group?.setOpen(null)} label={inspector.label} title={inspector.title} actions={inspector.actions} footer={inspector.footer} closeLabel={group?.closeLabel ?? ""}>
        {details}
      </KitInspector>
    </>
  );
}

