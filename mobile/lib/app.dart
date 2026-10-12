import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/gate/app_gate.dart';
import 'core/gate/gate_view.dart';
import 'core/providers.dart';
import 'core/routing/app_router.dart';
import 'core/services/push_registration.dart';
import 'core/storage/local_settings.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/palette.dart';

/// The app root: theme from the build and runtime config, routing, and the
/// start-up gate.
class YallappApp extends ConsumerWidget {
  const YallappApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final env = ref.watch(appEnvironmentProvider);
    final gate = ref.watch(appGateProvider);
    final themeMode = ref.watch(
      localSettingsProvider.select((s) => s.themeMode),
    );
    final router = ref.watch(appRouterProvider);
    ref
      ..watch(pushRegistrationProvider)
      ..watch(pushNavigationProvider);

    final build = env.build;
    final remotePrimary = gate is GateReady
        ? parseHexColor(gate.config.branding.primaryColor)
        : null;
    final primary = remotePrimary ?? Color(build.primaryColor);
    final font = resolveFont(build.font, build.template);

    ThemeData theme(Brightness brightness) => buildAppTheme(
      primary: primary,
      brightness: brightness,
      template: build.template,
      fontFamily: font,
    );

    return MaterialApp.router(
      title: build.appName,
      debugShowCheckedModeBanner: false,
      theme: theme(Brightness.light),
      darkTheme: theme(Brightness.dark),
      themeMode: themeMode,
      routerConfig: router,
      builder: (context, child) => GateView(child: child ?? const SizedBox()),
    );
  }
}
