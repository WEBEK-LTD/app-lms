import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/gate/app_gate.dart';
import 'core/gate/gate_view.dart';
import 'core/providers.dart';
import 'core/routing/app_router.dart';
import 'core/services/push_registration.dart';
import 'core/storage/local_settings.dart';
import 'core/theme/app_look.dart';

/// The app root: theme from the build and runtime config, routing, and the
/// start-up gate.
class YallappApp extends ConsumerWidget {
  const YallappApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final env = ref.watch(appEnvironmentProvider);
    ref.watch(appGateProvider);
    final look = ref.watch(appLookProvider);
    final settings = ref.watch(localSettingsProvider);
    final router = ref.watch(appRouterProvider);
    ref
      ..watch(pushRegistrationProvider)
      ..watch(pushNavigationProvider);

    return MaterialApp.router(
      title: env.build.appName,
      debugShowCheckedModeBanner: false,
      theme: look.theme(Brightness.light),
      darkTheme: look.theme(Brightness.dark),
      themeMode: look.themeModeFor(settings),
      routerConfig: router,
      builder: (context, child) => GateView(child: child ?? const SizedBox()),
    );
  }
}
