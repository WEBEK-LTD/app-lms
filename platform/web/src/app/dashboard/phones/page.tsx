import type { Metadata } from "next";
import { signOutAllPhonesAction, signOutPhoneAction } from "@/app/actions/owner-devices";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { KitCallout, KitEmpty, KitHeader, KitHero, KitMore, KitNext, KitPage, KitSection, KitStat, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { KitInspectorFacts, KitInspectorHead, KitTable, KitTableRow } from "@/components/studio-page/table";
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
          <KitSection titleId="h-phones" title={t("owner.count", { count: devices.length })} flush>
            <KitTable
              label={t("owner.title")}
              closeLabel={t("common.close")}
              media
              name={t("owner.colPhone")}
              columns={[
                { label: t("owner.colSystem"), width: "150px", wide: true },
                { label: t("owner.colLastUsed"), width: "150px" },
              ]}
              end={{ label: t("owner.colNotifications"), width: "150px" }}
            >
              {devices.map((device) => (
                <KitTableRow
                  key={device.id}
                  id={device.id}
                  data-device={device.id}
                  media={<KitThumb icon={device.platform === "ios" ? "phone_iphone" : "smartphone"} size={40} />}
                  name={
                    <span className="min-w-0 truncate" dir="auto">
                      {device.name}
                    </span>
                  }
                  // The page's words first: the line takes its direction from them (Arabic right to left).
                  line={t("owner.lastUsed", { date: date(device.lastSeenAt) })}
                  cells={[system(device), date(device.lastSeenAt)]}
                  end={device.pushToken ? <KitStatus tone="success">{t("owner.notifications")}</KitStatus> : <span className="text-[13px] text-(--sp-faint)">—</span>}
                  inspector={{
                    label: device.name,
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
                  }}
                >
                  <div className="flex flex-col gap-4" data-inspector-device={device.id}>
                    <KitInspectorHead
                      top={
                        <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-(--sp-tile) text-(--sp-ink-2)">
                          <Icon name={device.platform === "ios" ? "phone_iphone" : "smartphone"} size={24} />
                        </span>
                      }
                      title={<bdi>{device.name}</bdi>}
                      line={system(device)}
                    />
                    <KitInspectorFacts
                      facts={[
                        [t("owner.colSystem"), system(device)],
                        [t("owner.colSignedIn"), date(device.createdAt)],
                        [t("owner.colLastUsed"), date(device.lastSeenAt)],
                        [t("owner.colNotifications"), device.pushToken ? t("owner.notifications") : t("common.off")],
                      ]}
                    />
                    <p className="m-0 text-[13px] leading-relaxed text-(--sp-muted)">{t("owner.passwordNote")}</p>
                  </div>
                </KitTableRow>
              ))}
            </KitTable>
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
