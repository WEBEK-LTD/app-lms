import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/preview/preview.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/widgets/common.dart';
import 'package:yallapp/modules/shared/pages/draft_reload.dart';
import 'package:yallapp/modules/shared/pages/page_blocks.dart';
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

  group('99.3', () {
    test('corners: as the app has them, square or round', () {
      const shapes = AppShapes(card: 16, button: 14, chip: 19);
      const sharp = BlockLook(corners: BlockCorners.sharp);
      const round = BlockLook(corners: BlockCorners.round);
      expect(lookRadius(null, shapes, 16), 16);
      expect(lookRadius(const BlockLook(), shapes, 16), 16);
      expect(lookRadius(sharp, shapes, 16), 0);
      expect(lookRadius(round, shapes, 16), 22);
    });

    testWidgets('a block sits, sizes and fits as its look says; the page has '
        'its background and header picture', (tester) async {
      final api = FakeApi()
        ..navigation = navigationJson()
        ..pages = {
          'home': {
            ...appPageJson(
              blocks: [
                {
                  'id': 'b1',
                  'type': 'button',
                  'visibility': 'everyone',
                  'label': 'Read more',
                  'style': 'text',
                  'action': {'type': 'screen', 'screen': 'courses'},
                  'look': {'align': 'end', 'text_size': 'large'},
                },
                {
                  'id': 'b2',
                  'type': 'image',
                  'visibility': 'everyone',
                  'image_url': 'https://cdn.example.com/whole.png',
                  'look': {'image_fit': 'contain', 'corners': 'sharp'},
                },
              ],
            ),
            'background': 'tint',
            'header_image_url': 'https://cdn.example.com/top.jpg',
          },
        };
      final app = TestApp(api: api, signedIn: true);
      await app.pump(tester);
      expect(
        find.byKey(const ValueKey('page-background-tint')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('page-header-image')), findsOneWidget);

      // The text button at the end of the line, its text larger.
      final block = tester.getRect(find.byKey(const ValueKey('block-b1')));
      final label = tester.getRect(find.text('Read more'));
      expect(block.right - label.right, lessThan(40));
      expect(label.left - block.left, greaterThan(100));
      final scaler = MediaQuery.textScalerOf(
        tester.element(find.text('Read more')),
      );
      expect(scaler.scale(14), closeTo(16.8, 0.01));

      // The whole picture, with square corners.
      final picture = find.descendant(
        of: find.byKey(const ValueKey('block-b2')),
        matching: find.byType(AppNetworkImage),
      );
      expect(tester.widget<AppNetworkImage>(picture).fit, BoxFit.contain);
      final clips = find.descendant(
        of: find.byKey(const ValueKey('block-b2')),
        matching: find.byType(ClipRRect),
      );
      final clip = tester.widget<ClipRRect>(clips.first);
      expect(clip.borderRadius, BorderRadius.zero);
      expect(tester.takeException(), isNull);
    });

    testWidgets('switched off, the blocks keep their usual look', (
      tester,
    ) async {
      final config = {...configJson(), 'switches': {'block_looks': false}};
      final api = FakeApi(config: config)
        ..navigation = navigationJson()
        ..pages = {
          'home': appPageJson(
            blocks: [
              {
                'id': 'b1',
                'type': 'image',
                'visibility': 'everyone',
                'image_url': 'https://cdn.example.com/whole.png',
                'look': {'image_fit': 'contain'},
              },
            ],
          ),
        };
      final app = TestApp(api: api, signedIn: true);
      await app.pump(tester);
      final picture = find.descendant(
        of: find.byKey(const ValueKey('block-b1')),
        matching: find.byType(AppNetworkImage),
      );
      expect(tester.widget<AppNetworkImage>(picture).fit, BoxFit.cover);
    });
  });
}
