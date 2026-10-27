import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show SystemUiOverlayStyle;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/gate/app_gate.dart';
import 'core/gate/gate_view.dart';
import 'core/l10n/l10n.dart';
import 'core/l10n/language.dart';
import 'core/providers.dart';
import 'core/purchase/store_billing.dart';
import 'core/purchase/store_billing_widgets.dart';
import 'core/routing/app_router.dart';
import 'core/services/analytics_providers.dart';
import 'core/services/app_health.dart';
import 'core/services/push_registration.dart';
import 'core/services/screen_security.dart';
import 'core/storage/local_settings.dart';
import 'core/theme/app_look.dart';
import 'core/theme/app_theme.dart';
import 'modules/lms/downloads/learning_sync.dart';
import 'modules/shared/pages/draft_reload.dart';
import 'modules/store/data/cart_sync.dart';

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
    // 43 The owner's string packs over the app's own strings, any language.
    final packs = ref.watch(stringPackMapsProvider);
    final direction = ref.watch(appTextDirectionProvider);
    setCurrentLanguage(language, packs[language]);
    ref
      ..watch(pushRegistrationProvider)
      ..watch(pushNavigationProvider)
      // 85.3 The cart's item count, for "You left something in your cart".
      ..watch(cartSyncProvider)
      // 44 Usage statistics: the session and the screens.
      ..watch(analyticsRoutesProvider)
      // 46 Crash reports and the rating prompt's count of app runs.
      ..watch(appHealthProvider)
      // 45 Offline progress sent, saved lessons checked, at each start.
      ..watch(learningSyncProvider)
      // 53 Screenshots and screen recording blocked as the owner chose.
      ..watch(screenProtectionSyncProvider)
      // 82.1 The preview in the Pages & look editor follows the draft.
      ..watch(draftReloadProvider)
      // 100 Store purchases not confirmed yet are sent again at each start.
      ..watch(storeBillingProvider);

    return MaterialApp.router(
      title: env.build.appName,
      debugShowCheckedModeBanner: false,
      theme: look.theme(Brightness.light),
      darkTheme: look.theme(Brightness.dark),
      // 17 The app preview's Light / Dark switch wins over the app's setting.
      themeMode: env.preview?.themeMode ?? look.themeModeFor(settings),
      // A right-to-left language turns the whole app around (43 by its direction).
      locale: Locale(language),
      supportedLocales: ref.watch(appLocalesProvider),
      localizationsDelegates: appLocalizationsDelegates(packs),
      routerConfig: router,
      // Status bar icons follow the theme; screens with a colored top
      // (the Bold header) set their own.
      builder: (context, child) => AnnotatedRegion<SystemUiOverlayStyle>(
        value: overlayStyleOn(Theme.of(context).scaffoldBackgroundColor),
        child: Directionality(
          textDirection: direction,
          // 53 Covers protected screens while the screen is recorded (iOS).
          child: ScreenProtectionShield(
            // 100 What a store purchase came to, on any screen.
            child: StoreBillingMessages(
              child: GateView(child: child ?? const SizedBox()),
            ),
          ),
        ),
      ),
    );
  }
}
