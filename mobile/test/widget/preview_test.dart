import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config.dart';
import 'package:yallapp/core/preview/preview.dart';
import 'package:yallapp/core/preview/preview_start.dart';
import 'package:yallapp/core/preview/preview_widgets.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/web/web_view.dart';
import 'package:yallapp/l10n/app_localizations.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

PreviewSession _session({ThemeMode? themeMode}) => PreviewSession(
  appId: '11111111-2222-4333-8444-555555555555',
  platformUrl: 'https://yallapp.com.tr',
  contentSource: PreviewContentSource.wordpress,
  themeMode: themeMode,
);

FakeApi _api({required bool previewSignIn}) {
  final config = configJson();
  (config['auth'] as Map<String, dynamic>)['preview_sign_in'] = previewSignIn;
  return FakeApi(config: config);
}

void main() {
  setUp(() {
    final binding = TestWidgetsFlutterBinding.ensureInitialized();
    binding.platformDispatcher.views.first
      ..physicalSize = const Size(1170, 2532)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  testWidgets('the preview signs in with the store review number', (
    tester,
  ) async {
    final app = TestApp(api: _api(previewSignIn: true), preview: _session());
    await app.pump(tester);

    expect(find.textContaining('store review number'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '555 000 11 22');
    await tester.pump();
    await tester.tap(find.text('Send code'));
    await TestApp.settle(tester);
    expect(app.api.calls, contains('requestOtp'));
  });

  testWidgets('a server without preview sign-in keeps sign-in for the app', (
    tester,
  ) async {
    final app = TestApp(api: _api(previewSignIn: false), preview: _session());
    await app.pump(tester);

    expect(find.textContaining('works in the installed app'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '532 123 45 67');
    await tester.pump();
    await tester.tap(find.text('Send code'));
    await TestApp.settle(tester);
    expect(app.api.calls, isNot(contains('requestOtp')));
    // Browsing without signing in still works.
    expect(find.text('Not now'), findsOneWidget);
  });

  testWidgets('installed apps show no preview notes', (tester) async {
    final app = TestApp(api: _api(previewSignIn: true));
    await app.pump(tester);
    expect(find.byType(PreviewNote), findsNothing);
  });

  testWidgets('the Light / Dark switch of the preview page wins', (
    tester,
  ) async {
    final app = TestApp(preview: _session(themeMode: ThemeMode.dark));
    await app.pump(tester);
    final material = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(material.themeMode, ThemeMode.dark);
  });

  testWidgets('web views become a note with the page in a new tab', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        theme: buildAppTheme(
          primary: const Color(0xFF0E0D24),
          brightness: Brightness.light,
          template: AppTemplate.classic,
          fontFamily: 'Bricolage Grotesque',
        ),
        home: Scaffold(
          body: PreviewWebViewPlaceholder(
            request: WebViewRequest(url: Uri.parse('https://site.test/pay')),
          ),
        ),
      ),
    );
    expect(find.text('Available in the installed app'), findsOneWidget);
    expect(find.text('Open in a new tab'), findsOneWidget);
  });

  testWidgets('an expired link says how to get a new one', (tester) async {
    await tester.pumpWidget(
      const PreviewMessageApp(problem: PreviewProblem.expired),
    );
    await tester.pump();
    expect(find.textContaining('preview link has expired'), findsOneWidget);
  });
}
