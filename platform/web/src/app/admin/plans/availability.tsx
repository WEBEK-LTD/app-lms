"use client";

import { useActionState } from "react";
import { savePlanAvailabilityAction } from "@/app/actions/admin-switches";
import { FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

export interface AvailabilityGroup {
  title: string;
  items: { key: string; label: string; on: boolean; offForEveryone: boolean }[];
}

/** What one plan offers (roadmap 11.5): app types, websites and features its clients can choose. */
export function PlanAvailabilityForm({ plan, planName, groups }: { plan: string; planName: string; groups: AvailabilityGroup[] }) {
  const [state, action] = useActionState(savePlanAvailabilityAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="plan" value={plan} />
      <FormMessage message={state.message} ok={state.ok} />
      <AvailabilityFields groups={groups} />
      <SubmitButton variant="secondary" className="h-10 self-start px-4 text-sm">
        Save what {planName} offers
      </SubmitButton>
    </form>
  );
}

/** The app types, websites and features a plan offers, ticked `on`; in its own form or in a Studio plan's one form. */
export function AvailabilityFields({ groups }: { groups: AvailabilityGroup[] }) {
  return (
    <>
      {groups.map((group) => (
        <fieldset key={group.title} className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold">{group.title}</legend>
          <div className="grid gap-x-4 gap-y-1.5 [grid-template-columns:repeat(auto-fill,minmax(min(200px,100%),1fr))]">
            {group.items.map((item) => (
              <label key={item.key} className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="on" value={item.key} defaultChecked={item.on} className="mt-0.5 h-4 w-4 accent-midnight" />
                <span>
                  {item.label}
                  {item.offForEveryone ? <span className="text-muted"> (off for everyone)</span> : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </>
  );
}
