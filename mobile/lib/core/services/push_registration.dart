import 'analytics_providers.dart';

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_exception.dart';
import '../auth/auth_controller.dart';
import '../gate/app_gate.dart';
import '../l10n/language.dart';
import '../providers.dart';
import '../routing/app_router.dart';
import '../routing/paths.dart';
import '../storage/local_settings.dart';
import 'push_service.dart';

/// True when this build and the site both support push notifications.
final pushEnabledProvider = Provider<bool>((ref) {
  final push = ref.watch(pushServiceProvider);
  final gate = ref.watch(appGateProvider);
  return push.isAvailable && gate is GateReady && gate.config.features.push;
});

/// Registers this device's push token with the site (`PUT /me/push-token`)
/// while a student is signed in, and again whenever the token rotates or the
/// notification preferences change. Watched once at the app root.
final pushRegistrationProvider = Provider<void>((ref) {
  if (!ref.watch(pushEnabledProvider)) return;
  final signedIn = ref.watch(
    authControllerProvider.select((state) => state.isSignedIn),
  );
  if (!signedIn) return;
  final preferences = ref.watch(
    localSettingsProvider.select((settings) => settings.notifications),
  );
  // 85.1 Sent again when the person changes the app's language.
  final language = ref.watch(appLanguageProvider);
  final push = ref.read(pushServiceProvider);

  Future<void> send(String? token) async {
    if (token == null || token.isEmpty) return;
    try {
      // 36 With where the token is from: Firebase or Huawei Push Kit.
      await ref
          .read(yallappApiProvider)
          .setPushToken(
            token,
            preferences,
            provider: push.provider,
            language: language,
          );
    } on ApiException {
      // Tried again on the next start or preference change.
    }
  }

  unawaited(push.token().then(send));
  final subscription = push.tokenRefreshes.listen(send);
  ref.onDispose(subscription.cancel);
});

/// Opens the screen a tapped notification points to. Watched once at the
/// app root.
final pushNavigationProvider = Provider<void>((ref) {
  final push = ref.watch(pushServiceProvider);
  if (!push.isAvailable) return;
  final router = ref.watch(appRouterProvider);

  void open(Map<String, dynamic> data) {
    // 44 Which notifications people open, for the owner's statistics.
    ref.read(analyticsProvider).pushOpened(data);
    final location = pushTargetLocation(data);
    if (location == Paths.home) {
      router.go(location);
    } else {
      router.push(location);
    }
  }

  unawaited(
    push.initialMessage().then((data) {
      if (data != null) open(data);
    }),
  );
  final subscription = push.openedMessages.listen(open);
  ref.onDispose(subscription.cancel);
});
