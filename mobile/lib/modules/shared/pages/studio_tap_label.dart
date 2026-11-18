import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/vertical_wording.dart';
import '../../../core/providers.dart';

/// 159 Whether an element shows no words of its own: icons, pictures and
/// space, and layouts and buttons holding only those (Leqaa's round search
/// and bag over the stories). Anything that draws words or its own content
/// (a list, a map, a countdown) is not.
bool studioWordless(StudioNode node) => switch (node.type) {
  StudioNodeType.icon ||
  StudioNodeType.image ||
  StudioNodeType.spacer ||
  StudioNodeType.divider => true,
  StudioNodeType.button ||
  StudioNodeType.row ||
  StudioNodeType.column ||
  StudioNodeType.stack ||
  StudioNodeType.grid =>
    (node.text ?? '').trim().isEmpty && node.children.every(studioWordless),
  _ => false,
};

/// 159 What a screen reader says for a tap on an element without words of
/// its own: the owner's name for it in Studio, else what the tap opens, in
/// the app's language ("Search", "Cart", a page's title, else "Open").
/// Null for an element with words: they are what it says.
String? studioTapLabel(
  BuildContext context,
  WidgetRef ref,
  StudioNode node,
  PageAction action,
) {
  if (!studioWordless(node)) return null;
  final name = node.name?.trim();
  if (name != null && name.isNotEmpty) return name;
  return studioActionLabel(context, ref, action);
}

/// 159 What an action opens, in the app's language.
String studioActionLabel(
  BuildContext context,
  WidgetRef ref,
  PageAction action,
) {
  final l10n = context.l10n;
  final screen = action.screen;
  if (action.type == PageActionType.screen && screen != null) {
    final store =
        ref.watch(appEnvironmentProvider).build.appType == AppType.store;
    return switch (screen) {
      // A store's catalogue is its shop (or a restaurant's menu).
      BuiltInScreen.courses => store ? context.words.shop : l10n.tabCourses,
      BuiltInScreen.myCourses => l10n.tabMyCourses,
      BuiltInScreen.search => l10n.headerSearch,
      BuiltInScreen.favorites => l10n.tabFavorites,
      BuiltInScreen.messages => l10n.tabMessages,
      BuiltInScreen.account => l10n.tabAccount,
      BuiltInScreen.settings => l10n.settings,
      BuiltInScreen.notifications => l10n.notifications,
      BuiltInScreen.cart => l10n.tabCart,
      BuiltInScreen.orders => l10n.tabOrders,
      BuiltInScreen.services => l10n.services,
      BuiltInScreen.appointments => l10n.tabAppointments,
      BuiltInScreen.articles => l10n.tabLatest,
      BuiltInScreen.bookmarks => l10n.bookmarksTitle,
      BuiltInScreen.classes => l10n.classesTitle,
      BuiltInScreen.memberships => l10n.membershipTitle,
      BuiltInScreen.events => l10n.tabEvents,
      BuiltInScreen.tickets => l10n.tabTickets,
      BuiltInScreen.campaigns => l10n.tabCampaigns,
      BuiltInScreen.myDonations => l10n.tabMyDonations,
      BuiltInScreen.sendParcel => l10n.tabSend,
      BuiltInScreen.shipments => l10n.tabShipments,
      BuiltInScreen.courier => l10n.tabCourier,
      BuiltInScreen.restaurants => l10n.tabRestaurants,
      BuiltInScreen.foodOrders => l10n.tabFoodOrders,
      BuiltInScreen.restaurant => l10n.tabRestaurantDesk,
      BuiltInScreen.club => l10n.tabClub,
      BuiltInScreen.ride => l10n.tabRide,
      BuiltInScreen.myRides => l10n.tabMyRides,
      BuiltInScreen.driver => l10n.tabDriver,
      BuiltInScreen.teachers => l10n.teachersTitle,
      BuiltInScreen.teacher => l10n.tabTeacher,
      BuiltInScreen.school => l10n.tabSchool,
      BuiltInScreen.classroom => l10n.tabClassroom,
      BuiltInScreen.explore => l10n.travelTabExplore,
      BuiltInScreen.stays => l10n.travelTabStays,
      BuiltInScreen.flights => l10n.travelTabFlights,
      BuiltInScreen.trips => l10n.travelTabTrips,
      BuiltInScreen.saved => l10n.travelTabSaved,
      BuiltInScreen.priceAlerts => l10n.travelPriceAlerts,
    };
  }
  if (action.type == PageActionType.page) {
    final pages = ref.watch(navigationProvider)?.pages ?? const [];
    for (final page in pages) {
      if (page.slug == action.pageSlug && page.title.trim().isNotEmpty) {
        return page.title;
      }
    }
  }
  return l10n.open;
}
