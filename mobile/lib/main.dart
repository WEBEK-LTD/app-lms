import 'package:flutter/foundation.dart' show kIsWeb;
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
import 'core/services/push_service.dart';
import 'core/storage/local_settings.dart';

Future<void> main() async {
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
  final push = createPushService(environment.build, environment.platform);
  await push.init();

  runApp(
    ProviderScope(
      retry: retryPolicy,
      overrides: [
        sharedPreferencesProvider.overrideWithValue(preferences),
        appEnvironmentProvider.overrideWithValue(environment),
        pushServiceProvider.overrideWithValue(push),
      ],
      child: const YallappApp(),
    ),
  );
}
