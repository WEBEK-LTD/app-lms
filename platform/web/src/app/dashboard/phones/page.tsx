import type { Metadata } from "next";
import { signOutAllPhonesAction, signOutPhoneAction } from "@/app/actions/owner-devices";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { EmptyState, Notice, PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("owner.title") };
}

/**
 * 58 The phones signed in to Yallapp Business (the owners' own app) with this
 * account, each with "Sign out", and "Sign out every phone".
 */
export default async function PhonesPage({ searchParams }: PageProps<"/dashboard/phones">) {
  const { user } = await requireClient();
  const { t, date } = await dashboardText();
  const devices = await (await getStore()).listOwnerDevices(user.id);
  const signedOut = (await searchParams)["signed-out"];
  const done = typeof signedOut === "string" ? (signedOut === "all" ? t("owner.signedOutAll") : t("owner.signedOut", { name: signedOut })) : null;
  return (
    <>
      <PageHeader title={t("owner.title")} description={t("owner.intro")} />
      {done ? (
        <Notice tone="success" icon="check_circle" role="status">
          {done}
        </Notice>
      ) : null}
      {devices.length ? (
        <section aria-label={t("owner.title")} className="flex max-w-[720px] flex-col gap-4">
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {devices.map((device) => (
              <li key={device.id} data-device={device.id} className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-line bg-white px-4 py-4 sm:px-5">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-sand text-ink-3" aria-hidden="true">
                  <Icon name={device.platform === "ios" ? "phone_iphone" : "smartphone"} size={22} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-bold text-midnight">{device.name}</span>
                  <span className="text-[13px] text-muted">
                    {device.platform === "ios" ? t("owner.ios") : t("owner.android")}
                    {device.appVersion ? <span dir="ltr"> {device.appVersion}</span> : null} · {t("owner.signedIn", { date: date(device.createdAt) })} ·{" "}
                    {t("owner.lastUsed", { date: date(device.lastSeenAt) })}
                    {device.pushToken ? ` · ${t("owner.notifications")}` : ""}
                  </span>
                </div>
                <form action={signOutPhoneAction}>
                  <input type="hidden" name="id" value={device.id} />
                  <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                    <span aria-hidden="true">{t("owner.signOut")}</span>
                    <span className="sr-only">{t("owner.signOutNamed", { name: device.name })}</span>
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <form action={signOutAllPhonesAction}>
              <SubmitButton variant="secondary" className="h-10 px-4 text-sm">
                <Icon name="logout" size={18} />
                {t("owner.signOutAll")}
              </SubmitButton>
            </form>
            <span className="text-sm text-muted">{t("owner.passwordNote")}</span>
          </div>
        </section>
      ) : (
        <EmptyState icon="smartphone" title={t("owner.empty")}>
          {t("owner.emptyText")}
        </EmptyState>
      )}
    </>
  );
}
