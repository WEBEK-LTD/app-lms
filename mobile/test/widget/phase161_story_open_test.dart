import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/shared/pages/page_providers.dart';

import '../screenshots/support/demo_api.dart';
import '../screenshots/support/leqaa.dart';
import '../screenshots/support/shot.dart' show loadAppFonts, usePhone;
import '../screenshots/support/studio_demo.dart';
import '../support/test_app.dart';

/// 161 "افتح" (Open) on a story: the owner of Kech Flora (18 November),
/// "When I tap 'Open' while viewing a story, it doesn't open any other
/// page, it opens the home page." A story's Open now opens its link from
/// the stories' own navigator (the row under them may be built again
/// meanwhile, and its link was then lost), and the shop when the link
/// opens nothing here (none, a page not published, the page the story is
/// on): never nothing, which left the customer on Home. Leqaa's look A,
/// its occasions on its home, as the platform makes it.

/// [api] with the home's stories linked as [links] (one per occasion).
DemoApi _linked(DemoApi api, List<Map<String, dynamic>?> links) {
  final home = api.pages['home']!;
  final studio = home['studio'] as Map<String, dynamic>;
  Object? walk(Object? node) {
    if (node is Map<String, dynamic>) {
      if (node['type'] == 'stories') {
        final slides = node['slides'] as List;
        return {
          ...node,
          'slides': [
            for (final (i, s) in slides.indexed)
              {
                ...(s as Map<String, dynamic>)..remove('action'),
                if (i < links.length && links[i] != null) 'action': links[i],
              },
          ],
        };
      }
      return {for (final e in node.entries) e.key: walk(e.value)};
    }
    if (node is List) return [for (final n in node) walk(n)];
    return node;
  }

  api.pages['home'] = {
    ...home,
    'studio': {...studio, 'body': walk(studio['body'])},
  };
  return api;
}

Future<TestApp> _open(WidgetTester tester, DemoApi api) async {
  StudioDemo.language = 'en';
  usePhone(tester);
  final app = TestApp(api: api, appType: AppType.store, signedIn: true);
  await app.pump(tester);
  return app;
}

/// Where the app is: the screen on top (a page pushed over the tabs too).
String _at(TestApp app) =>
    app.container.read(appRouterProvider).state.uri.toString();

final _rings = find.byWidgetPredicate(
  (w) =>
      w.key is ValueKey &&
      RegExp(r'^studio-story-[a-z0-9-]+-\d+$')
          .hasMatch('${(w.key as ValueKey).value}') &&
      !'${(w.key as ValueKey).value}'.contains('-ring-'),
);

/// Opens story [i] of the home's occasions and taps its Open.
Future<void> _openStory(
  WidgetTester tester,
  int i, {
  bool tapOpen = true,
}) async {
  await tester.ensureVisible(_rings.at(i));
  await TestApp.settle(tester);
  await tester.tap(_rings.at(i), warnIfMissed: false);
  await TestApp.settle(tester);
  if (!tapOpen) return;
  await tester.tap(find.byKey(const ValueKey('studio-story-open')));
  await TestApp.settle(tester, 30);
}

void main() {
  // The app's own fonts, on a phone's size, as the layout tests draw Leqaa.
  setUpAll(loadAppFonts);

  final look = StudioDemo.signature('flowers', 'a');

  testWidgets(
    '161 the template\'s occasions: each one\'s Open opens the shop (Bouquets), not Home',
    (tester) async {
      final app = await _open(tester, leqaaStudioApi(look: look));
      expect(_at(app), '/page/home');
      for (var i = 0; i < 5; i++) {
        await _openStory(tester, i);
        expect(_at(app), '/shop?focus=1', reason: 'story $i');
        app.container.read(appRouterProvider).go('/page/home');
        await TestApp.settle(tester);
      }
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    '161 a story\'s own link: a page, a product, the cart; none, a page not published, or the page it is on: the shop',
    (tester) async {
      final api = _linked(leqaaStudioApi(look: look), [
        {'type': 'page', 'page_slug': 'bouquet'},
        {
          'type': 'item',
          'item': {'source': 'products', 'id': '101'},
        },
        null,
        {'type': 'page', 'page_slug': 'not-published'},
        {'type': 'page', 'page_slug': 'home'},
      ]);
      final app = await _open(tester, api);
      final expected = [
        '/page/bouquet',
        '/product/101?or=shop',
        '/shop?focus=1',
        '/shop?focus=1',
        '/shop?focus=1',
      ];
      for (var i = 0; i < 5; i++) {
        // Every story has its Open: its link, or the shop.
        await _openStory(tester, i, tapOpen: false);
        expect(
          find.byKey(const ValueKey('studio-story-open')),
          findsOneWidget,
          reason: 'story $i',
        );
        await tester.tap(find.byKey(const ValueKey('studio-story-open')));
        await TestApp.settle(tester, 30);
        expect(_at(app), expected[i], reason: 'story $i');
        app.container.read(appRouterProvider).go('/page/home');
        await TestApp.settle(tester);
      }
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    '161 the page asked again while the story shows (its row built anew): Open still opens the shop',
    (tester) async {
      final app = await _open(tester, leqaaStudioApi(look: look));
      await _openStory(tester, 0, tapOpen: false);
      // What the owner publishes reaches the app: the page under the stories is built again.
      app.container.invalidate(pageProvider);
      await TestApp.settle(tester);
      await tester.tap(find.byKey(const ValueKey('studio-story-open')));
      await TestApp.settle(tester, 30);
      expect(_at(app), '/shop?focus=1');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('161 in Arabic: «افتح» opens the shop', (tester) async {
    StudioDemo.language = 'ar';
    usePhone(tester);
    final app = TestApp(
      api: leqaaStudioApi(look: look, lang: 'ar'),
      appType: AppType.store,
      signedIn: true,
      preferences: const {'settings.language': 'ar'},
    );
    await app.pump(tester);
    await _openStory(tester, 1, tapOpen: false);
    expect(find.text('افتح'), findsOneWidget);
    await tester.tap(find.text('افتح'));
    await TestApp.settle(tester, 30);
    expect(_at(app), '/shop?focus=1');
    StudioDemo.language = 'en';
  });
}
