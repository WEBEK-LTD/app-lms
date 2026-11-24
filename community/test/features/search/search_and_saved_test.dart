import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/routing/app_router.dart';
import 'package:yallapp_community/features/qa/data/fake_qa_api.dart';
import 'package:yallapp_community/features/qa/data/qa_api.dart';
import 'package:yallapp_community/features/search/data/search_api.dart';
import 'package:yallapp_community/features/tutorials/data/tutorials_api.dart';

import '../../support/shots.dart';
import '../../support/test_app.dart';

/// 231 (area E) The header's search and the menu's Saved page.
Future<(TestApp, FakeQaApi)> _open(WidgetTester tester, String location) async {
  await loadShotFonts();
  phoneInsets(tester);
  final qa = FakeQaApi();
  final tutorials = FakeTutorialsApi();
  final app = await TestApp.start(
    tester,
    overrides: [
      qaApiProvider.overrideWithValue(qa),
      tutorialsApiProvider.overrideWithValue(tutorials),
      searchApiProvider.overrideWithValue(
        FakeSearchApi(qa: qa, tutorials: tutorials),
      ),
    ],
  );
  app.container.read(routerProvider).push(location);
  await TestApp.settle(tester);
  return (app, qa);
}

void main() {
  testWidgets('search finds questions, tutorials and tags as one types', (
    tester,
  ) async {
    await _open(tester, '/search');
    await tester.enterText(find.byType(TextField), 'product page');
    await tester.pump(const Duration(milliseconds: 350));
    await TestApp.settle(tester);
    expect(find.text('QUESTIONS'), findsOneWidget);
    expect(
      find.text('How do I give each template its own product page?'),
      findsOneWidget,
    );
    expect(find.text('TUTORIALS'), findsOneWidget);
    await shot(tester, 'search-light-en');
  });

  testWidgets('a search with nothing found says so', (tester) async {
    await _open(tester, '/search');
    await tester.enterText(find.byType(TextField), 'zzzz');
    await tester.pump(const Duration(milliseconds: 350));
    await TestApp.settle(tester);
    expect(find.text('Nothing matches “zzzz”.'), findsOneWidget);
  });

  testWidgets('Saved lists what the member saved', (tester) async {
    final (app, qa) = await _open(tester, '/saved');
    expect(
      find.text('Questions and tutorials you save show here.'),
      findsOneWidget,
    );
    await qa.bookmark('q-product-page', saved: true);
    app.container.read(routerProvider).pop();
    await TestApp.settle(tester);
    app.container.read(routerProvider).push('/saved');
    await TestApp.settle(tester);
    expect(
      find.text('How do I give each template its own product page?'),
      findsOneWidget,
    );
  });
}
