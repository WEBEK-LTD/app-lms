import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../app.dart';
import '../../l10n/app_localizations.dart';
import '../api/api_exception.dart';
import '../app_environment.dart';
import '../auth/token_store.dart';
import '../config/build_config.dart';
import '../providers.dart';
import '../services/push_service.dart';
import '../storage/local_settings.dart';
import '../theme/app_icons.dart';
import '../theme/app_theme.dart';
import '../web/browser_frame.dart';
import '../web/web_view.dart';
import '../widgets/common.dart';
import 'preview.dart';
import 'preview_widgets.dart';

/// 17 Starts the app preview (the web build): reads the build config for the
/// preview link in the page address from the platform it was opened from,
/// keeps this app's browser storage apart from other apps' previews, and
/// runs the same app as the installed one, without push notifications, web
/// views (40: but for the video player) or checkout.
Future<void> runPreview({Uri? address, Dio? http}) async {
  final page = address ?? Uri.base;
  final launch = PreviewLaunch.fromUri(page);
  if (launch == null) {
    return runApp(const PreviewMessageApp(problem: PreviewProblem.noLink));
  }
  final PreviewStart start;
  try {
    start = await fetchPreview(
      launch,
      platformUrl: page.origin,
      http: http ?? Dio(),
    );
  } on PreviewException catch (e) {
    return runApp(PreviewMessageApp(problem: e.problem));
  }
  final session = start.session;
  if (session.contentSource == PreviewContentSource.none) {
    return runApp(
      PreviewMessageApp(problem: PreviewProblem.noContent, config: start.build),
    );
  }
  // Each app's preview keeps its own sign-in and settings in this browser.
  SharedPreferences.setPrefix('yallapp.preview.${session.appId}.');
  final preferences = await SharedPreferences.getInstance();
  final language = launch.language;
  if (language != null) {
    await preferences.setString(LocalSettingsController.languageKey, language);
  }
  final environment = await AppEnvironment.load(
    build: start.build,
    preferences: preferences,
    preview: session,
  );

  runApp(
    ProviderScope(
      retry: retryPolicy,
      overrides: [
        sharedPreferencesProvider.overrideWithValue(preferences),
        appEnvironmentProvider.overrideWithValue(environment),
        pushServiceProvider.overrideWithValue(const NoopPushService()),
        tokenStoreProvider.overrideWithValue(
          PreferencesTokenStore(preferences),
        ),
        // 40 Pages made to work in a browser frame (the lesson video
        // player) show there; the rest need the installed app.
        webViewBuilderProvider.overrideWithValue(
          (request) => request.browserFrame
              ? BrowserFrame(request: request)
              : PreviewWebViewPlaceholder(request: request),
        ),
      ],
      child: const YallappApp(),
    ),
  );
}

/// What the preview shows when it can't start: an expired or broken link,
/// no connection, or an app with no content source yet (in its colors).
class PreviewMessageApp extends StatelessWidget {
  const PreviewMessageApp({super.key, required this.problem, this.config});

  final PreviewProblem problem;

  /// The app's build config, for its name and colors, when it was read.
  final BuildConfigData? config;

  @override
  Widget build(BuildContext context) {
    final config = this.config;
    ThemeData theme(Brightness brightness) => buildAppTheme(
      primary: Color(config?.primaryColor ?? 0xFF0E0D24),
      brightness: brightness,
      template: config?.template ?? AppTemplate.classic,
      fontFamily: config?.font ?? 'Bricolage Grotesque',
    );
    return MaterialApp(
      title: config?.appName ?? 'App preview',
      debugShowCheckedModeBanner: false,
      theme: theme(Brightness.light),
      darkTheme: theme(Brightness.dark),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      home: Builder(
        builder: (context) {
          final l10n = AppLocalizations.of(context);
          final message = switch (problem) {
            PreviewProblem.noLink => l10n.previewNoLink,
            PreviewProblem.expired => l10n.previewExpired,
            PreviewProblem.invalid => l10n.previewInvalid,
            PreviewProblem.unreachable => l10n.previewUnreachable,
            PreviewProblem.noContent => l10n.previewNoContent,
          };
          return Scaffold(
            body: SafeArea(
              child: MessageView(
                icon: problem == PreviewProblem.unreachable
                    ? AppIcons.offline
                    : AppIcons.preview,
                title: config?.appName ?? l10n.previewTitle,
                message: message,
              ),
            ),
          );
        },
      ),
    );
  }
}
