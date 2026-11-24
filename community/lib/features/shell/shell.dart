import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n.dart';
import '../../core/routing/feature_routes.dart';
import '../../core/routing/paths.dart';
import '../../core/widgets/coming_soon.dart';
import '../../core/widgets/floating_tab_bar.dart';
import 'create_sheet.dart';

/// The tab a location is under (null: a screen of no tab, such as a profile).
ShellTab? tabOf(String location) {
  if (location == Paths.home) return ShellTab.home;
  if (location == FeatureLinks.qa ||
      location.startsWith('${FeatureLinks.qa}/')) {
    return ShellTab.qa;
  }
  if (location == FeatureLinks.learn ||
      location.startsWith('${FeatureLinks.learn}/')) {
    return ShellTab.learn;
  }
  if (location == Paths.groups) return ShellTab.groups;
  return null;
}

/// The pages under the floating tab bar: the page fills the screen, the bar
/// floats over its foot.
class ShellScaffold extends ConsumerWidget {
  const ShellScaffold({super.key, required this.location, required this.child});

  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final questions = ref.watch(newQuestionsProvider);
    return Stack(
      children: [
        Positioned.fill(child: child),
        Positioned(
          left: 14,
          right: 14,
          bottom: 20,
          child: FloatingTabBar(
            current: tabOf(location),
            dots: {if (questions > 0) ShellTab.qa},
            onCreate: () => showCreateSheet(context),
            onTab: (tab) => switch (tab) {
              ShellTab.home => context.go(Paths.home),
              ShellTab.qa => context.go(FeatureLinks.qa),
              ShellTab.learn => context.go(FeatureLinks.learn),
              // Groups come in phase 2.
              ShellTab.groups => showComingSoon(context, l.tabGroups),
            },
          ),
        ),
      ],
    );
  }
}
