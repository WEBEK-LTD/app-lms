import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/routing/app_module.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/routing/inner_screens.dart';
import '../../chat/chat_routes.dart';
import 'page_providers.dart';
import 'studio_page.dart';

/// 120 Where each of the app's screens that the owner drew a Studio page
/// around is (`PageSummary.screen`), to that page's slug: the app shows the
/// page wherever it shows the screen. Empty without published pages.
final screenPagesProvider = Provider<Map<String, String>>((ref) {
  final navigation = ref.watch(navigationProvider);
  if (navigation == null) return const {};
  final module = ref.watch(appModuleProvider);
  final gate = ref.watch(appGateProvider);
  final config = gate is GateReady ? gate.config : null;
  return {
    for (final page in navigation.pages)
      ?screenPath(page.screen, module, config): page.slug,
  };
});

/// 120 Where the screen the API calls [screen] is in this app: a built-in
/// screen where the app type has it, 120.4 one opened from the tabs at its
/// address (`/shipment/:id`); null for one this app doesn't have.
String? screenPath(String? screen, AppModule module, AppConfig? config) {
  if (screen == null) return null;
  final builtIn = builtInScreenFrom(screen);
  if (builtIn != null) {
    final location = module.screenLocation(builtIn, config);
    return location == null ? null : Uri.parse(location).path;
  }
  return innerScreenPaths[screen];
}

/// 120 The built-in screen a page is drawn around, when the page is one
/// (the page of a screen opened from the tabs opens as a page).
BuiltInScreen? screenOfPage(WidgetRef ref, String slug) => builtInScreenFrom(
  ref
      .read(navigationProvider)
      ?.pages
      .where((p) => p.slug == slug)
      .firstOrNull
      ?.screen,
);

/// 120 One of the app's screens with the Studio page the owner drew around
/// it, as a tab or opened on top of the tabs ([pushed]); the screen as it
/// is ([alone], else [child]) without one, and while the page loads or
/// when it can't.
class ScreenWithPage extends ConsumerWidget {
  const ScreenWithPage({
    super.key,
    required this.path,
    required this.child,
    this.pushed = false,
    this.alone,
  });

  /// Where the screen is, for example `/shipments`.
  final String path;
  final Widget child;
  final bool pushed;

  /// The screen without a page around it, when that differs from [child]
  /// (opened on top of the tabs, with its back button).
  final Widget? alone;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final slug = ref.watch(screenPagesProvider)[path];
    if (slug == null) return alone ?? child;
    final studio = ref.watch(pageProvider(slug)).value?.studio;
    // Nothing over it (yet): the screen as it is, its own top and back
    // button too.
    if (studio == null ||
        (studio.header == null && studio.body.children.isEmpty)) {
      return alone ?? child;
    }
    return StudioPageView(
      page: studio,
      pageSlug: slug,
      pushed: pushed,
      // Without a header the screen keeps its own top.
      screen: studio.header == null ? (alone ?? child) : child,
    );
  }
}

/// 120 The app's own [screen] as a widget, for a page drawn around it that
/// is opened by its address; null when this app has no such screen.
Widget? builtInScreenWidget(BuildContext context, WidgetRef ref, String name) {
  // A screen opened from the tabs needs what it shows (an order, a course).
  final screen = builtInScreenFrom(name);
  if (screen == null) return null;
  final module = ref.read(appModuleProvider);
  final gate = ref.read(appGateProvider);
  final location = module.screenLocation(
    screen,
    gate is GateReady ? gate.config : null,
  );
  if (location == null) return null;
  final path = Uri.parse(location).path;
  final match = [
    ...module.screens(),
    chatTabScreen(),
  ].where((s) => s.path == path).firstOrNull;
  if (match == null) return null;
  return match.build(GoRouterState.of(context));
}
