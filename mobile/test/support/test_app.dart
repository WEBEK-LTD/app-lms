import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/app.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/app_environment.dart';
import 'package:yallapp/core/auth/token_manager.dart';
import 'package:yallapp/core/auth/token_store.dart';
import 'package:yallapp/core/config/build_config.dart';
import 'package:yallapp/core/preview/preview.dart';
import 'package:yallapp/core/providers.dart';
import 'package:yallapp/core/services/screen_security.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/core/web/web_view.dart';
import 'package:yallapp/modules/lms/lesson/embeds/embed_frame.dart';

import 'fake_api.dart';

const testBuild = BuildConfigData(
  appName: 'Your Academy',
  shortName: 'Academy',
  siteUrl: 'https://your-academy.com',
  androidPackage: 'com.youracademy.app',
  iosBundleId: 'com.youracademy.app',
  versionName: '1.0.0',
  versionCode: 1,
  primaryColor: 0xFF0E0D24,
  splashColor: 0xFFF4EFE6,
  template: AppTemplate.classic,
  font: 'Bricolage Grotesque',
);

/// Records the web views the app asked for, and draws a sized placeholder.
class WebViewLog {
  final requests = <WebViewRequest>[];

  Widget build(WebViewRequest request) {
    requests.add(request);
    return ColoredBox(
      key: ValueKey('webview-${request.debugLabel}'),
      color: const Color(0xFFDDDDDD),
    );
  }
}

class FakeScreenSecurity implements ScreenSecurity {
  final calls = <bool>[];

  @override
  Future<void> setSecure(bool enabled) async => calls.add(enabled);

  @override
  Stream<bool> captureChanges() => const Stream.empty();
}

class TestApp {
  TestApp({
    FakeApi? api,
    this.platform = DevicePlatform.android,
    this.template = AppTemplate.classic,
    this.appType = AppType.lms,
    this.signedIn = false,
    this.guest = false,
    this.framingAllowed = true,
    this.preferences = const {},
    this.wrap,
    this.preview,
    this.overrides = const [],
  }) : api = api ?? FakeApi();

  /// More provider overrides (for example sharing in News & blog apps).
  final List<Override> overrides;

  /// 17 Runs as the app preview on the web would.
  final PreviewSession? preview;

  final FakeApi api;
  final DevicePlatform platform;
  final AppTemplate template;
  final AppType appType;
  final bool signedIn;
  final bool guest;
  final bool framingAllowed;

  /// Extra SharedPreferences values (for example 'settings.theme_mode').
  final Map<String, Object> preferences;

  /// Puts widgets around the app (the website screenshots add a status bar).
  final Widget Function(Widget app)? wrap;
  final webViews = WebViewLog();
  final security = FakeScreenSecurity();
  late final MemoryTokenStore tokens;
  late final ProviderContainer container;

  Future<void> pump(WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({
      if (guest) 'settings.guest_mode': true,
      ...preferences,
    });
    final prefs = await SharedPreferences.getInstance();
    tokens = MemoryTokenStore(
      signedIn
          ? StoredTokens(
              accessToken: 'access-1',
              refreshToken: 'refresh-1',
              expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
            )
          : null,
    );
    final overrides = <Override>[
      sharedPreferencesProvider.overrideWithValue(prefs),
      appEnvironmentProvider.overrideWithValue(
        AppEnvironment(
          build: testBuild.copyWith(template: template, appType: appType),
          platform: platform,
          appVersion: '1.0.0',
          deviceId: 'device-1',
          deviceName: 'Test phone',
          preview: preview,
        ),
      ),
      yallappApiProvider.overrideWithValue(api),
      tokenManagerProvider.overrideWithValue(
        TokenManager(store: tokens, refresh: api.refreshTokens),
      ),
      webViewBuilderProvider.overrideWithValue(webViews.build),
      screenSecurityProvider.overrideWithValue(security),
      framingCheckProvider.overrideWithValue((_) async => framingAllowed),
      ...this.overrides,
    ];
    container = ProviderContainer(overrides: overrides, retry: (_, _) => null);
    addTearDown(container.dispose);
    final app = UncontrolledProviderScope(
      container: container,
      child: const YallappApp(),
    );
    await tester.pumpWidget(wrap == null ? app : wrap!(app));
    await settle(tester);
  }

  /// Lets futures and frames finish (screens poll timers, so avoid
  /// pumpAndSettle's infinite wait).
  static Future<void> settle(WidgetTester tester, [int frames = 12]) async {
    for (var i = 0; i < frames; i++) {
      await tester.pump(const Duration(milliseconds: 50));
    }
  }
}
