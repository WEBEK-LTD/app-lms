import type { App } from "../data/types";
import type { DashboardText } from "../dashboard-words";
import type { DashKey } from "@/i18n/dashboard";
import { contentNavOf, kindOf, usersLabelOf } from "../app/kinds";
import { STEP_LABEL } from "../app/setup";
import { chatSessionKind } from "../chat/access";
import { needsYallappSignIn, storeBillingSource } from "../store-billing/access";
import { pathPermission, type TeamPermission } from "../team/permissions";
import { studioScreensOn } from "./screens";

/**
 * 132.1 A Studio project's menu: every page of the dashboard that applies to
 * the project, in Studio's frame (`/studio/project/…`; the account's own
 * `/studio/account` and `/studio/team`), in a few short
 * groups. The same gates as the dashboard's own menu (app/dashboard/layout.tsx):
 * the project's kind and content (its own pages, a store's delivery and
 * offers), where its people sign in (the notifications or the site's
 * campaigns, chat), what it sells (in-app purchases), and the pages the
 * signed-in person may open (lib/team/permissions.ts).
 */

export interface StudioNavItem {
  /** The dashboard's page it shows: its permission is the team's, as on the dashboard. */
  dashboardHref: string;
  /** Where the link goes: the page in Studio's frame (an external one opens in a new tab). */
  href: string;
  label: string;
  /** A Material Symbols (Rounded) name of the site's set (components/icon-names.ts). */
  icon: string;
  external?: boolean;
}

export interface StudioNavGroup {
  /** Stable, for the menu's remembered open and closed groups. */
  id: "start" | "kind" | "app" | "people" | "publish" | "account";
  /** Shown above the group's links; none for the first group. */
  label?: string;
  /** 132.150 Its icon on the console's rail (Material Symbols Rounded, of the site's set). */
  icon: string;
  items: StudioNavItem[];
}

export interface StudioNavInput {
  app: Pick<App, "id" | "appType" | "backend" | "connector" | "vertical" | "section" | "hostedSettings" | "apiBaseUrl">;
  text: Pick<DashboardText, "t" | "k">;
  /** Whether the signed-in person may open a part of the dashboard (`contextCan`). */
  can: (permission: TeamPermission) => boolean;
  /** The support chat (WhatsApp), opened in a new tab; none, no link. */
  supportUrl?: string | null;
}

/** A dashboard address in the project's own frame: the overview for the dashboard's home, Studio's editor for the page editor. */
export function inStudioFrame(dashboardHref: string): string {
  if (dashboardHref === "/dashboard") return "/studio/project";
  if (dashboardHref === "/dashboard/pages") return "/studio/editor";
  // 132.51 The account's own pages, in Studio's account frame (as lib/studio/section.ts's studioAccountPathFor sends them).
  const account = /^\/dashboard\/(account|team)$/.exec(dashboardHref);
  if (account) return `/studio/${account[1]}`;
  return dashboardHref.replace(/^\/dashboard/, "/studio/project");
}

const item = (dashboardHref: string, label: string, icon: string): StudioNavItem => ({ dashboardHref, href: inStudioFrame(dashboardHref), label, icon });

/** The school's pages whose English word is another kind's too (a gym's Classes), or has no translation of its own: Studio's own words. */
const SCHOOL_WORDS: Record<string, DashKey> = {
  "/dashboard/school/classes": "studio.navSchoolClasses",
  "/dashboard/school/attendance": "studio.navSchoolAttendance",
  "/dashboard/school/homework": "studio.navSchoolHomework",
  "/dashboard/school/grades": "studio.navSchoolGrades",
  "/dashboard/school/fees": "studio.navSchoolFees",
};

/** 115 The marketplace's own pages (the Marketplace kind's menu has them all; a food company reaches them too). */
const MARKET_PAGES = [
  { href: "/dashboard/market/orders", label: "Marketplace orders", icon: "shopping_bag" },
  { href: "/dashboard/market/offers", label: "Offers & club", icon: "local_offer" },
  { href: "/dashboard/market/joining", label: "Joining", icon: "note_add" },
  { href: "/dashboard/market/complaints", label: "Complaints", icon: "support_agent" },
  { href: "/dashboard/market/statements", label: "Statements", icon: "receipt_long" },
] as const;

/**
 * 132.150 The rail's icon of the kind's group: a shop front for a store, the
 * kind's own icon for the rest (an academy with many teachers, whose icon is
 * the people's, a school).
 */
function kindIcon(app: StudioNavInput["app"]): string {
  if (app.appType === "store" && !app.vertical) return "storefront";
  const icon = kindOf(app).icon;
  return icon === "groups" ? "school" : icon;
}

/** 132.1 The project's menu, in its groups, only what the person may open; a group left empty goes. */
export function studioProjectNav({ app, text, can, supportUrl }: StudioNavInput): StudioNavGroup[] {
  const { t, k } = text;
  const content = contentNavOf(app);
  // 131 A store's delivery, gifts, flash sales and discount codes, and its card messages, next to its products and orders.
  const storeExtras = app.appType === "store" ? [item("/dashboard/selling", t("selling.nav"), "local_shipping"), item("/dashboard/selling/messages", t("selling.messagesTitle"), "redeem")] : [];
  // A kind's page by its own word: the school's Classes are its classes, not the gym's ("Classes" alone is the gym's word in the known texts).
  const kindLabel = (href: string, label: string) => {
    const own = SCHOOL_WORDS[href];
    return own ? t(own) : k(label);
  };
  // 115 A food company's marketplace pages, which its Marketplace settings turn on: its orders, offers and club, joining, complaints and statements.
  const marketExtras = (items: readonly { href: string }[]) =>
    app.appType === "food"
      ? MARKET_PAGES.filter((m) => !items.some((i) => i.href === m.href)).map((m) => item(m.href, k(m.label), m.icon))
      : [];
  const kind: StudioNavGroup | null =
    app.appType === "delivery"
      ? // 104 A delivery company's group, in the approved design's words.
        {
          id: "kind",
          label: t("studio.navDelivery"),
          icon: kindIcon(app),
          items: [
            // 112.2 The couriers and jobs on the map.
            item("/dashboard/delivery/live", t("studio.navLiveMap"), "map"),
            item("/dashboard/shipments", t("studio.navShipments"), "package_2"),
            item("/dashboard/couriers", t("studio.navCouriers"), "two_wheeler"),
            item("/dashboard/orders", t("studio.navPaidOrders"), "receipt_long"),
            item("/dashboard/delivery", t("studio.navDeliverySettings"), "local_shipping"),
          ],
        }
      : content
        ? { id: "kind", label: k(content.label), icon: kindIcon(app), items: [...content.items.map((i) => item(i.href, kindLabel(i.href, i.label), i.icon)), ...marketExtras(content.items), ...storeExtras] }
        : storeExtras.length
          ? { id: "kind", label: t("selling.nav"), icon: kindIcon(app), items: storeExtras }
          : null;
  // 18 Where the app's people sign in decides how they hear from it: the hosted API's notifications, or the WordPress site's campaigns (85.4).
  const notifications =
    app.backend === "hosted"
      ? [item("/dashboard/notifications", t("studio.navNotifications"), "notifications")]
      : app.backend === "wordpress"
        ? [item("/dashboard/notifications/campaigns", t("studio.navNotifications"), "notifications")]
        : [];
  const groups: StudioNavGroup[] = [
    {
      id: "start",
      icon: "space_dashboard",
      items: [
        item("/dashboard", t("studio.overview"), "space_dashboard"),
        item("/dashboard/pages", t("studio.navEditor"), "draw"),
        // 165 The app's stories: the home's full-screen stories and rings, from the dashboard.
        item("/dashboard/stories", t("stories.nav"), "auto_stories"),
        // 17 The app on a phone in the browser.
        item("/dashboard/preview", t("studio.navPreview"), "play_arrow"),
      ],
    },
    ...(kind ? [kind] : []),
    {
      id: "app",
      label: t("studio.groupApp"),
      icon: "phone_iphone",
      items: [
        item("/dashboard/setup?step=website", t("studio.navSource"), "hub"),
        item("/dashboard/setup?step=branding", t("studio.navIdentity"), "palette"),
        // 118.3 The sign-in screen and the account menu (on Yallapp's server, WordPress, or an own API Yallapp signs people in to).
        ...(studioScreensOn(app) ? [item("/dashboard/screens", t("studio.navScreens"), "phone_iphone")] : []),
        item("/dashboard/languages", t("studio.navLanguages"), "translate"),
        // 51 The app's videos, pictures and PDFs, kept by Yallapp.
        item("/dashboard/media", t("nav.media"), "photo_library"),
        // 53 Screenshots and screen recording in the app.
        item("/dashboard/protection", t("nav.protection"), "lock"),
        // 80.1 Everything the app is connected to (its payments among them), with its state and a test.
        item("/dashboard/integrations", t("integrations.title"), "link"),
        // 132.30 The owner's own payment gateways (Stripe and the others), with a test of the connection.
        item("/dashboard/payments", t("gateways.page"), "payments"),
        // 100.2 Courses and memberships sold through Google Play and the App Store; 100.7 also an own API, which first needs Yallapp's sign-in.
        ...((storeBillingSource(app) || needsYallappSignIn(app)) && can("settings") ? [item("/dashboard/in-app-purchases", t("inapp.nav"), "shopping_bag")] : []),
        item("/dashboard/setup", t("studio.navSettings"), "tune"),
      ],
    },
    {
      id: "people",
      label: k(usersLabelOf(app)),
      icon: "groups",
      items: [
        // 124.12 How people sign in and who sends their codes.
        item("/dashboard/app-sign-in", t("studio.navSignIn"), "login"),
        ...notifications,
        // 77 The people using the app write to the business (apps whose people Yallapp knows).
        ...(chatSessionKind(app) ? [item("/dashboard/chat", t("chat.nav"), "forum")] : []),
        // 44 How people use the app.
        item("/dashboard/analytics", t("studio.navAnalytics"), "monitoring"),
      ],
    },
    {
      id: "publish",
      label: t("studio.groupPublish"),
      icon: "public",
      items: [
        item("/dashboard/publishing", t("studio.navStores"), "storefront"),
        item("/dashboard/builds", t("studio.navBuilds"), "build"),
        // 46 Crash-free sessions, the rating prompt and crash reports.
        item("/dashboard/stability", t("nav.stability"), "verified"),
      ],
    },
    {
      id: "account",
      label: t("nav.account"),
      icon: "account_circle",
      items: [
        item("/dashboard/license", t("studio.navPlan"), "workspace_premium"),
        item("/dashboard/invoices", t("studio.navInvoices"), "receipt_long"),
        // 133.8 Add-ons for the project (services, more of a limit, features), as in the dashboard's menu.
        item("/dashboard/addons", t("addons.title"), "widgets"),
        // 60 The people who work with the owner.
        item("/dashboard/team", t("team.nav"), "groups"),
        // 57 Updates from Yallapp, the list behind the bell.
        item("/dashboard/announcements", t("nav.updates"), "campaign"),
        // 58 Phones signed in to Yallapp Business with this account.
        item("/dashboard/phones", t("owner.nav"), "smartphone"),
        // 66 Who is signed in, and deleting the Yallapp account.
        item("/dashboard/account", t("account.nav"), "account_circle"),
        ...(supportUrl ? [{ dashboardHref: supportUrl, href: supportUrl, label: t("nav.support"), icon: "support_agent", external: true }] : []),
      ],
    },
  ];
  // A page the kind's group has already (a travel agency's Messages) shows there only.
  const seen = new Set<string>();
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((i) => {
        if (seen.has(i.href)) return false;
        seen.add(i.href);
        return i.external || can(pathPermission(i.dashboardHref));
      }),
    }))
    .filter((group) => group.items.length);
}

/**
 * 132.2 The pages the quick search finds besides the menu's: the setup's
 * other steps and the store pages' parts, each in Studio's frame, for the
 * person who may open them.
 */
export function studioJumpTargets({ app, text, can }: StudioNavInput): StudioNavItem[] {
  const { t, k } = text;
  return [
    item("/dashboard/setup?step=listing", k(STEP_LABEL.listing), "storefront"),
    item("/dashboard/setup?step=publishing", k(STEP_LABEL.publishing), "rocket_launch"),
    item("/dashboard/publishing/links", t("stores.linksTitle"), "link"),
    item("/dashboard/publishing/more-stores", t("stores.moreTitle"), "storefront"),
    ...(app.backend === "hosted" ? [item("/dashboard/notifications/campaigns", t("campaigns.title"), "campaign")] : []),
  ].filter((i) => can(pathPermission(i.dashboardHref)));
}
