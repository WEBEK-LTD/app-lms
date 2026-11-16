import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/widgets/l10n.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 132 The business's reply under a customer's rating of a food order, a
/// marketplace order or a ride, in Yallapp Business: on the order's or the
/// ride's page and in Prime's reviews; written, changed (marked edited) and
/// removed after asking. Light, dark, right to left.

Future<TestApp> _open(
  WidgetTester tester,
  String location, {
  required String appId,
  String language = 'en',
  Brightness? brightness,
  double height = 2000,
}) async {
  final app = TestApp(
    api: FakeOwnerApi()..language = language,
    appId: appId,
    language: language,
    brightness: brightness,
  );
  await app.pump(tester, size: Size(400, height));
  await go(tester, app, location);
  return app;
}

Future<void> _write(WidgetTester tester, String text) async {
  await tester.enterText(find.byType(TextField).last, text);
  await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
}

void main() {
  testWidgets('a food order\'s rating: reply, change it, remove it', (
    tester,
  ) async {
    final app = await _open(
      tester,
      '/food-orders/40',
      appId: FakeOwnerApi.foodId,
    );
    expect(find.text("Customer's rating"), findsOneWidget);
    expect(
      find.text('“${isolate('The lahmacun arrived cold.')}”'),
      findsOneWidget,
    );
    await tapOn(tester, find.widgetWithText(TextButton, 'Reply'));
    expect(
      find.text(
        "The customer sees it under their rating in the app, in your business's name, and is told the first time.",
      ),
      findsOneWidget,
    );
    await _write(tester, 'Sorry, we have new insulated bags from today.');
    expect(app.api.calls, contains('replyRating:food'));
    expect(find.text('Reply saved'), findsOneWidget);
    expect(
      find.text(isolate('Sorry, we have new insulated bags from today.')),
      findsOneWidget,
    );
    expect(find.text('Your reply'), findsOneWidget);

    await tapOn(tester, find.widgetWithText(TextButton, 'Change the reply'));
    await _write(tester, 'Sorry! New insulated bags from today.');
    expect(find.text('Your reply · Edited'), findsOneWidget);

    await tapOn(tester, find.widgetWithText(TextButton, 'Remove the reply'));
    expect(find.text('Remove your reply?'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(FilledButton, 'Remove the reply'));
    expect(app.api.calls, contains('deleteRatingReply:food'));
    expect(find.byKey(const ValueKey('rating-reply')), findsNothing);
    expect(find.widgetWithText(TextButton, 'Reply'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a ride\'s rating has it too', (tester) async {
    final app = await _open(tester, '/rides/540', appId: FakeOwnerApi.ridesId);
    expect(find.text("Customer's rating"), findsOneWidget);
    expect(find.text('“${isolate('Very kind driver.')}”'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(TextButton, 'Reply'));
    await _write(tester, 'Thank you!');
    expect(app.api.calls, contains('replyRating:ride'));
  });

  testWidgets('a marketplace order\'s rating has it too', (tester) async {
    final market = await _open(
      tester,
      '/market/orders/39',
      appId: FakeOwnerApi.marketId,
    );
    expect(
      find.text('“${isolate('The olive oil bottle leaked a little.')}”'),
      findsOneWidget,
    );
    await tapOn(tester, find.widgetWithText(TextButton, 'Reply'));
    await _write(tester, 'We are changing the bottles.');
    expect(market.api.calls, contains('replyRating:market'));
  });

  testWidgets('Prime\'s reviews: reply under a rating from the list', (
    tester,
  ) async {
    final app = await _open(
      tester,
      '/prime-reviews',
      appId: FakeOwnerApi.foodId,
      height: 1600,
    );
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Reply').at(1));
    await _write(tester, 'Sorry about the fries, Mert.');
    expect(app.api.calls, contains('replyRating:food'));
    expect(
      find.text('Your reply: ${isolate('Sorry about the fries, Mert.')}'),
      findsOneWidget,
    );
  });

  testWidgets('in Arabic, dark, right to left', (tester) async {
    await _open(
      tester,
      '/food-orders/40',
      appId: FakeOwnerApi.foodId,
      language: 'ar',
      brightness: Brightness.dark,
    );
    final title = find.text('تقييم العميل');
    expect(title, findsOneWidget);
    expect(Directionality.of(tester.element(title)), TextDirection.rtl);
    expect(Theme.of(tester.element(title)).brightness, Brightness.dark);
    await tapOn(tester, find.widgetWithText(TextButton, 'رد'));
    expect(
      find.text(
        'يراه العميل تحت تقييمه في التطبيق باسم نشاطك التجاري، ويُبلَّغ في المرة الأولى.',
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
}
