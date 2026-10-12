import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/widgets/buttons.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

Future<TestApp> openApp(
  WidgetTester tester, {
  DevicePlatform platform = DevicePlatform.android,
  bool qna = false,
  bool orders = false,
  bool enrolled = false,
}) async {
  final app = TestApp(
    platform: platform,
    signedIn: true,
    api: FakeApi(
      config: configJson(qna: qna, orders: orders),
      course: courseDetailJson(
        action: enrolled ? 'continue' : 'checkout',
        enrolled: enrolled,
      ),
    ),
  );
  await app.pump(tester);
  return app;
}

/// Scrolls the page until [finder] can be tapped (not under the bottom
/// bar), then taps it.
Future<void> showAndTap(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder.hitTestable(),
    200,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.tap(finder);
  await TestApp.settle(tester);
}

Future<void> go(TestApp app, WidgetTester tester, String location) async {
  app.container.read(appRouterProvider).push(location);
  await TestApp.settle(tester);
}

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized().platformDispatcher.views.first
      ..physicalSize = const Size(1170, 2532)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  testWidgets('the bell shows unread notifications and opens the inbox', (
    tester,
  ) async {
    final app = await openApp(tester);
    final bell = find.byWidgetPredicate(
      (w) => w is SquareIconButton && w.label == 'Notifications, 2 unread',
    );
    expect(bell, findsOneWidget);

    await tester.tap(bell);
    await TestApp.settle(tester);

    expect(find.text('Exam on Friday'), findsNWidgets(2));
    expect(app.api.count('markNotificationsRead'), 1);

    // The answer notification opens the question.
    await tester.tap(find.text('Exam on Friday').last);
    await TestApp.settle(tester);
    expect(find.text('It returns a range object.'), findsOneWidget);
    expect(find.text('Instructor'), findsOneWidget);
  });

  testWidgets('orders are in the account menu on Android only', (tester) async {
    await openApp(tester, orders: true);
    await tester.tap(find.bySemanticsLabel('Account').last);
    await TestApp.settle(tester);
    expect(find.text('My orders'), findsOneWidget);

    await tester.tap(find.text('My orders'));
    await TestApp.settle(tester);
    expect(find.text('Order #1042'), findsOneWidget);
    expect(find.text('On hold'), findsOneWidget);
    expect(find.text('₺450.00'), findsOneWidget);
  });

  testWidgets('iOS never shows orders', (tester) async {
    await openApp(tester, platform: DevicePlatform.ios, orders: true);
    await tester.tap(find.bySemanticsLabel('Account').last);
    await TestApp.settle(tester);
    expect(find.text('My orders'), findsNothing);
  });

  testWidgets('students rate a course from the Reviews tab', (tester) async {
    final app = await openApp(tester);
    await go(app, tester, '/course/1');
    await tester.tap(find.text('Reviews'));
    await TestApp.settle(tester);

    expect(find.text('4.5'), findsOneWidget);
    expect(find.text('Clear lessons and a good pace.'), findsNWidgets(2));

    await showAndTap(tester, find.text('Write a review'));
    await TestApp.settle(tester);
    // A rating is required.
    await tester.tap(find.text('Post review'));
    await TestApp.settle(tester);
    expect(find.text('Choose a rating from 1 to 5 stars.'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('4 stars'));
    await tester.enterText(find.byType(TextField), 'Very clear.');
    await tester.tap(find.text('Post review'));
    await TestApp.settle(tester);

    expect(app.api.savedReview, (rating: 4, text: 'Very clear.'));
    expect(find.text('Thanks for your review!'), findsOneWidget);
    expect(find.text('Edit your review'), findsOneWidget);
  });

  testWidgets('Q&A is only for enrolled students', (tester) async {
    final app = await openApp(tester, qna: true);
    await go(app, tester, '/course/1');
    expect(find.text('Q&A'), findsNothing);
  });

  testWidgets('enrolled students ask a question and reply in the thread', (
    tester,
  ) async {
    final app = await openApp(tester, qna: true, enrolled: true);
    await go(app, tester, '/course/1');
    await tester.tap(find.text('Q&A'));
    await TestApp.settle(tester);

    expect(find.text('What does range return?'), findsOneWidget);
    expect(find.text('1 answer'), findsOneWidget);

    await showAndTap(tester, find.text('Ask a question'));
    await TestApp.settle(tester);
    await tester.enterText(find.byType(TextField), 'Is there homework?');
    await tester.pump();
    await tester.tap(find.text('Send question'));
    await TestApp.settle(tester);
    expect(app.api.lastQuestion, 'Is there homework?');

    // The new question's thread opens, with no snackbar over its reply box.
    expect(find.text('Question'), findsOneWidget);
    expect(find.byType(SnackBar), findsNothing);
    await tester.enterText(find.byType(TextField), 'Thanks!');
    await tester.pump();
    await tester.tap(find.bySemanticsLabel('Send reply'));
    await TestApp.settle(tester);
    expect(app.api.lastAnswer, 'Thanks!');
    expect(app.api.count('getQuestion'), 2);
  });
}
