import { SectionTabs } from "@/components/manage-kit-client";
import { dashboardText } from "@/lib/dashboard-lang";

/** 132.160 Delivery & offers and Card messages, side by side as the console's segmented control. */
export async function SellingTabs({ messages }: { messages: number }) {
  const { t } = await dashboardText();
  return (
    <SectionTabs
      label={t("selling.nav")}
      items={[
        { href: "/dashboard/selling", label: t("selling.title"), icon: "local_shipping" },
        { href: "/dashboard/selling/messages", label: t("selling.messagesTitle"), icon: "redeem", count: messages },
      ]}
    />
  );
}
