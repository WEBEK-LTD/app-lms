import type { Metadata } from "next";
import { signOutAllPhonesAction, signOutPhoneAction } from "@/app/actions/owner-devices";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { ItemList, ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { EmptyState, Notice, PageHeader, Section } from "@/components/ui";
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
  // 60 A team member sees their own phones; our team managing the dashboard, the owner's.
  const { user, member } = await requireClient("dashboard");
  const { t, date } = await dashboardText();
  const devices = await (await getStore()).listOwnerDevices((member ?? user).id);
  const signedOut = (await searchParams)["signed-out"];
  const done = typeof signedOut === "string" ? (signedOut === "all" ? t("owner.signedOutAll") : t("owner.signedOut", { name: signedOut })) : null;
  const withNotifications = devices.filter((device) => device.pushToken).length;
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the numbers, then the phones with their own Sign out. */}
      <PageHeader title={t("owner.title")} description={t("owner.intro")} />
      {done ? (
        <Notice tone="success" icon="check_circle" role="status">
          {done}
        </Notice>
      ) : null}
      {devices.length ? (
        <>
          <StatRow label={t("owner.title")}>
            <Stat icon="smartphone" label={t("owner.statPhones")} value={devices.length} />
            <Stat icon="notifications" tone="accent" label={t("owner.notifications")} value={withNotifications} />
          </StatRow>
          <Section
            titleId="h-phones"
            title={t("owner.count", { count: devices.length })}
            description={t("owner.passwordNote")}
            actions={
              <form action={signOutAllPhonesAction}>
                <SubmitButton variant="secondary" className="h-10 px-4 text-sm">
                  <Icon name="logout" size={18} />
                  {t("owner.signOutAll")}
                </SubmitButton>
              </form>
            }
            flush
          >
            <ItemList>
              {devices.map((device, i) => (
                <ItemRow
                  key={device.id}
                  data-device={device.id}
                  media={<Thumb icon={device.platform === "ios" ? "phone_iphone" : "smartphone"} shape="round" tint={i} />}
                  title={device.name}
                  meta={
                    <>
                      {device.platform === "ios" ? t("owner.ios") : t("owner.android")}
                      {device.appVersion ? <span dir="ltr"> {device.appVersion}</span> : null} · {t("owner.signedIn", { date: date(device.createdAt) })} · {t("owner.lastUsed", { date: date(device.lastSeenAt) })}
                    </>
                  }
                  aside={
                    device.pushToken ? (
                      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-success">
                        <Icon name="notifications" size={16} />
                        {t("owner.notifications")}
                      </span>
                    ) : null
                  }
                  actions={
                    <form action={signOutPhoneAction}>
                      <input type="hidden" name="id" value={device.id} />
                      <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm">
                        <span aria-hidden="true">{t("owner.signOut")}</span>
                        <span className="sr-only">{t("owner.signOutNamed", { name: device.name })}</span>
                      </SubmitButton>
                    </form>
                  }
                />
              ))}
            </ItemList>
          </Section>
        </>
      ) : (
        <EmptyState icon="smartphone" title={t("owner.empty")}>
          {t("owner.emptyText")}
        </EmptyState>
      )}
    </div>
  );
}
