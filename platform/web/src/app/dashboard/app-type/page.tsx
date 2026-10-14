import type { Metadata } from "next";
import { chooseAppTypeAction } from "@/app/actions/dashboard";
import { Icon } from "@/components/icon";
import { SubmitButton } from "@/components/form";
import Link from "next/link";
import { Notice, btn } from "@/components/ui";
import { MAX_APPS_PER_CLIENT } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appTypeOn, getSwitches } from "@/lib/switches";
import { KINDS, kindOf } from "@/lib/app/kinds";

export const metadata: Metadata = { title: "Choose app type" };

export default async function AppTypePage({ searchParams }: PageProps<"/dashboard/app-type">) {
  const context = await requireClient();
  const query = await searchParams;
  // "Add an app": a new app for the same account, with its own plan. The account's first app is created here too.
  const adding = query.new === "1" && context.apps.length > 0;
  const app = adding ? null : context.app;
  const license = adding ? null : context.license;
  // 11.5 Switches: types the team switched off aren't offered (the app's own type stays).
  // 20 The picker shows kinds (lib/app/kinds.ts): an engine, with a kind of business for some.
  const switches = await getSwitches(await getStore());
  const types = KINDS.filter((k) => k.engine === app?.appType || appTypeOn(switches, k.engine, license?.plan ?? null));
  const current = app ? kindOf(app).id : (types[0]?.id ?? KINDS[0]!.id);
  const unavailable = query.unavailable === "1";
  if (adding && context.apps.length >= MAX_APPS_PER_CLIENT) {
    return (
      <div className="flex max-w-[620px] flex-col gap-4">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Add an app</h1>
        <Notice tone="warn" icon="warning" role="alert">
          This account has {MAX_APPS_PER_CLIENT} apps, the most it can have. Message us on WhatsApp if you need more.
        </Notice>
      </div>
    );
  }
  return (
    <form action={chooseAppTypeAction} className="flex flex-col gap-8">
      {adding ? <input type="hidden" name="new" value="1" /> : null}
      <div className="flex max-w-[620px] flex-col gap-2">
        {adding ? (
          <>
            <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Add an app</h1>
            <p className="m-0 text-[15px] leading-relaxed text-ink-4">
              A new app for this account, with its own plan, license key and builds. Pick its type first; it waits for activation
              until we activate it or you pay its plan.
            </p>
          </>
        ) : (
          <>
            <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">What kind of app do you want?</h1>
            <p className="m-0 text-[15px] leading-relaxed text-ink-4">
              Pick the type that matches your business. You can change it later; your next build follows it.
            </p>
            {app ? (
              <p className="m-0 text-[15px] leading-relaxed text-ink-4">
                <Link href="/dashboard/preview" className="inline-flex items-center gap-1.5 font-semibold">
                  <Icon name="visibility" size={18} />
                  Preview your app
                </Link>{" "}
                to try it with the type it has now.
              </p>
            ) : null}
          </>
        )}
      </div>

      {unavailable ? (
        <Notice tone="warn" icon="warning" role="alert">
          This app type isn&apos;t available. Choose another one, or message us on WhatsApp.
        </Notice>
      ) : null}

      <fieldset className="m-0 grid gap-5 border-0 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
        <legend className="sr-only">App type</legend>
        {types.map((type) => (
          <label
            key={type.id}
            className="group flex cursor-pointer flex-col gap-3.5 rounded-[20px] border border-line bg-white p-[26px] has-[:checked]:border-2 has-[:checked]:border-midnight has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
          >
            <div className="flex items-center justify-between">
              <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-[14px] ${type.tile}`}>
                <Icon name={type.icon} size={26} />
              </span>
              <span className="hidden h-6 w-6 items-center justify-center rounded-full bg-midnight text-white group-has-[:checked]:flex">
                <Icon name="check" size={14} />
              </span>
            </div>
            <span className="flex items-center gap-2 text-xl font-extrabold">
              <input type="radio" name="kind" value={type.id} defaultChecked={type.id === current} className="sr-only" />
              {type.name}
            </span>
            <span className="text-[15px] leading-relaxed text-ink-4">{type.description}</span>
            <span className="text-[13px] leading-normal text-muted">{type.requires}</span>
          </label>
        ))}

      </fieldset>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {adding ? (
          <Link href="/dashboard" className={`${btn.secondary} h-12`}>
            Cancel
          </Link>
        ) : null}
        <SubmitButton className="h-12 px-6" pendingText={adding ? "Adding…" : "Continuing…"}>
          {adding ? "Add the app" : "Continue"}
        </SubmitButton>
      </div>
    </form>
  );
}
