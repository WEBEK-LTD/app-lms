import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/providers.dart';
import 'package:yallapp_community/core/routing/app_router.dart';
import 'package:yallapp_community/features/tutorials/data/tutorials_api.dart';

import '../../support/shots.dart';
import '../../support/test_app.dart';

/// 231 (area E) Official tutorials: the Learn tab and a tutorial.
Future<(FakeTutorialsApi, List<Uri>)> _open(
  WidgetTester tester,
  String location, {
  ThemeMode theme = ThemeMode.light,
  String language = 'en',
}) async {
  await loadShotFonts();
  phoneInsets(tester);
  final api = FakeTutorialsApi();
  final opened = <Uri>[];
  final app = await TestApp.start(
    tester,
    theme: theme,
    language: language,
    overrides: [
      tutorialsApiProvider.overrideWithValue(api),
      openExternalProvider.overrideWithValue((uri) async {
        opened.add(uri);
        return true;
      }),
    ],
  );
  app.container.read(routerProvider).go(location);
  await TestApp.settle(tester);
  return (api, opened);
}

void main() {
  testWidgets('Learn lists the tutorials with their kind, length and level', (
    tester,
  ) async {
    await _open(tester, '/learn');
    expect(
      find.text('Give every template its own product page'),
      findsOneWidget,
    );
    expect(find.text('Video · 08:24'), findsOneWidget);
    expect(find.text('Beginner'), findsWidgets);
    await shot(tester, 'learn-light-en');
  });

  testWidgets('a filter asks for videos only', (tester) async {
    final (api, _) = await _open(tester, '/learn');
    await tester.tap(find.text('Video').first);
    await TestApp.settle(tester);
    expect(api.calls.last, 'tutorials::video::');
    expect(
      find.text('Your first shop, from sign-up to the stores'),
      findsNothing,
    );
  });

  testWidgets('a video opens its player outside the app', (tester) async {
    final (_, opened) = await _open(tester, '/learn/tut-product-page');
    await tester.tap(find.text('Watch the video'));
    await TestApp.settle(tester);
    expect(opened.single.path, '/community/videos/product-page');
    await shot(tester, 'tutorial-video-light-en');
  });

  testWidgets('an article shows its text', (tester) async {
    await _open(tester, '/learn/tut-first-shop', theme: ThemeMode.dark);
    expect(find.textContaining('Start in Studio'), findsOneWidget);
    expect(find.textContaining('Article · 9 min read'), findsWidgets);
    await shot(tester, 'tutorial-article-dark-en');
  });

  testWidgets('a locked tutorial shows a lock, no text, no video and no '
      'price', (tester) async {
    await _open(tester, '/learn/tut-pro-launch');
    expect(find.text('Unlocks on the account that has it'), findsOneWidget);
    expect(find.text('Watch the video'), findsNothing);
    expect(
      find.textContaining(RegExp(r'[$€£₺]|price|buy', caseSensitive: false)),
      findsNothing,
    );
    await shot(tester, 'tutorial-locked-light-en');
  });

  testWidgets('Learn in Arabic', (tester) async {
    await _open(tester, '/learn', language: 'ar', theme: ThemeMode.dark);
    expect(find.text('تعلّم'), findsWidgets);
    expect(find.text('متجر بالعربية أولًا'), findsOneWidget);
    await shot(tester, 'learn-dark-ar');
  });
}
