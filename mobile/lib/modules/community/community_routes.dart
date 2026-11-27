import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/api/models/models.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'community_paths.dart';
import 'screens/community_screens.dart';

/// 235 The Community module (hosted API, `/community`): the client's own
/// community, on the community engine with this app as its tenant. Its tabs
/// are the feed, Q&A, groups, messages and the member's profile; the
/// account stays where every app has it. Reading needs no account; posting,
/// answering, joining and messages need the app's sign-in.
final communityModule = AppModule(
  tabPaths: {
    CommunityPaths.feed,
    CommunityPaths.questions,
    CommunityPaths.groups,
    CommunityPaths.messages,
    CommunityPaths.profile,
    Paths.account,
  },
  screens: _screens,
  defaultTabs: (_) => _defaultTabs,
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.communityFeed => CommunityPaths.feed,
    BuiltInScreen.communityQuestions => CommunityPaths.questions,
    BuiltInScreen.communityGroups => CommunityPaths.groups,
    BuiltInScreen.communityMessages => CommunityPaths.messages,
    BuiltInScreen.communityProfile => CommunityPaths.profile,
    BuiltInScreen.account => Paths.account,
    BuiltInScreen.settings => Paths.settings,
    BuiltInScreen.notifications => Paths.notifications,
    BuiltInScreen.messages => CommunityPaths.messages,
    BuiltInScreen.courses ||
    BuiltInScreen.myCourses ||
    BuiltInScreen.search ||
    BuiltInScreen.favorites ||
    BuiltInScreen.cart ||
    BuiltInScreen.orders ||
    BuiltInScreen.services ||
    BuiltInScreen.appointments ||
    BuiltInScreen.articles ||
    BuiltInScreen.bookmarks ||
    BuiltInScreen.classes ||
    BuiltInScreen.memberships ||
    BuiltInScreen.events ||
    BuiltInScreen.tickets ||
    BuiltInScreen.campaigns ||
    BuiltInScreen.myDonations ||
    BuiltInScreen.sendParcel ||
    BuiltInScreen.shipments ||
    BuiltInScreen.courier ||
    BuiltInScreen.restaurants ||
    BuiltInScreen.club ||
    BuiltInScreen.foodOrders ||
    BuiltInScreen.restaurant ||
    BuiltInScreen.ride ||
    BuiltInScreen.myRides ||
    BuiltInScreen.driver ||
    BuiltInScreen.teachers ||
    BuiltInScreen.teacher ||
    BuiltInScreen.school ||
    BuiltInScreen.classroom ||
    BuiltInScreen.explore ||
    BuiltInScreen.stays ||
    BuiltInScreen.flights ||
    BuiltInScreen.trips ||
    BuiltInScreen.saved ||
    BuiltInScreen.priceAlerts => null,
  },
  routes: _pushedRoutes,
);

final _defaultTabs = [
  ShellTab(
    icon: Symbols.dynamic_feed_rounded,
    label: (c) => c.l10n.communityTabFeed,
    location: CommunityPaths.feed,
  ),
  ShellTab(
    icon: Symbols.forum_rounded,
    label: (c) => c.l10n.communityTabQuestions,
    location: CommunityPaths.questions,
  ),
  ShellTab(
    icon: Symbols.groups_rounded,
    label: (c) => c.l10n.communityTabGroups,
    location: CommunityPaths.groups,
  ),
  ShellTab(
    icon: Symbols.chat_rounded,
    label: (c) => c.l10n.communityTabMessages,
    location: CommunityPaths.messages,
  ),
  ShellTab(
    icon: Symbols.person_rounded,
    label: (c) => c.l10n.communityTabProfile,
    location: CommunityPaths.profile,
  ),
];

List<TabScreen> _screens() => [
  TabScreen(CommunityPaths.feed, (state) => const CommunityFeedScreen()),
  TabScreen(
    CommunityPaths.questions,
    (state) => const CommunityQuestionsScreen(),
  ),
  TabScreen(CommunityPaths.groups, (state) => const CommunityGroupsScreen()),
  TabScreen(
    CommunityPaths.messages,
    (state) => const CommunityMessagesScreen(),
  ),
  TabScreen(CommunityPaths.profile, (state) => const CommunityProfileScreen()),
  TabScreen(
    Paths.account,
    (state) => const ProfileScreen(),
    routes: accountSubRoutes(),
  ),
];

final _id = RegExp(r'^[A-Za-z0-9_-]{1,64}$');

List<RouteBase> _pushedRoutes() => [
  GoRoute(
    path: '/community/question/:id',
    pageBuilder: (context, state) {
      final id = state.pathParameters['id'] ?? '';
      return appPage(
        state,
        _id.hasMatch(id)
            ? CommunityQuestionScreen(id: id)
            : const NotFoundScreen(),
      );
    },
  ),
  GoRoute(
    path: '/community/conversation/:id',
    pageBuilder: (context, state) {
      final id = state.pathParameters['id'] ?? '';
      return appPage(
        state,
        _id.hasMatch(id)
            ? CommunityConversationScreen(id: id)
            : const NotFoundScreen(),
      );
    },
  ),
];
