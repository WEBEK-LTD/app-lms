import { SectionTabs } from "@/components/manage-kit-client";
import { dashboardText } from "@/lib/dashboard-lang";

/** 132.160 Delivery & offers and Card messages, side by side as the console's segmented control. */
export async function SellingTabs({ messages, reviews }: { messages: number; reviews?: number }) {
  const { t } = await dashboardText();
  return (
    <SectionTabs
      label={t("selling.nav")}
      items={[
        { href: "/dashboard/selling", label: t("selling.title"), icon: "local_shipping" },
        { href: "/dashboard/selling/messages", label: t("selling.messagesTitle"), icon: "redeem", count: messages },
        // 212 The reviews with photos, and who waits for what and saved what.
        { href: "/dashboard/selling/reviews", label: t("shopFeatures.reviews"), icon: "reviews", ...(reviews !== undefined ? { count: reviews } : {}) },
        { href: "/dashboard/selling/wishes", label: t("shopFeatures.wishes"), icon: "favorite" },
      ]}
    />
  );
}
