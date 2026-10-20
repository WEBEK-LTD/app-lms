import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/api_exception.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';

import '../support/test_app.dart';

void main() {
  testWidgets('Today: numbers, what needs the owner, quick actions, the bell', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    expect(find.text('Bab Al Sham'), findsOneWidget);
    expect(find.text('Sales today'), findsOneWidget);
    expect(find.text('₺2,425.00'), findsOneWidget); // 5 orders × ₺485
    expect(find.text('App opens'), findsOneWidget);
    expect(find.text('342'), findsOneWidget);
    expect(find.text('Needs you now'), findsOneWidget);
    expect(find.text('3 orders in progress'), findsOneWidget);
    expect(find.text('Kitchen mode'), findsOneWidget);
    expect(find.text('Notify'), findsOneWidget);
    expect(find.text('Upload'), findsOneWidget);
    expect(find.text('Preview'), findsOneWidget);
    expect(find.text('Scan'), findsNothing); // a restaurant has no tickets
    // The tabs this app has.
    expect(
      find.widgetWithText(NavigationDestination, 'Orders'),
      findsOneWidget,
    );
    expect(find.widgetWithText(NavigationDestination, 'Stats'), findsOneWidget);
    expect(find.widgetWithText(NavigationDestination, 'Inbox'), findsNothing);
    expect(find.byTooltip('Updates from Yallapp, 2 unread'), findsOneWidget);
  });

  testWidgets('Needs you now opens the orders in progress', (tester) async {
    await TestApp().pump(tester);
    await tapOn(tester, find.text('3 orders in progress'));
    expect(find.text('#1042'), findsOneWidget);
    expect(find.text('#1039'), findsNothing);
  });

  testWidgets('Updates from Yallapp: marks what it shows read, and all', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    await tapOn(tester, find.byTooltip('Updates from Yallapp, 2 unread'));
    expect(find.text('Planned maintenance on Sunday'), findsOneWidget);
    expect(find.text('Maintenance'), findsOneWidget);
    expect(find.text('New'), findsNWidgets(2));
    expect(app.api.calls, contains('markUpdatesRead'));
    expect(app.api.updatesList.where((u) => u.unread), isEmpty);
    await tapOn(tester, find.text('Read about Kitchen mode'));
    expect(app.opened, ['https://yallapp.com.tr/blog']);
    await tester.pageBack();
    await settle(tester);
    expect(find.byTooltip('Updates from Yallapp'), findsOneWidget);
  });

  testWidgets('the app switcher changes the app and its tabs', (tester) async {
    await TestApp().pump(tester);
    await tapOn(tester, find.text('Bab Al Sham'));
    await tapOn(tester, find.text('Bosphorus Homes'));
    // 63 In the app's words, with its plural.
    expect(find.text('1 conversation waiting for your reply'), findsOneWidget);
    expect(find.widgetWithText(NavigationDestination, 'Inbox'), findsOneWidget);
    expect(
      find.widgetWithText(NavigationDestination, 'Listings'),
      findsOneWidget,
    );
  });

  testWidgets('an app whose plan ended says so, read-only', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.newsId);
    await app.pump(tester);
    expect(find.text("This app's plan has ended"), findsOneWidget);
    await tapOn(tester, find.text('See the plan'));
    expect(find.text('Plan & storage'), findsOneWidget);
    expect(find.text('Manage on yallapp.com.tr'), findsOneWidget);
    expect(
      find.textContaining(
        RegExp('buy|renew now|upgrade', caseSensitive: false),
      ),
      findsNothing,
    );
  });

  testWidgets('Today in Arabic is right to left with Arabic text', (
    tester,
  ) async {
    await TestApp(language: 'ar').pump(tester);
    expect(find.text('بحاجة إليك الآن'), findsOneWidget);
    expect(find.text('مبيعات اليوم'), findsOneWidget);
    final dir = Directionality.of(tester.element(find.text('مبيعات اليوم')));
    expect(dir, TextDirection.rtl);
    expect(
      find.widgetWithText(NavigationDestination, 'الطلبات'),
      findsOneWidget,
    );
  });

  testWidgets('Today in Turkish', (tester) async {
    await TestApp(language: 'tr').pump(tester);
    expect(find.text('Şimdi sizi bekleyenler'), findsOneWidget);
    expect(find.text('Bugünkü satışlar'), findsOneWidget);
  });

  testWidgets('offline at first: says so, and tries again', (tester) async {
    final app = TestApp();
    app.api.failNext = const ApiException(code: ApiException.network);
    await app.pump(tester);
    expect(find.text("You're offline"), findsOneWidget);
    expect(find.text('Check your connection and try again.'), findsOneWidget);
    await tapOn(tester, find.text('Try again'));
    expect(find.text('Needs you now'), findsOneWidget);
  });

  testWidgets('Today offline shows the error with Try again', (tester) async {
    final app = TestApp();
    app.api.failOn['today'] = const ApiException(code: ApiException.network);
    await app.pump(tester);
    expect(find.text("You're offline"), findsOneWidget);
    await tapOn(tester, find.text('Try again'));
    expect(find.text('Sales today'), findsOneWidget);
  });

  testWidgets('a failed pull to refresh keeps the numbers and says why', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    app.api.failOn['today'] = const ApiException(code: ApiException.network);
    await tester.fling(find.text('Needs you now'), const Offset(0, 500), 1000);
    await settle(tester, 30);
    expect(find.text('Sales today'), findsOneWidget);
    expect(find.text('Check your connection and try again.'), findsOneWidget);
  });

  testWidgets('large text: the tiles stack and nothing overflows', (
    tester,
  ) async {
    tester.platformDispatcher.textScaleFactorTestValue = 1.6;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await TestApp().pump(tester);
    expect(tester.takeException(), isNull);
    expect(find.text('Sales today'), findsOneWidget);
  });
}
