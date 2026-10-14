import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'screens/article_screen.dart';
import 'screens/articles_screen.dart';
import 'screens/news_home_screen.dart';
import 'screens/saved_screen.dart';

/// The News & blog module (23): home, the latest articles, saved articles
/// and the account as tabs, and the article page. Reading needs no account.
final newsModule = AppModule(
  tabPaths: {Paths.home, Paths.articles, Paths.saved, Paths.account},
  screens: _screens,
  defaultTabs: (_) => _defaultTabs,
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.articles || BuiltInScreen.courses => Paths.articles,
    BuiltInScreen.search => Paths.articlesFiltered(focus: true),
    BuiltInScreen.bookmarks || BuiltInScreen.favorites => Paths.saved,
    BuiltInScreen.account => Paths.account,
    BuiltInScreen.settings => Paths.settings,
    BuiltInScreen.notifications => Paths.notifications,
    BuiltInScreen.myCourses ||
    BuiltInScreen.messages ||
    BuiltInScreen.cart ||
    BuiltInScreen.orders ||
    BuiltInScreen.services ||
    BuiltInScreen.appointments ||
    BuiltInScreen.classes ||
    BuiltInScreen.memberships => null,
    BuiltInScreen.events || BuiltInScreen.tickets => null,
    BuiltInScreen.campaigns || BuiltInScreen.myDonations => null,
  },
  routes: _pushedRoutes,
);

final _defaultTabs = [
  ShellTab(
    icon: AppIcons.home,
    label: (c) => c.l10n.tabHome,
    location: Paths.home,
  ),
  ShellTab(
    icon: AppIcons.newspaper,
    label: (c) => c.l10n.tabLatest,
    location: Paths.articles,
  ),
  ShellTab(
    icon: AppIcons.bookmark,
    label: (c) => c.l10n.tabSaved,
    location: Paths.saved,
  ),
  ShellTab(
    icon: AppIcons.account,
    label: (c) => c.l10n.tabAccount,
    location: Paths.account,
  ),
];

List<TabScreen> _screens() => [
  TabScreen(Paths.home, (state) => const NewsHomeScreen()),
  TabScreen(
    Paths.articles,
    (state) => ArticlesScreen(
      // A new section or search from a link starts a fresh list.
      key: ValueKey('articles-${state.uri.query}'),
      initialCategory: state.uri.queryParameters['category'],
      focusSearch: state.uri.queryParameters['focus'] == '1',
    ),
  ),
  TabScreen(Paths.saved, (state) => const SavedScreen()),
  TabScreen(
    Paths.account,
    (state) => const ProfileScreen(),
    routes: accountSubRoutes(),
  ),
];

List<RouteBase> _pushedRoutes() => [
  GoRoute(
    path: '/article/:id',
    pageBuilder: (context, state) {
      final id = state.pathParameters['id'] ?? '';
      return appPage(
        state,
        RegExp(r'^[A-Za-z0-9_-]{1,64}$').hasMatch(id)
            ? ArticleScreen(articleId: id)
            : const NotFoundScreen(),
      );
    },
  ),
];
