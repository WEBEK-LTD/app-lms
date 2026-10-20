import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/api_exception.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

void main() {
  testWidgets('Inbox: a conversation is read and answered', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.homesId);
    await app.pump(tester);
    await tapOn(tester, find.widgetWithText(NavigationDestination, 'Inbox'));
    expect(find.text('Deniz Arslan'), findsOneWidget);
    expect(find.text('Is the flat still available?'), findsOneWidget);
    await tapOn(tester, find.text('Deniz Arslan'));
    expect(find.text('Hello, is the flat still available?'), findsOneWidget);
    expect(find.text('About: Sea-view flat in Beşiktaş'), findsOneWidget);
    await tester.enterText(
      find.byType(TextField),
      'Yes, it is. When would you like to see it?',
    );
    await tapOn(tester, find.byTooltip('Send'));
    expect(find.text('Reply sent'), findsOneWidget);
    expect(
      find.text('Yes, it is. When would you like to see it?'),
      findsOneWidget,
    );
    expect(app.api.calls, contains('replyInquiry'));
  });

  testWidgets('Inbox: closed conversations', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.homesId);
    await app.pump(tester);
    await go(tester, app, '/inbox');
    await tapOn(tester, find.text('Closed'));
    expect(find.text('Mehmet Aydın'), findsOneWidget);
    expect(find.text('Deniz Arslan'), findsNothing);
  });

  testWidgets('Inbox in Arabic: the send arrow turns round', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.homesId, language: 'ar');
    await app.pump(tester);
    await go(tester, app, '/inbox/31');
    expect(find.byType(Transform), findsWidgets);
    expect(find.byTooltip('إرسال'), findsOneWidget);
  });

  testWidgets('App users: the count and a search', (tester) async {
    final app = TestApp();
    await app.pump(tester);
    await push(tester, app, '/users');
    expect(find.text('26 users'), findsOneWidget);
    expect(find.text('Aylin Kara'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'selin');
    await tester.pump(const Duration(milliseconds: 500));
    await settle(tester);
    expect(find.text('Selin Koç'), findsOneWidget);
    expect(find.text('Aylin Kara'), findsNothing);
    expect(find.text('4 of 26 users'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'zzz');
    await tester.pump(const Duration(milliseconds: 500));
    await settle(tester);
    expect(find.text('No one matches this search'), findsOneWidget);
  });

  testWidgets('Stats: numbers for a range, a chart read aloud', (tester) async {
    final semantics = tester.ensureSemantics();
    final app = TestApp();
    await app.pump(tester);
    await tapOn(tester, find.widgetWithText(NavigationDestination, 'Stats'));
    expect(app.api.calls, contains('analytics:30'));
    expect(find.text('Installs'), findsWidgets);
    expect(find.text('Active this month'), findsOneWidget);
    expect(
      find.bySemanticsLabel(RegExp(r'^Active users every day: ')),
      findsOneWidget,
    );
    await tapOn(tester, find.text('7 days'));
    expect(app.api.calls, contains('analytics:7'));
    await tapOn(tester, find.widgetWithText(ChoiceChip, 'Sessions'));
    expect(
      find.bySemanticsLabel(RegExp(r'^Sessions every day: ')),
      findsOneWidget,
    );
    await tester.scrollUntilVisible(
      find.text('Türkiye'),
      300,
      scrollable: find.byType(Scrollable).last,
    );
    semantics.dispose();
  });

  testWidgets('Send a notification: preview, confirm, sent; the limit', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    await push(tester, app, '/notify');
    expect(find.text('To everyone who uses Bab Al Sham'), findsOneWidget);
    await tester.enterText(
      find.widgetWithText(TextField, 'Title'),
      'Iftar menu',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Message'),
      'Our iftar menu is back from tonight.',
    );
    await settle(tester, 2);
    expect(find.text('Iftar menu'), findsWidgets); // the phone preview
    await tapOn(tester, find.text('Send now'));
    expect(find.text('Send to everyone?'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(FilledButton, 'Send'));
    expect(find.textContaining('The push went to 128 phones.'), findsOneWidget);
    expect(app.api.calls, contains('sendNotification'));

    app.api.failOn['sendNotification'] = const ApiException(
      code: ApiException.rateLimited,
      message: 'You can send 10 notifications an hour. Try again later.',
      statusCode: 429,
    );
    ScaffoldMessenger.of(tester.element(find.text('Send now')))
        .removeCurrentSnackBar();
    await settle(tester, 2);
    await tester.enterText(find.widgetWithText(TextField, 'Title'), 'Again');
    await tester.enterText(find.widgetWithText(TextField, 'Message'), 'Hello');
    await settle(tester, 2);
    await tapOn(tester, find.text('Send now'));
    await tapOn(
      tester,
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Send'),
      ),
    );
    expect(
      find.text('You can send 10 notifications an hour. Try again later.'),
      findsOneWidget,
    );
  });

  testWidgets('Notifications without push: inbox only', (tester) async {
    final app = TestApp()..api.pushAvailable = false;
    await app.pump(tester);
    await push(tester, app, '/notify');
    expect(
      find.textContaining("It lands in the app's inbox. Pushes need"),
      findsOneWidget,
    );
  });
}
