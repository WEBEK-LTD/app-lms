"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMailSegmentAction, deleteMailTemplateAction, suppressMailAddressAction, unsuppressMailAddressAction } from "@/app/actions/admin-mail";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";

/** 114 Small actions of the campaigns' lists. */
export function DeleteButton({ kind, id, name }: { kind: "template" | "segment"; id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete “${name}”?`)) return;
        start(async () => {
          await (kind === "template" ? deleteMailTemplateAction(id) : deleteMailSegmentAction(id));
          router.refresh();
        });
      }}
      className={`${btn.ghost} h-9 cursor-pointer text-[13px] text-danger`}
    >
      <Icon name="delete" size={17} />
      Delete
    </button>
  );
}

export function AddSuppression() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await suppressMailAddressAction(email);
          if (r.ok) {
            setEmail("");
            setError(null);
            router.refresh();
          } else setError(r.error);
        });
      }}
    >
      <label htmlFor="f-suppress" className="text-[14px] font-semibold text-midnight">
        Keep an address out
      </label>
      <input id="f-suppress" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="someone@example.com" dir="ltr" className="h-10 min-w-0 flex-[1_1_260px] rounded-[10px] border border-line bg-white px-3 text-[14px] outline-0 focus:border-midnight" />
      <button type="submit" disabled={pending || !email.trim()} className={`${btn.secondary} h-10 cursor-pointer`}>
        <Icon name="block" size={18} />
        Keep out
      </button>
      {error ? <span className="basis-full text-[13px] text-danger" role="alert">{error}</span> : null}
    </form>
  );
}

export function AllowAgain({ email, force }: { email: string; force: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (force && !window.confirm(`${email} bounced or marked an email as spam. Mailing it again can hurt how inboxes treat Yallapp's emails. Allow it anyway?`)) return;
        start(async () => {
          const r = await unsuppressMailAddressAction(email, force);
          if (!r.ok) window.alert(r.error);
          router.refresh();
        });
      }}
      className={`${btn.ghost} h-9 cursor-pointer text-[13px]`}
    >
      Allow again
    </button>
  );
}
