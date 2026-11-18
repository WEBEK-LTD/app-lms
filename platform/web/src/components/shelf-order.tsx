"use client";

import { useState } from "react";
import { Icon } from "./icon";

/**
 * 115.24 Departments (or a department's aisles) put in order by drag: the
 * list is dragged into its new order, then saved with the form's button
 * (the ids in their new order). The arrows beside each row work without it.
 */
export function ShelfOrder({ items, action, hidden, labels }: {
  items: { id: number; name: string }[];
  action: (f: FormData) => Promise<void>;
  hidden: Record<string, string>;
  labels: { hint: string; save: string };
}) {
  const [order, setOrder] = useState(items);
  const [dragging, setDragging] = useState<number | null>(null);
  const changed = order.map((x) => x.id).join(",") !== items.map((x) => x.id).join(",");
  const moveTo = (id: number, target: number) => {
    if (id === target) return;
    const from = order.findIndex((x) => x.id === id);
    const to = order.findIndex((x) => x.id === target);
    if (from < 0 || to < 0) return;
    const next = [...order];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row!);
    setOrder(next);
  };
  if (items.length < 2) return null;
  return (
    <form action={action} className="flex flex-col gap-2">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="ids" value={order.map((x) => x.id).join(",")} />
      <p className="m-0 text-[13px] text-muted">{labels.hint}</p>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {order.map((x) => (
          <li
            key={x.id}
            draggable
            onDragStart={() => setDragging(x.id)}
            onDragEnd={() => setDragging(null)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragging !== null) moveTo(dragging, x.id);
            }}
            data-shelf={x.id}
            className={`inline-flex cursor-grab items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold text-ink-2 select-none ${dragging === x.id ? "border-ember bg-peach" : "border-line bg-sand"}`}
          >
            <Icon name="drag_indicator" size={16} className="text-faint" />
            {x.name}
          </li>
        ))}
      </ul>
      {changed ? (
        <button className="inline-flex h-10 w-fit items-center justify-center gap-1.5 rounded-xl bg-midnight px-4 text-sm font-bold text-white hover:bg-ink-3">
          <Icon name="check" size={17} />
          {labels.save}
        </button>
      ) : null}
    </form>
  );
}
