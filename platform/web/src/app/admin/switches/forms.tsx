"use client";

import { useActionState } from "react";
import { saveSwitchesAction } from "@/app/actions/admin-switches";
import { FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

export interface SwitchGroupView {
  kind: string;
  title: string;
  text: string;
  items: { key: string; label: string; on: boolean; offOn: string[] }[];
}

/** On/off for everyone: a ticked box is on. */
export function SwitchesForm({ groups }: { groups: SwitchGroupView[] }) {
  const [state, action] = useActionState(saveSwitchesAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormMessage message={state.message} ok={state.ok} />
      {groups.map((group) => (
        <section key={group.kind} aria-labelledby={`h-${group.kind}`} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id={`h-${group.kind}`} className="m-0 text-[19px] font-bold">
              {group.title}
            </h2>
            <p className="m-0 text-sm text-ink-4">{group.text}</p>
          </div>
          <div className="grid gap-x-5 gap-y-2 [grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr))]">
            {group.items.map((item) => (
              <label key={item.key} className="flex items-start gap-2.5 text-[15px]">
                <input type="checkbox" name="on" value={item.key} defaultChecked={item.on} className="mt-1 h-4 w-4 accent-midnight" />
                <span className="flex flex-col">
                  <span>{item.label}</span>
                  {item.offOn.length ? <span className="text-xs text-muted">Off on {item.offOn.join(", ")}</span> : null}
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}
      <div className="flex justify-end">
        <SubmitButton className="h-11 px-6">Save switches</SubmitButton>
      </div>
    </form>
  );
}
