import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'screens/campaign_screen.dart';
import 'screens/campaigns_screen.dart';
import 'screens/my_donations_screen.dart';

/// The Charity & donations module (29, hosted API): campaigns, my donations
/// and the account as tabs, and the campaign page. Browsing needs no
/// account; the history does.
final donationsModule = AppModule(
  tabPaths: {Paths.campaigns, Paths.myDonations, Paths.account},
  screens: _screens,
  defaultTabs: (_) => _defaultTabs,
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.campaigns || BuiltInScreen.courses => Paths.campaigns,
    BuiltInScreen.myDonations || BuiltInScreen.orders => Paths.myDonations,
    BuiltInScreen.account => Paths.account,
    BuiltInScreen.settings => Paths.settings,
    BuiltInScreen.notifications => Paths.notifications,
    BuiltInScreen.sendParcel ||
    BuiltInScreen.shipments ||
    BuiltInScreen.courier ||
    BuiltInScreen.restaurants ||
    BuiltInScreen.foodOrders ||
    BuiltInScreen.restaurant ||
    BuiltInScreen.search ||
    BuiltInScreen.myCourses ||
    BuiltInScreen.favorites ||
    BuiltInScreen.messages ||
    BuiltInScreen.cart ||
    BuiltInScreen.services ||
    BuiltInScreen.appointments ||
    BuiltInScreen.articles ||
    BuiltInScreen.bookmarks ||
    BuiltInScreen.classes ||
    BuiltInScreen.memberships ||
    BuiltInScreen.events ||
    BuiltInScreen.tickets => null,
  },
  routes: _pushedRoutes,
);

final _defaultTabs = [
  ShellTab(
    icon: AppIcons.campaigns,
    label: (c) => c.l10n.tabCampaigns,
    location: Paths.campaigns,
  ),
  ShellTab(
    icon: AppIcons.receipt,
    label: (c) => c.l10n.tabMyDonations,
    location: Paths.myDonations,
  ),
  ShellTab(
    icon: AppIcons.account,
    label: (c) => c.l10n.tabAccount,
    location: Paths.account,
  ),
];

List<TabScreen> _screens() => [
  TabScreen(Paths.campaigns, (state) => const CampaignsScreen()),
  TabScreen(Paths.myDonations, (state) => const MyDonationsScreen()),
  TabScreen(
    Paths.account,
    (state) => const ProfileScreen(),
    routes: accountSubRoutes(),
  ),
];

List<RouteBase> _pushedRoutes() => [
  GoRoute(
    path: '/campaign/:id',
    pageBuilder: (context, state) {
      final id = int.tryParse(state.pathParameters['id'] ?? '');
      return appPage(
        state,
        id == null || id < 1
            ? const NotFoundScreen()
            : CampaignScreen(campaignId: id),
      );
    },
  ),
];
