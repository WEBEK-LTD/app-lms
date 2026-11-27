import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:yallapp_community/core/routing/app_router.dart';
import 'package:yallapp_community/features/academy/data/academy_api.dart';

import 'support/no_payments.dart';
import 'support/test_app.dart';

/// 233.1 The brief: the app shows bought courses open and the others with a
/// lock, and no price, no buy button and no payment link, on Android and
/// iOS alike. (test/no_payments_test.dart keeps every string clean.)
void main() {
  Iterable<String> shownTexts(WidgetTester tester) => tester
      .widgetList<Text>(find.byType(Text))
      .map((t) => t.data ?? t.textSpan?.toPlainText() ?? '');

  for (final platform in [TargetPlatform.android, TargetPlatform.iOS]) {
    for (final language in ['en', 'ar', 'tr']) {
      for (final location in [
        '/academy',
        '/academy/first-app',
        '/academy/delivery-deep-dive',
      ]) {
        testWidgets(
          '$location shows nothing to buy (${platform.name}, $language)',
          (tester) async {
            debugDefaultTargetPlatformOverride = platform;
            try {
              final app = await TestApp.start(
                tester,
                language: language,
                overrides: [
                  academyApiProvider.overrideWithValue(FakeAcademyApi()),
                ],
              );
              app.container.read(routerProvider).go(location);
              await TestApp.settle(tester);
              for (final text in shownTexts(tester)) {
                expect(bannedPayments.hasMatch(text), isFalse, reason: text);
              }
              // No form to fill in: no card, no address, no code.
              expect(find.byType(TextField), findsNothing);
              if (location != '/academy/first-app') {
                expect(find.byIcon(Symbols.lock_rounded), findsWidgets);
              }
            } finally {
              debugDefaultTargetPlatformOverride = null;
            }
          },
        );
      }
    }
  }

  testWidgets('a locked course opens none of its lessons', (tester) async {
    final app = await TestApp.start(
      tester,
      overrides: [academyApiProvider.overrideWithValue(FakeAcademyApi())],
    );
    app.container.read(routerProvider).go('/academy/delivery-deep-dive');
    await TestApp.settle(tester);
    expect(
      find.text("This course isn't open on your account yet."),
      findsOneWidget,
    );
    await tester.tap(find.text('Delivery zones'));
    await TestApp.settle(tester);
    expect(
      app.container
          .read(routerProvider)
          .routerDelegate
          .currentConfiguration
          .uri
          .path,
      '/academy/delivery-deep-dive',
    );
  });

  test('a course is open only when the API says `open`', () {
    expect(CourseSummary.fromJson({'access': 'open'}).locked, isFalse);
    expect(CourseSummary.fromJson({'access': 'locked'}).locked, isTrue);
    // Anything else is locked, and nothing of it is shown.
    expect(CourseSummary.fromJson({'access': 'other'}).locked, isTrue);
  });
}
