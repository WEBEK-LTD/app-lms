import type { Metadata } from "next";
import { chooseAppTypeAction } from "@/app/actions/dashboard";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { SubmitButton } from "@/components/form";
import { Notice } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appTypeOn, getSwitches } from "@/lib/switches";
import type { AppType } from "@/lib/data/types";

export const metadata: Metadata = { title: "Choose app type" };

const TYPES: { value: AppType; name: string; icon: IconName; tile: string; text: string; requires: string }[] = [
  {
    value: "lms",
    name: "Academy",
    icon: "school",
    tile: "bg-peach",
    text: "Courses, lessons, quizzes and certificates.",
    requires: "Works with: Tutor LMS, LearnPress, LifterLMS, MasterStudy, Sensei, Masteriyo · Digits",
  },
  {
    value: "store",
    name: "Store",
    icon: "shopping_bag",
    tile: "bg-tile-1 text-[#8A5A12]",
    text: "Products, cart, checkout and orders. Delivery date and gift messages for flower shops.",
    requires: "Works with: WooCommerce · Digits",
  },
  {
    value: "booking",
    name: "Bookings",
    icon: "calendar_month",
    tile: "bg-tile-2 text-[#1D6B48]",
    text: "Services, staff, free times and appointments, booked through your booking plugin.",
    requires: "Works with: Amelia, BookingPress, LatePoint · Digits",
  },
  {
    value: "real_estate",
    name: "Real estate",
    icon: "apartment",
    tile: "bg-tile-3 text-[#3F3A6B]",
    text: "Property listings with search and filters, favorites and messages to your office.",
    requires: "No website needed: you add your listings here in the dashboard",
  },
];

export default async function AppTypePage({ searchParams }: PageProps<"/dashboard/app-type">) {
  const { app, license } = await requireClient();
  // 11.5 Switches: types the team switched off aren't offered (the app's own type stays).
  const switches = await getSwitches(await getStore());
  const types = TYPES.filter((t) => t.value === app?.appType || appTypeOn(switches, t.value, license?.plan ?? null));
  const current: AppType = app?.appType ?? types[0]?.value ?? "lms";
  const unavailable = (await searchParams).unavailable === "1";
  return (
    <form action={chooseAppTypeAction} className="flex flex-col gap-8">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">What kind of app do you want?</h1>
        <p className="m-0 text-[17px] leading-relaxed text-ink-4">
          Pick the type that matches your business. You can change it later; your next build follows it.
        </p>
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
            key={type.value}
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
              <input type="radio" name="appType" value={type.value} defaultChecked={type.value === current} className="sr-only" />
              {type.name}
            </span>
            <span className="text-[15px] leading-relaxed text-ink-4">{type.text}</span>
            <span className="text-[13px] leading-normal text-muted">{type.requires}</span>
          </label>
        ))}

      </fieldset>

      <div className="flex justify-end">
        <SubmitButton className="h-12 px-6" pendingText="Continuing…">
          Continue
        </SubmitButton>
      </div>
    </form>
  );
}
