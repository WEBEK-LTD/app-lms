"use client";

import { useActionState } from "react";
import { saveAppHealthAction } from "@/app/actions/app-links";
import { FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

/** 46 The owner's switches: the store's own rating prompt and crash reports. */
export function AppHealthForm({ reviewPrompt, crashReports }: { reviewPrompt: boolean; crashReports: boolean }) {
  const [state, action] = useActionState(saveAppHealthAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
        <input type="checkbox" name="reviewPrompt" defaultChecked={reviewPrompt} className="mt-1 h-4 w-4 accent-midnight" />
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold">Ask for a rating</span>
          <span className="text-sm leading-relaxed text-ink-4">
            After a good moment (a finished lesson, an order, a booking), and not before someone has used the app for a few days, the app shows the
            store&apos;s own rating box. Google Play and the App Store decide whether it appears, and show it only a few times a year. Everyone gets the same
            box: the app never asks first who is happy, which the stores don&apos;t allow.
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
        <input type="checkbox" name="crashReports" defaultChecked={crashReports} className="mt-1 h-4 w-4 accent-midnight" />
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold">Send crash reports</span>
          <span className="text-sm leading-relaxed text-ink-4">
            When something goes wrong in the app, it sends us what happened, the app version and the kind of phone, so our team can fix it. Never names,
            phone numbers, emails or what people typed.
          </span>
        </span>
      </label>
      <div>
        <SubmitButton className="h-10">Save</SubmitButton>
      </div>
    </form>
  );
}
