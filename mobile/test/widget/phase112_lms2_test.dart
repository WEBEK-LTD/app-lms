import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/core/services/share_links.dart';

import '../support/fake_api.dart';
import '../support/test_app.dart';

/// 112.5, round 2: the certificate's PDF and sharing it, the question bank,
/// cohorts, grading in the Teacher tab, report cards and the live classes'
/// calendar.

void usePhone(WidgetTester tester) {
  final view = tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

Future<void> push(TestApp app, WidgetTester tester, String location) async {
  app.container.read(appRouterProvider).push(location);
  await TestApp.settle(tester);
}

Future<void> tapKey(WidgetTester tester, String key) async {
  final target = find.byKey(ValueKey(key));
  await tester.ensureVisible(target);
  await TestApp.settle(tester);
  await tester.tap(target);
  await TestApp.settle(tester);
}

void main() {
  testWidgets('112.5 a certificate: its PDF opens and its link is shared', (
    tester,
  ) async {
    usePhone(tester);
    final opened = <String>[];
    final shared = <String>[];
    const url = 'https://yallapp.test/a/app/certificate/1-10-abc';
    final api = FakeApi()
      ..certificates = [
        {
          'course_id': 10,
          'course_title': 'Turkish for Beginners',
          'url': url,
          'pdf_url': '$url/pdf?lang=en',
          'issued_at': '2026-10-20T10:00:00Z',
        },
      ];
    final app = TestApp(
      signedIn: true,
      appType: AppType.lms,
      api: api,
      overrides: [
        openExternalProvider.overrideWithValue((u) async {
          opened.add(u);
          return true;
        }),
        shareTextProvider.overrideWithValue((text) async => shared.add(text)),
      ],
    );
    await app.pump(tester);
    await push(app, tester, Paths.certificates);
    expect(find.text('Turkish for Beginners'), findsOneWidget);
    await tapKey(tester, 'certificate-pdf-10');
    expect(opened, ['$url/pdf?lang=en']);
    await tapKey(tester, 'certificate-share-10');
    expect(shared, ['My certificate for Turkish for Beginners: $url']);
  });
}
