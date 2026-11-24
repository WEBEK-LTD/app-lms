import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:yallapp_community/core/routing/app_router.dart';
import 'package:yallapp_community/features/qa/data/fake_qa_api.dart';
import 'package:yallapp_community/features/qa/data/qa_api.dart';
import 'package:yallapp_community/features/qa/ui/widgets/qa_widgets.dart';

import '../../support/shots.dart';
import '../../support/test_app.dart';

/// 231 (area E) The question screen: mobile.html's "Question · dark mode".
Future<(TestApp, FakeQaApi)> _open(
  WidgetTester tester, {
  ThemeMode theme = ThemeMode.dark,
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
  app.container.read(routerProvider).go('/qa/q-product-page');
  await TestApp.settle(tester);
  return (app, qa);
}

void main() {
  testWidgets('the design question: chips, title, asker, accepted official '
      'answer first, then the others', (tester) async {
    await _open(tester);
    expect(find.text('Studio'), findsOneWidget);
    expect(find.text('Product page'), findsOneWidget);
    expect(
      find.text('How do I give each template its own product page?'),
      findsOneWidget,
    );
    expect(find.text('Karim Samy'), findsOneWidget);
    expect(find.text('3h · 284 views · 4 answers'), findsOneWidget);
    expect(find.text('Accepted'), findsOneWidget);
    expect(find.text('Yallapp Team'), findsOneWidget);
    expect(find.text('Official'), findsOneWidget);
    expect(find.text('5 replies'), findsOneWidget);
    expect(find.text('Expert'), findsOneWidget);
    // The accepted answer comes before Nour's.
    final team = tester.getTopLeft(find.text('Yallapp Team')).dy;
    final nour = tester.getTopLeft(find.text('Nour El Hoda')).dy;
    expect(team, lessThan(nour));
    await shot(tester, 'question-dark-en');
  });

  testWidgets('a vote shows at once and reaches the server', (tester) async {
    final (_, qa) = await _open(tester);
    await tester.scrollUntilVisible(find.text('17'), 120);
    await TestApp.settle(tester);
    expect(find.text('17'), findsOneWidget);
    final pill = find.ancestor(
      of: find.text('17'),
      matching: find.byType(VotePill),
    );
    await tester.tap(
      find.descendant(of: pill, matching: find.byIcon(Symbols.arrow_upward)),
    );
    await TestApp.settle(tester);
    expect(find.text('18'), findsOneWidget);
    expect(qa.calls, contains('voteAnswer:a-nour:1'));
  });

  testWidgets('saving the question fills the bookmark', (tester) async {
    final (_, qa) = await _open(tester);
    await tester.tap(find.bySemanticsLabel('Save'));
    await TestApp.settle(tester);
    expect(qa.calls, contains('bookmark:q-product-page:true'));
    expect(find.bySemanticsLabel('Saved'), findsOneWidget);
  });

  testWidgets('writing an answer adds it to the end', (tester) async {
    final (_, qa) = await _open(tester);
    await tester.scrollUntilVisible(find.text('Write an answer'), 200);
    await tester.tap(find.text('Write an answer'));
    await TestApp.settle(tester);
    await tester.enterText(
      find.byType(TextField),
      'Open the look and switch it on.',
    );
    await tester.tap(find.text('Post'));
    await TestApp.settle(tester);
    expect(qa.calls, contains('answer:q-product-page'));
    await tester.scrollUntilVisible(
      find.text('Open the look and switch it on.'),
      200,
    );
    expect(find.text('Open the look and switch it on.'), findsOneWidget);
  });

  testWidgets('the replies sheet lists the five replies', (tester) async {
    await _open(tester);
    await tester.tap(find.text('5 replies'));
    await TestApp.settle(tester);
    expect(find.text('Worked for me, thanks!'), findsOneWidget);
    expect(find.text('Great answer.'), findsOneWidget);
  });

  testWidgets('by day and in Arabic', (tester) async {
    await _open(tester, theme: ThemeMode.light);
    expect(find.text('Accepted'), findsOneWidget);
    await shot(tester, 'question-light-en');
  });

  testWidgets('in Arabic, right to left', (tester) async {
    await _open(tester, language: 'ar');
    expect(find.text('مقبولة'), findsOneWidget);
    expect(find.text('رسمي'), findsOneWidget);
    await shot(tester, 'question-dark-ar');
  });
}
