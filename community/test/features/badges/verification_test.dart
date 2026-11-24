import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/routing/app_router.dart';
import 'package:yallapp_community/features/badges/data/verification_api.dart';
import 'package:yallapp_community/features/badges/ui/verification_screen.dart';

import '../../support/shots.dart';
import '../../support/test_app.dart';

/// 231 (area E) The Gold badge's verification form.
Future<FakeVerificationApi> _open(
  WidgetTester tester,
  FakeVerificationApi api, {
  ThemeMode theme = ThemeMode.light,
  String language = 'en',
}) async {
  await loadShotFonts();
  phoneInsets(tester);
  final app = await TestApp.start(
    tester,
    theme: theme,
    language: language,
    overrides: [
      verificationApiProvider.overrideWithValue(api),
      pickIdProofProvider.overrideWithValue(() async => '/tmp/id-card.jpg'),
    ],
  );
  app.container.read(routerProvider).push('/verify');
  await TestApp.settle(tester);
  return api;
}

Future<void> _scrollTo(WidgetTester tester, Finder finder) async {
  await tester.dragUntilVisible(
    finder,
    find.byType(ListView).first,
    const Offset(0, -250),
  );
  // A list still moving ignores taps.
  await TestApp.settle(tester, 30);
}

void main() {
  testWidgets('with 5 or more apps the form shows, its apps from the linked '
      'account', (tester) async {
    await _open(tester, FakeVerificationApi(appCount: 6));
    expect(find.text('6 of 5 apps'), findsOneWidget);
    expect(find.text('Full name (as on your ID)'), findsOneWidget);
    await _scrollTo(tester, find.text('Send my request'));
    expect(find.text('From your linked Yallapp account'), findsOneWidget);
    expect(find.text('Lujain'), findsOneWidget);
    // Each app's own icon from the linked account.
    expect(find.byKey(const ValueKey('app-icon-app-0')), findsOneWidget);
    await shot(tester, 'verify-form-light-en');
  });

  testWidgets('under 5 apps there is no Apply: the progress and what is '
      'needed', (tester) async {
    await _open(tester, FakeVerificationApi(appCount: 3));
    expect(find.text('3 of 5 apps'), findsOneWidget);
    expect(
      find.text('You can apply once your Yallapp account has 5 apps.'),
      findsOneWidget,
    );
    expect(find.text('Send my request'), findsNothing);
    expect(find.text('Full name (as on your ID)'), findsNothing);
  });

  testWidgets('not linked: link the Yallapp account first', (tester) async {
    await _open(tester, FakeVerificationApi(linked: false));
    expect(find.byKey(const ValueKey('verify-not-linked')), findsOneWidget);
    expect(find.text('Link my Yallapp account'), findsOneWidget);
    expect(find.text('Send my request'), findsNothing);
  });

  testWidgets('sending needs a name and an ID, then shows it waiting', (
    tester,
  ) async {
    final api = await _open(tester, FakeVerificationApi());
    await _scrollTo(tester, find.text('Send my request'));
    await tester.tap(find.text('Send my request'));
    await TestApp.settle(tester);
    expect(api.calls.where((c) => c.startsWith('apply:')), isEmpty);
    await tester.dragUntilVisible(
      find.byKey(const ValueKey('verify-name')),
      find.byType(ListView).first,
      const Offset(0, 250),
    );
    await TestApp.settle(tester, 30);
    await tester.enterText(
      find.byKey(const ValueKey('verify-name')),
      'Mohamed Ali Hassan',
    );
    await tester.ensureVisible(find.byKey(const ValueKey('verify-id')));
    await TestApp.settle(tester, 30);
    await tester.tap(find.byKey(const ValueKey('verify-id')));
    await TestApp.settle(tester);
    await tester.ensureVisible(find.byKey(const ValueKey('verify-link-0')));
    await tester.pump();
    await tester.enterText(
      find.byKey(const ValueKey('verify-link-0')),
      'https://dribbble.com/mohamed',
    );
    await _scrollTo(tester, find.text('Send my request'));
    await tester.tap(find.text('Send my request'));
    await TestApp.settle(tester);
    expect(
      api.calls,
      contains(
        'apply:Mohamed Ali Hassan:/tmp/id-card.jpg:https://dribbble.com/mohamed',
      ),
    );
    await tester.dragUntilVisible(
      find.byKey(const ValueKey('verify-pending')),
      find.byType(ListView).first,
      const Offset(0, 250),
    );
    expect(find.byKey(const ValueKey('verify-pending')), findsOneWidget);
  });

  testWidgets('a rejection shows the admin\'s reason, and the form again', (
    tester,
  ) async {
    await _open(
      tester,
      FakeVerificationApi(
        request: VerificationRequest(
          id: 'vr-0',
          fullName: 'Mohamed Ali',
          status: RequestStatus.rejected,
          reason: 'The ID photo was blurred.',
          createdAt: DateTime.utc(2026, 11, 1),
        ),
      ),
      theme: ThemeMode.dark,
    );
    expect(find.text('Reason: The ID photo was blurred.'), findsOneWidget);
    expect(find.text('Full name (as on your ID)'), findsOneWidget);
    await shot(tester, 'verify-rejected-dark-en');
  });

  testWidgets('a Pro Developer sees the badge, no form', (tester) async {
    await _open(tester, FakeVerificationApi(hasGold: true), language: 'ar');
    expect(find.byKey(const ValueKey('verify-has-gold')), findsOneWidget);
    expect(find.text('مطوّر محترف'), findsOneWidget);
    await shot(tester, 'verify-gold-light-ar');
  });
}
