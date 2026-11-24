import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/routing/app_router.dart';
import 'package:yallapp_community/features/notifications/data/notifications_api.dart';
import 'package:yallapp_community/features/qa/data/fake_qa_api.dart';
import 'package:yallapp_community/features/qa/data/qa_api.dart';

import '../../support/shots.dart';
import '../../support/test_app.dart';

/// 231 (area E) Notifications: the list, the bell's count, email choices.
Future<(TestApp, FakeNotificationsApi)> _open(
  WidgetTester tester, {
  String? location = '/notifications',
  ThemeMode theme = ThemeMode.light,
}) async {
  await loadShotFonts();
  phoneInsets(tester);
  final api = FakeNotificationsApi();
  final app = await TestApp.start(
    tester,
    theme: theme,
    overrides: [
      notificationsApiProvider.overrideWithValue(api),
      qaApiProvider.overrideWithValue(FakeQaApi()),
    ],
  );
  if (location != null) {
    app.container.read(routerProvider).push(location);
    await TestApp.settle(tester);
  }
  return (app, api);
}

void main() {
  testWidgets('the bell on Home shows the design\'s 9 unread', (tester) async {
    await _open(tester, location: null);
    expect(find.bySemanticsLabel(RegExp(r'Notifications, 9')), findsOneWidget);
  });

  testWidgets('the list: unread first marks, newest first', (tester) async {
    await _open(tester);
    expect(
      find.text('Karim Samy accepted your answer. +25 points'),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('unread-dot')), findsWidgets);
    await shot(tester, 'notifications-light-en');
  });

  testWidgets('a tap marks it read and opens what it is about', (tester) async {
    final (_, api) = await _open(tester);
    await tester.tap(find.text('Karim Samy accepted your answer. +25 points'));
    await TestApp.settle(tester);
    expect(api.calls, contains('read:n1'));
    expect(find.text('Accepted'), findsOneWidget);
  });

  testWidgets('Mark all read clears the dots', (tester) async {
    final (_, api) = await _open(tester, theme: ThemeMode.dark);
    await tester.tap(find.text('Mark all read'));
    await TestApp.settle(tester);
    expect(api.calls, contains('read:all'));
    expect(find.byKey(const ValueKey('unread-dot')), findsNothing);
    await shot(tester, 'notifications-dark-en');
  });

  testWidgets('email choices: one switch per kind, saved at once', (
    tester,
  ) async {
    final (_, api) = await _open(tester);
    await tester.tap(find.byTooltip('Email me about'));
    await TestApp.settle(tester);
    expect(find.text('New followers'), findsOneWidget);
    await tester.tap(find.text('New followers'));
    await TestApp.settle(tester);
    expect(api.email['follow'], isTrue);
  });
}
