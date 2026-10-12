import type { Metadata } from "next";
import { chooseAppTypeAction } from "@/app/actions/dashboard";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { SubmitButton } from "@/components/form";
import { requireClient } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose app type" };

const SOON: { name: string; icon: IconName; tile: string; text: string; requires: string }[] = [
  {
    name: "Store",
    icon: "shopping_bag",
    tile: "bg-tile-1 text-[#8A5A12]",
    text: "Products, cart, checkout and orders. Delivery date and gift messages for flower shops.",
    requires: "Requires: WooCommerce · Digits",
  },
  {
    name: "Bookings",
    icon: "calendar_month",
    tile: "bg-tile-2 text-[#1D6B48]",
    text: "Services, staff, available times and reminders.",
    requires: "Requires: a booking plugin · Digits",
  },
];

export default async function AppTypePage() {
  await requireClient();
  return (
    <form action={chooseAppTypeAction} className="flex flex-col gap-8">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">What kind of app do you want?</h1>
        <p className="m-0 text-[17px] leading-relaxed text-ink-4">Pick the type that matches your WordPress site. You can add another app type later.</p>
      </div>

      <fieldset className="m-0 grid gap-5 border-0 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
        <legend className="sr-only">App type</legend>
        <label className="flex cursor-pointer flex-col gap-3.5 rounded-[20px] border-2 border-midnight bg-white p-[26px] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2">
          <div className="flex items-center justify-between">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-peach">
              <Icon name="school" size={26} />
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-midnight text-white">
              <Icon name="check" size={14} />
            </span>
          </div>
          <span className="flex items-center gap-2 text-xl font-extrabold">
            <input type="radio" name="appType" value="lms" defaultChecked className="sr-only" />
            Academy
          </span>
          <span className="text-[15px] leading-relaxed text-ink-4">Courses, lessons, quizzes and certificates.</span>
          <span className="text-[13px] leading-normal text-muted">
            Works with: Tutor LMS, LearnPress, LifterLMS, MasterStudy, Sensei, Masteriyo · Digits
          </span>
        </label>

        {SOON.map((type) => (
          <label key={type.name} className="flex cursor-not-allowed flex-col gap-3.5 rounded-[20px] border border-line bg-white p-[26px]">
            <div className="flex items-center justify-between">
              <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-[14px] ${type.tile}`}>
                <Icon name={type.icon} size={26} />
              </span>
              <span className="rounded-xl bg-line-soft px-2.5 py-1 text-xs font-bold text-muted">Coming soon</span>
            </div>
            <span className="flex items-center gap-2 text-xl font-extrabold">
              <input type="radio" name="appType" value={type.name.toLowerCase()} disabled className="sr-only" />
              {type.name}
            </span>
            <span className="text-[15px] leading-relaxed text-ink-4">{type.text}</span>
            <span className="text-[13px] text-muted">{type.requires}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton className="h-12 px-6" pendingText="Continuing…">
          Continue with Academy
        </SubmitButton>
      </div>
    </form>
  );
}
