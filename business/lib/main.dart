import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/api/api_exception.dart';
import 'core/auth/token_store.dart';
import 'core/config.dart';
import 'core/providers.dart';
import 'core/services/biometrics.dart';
import 'core/services/home_widget.dart';
import 'core/services/push.dart';
import 'core/services/ringtones.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    // Kitchen mode on a tablet turns sideways.
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);
  final config = AppConfig.fromEnvironment();
  final preferences = await SharedPreferences.getInstance();
  // 59 Push only in builds with Yallapp Business's Firebase options
  // (business/README.md); the app works the same without them.
  final firebase = config.firebase;
  final PushService push = firebase == null || config.demo
      ? const NoPushService()
      : FirebasePushService(firebase);
  await push.init();

  runApp(
    ProviderScope(
      retry: retryPolicy,
      overrides: [
        configProvider.overrideWithValue(config),
        sharedPreferencesProvider.overrideWithValue(preferences),
        pushServiceProvider.overrideWithValue(push),
        // 207 Android shows its pushes itself, with the chosen ringtones.
        ringNativeProvider.overrideWithValue(PlatformRingNative()),
        // 214 The home-screen widget; the demo's figures stay in the app.
        if (!config.demo)
          homeWidgetProvider.overrideWithValue(const PlatformHomeWidget()),
        if (config.demo) ...[
          tokenStoreProvider.overrideWithValue(MemoryTokenStore()),
          biometricsProvider.overrideWithValue(NoBiometrics()),
        ],
      ],
      child: const BusinessApp(),
    ),
  );
}
