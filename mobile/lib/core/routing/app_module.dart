import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/models/models.dart';
import 'paths.dart';

/// One bottom tab: a screen or page it shows ([location]), or a page it
/// opens on top ([pushLocation]) or an [action] it runs instead (open a
/// course or a link).
@immutable
class ShellTab {
  const ShellTab({
    required this.icon,
    required this.label,
    this.location,
    this.pushLocation,
    this.action,
    this.iconUrl,
    this.id,
    this.more = const [],
  }) : assert(location != null || pushLocation != null || action != null);

  final IconData icon;

  /// The published tab's id (`NavTab.id`), for the bar's look (the tab in
  /// the middle); null for the app's own tabs.
  final String? id;

  /// 109 The More tab's list: the tabs past the fourth, opened on top.
  final List<ShellTab> more;

  /// 109 Whether this is the More tab.
  bool get isMore => action?.type == PageActionType.more;

  /// 82.5 The owner's own icon, shown instead of [icon].
  final String? iconUrl;
  final String Function(BuildContext context) label;

  /// Where the tab's branch starts, for example `/courses` or `/page/home`.
  final String? location;
  final String? pushLocation;
  final PageAction? action;

  String? get path => location == null ? null : Uri.parse(location!).path;

  /// Identifies the tab's place in the router (labels may change).
  String get routeKey => location ?? 'action';

  /// 109 The same tab with [entries] in its More list.
  ShellTab withMore(List<ShellTab> entries) => ShellTab(
    icon: icon,
    label: label,
    location: location,
    pushLocation: pushLocation,
    action: action,
    iconUrl: iconUrl,
    id: id,
    more: entries,
  );
}

/// A screen that is a bottom tab when the tabs include it, and a pushed
/// page with a back button otherwise.
class TabScreen {
  const TabScreen(this.path, this.build, {this.routes = const []});

  final String path;
  final Widget Function(GoRouterState state) build;

  /// Pages under this screen (for example the account's settings).
  final List<RouteBase> routes;
}

/// What an app type brings to the router: its screens, its built-in tabs
/// and where the dashboard's `screen` actions lead.
class AppModule {
  const AppModule({
    required this.tabPaths,
    required this.screens,
    required this.defaultTabs,
    required this.screenLocation,
    required this.routes,
    this.badges,
  });

  /// The paths of [screens], known without building them.
  final Set<String> tabPaths;
  final List<TabScreen> Function() screens;

  /// The tabs when the client hasn't published any (`/pages` 404).
  final List<ShellTab> Function(AppConfig? config) defaultTabs;

  /// Where a built-in screen is in this app type, or null when it has none.
  final String? Function(BuiltInScreen screen, AppConfig? config)
  screenLocation;

  /// Pushed pages (course, product, listing...).
  final List<RouteBase> Function() routes;

  /// Counts shown on tabs, by tab path (for example the cart).
  final Map<String, int> Function(WidgetRef ref)? badges;

  bool isTabPath(String path) =>
      tabPaths.contains(path) || path.startsWith(Paths.pagePrefix);
}
