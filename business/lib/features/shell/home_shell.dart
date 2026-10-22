import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/routing/paths.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/widgets/l10n.dart';

class NavTab {
  const NavTab(this.path, this.icon, this.label);

  final String path;
  final IconData icon;
  final String label;
}

/// 59 The app's main tool, the second tab: what its owner does most.
NavTab? workTab(BuildContext context, AppSummary app) {
  final l10n = context.l10n;
  final f = app.features;
  if (f.events) return NavTab(Paths.events, AppIcons.events, l10n.events);
  if (f.appointments) {
    return NavTab(Paths.appointments, AppIcons.appointments, l10n.appointments);
  }
  if (f.orders) return NavTab(Paths.orders, AppIcons.orders, l10n.orders);
  if (f.donations) {
    return NavTab(Paths.donations, AppIcons.donations, l10n.donations);
  }
  if (f.catalog) {
    return NavTab(Paths.catalog, catalogIcon(app), catalogLabel(context, app));
  }
  return null;
}

/// What the catalog is called for this app (Menu, Products, Courses…).
String catalogLabel(BuildContext context, AppSummary app) {
  final l10n = context.l10n;
  final f = app.features;
  final kinds = [f.products, f.courses, f.articles, f.listings].where((x) => x);
  if (kinds.length > 1) return l10n.catalog;
  if (f.products) return app.isRestaurant ? l10n.menu : l10n.products;
  if (f.courses) return l10n.courses;
  if (f.articles) return l10n.articles;
  return l10n.listings;
}

IconData catalogIcon(AppSummary app) {
  final f = app.features;
  if (f.products) return app.isRestaurant ? AppIcons.menu : AppIcons.products;
  if (f.courses) return AppIcons.courses;
  if (f.articles) return AppIcons.articles;
  if (f.listings) return AppIcons.listings;
  return AppIcons.catalog;
}

List<NavTab> tabsFor(BuildContext context, AppSummary app) {
  final l10n = context.l10n;
  final work = workTab(context, app);
  final tabs = [
    NavTab(Paths.today, AppIcons.today, l10n.today),
    ?work,
    // 77 The app's chat.
    if (app.features.chat) NavTab(Paths.chat, AppIcons.chat, l10n.chat),
    // 63 Also course questions and reviews.
    if (app.features.inbox) NavTab(Paths.inbox, AppIcons.inbox, l10n.inbox),
    if (app.features.analytics) NavTab(Paths.stats, AppIcons.stats, l10n.stats),
  ];
  // 77 Five at most with More: Stats goes to More first.
  if (tabs.length > 4) tabs.removeWhere((t) => t.path == Paths.stats);
  return [...tabs, NavTab(Paths.more, AppIcons.more, l10n.more)];
}

/// The bottom navigation: Today, the app's main tool, Chat, Inbox, Stats,
/// More, each shown only when the app has it (Stats in More when there
/// isn't room).
class HomeShell extends ConsumerWidget {
  const HomeShell({super.key, required this.location, required this.child});

  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final app = ref.watch(currentAppProvider);
    if (app == null) return child;
    final tabs = tabsFor(context, app);
    var index = tabs.indexWhere(
      (t) => location == t.path || location.startsWith('${t.path}/'),
    );
    // A tool opened from More keeps More lit.
    if (index < 0) index = tabs.length - 1;
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => context.go(tabs[i].path),
        destinations: [
          for (final tab in tabs)
            NavigationDestination(
              icon: Icon(tab.icon),
              selectedIcon: Icon(tab.icon, fill: 1),
              label: tab.label,
            ),
        ],
      ),
    );
  }
}
