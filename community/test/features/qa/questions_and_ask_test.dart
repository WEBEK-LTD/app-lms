import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/routing/app_router.dart';
import 'package:yallapp_community/features/qa/data/fake_qa_api.dart';
import 'package:yallapp_community/features/qa/data/qa_api.dart';

import '../../support/shots.dart';
import '../../support/test_app.dart';

/// 231 (area E) The Q&A tab and asking a question.
Future<FakeQaApi> _open(
  WidgetTester tester,
  String location, {
  ThemeMode theme = ThemeMode.light,
  String language = 'en',
}) async {
  await loadShotFonts();
  phoneInsets(tester);
  final qa = FakeQaApi();
  final app = await TestApp.start(
    tester,
    theme: theme,
    language: language,
    overrides: [qaApiProvider.overrideWithValue(qa)],
  );
  app.container.read(routerProvider).go(location);
  await TestApp.settle(tester);
  return qa;
}

void main() {
  testWidgets('the Q&A tab lists the questions, the design one first', (
    tester,
  ) async {
    await _open(tester, '/qa');
    expect(
      find.text('How do I give each template its own product page?'),
      findsOneWidget,
    );
    expect(find.text('Ask a question'), findsOneWidget);
    await shot(tester, 'qa-list-light-en');
  });

  testWidgets('a filter asks the server again', (tester) async {
    final qa = await _open(tester, '/qa');
    await tester.tap(find.text('Unanswered'));
    await TestApp.settle(tester);
    expect(qa.calls, contains('questions:unanswered:'));
    expect(
      find.text('How long does the App Store review take for a new shop?'),
      findsOneWidget,
    );
    expect(
      find.text('How do I give each template its own product page?'),
      findsNothing,
    );
  });

  testWidgets('a question opens from the list', (tester) async {
    await _open(tester, '/qa');
    await tester.tap(
      find.text('How do I give each template its own product page?'),
    );
    await TestApp.settle(tester);
    expect(find.text('Accepted'), findsOneWidget);
  });

  testWidgets('typing a title shows the questions like it', (tester) async {
    await _open(tester, '/ask');
    await tester.enterText(
      find.byType(TextField).first,
      'Product photos for the gallery',
    );
    await tester.pump(const Duration(milliseconds: 400));
    await TestApp.settle(tester);
    expect(find.text('Already asked?'), findsOneWidget);
    expect(
      find.text('What size should product photos be for the gallery?'),
      findsOneWidget,
    );
    await shot(tester, 'ask-similar-light-en');
  });

  testWidgets('asking posts the question and opens it', (tester) async {
    final qa = await _open(tester, '/ask');
    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), 'Can I sell gift cards in my shop?');
    await tester.enterText(
      fields.at(1),
      'My customers ask for gift cards every holiday.',
    );
    // The similar questions come after a pause in typing.
    await TestApp.settle(tester);
    await tester.dragUntilVisible(
      find.text('Post question'),
      find.byType(ListView),
      const Offset(0, -300),
    );
    await tester.pump();
    await tester.tap(find.text('Post question'));
    await TestApp.settle(tester);
    expect(qa.calls, contains('ask:Can I sell gift cards in my shop?'));
    expect(find.text('Can I sell gift cards in my shop?'), findsOneWidget);
  });

  testWidgets('a short title is refused before sending', (tester) async {
    final qa = await _open(tester, '/ask');
    await tester.enterText(find.byType(TextField).at(0), 'Help');
    // The similar questions come after a pause in typing.
    await TestApp.settle(tester);
    await tester.dragUntilVisible(
      find.text('Post question'),
      find.byType(ListView),
      const Offset(0, -300),
    );
    await tester.pump();
    await tester.tap(find.text('Post question'));
    await TestApp.settle(tester);
    expect(qa.calls.where((c) => c.startsWith('ask:')), isEmpty);
    expect(find.text('Write at least 10 characters.'), findsOneWidget);
  });

  testWidgets('the Q&A tab in Arabic, by night', (tester) async {
    await _open(tester, '/qa', theme: ThemeMode.dark, language: 'ar');
    expect(find.text('سؤال وجواب'), findsOneWidget);
    await shot(tester, 'qa-list-dark-ar');
  });
}
