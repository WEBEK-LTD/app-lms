import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../l10n/language.dart';
import '../providers.dart';
import '../routing/app_router.dart';
import '../storage/local_settings.dart';
import 'analytics.dart';

/// How batches go out; replaced in tests.
final analyticsSenderProvider = Provider<AnalyticsSender>((ref) => dioSender());

/// How often the queue is sent while the app is open; null (tests) sends
/// only on [AnalyticsService.flush] and when the app goes to the background.
final analyticsSendEveryProvider = Provider<Duration?>(
  (ref) => AnalyticsService.sendEvery,
);

/// 44 The app's usage statistics: active only when the build config has
/// `analytics` and this isn't the app preview, and while the person shares
/// them (Settings › Share usage statistics).
final analyticsProvider = Provider<AnalyticsService>((ref) {
  final env = ref.watch(appEnvironmentProvider);
  final preview = env.isPreview;
  final service = AnalyticsService(
    preferences: ref.watch(sharedPreferencesProvider),
    eventsUrl: preview ? null : env.build.analyticsUrl,
    key: preview ? null : env.build.analyticsKey,
    platform: env.platform.name,
    appVersion: env.appVersion,
    osVersion: env.osVersion,
    locale: () => ref.read(appLanguageProvider),
    enabled: ref.read(localSettingsProvider).shareUsage,
    sender: ref.watch(analyticsSenderProvider),
  );
  ref.listen(
    localSettingsProvider.select((s) => s.shareUsage),
    (_, on) => service.setEnabled(on),
  );
  ref.onDispose(service.dispose);
  return service;
});

/// Starts the session and counts each screen the router shows, by its kind.
/// Watched by the app root.
final analyticsRoutesProvider = Provider<void>((ref) {
  final analytics = ref.watch(analyticsProvider);
  if (!analytics.available) return;
  analytics.start(every: ref.read(analyticsSendEveryProvider));
  final router = ref.watch(appRouterProvider);
  void changed() {
    // The screen on top, also one that was pushed over a tab.
    final shown = router.routerDelegate.currentConfiguration;
    if (shown.isEmpty) return;
    analytics.screen(shown.last.matchedLocation);
  }

  router.routerDelegate.addListener(changed);
  // The screen already shown (none before the router's first build).
  changed();
  ref.onDispose(() => router.routerDelegate.removeListener(changed));
});
