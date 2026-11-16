import type { Metadata } from "next";
import { signOutAllPhonesAction, signOutPhoneAction } from "@/app/actions/owner-devices";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { KitCallout, KitEmpty, KitHeader, KitHero, KitList, KitNext, KitPage, KitRow, KitSection, KitStat, KitStatus, KitThumb, kit } from "@/components/studio-page";
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
  const { t, date, num } = await dashboardText();
  const devices = await (await getStore()).listOwnerDevices((member ?? user).id);
  const signedOut = (await searchParams)["signed-out"];
  const done = typeof signedOut === "string" ? (signedOut === "all" ? t("owner.signedOutAll") : t("owner.signedOut", { name: signedOut })) : null;
  const withNotifications = devices.filter((device) => device.pushToken).length;
  // 132.142 The premium kit: the numbers in one hero card with signing out every phone as its next step, then each phone as a row with its own Sign out.
  return (
    <KitPage>
      <KitHeader icon="smartphone" title={t("owner.title")} description={t("owner.line")} help={t("owner.intro")} helpLabel={t("studioPage.help")} />
      {done ? (
        <KitCallout tone="success" icon="check_circle" role="status">
          {done}
        </KitCallout>
      ) : null}
      {devices.length ? (
        <>
          <KitHero
            label={t("owner.title")}
            stats={
              <>
                <KitStat icon="smartphone" tone="accent" label={t("owner.statPhones")} value={num(devices.length)} />
                <KitStat icon="notifications" tone="success" label={t("owner.notifications")} value={num(withNotifications)} />
              </>
            }
            next={
              <KitNext
                icon="lock"
                action={
                  <form action={signOutAllPhonesAction}>
                    <SubmitButton variant="secondary" className="h-10 px-4 text-sm">
                      <Icon name="logout" size={18} />
                      {t("owner.signOutAll")}
                    </SubmitButton>
                  </form>
                }
              >
                {t("owner.passwordNote")}
              </KitNext>
            }
          />
          <KitSection titleId="h-phones" title={t("owner.count", { count: devices.length })} flush>
            <KitList>
              {devices.map((device) => (
                <KitRow
                  key={device.id}
                  data-device={device.id}
                  media={<KitThumb icon={device.platform === "ios" ? "phone_iphone" : "smartphone"} />}
                  title={device.name}
                  // The page's words first: the row's line takes its direction from them (Arabic right to left).
                  meta={
                    <>
                      {t("owner.signedIn", { date: date(device.createdAt) })} · {t("owner.lastUsed", { date: date(device.lastSeenAt) })} ·{" "}
                      <bdi>
                        {device.platform === "ios" ? t("owner.ios") : t("owner.android")}
                        {device.appVersion ? <span dir="ltr"> {device.appVersion}</span> : null}
                      </bdi>
                    </>
                  }
                  aside={device.pushToken ? <KitStatus tone="success">{t("owner.notifications")}</KitStatus> : null}
                  actions={
                    <form action={signOutPhoneAction}>
                      <input type="hidden" name="id" value={device.id} />
                      <SubmitButton variant="pill" className="h-9 cursor-pointer">
                        <span aria-hidden="true">{t("owner.signOut")}</span>
                        <span className="sr-only">{t("owner.signOutNamed", { name: device.name })}</span>
                      </SubmitButton>
                    </form>
                  }
                />
              ))}
            </KitList>
          </KitSection>
        </>
      ) : (
        <div className={kit.card}>
          <KitEmpty icon="smartphone" title={t("owner.empty")}>
            {t("owner.emptyText")}
          </KitEmpty>
        </div>
      )}
    </KitPage>
  );
}
