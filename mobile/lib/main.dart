import 'dart:async';
import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/foundation.dart' show kDebugMode, kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/api/api_exception.dart';
import 'core/app_environment.dart';
import 'core/config/build_config.dart';
import 'core/preview/preview_start.dart';
import 'core/providers.dart';
import 'core/services/crash_reporter.dart';
import 'core/services/push_service.dart';
import 'core/storage/local_settings.dart';

void main() {
  // 46 Errors that no other handler caught go to the crash reports.
  runZonedGuarded(
    _start,
    (error, stack) => CrashReporter.current?.record(error, stack, fatal: true),
  );
}

Future<void> _start() async {
  WidgetsFlutterBinding.ensureInitialized();
  // 17 The web build is only the app preview of the Yallapp dashboard: its
  // build config comes from the platform. Android and iOS use the compiled one.
  if (kIsWeb) return runPreview();
  // Portrait by default; full-screen video and embeds allow rotation.
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  final preferences = await SharedPreferences.getInstance();
  final environment = await AppEnvironment.load(
    build: resolveBuildConfig(),
    preferences: preferences,
  );
  // 36 Firebase, or Huawei Push Kit on Huawei phones without Google Play.
  final push = await choosePushService(environment.build, environment.platform);
  await push.init();
  final crashes = await _crashReporter(environment, preferences);

  runApp(
    ProviderScope(
      retry: retryPolicy,
      overrides: [
        sharedPreferencesProvider.overrideWithValue(preferences),
        appEnvironmentProvider.overrideWithValue(environment),
        pushServiceProvider.overrideWithValue(push),
        crashReporterProvider.overrideWithValue(crashes),
      ],
      child: const YallappApp(),
    ),
  );
}

/// 46 Crash reports, in builds that have their address (not in development
/// builds, where Flutter shows the errors).
Future<CrashReporter?> _crashReporter(
  AppEnvironment environment,
  SharedPreferences preferences,
) async {
  final endpoint = environment.build.crashReportUrl;
  if (endpoint == null || kDebugMode) return null;
  final views = PlatformDispatcher.instance.views;
  final view = views.isEmpty ? null : views.first;
  final size = view == null ? null : view.physicalSize / view.devicePixelRatio;
  final facts = await CrashReporter.deviceFacts(
    environment.platform,
    size?.shortestSide ?? 0,
  );
  final reporter = CrashReporter(
    preferences: preferences,
    endpoint: endpoint,
    platform: environment.platform,
    appVersion: environment.appVersion,
    buildNumber: environment.build.versionCode,
    osVersion: facts.os,
    device: facts.device,
  )..install();
  reporter.startSession();
  return reporter;
}
