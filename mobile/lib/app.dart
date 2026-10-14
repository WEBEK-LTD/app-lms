import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show SystemUiOverlayStyle;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/gate/app_gate.dart';
import 'core/gate/gate_view.dart';
import 'core/l10n/l10n.dart';
import 'core/l10n/language.dart';
import 'core/providers.dart';
import 'core/routing/app_router.dart';
import 'core/services/push_registration.dart';
import 'core/storage/local_settings.dart';
import 'core/theme/app_look.dart';
import 'core/theme/app_theme.dart';

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
    final language = ref.watch(appLanguageProvider);
    setCurrentLanguage(language);
    ref
      ..watch(pushRegistrationProvider)
      ..watch(pushNavigationProvider);

    return MaterialApp.router(
      title: env.build.appName,
      debugShowCheckedModeBanner: false,
      theme: look.theme(Brightness.light),
      darkTheme: look.theme(Brightness.dark),
      themeMode: look.themeModeFor(settings),
      // Arabic turns the whole app right to left through the locale.
      locale: Locale(language),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      routerConfig: router,
      // Status bar icons follow the theme; screens with a colored top
      // (the Bold header) set their own.
      builder: (context, child) => AnnotatedRegion<SystemUiOverlayStyle>(
        value: overlayStyleOn(Theme.of(context).scaffoldBackgroundColor),
        child: GateView(child: child ?? const SizedBox()),
      ),
    );
  }
}
