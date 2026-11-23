import type { Metadata } from "next";
import { signOutAllPhonesAction, signOutPhoneAction } from "@/app/actions/owner-devices";
import { BusinessAppButtons } from "@/components/business-app";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { KitCallout, KitEmpty, KitHeader, KitHero, KitMore, KitNext, KitPage, KitStat, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { KitInspectorBody, KitInspectorFacts, KitInspectorHead } from "@/components/studio-page/parts";
import { KitTable } from "@/components/studio-page/table";
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
  const iphones = devices.filter((device) => device.platform === "ios").length;
  const storeLabels = {
    appStoreLine: t("owner.appStoreLine"),
    appStore: t("owner.appStore"),
    googlePlayLine: t("owner.googlePlayLine"),
    googlePlay: t("owner.googlePlay"),
    newTab: t("owner.newTab"),
  };
  const system = (device: (typeof devices)[number]) => (
    <bdi>
      {device.platform === "ios" ? t("owner.ios") : t("owner.android")}
      {device.appVersion ? <span dir="ltr"> {device.appVersion}</span> : null}
    </bdi>
  );
  // 132.178 The console's look: signing out every phone in the "⋯" menu, the counts as tiles, the phones as a table
  // (the phone, when it was last used); a phone's details and its Sign out in the inspector.
  return (
    <KitPage>
      <KitHeader
        icon="smartphone"
        title={t("owner.title")}
        description={t("owner.line")}
        help={t("owner.intro")}
        helpLabel={t("studioPage.help")}
        actions={
          devices.length ? (
            <KitMore label={t("studioPage.more")}>
              <form action={signOutAllPhonesAction}>
                <button type="submit" className={kit.menuItem}>
                  <Icon name="logout" size={18} />
                  {t("owner.signOutAll")}
                </button>
              </form>
            </KitMore>
          ) : null
        }
      />
      {done ? (
        <KitCallout tone="success" icon="check_circle" role="status">
          {done}
        </KitCallout>
      ) : null}
      {/* 203 Yallapp Business on the App Store and Google Play, to install it on a phone. */}
      <div data-phones-get-app="">
        <KitCallout
          icon="download"
          title={t("owner.getApp")}
          action={<BusinessAppButtons labels={storeLabels} label={t("owner.getApp")} tone="kit" size="sm" className="gap-2" />}
        >
          {t("owner.getAppText")}
        </KitCallout>
      </div>
      {devices.length ? (
        <>
          <KitHero
            label={t("owner.title")}
            stats={
              <>
                <KitStat icon="smartphone" label={t("owner.statPhones")} value={num(devices.length)} hint={t("owner.withNotifications", { count: withNotifications })} progress={withNotifications / devices.length} />
                <KitStat icon="notifications" tone="success" label={t("owner.notifications")} value={num(withNotifications)} />
                <KitStat icon="phone_iphone" label={t("owner.ios")} value={num(iphones)} />
                <KitStat icon="android" label={t("owner.android")} value={num(devices.length - iphones)} />
              </>
            }
            next={<KitNext icon="lock">{t("owner.passwordNote")}</KitNext>}
          />
          <KitTable
            label={t("owner.title")}
            title={t("owner.count", { count: devices.length })}
            titleId="h-phones"
            columns={[
              { label: t("owner.colPhone"), width: "minmax(0,1fr)" },
              { label: t("owner.colSystem"), width: "150px", wide: true },
              { label: t("owner.colLastUsed"), width: "150px", phone: "sub" },
              { label: t("owner.colNotifications"), width: "150px", phone: "end" },
            ]}
            rows={devices.map((device) => ({
              id: device.id,
              name: device.name,
              data: { "data-device": device.id },
              cells: [
                <span key="name" className="contents">
                  <KitThumb icon={device.platform === "ios" ? "phone_iphone" : "smartphone"} size={40} />
                  <span className="min-w-0 truncate text-[14.5px] font-bold" dir="auto">
                    {device.name}
                  </span>
                </span>,
                system(device),
                // On a phone, under the name: the page's words first, so the line reads right to left in Arabic.
                <span key="used">
                  <span className="@min-[561px]/kit-page:hidden">{t("owner.lastUsed", { date: date(device.lastSeenAt) })}</span>
                  <span className="@max-[560px]/kit-page:hidden">{date(device.lastSeenAt)}</span>
                </span>,
                device.pushToken ? (
                  <KitStatus key="push" tone="success">
                    {t("owner.notifications")}
                  </KitStatus>
                ) : (
                  <span key="push" className="text-[13px] text-(--sp-faint)">
                    —
                  </span>
                ),
              ],
              inspector: {
                title: t("owner.colPhone"),
                footer: (
                  <form action={signOutPhoneAction}>
                    <input type="hidden" name="id" value={device.id} />
                    <SubmitButton variant="danger" className="h-11 w-full">
                      <Icon name="logout" size={18} />
                      <span aria-hidden="true">{t("owner.signOut")}</span>
                      <span className="sr-only">{t("owner.signOutNamed", { name: device.name })}</span>
                    </SubmitButton>
                  </form>
                ),
                body: (
                  <KitInspectorBody data-inspector-device={device.id}>
                    <KitInspectorHead icon={device.platform === "ios" ? "phone_iphone" : "smartphone"} title={device.name} line={system(device)} />
                    <KitInspectorFacts
                      facts={[
                        [t("owner.colSystem"), system(device)],
                        [t("owner.colSignedIn"), date(device.createdAt)],
                        [t("owner.colLastUsed"), date(device.lastSeenAt)],
                        [t("owner.colNotifications"), device.pushToken ? t("owner.notifications") : t("common.off")],
                      ]}
                    />
                    <p className="m-0 text-[13px] leading-relaxed text-(--sp-muted)">{t("owner.passwordNote")}</p>
                  </KitInspectorBody>
                ),
              },
            }))}
          />
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
