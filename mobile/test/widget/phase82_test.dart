import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/preview/preview.dart';
import 'package:yallapp/modules/shared/pages/draft_reload.dart';
import 'package:yallapp/modules/shared/pages/page_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 82.1 The app preview inside the Pages & look editor follows the draft:
/// each save the editor reports reloads the tabs and pages in place.
void main() {
  PreviewSession session({required bool draft}) => PreviewSession(
    appId: '11111111-2222-4333-8444-555555555555',
    platformUrl: 'https://yallapp.com.tr',
    contentSource: PreviewContentSource.hosted,
    apiToken: 'preview-token',
    draft: draft,
  );

  FakeApi api() => FakeApi()
    ..navigation = navigationJson()
    ..pages = {
      'home': appPageJson(
        blocks: [
          {
            'id': 'b1',
            'type': 'text',
            'visibility': 'everyone',
            'html': '<p>First draft</p>',
          },
        ],
      ),
    };

  int count(FakeApi api, String call) =>
      api.calls.where((c) => c == call).length;

  testWidgets('a saved draft reloads the tabs and the page on screen', (
    tester,
  ) async {
    final saves = StreamController<void>.broadcast();
    addTearDown(saves.close);
    final app = TestApp(
      api: api(),
      preview: session(draft: true),
      signedIn: true,
      overrides: [draftSavedProvider.overrideWithValue(saves.stream)],
    );
    await app.pump(tester);
    expect(find.text('Discover'), findsWidgets);
    expect(
      find.textContaining('First draft', findRichText: true),
      findsOneWidget,
    );
    final pagesBefore = count(app.api, 'getPages');
    final pageBefore = count(app.api, 'getPage');

    // The owner renames a tab and edits the home page; the editor saves twice in a row.
    app.api
      ..navigation = navigationJson(
        tabs: [
          navTabJson('t1', 'Welcome', 'explore', {
            'type': 'page',
            'page_slug': 'home',
          }),
          navTabJson('t4', 'Me', 'person', {
            'type': 'screen',
            'screen': 'account',
          }),
        ],
      )
      ..pages['home'] = appPageJson(
        blocks: [
          {
            'id': 'b1',
            'type': 'text',
            'visibility': 'everyone',
            'html': '<p>Second draft</p>',
          },
        ],
      );
    saves
      ..add(null)
      ..add(null);
    await TestApp.settle(tester, 20);

    // Once for both saves, without starting the app again.
    expect(count(app.api, 'getPages'), pagesBefore + 1);
    expect(count(app.api, 'getPage'), greaterThan(pageBefore));
    expect(find.text('Welcome'), findsWidgets);
    expect(
      find.textContaining('Second draft', findRichText: true),
      findsOneWidget,
    );
    expect(
      find.textContaining('First draft', findRichText: true),
      findsNothing,
    );
  });

  testWidgets('the published preview and the phone apps listen to nothing', (
    tester,
  ) async {
    final app = TestApp(api: api(), preview: session(draft: false));
    await app.pump(tester);
    expect(app.container.read(draftSavedProvider), isA<Stream<void>>());
    final pagesBefore = count(app.api, 'getPages');
    await TestApp.settle(tester, 10);
    expect(count(app.api, 'getPages'), pagesBefore);
  });

  test('82.3 the preview link asks for Android or an iPhone', () {
    PreviewLaunch? launch(String query) => PreviewLaunch.fromUri(
      Uri.parse('https://yallapp.com.tr/preview-app/index.html?$query'),
    );
    const token = 'token=p1.abcdefghijklmnopqrstuvwxyz';
    expect(launch('$token&os=ios')!.platform, DevicePlatform.ios);
    expect(
      launch('$token&os=android&theme=dark')!.platform,
      DevicePlatform.android,
    );
    expect(launch('$token&theme=dark')!.themeMode, ThemeMode.dark);
    // Anything else: as the browser's system.
    expect(launch('$token&os=windows')!.platform, isNull);
    expect(launch(token)!.platform, isNull);
  });

  group('82.5', () {
    test('reads the side menu, the own icons and the looks', () {
      final navigation = Navigation.fromJson({
        ...navigationJson(),
        'menu': [
          {
            ...navTabJson('m1', 'About us', 'info', {
              'type': 'page',
              'page_slug': 'home',
            }),
            'icon_url': 'https://cdn.example.com/about.png',
          },
          // Not https: the list icon instead.
          {
            ...navTabJson('m2', 'Orders', 'receipt_long', {
              'type': 'screen',
              'screen': 'orders',
            }),
            'icon_url': 'http://cdn.example.com/orders.png',
          },
          navTabJson('m3', 'Later', 'rocket', {'type': 'teleport'}),
        ],
      });
      expect(navigation.menu.map((e) => e.label), ['About us', 'Orders']);
      expect(
        navigation.menu.first.iconUrl,
        'https://cdn.example.com/about.png',
      );
      expect(navigation.menu.last.iconUrl, isNull);
      // An older platform without a menu.
      expect(Navigation.fromJson(navigationJson()).menu, isEmpty);

      final page = AppPage.fromJson(
        appPageJson(
          blocks: [
            {
              'id': 'b1',
              'type': 'text',
              'html': '<p>Hi</p>',
              'look': {'background': 'primary', 'spacing': 'large'},
            },
            {
              'id': 'b2',
              'type': 'text',
              'html': '<p>Plain</p>',
              'look': {'background': 'none', 'spacing': 'medium'},
            },
            {
              'id': 'b3',
              'type': 'text',
              'html': '<p>Odd</p>',
              'look': {'background': 'neon', 'spacing': 'small'},
            },
          ],
        ),
      );
      expect(page.looks['b1']!.background, BlockBackground.primary);
      expect(page.looks['b1']!.spacing, BlockSpacing.large);
      expect(page.looks.containsKey('b2'), isFalse);
      expect(page.looks['b3']!.background, BlockBackground.none);
      expect(page.looks['b3']!.spacing, BlockSpacing.small);
      expect(blockGap(16, page.looks['b1'], page.looks['b3']), 32);
      expect(blockGap(16, null, page.looks['b3']), 16);
      expect(blockGap(16, null, null), 16);
    });

    testWidgets(
      'the menu button opens the side menu; a block has its background',
      (tester) async {
        final api = FakeApi()
          ..navigation = {
            ...navigationJson(),
            'menu': [
              navTabJson('m1', 'About us', 'info', {
                'type': 'page',
                'page_slug': 'home',
              }),
              navTabJson('m2', 'Settings', 'settings', {
                'type': 'screen',
                'screen': 'settings',
              }),
            ],
          }
          ..pages = {
            'home': appPageJson(
              blocks: [
                {
                  'id': 'b1',
                  'type': 'text',
                  'visibility': 'everyone',
                  'html': '<p>On the brand colour</p>',
                  'look': {'background': 'primary', 'spacing': 'large'},
                },
              ],
            ),
          };
        final app = TestApp(api: api, signedIn: true);
        await app.pump(tester);
        expect(
          find.byKey(const ValueKey('look-primary-large')),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);

        await tester.tap(find.bySemanticsLabel('Open the menu'));
        await TestApp.settle(tester, 10);
        expect(find.byKey(const ValueKey('side-menu-m1')), findsOneWidget);
        expect(find.text('Settings'), findsOneWidget);

        await tester.tap(find.byKey(const ValueKey('side-menu-m2')));
        await TestApp.settle(tester, 10);
        expect(find.byKey(const ValueKey('side-menu-m1')), findsNothing);
      },
    );

    testWidgets('no menu, no menu button', (tester) async {
      final app = TestApp(
        api: FakeApi()..navigation = navigationJson(),
        signedIn: true,
      );
      await app.pump(tester);
      expect(find.bySemanticsLabel('Open the menu'), findsNothing);
    });
  });
}
