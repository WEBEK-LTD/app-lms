import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/modules/shared/pages/recently_viewed.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 112.4 A store's Studio pages: a coupon that copies its code, sliders that
/// show where they are and take a shape, spots on a picture, categories in
/// pictures and what this person opened lately.
void main() {
  Map<String, dynamic> studio(List<Map<String, dynamic>> children) => {
    'body': {'id': 'root', 'type': 'column', 'gap': 8, 'children': children},
  };

  TestApp appWith(
    List<Map<String, dynamic>> children, {
    FakeApi? api,
    AppType appType = AppType.lms,
    Map<String, Object> preferences = const {},
  }) => TestApp(
    api: (api ?? FakeApi())
      ..navigation = navigationJson()
      ..pages = {
        'home': {...appPageJson(blocks: []), 'studio': studio(children)},
      },
    appType: appType,
    signedIn: true,
    preferences: preferences,
  );

  Map<String, dynamic> slide(String id, String text) => {
    'id': id,
    'type': 'column',
    'height': 'fill',
    'align': 'end',
    'padding': {'top': 20, 'end': 20, 'bottom': 20, 'start': 20},
    'image_background_url': 'https://example.com/$id.jpg',
    'overlay': {'color': '#000000', 'opacity': 0.35},
    'children': [
      {'id': '$id-t', 'type': 'text', 'text': text, 'color': '#FFFFFF'},
    ],
  };

  test('reads them', () {
    final body = AppPage.fromJson({
      ...appPageJson(blocks: []),
      'studio': studio([
        {'id': 'c', 'type': 'coupon', 'code': 'WELCOME15'},
        {
          'id': 's',
          'type': 'slider',
          'indicator': 'progress',
          'aspect_ratio': 0.8,
          'children': <Object>[],
        },
        {
          'id': 'look',
          'type': 'stack',
          'children': [
            {
              'id': 'spot',
              'type': 'icon',
              'icon': 'add',
              'place': {'x': 50, 'y': 140},
            },
          ],
        },
        {
          'id': 'cats',
          'type': 'categories',
          'source': 'products',
          'style': 'circles',
          'categories': [
            {
              'id': 1,
              'name': 'Bouquets',
              'count': 3,
              'image_url': 'https://example.com/b.jpg',
            },
          ],
        },
        {
          'id': 'seen',
          'type': 'items',
          'source': 'products',
          'recent': true,
          'items': <Object>[],
        },
        {'id': 'later', 'type': 'slider', 'indicator': 'stars'},
      ]),
    }).studio!.body;
    final [coupon, slider, look, cats, seen, later] = body.children;
    expect(coupon.type, StudioNodeType.coupon);
    expect(coupon.code, 'WELCOME15');
    expect(slider.indicator, StudioIndicator.progress);
    expect(slider.aspectRatio, 0.8);
    expect(look.children.single.place?.x, 50);
    expect(look.children.single.place?.y, 100);
    expect(cats.categoriesStyle, CategoriesStyle.circles);
    expect(cats.categories.single.imageUrl, 'https://example.com/b.jpg');
    expect(seen.recent, isTrue);
    // A way the app doesn't know: dots.
    expect(later.indicator, StudioIndicator.dots);
  });

  testWidgets('a coupon copies its code with one tap', (tester) async {
    String? copied;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'Clipboard.setData') {
          copied = (call.arguments as Map)['text'] as String?;
        }
        return null;
      },
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );
    await appWith([
      {'id': 'code', 'type': 'coupon', 'code': 'WELCOME15', 'radius': 10},
      {'id': 'none', 'type': 'coupon'},
    ]).pump(tester);
    await TestApp.settle(tester, 10);

    expect(find.text('WELCOME15'), findsOneWidget);
    expect(find.text('Copy'), findsOneWidget);
    expect(find.bySemanticsLabel('Copy code, WELCOME15'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('studio-coupon')));
    await tester.pump();
    expect(copied, 'WELCOME15');
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('Code copied'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'sliders take their shape and show where they are: "1 / 3" and dots',
    (tester) async {
      tester.view
        ..physicalSize = const Size(780, 3200)
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      await appWith([
        {
          'id': 'shaped',
          'type': 'slider',
          'aspect_ratio': 0.8,
          'indicator': 'count',
          'children': [
            slide('a1', 'First slide'),
            slide('a2', 'Second slide'),
            slide('a3', 'Third slide'),
          ],
        },
        {
          'id': 'dotted',
          'type': 'slider',
          'height': 120,
          'children': [slide('c1', 'Card one'), slide('c2', 'Card two')],
        },
      ]).pump(tester);
      await TestApp.settle(tester, 10);

      // Its height from its width and shape; the words at the slide's bottom.
      final shaped = tester.getRect(
        find.byKey(const ValueKey('studio-node-shaped')),
      );
      expect(shaped.height, closeTo(shaped.width / 0.8, 1));
      final first = tester.getRect(
        find.byKey(const ValueKey('studio-node-a1')),
      );
      final words = tester.getRect(find.text('First slide'));
      expect(first.bottom - words.bottom, closeTo(20, 1));
      // "1 / 3" over it, then "2 / 3" after a swipe.
      expect(find.text('1 / 3'), findsOneWidget);
      await tester.drag(
        find.byKey(const ValueKey('studio-node-a1')),
        const Offset(-300, 0),
      );
      await TestApp.settle(tester, 10);
      expect(find.text('2 / 3'), findsOneWidget);

      // Dots under the third, outside its height.
      final dotted = tester.getRect(
        find.byKey(const ValueKey('studio-node-dotted')),
      );
      expect(dotted.height, closeTo(120 + 8 + 6, 1));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'lines over a slider fill while it waits, then the next slide comes',
    (tester) async {
      await appWith([
        {
          'id': 'lines',
          'type': 'slider',
          'height': 150,
          'indicator': 'progress',
          'autoplay': true,
          'interval_ms': 2000,
          'children': [slide('b1', 'Offer one'), slide('b2', 'Offer two')],
        },
      ]).pump(tester);
      expect(find.byKey(const ValueKey('studio-lines-lines')), findsOneWidget);
      final lines = tester.getRect(
        find.byKey(const ValueKey('studio-node-lines')),
      );
      expect(lines.height, closeTo(150, 1));
      double filled() => tester
          .widgetList<FractionallySizedBox>(
            find.descendant(
              of: find.byKey(const ValueKey('studio-lines-lines')),
              matching: find.byType(FractionallySizedBox),
            ),
          )
          .first
          .widthFactor!;
      // The open slide's line fills as it waits.
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 500));
      expect(filled(), inExclusiveRange(0, 1));
      // Within its two seconds, the next slide.
      var moved = false;
      for (var i = 0; i < 25 && !moved; i++) {
        await tester.pump(const Duration(milliseconds: 100));
        final next = find.byKey(const ValueKey('studio-node-b2'));
        moved =
            next.evaluate().isNotEmpty &&
            (tester.getRect(next).left - lines.left).abs() < 1;
      }
      expect(moved, isTrue);
      expect(find.text('Offer two'), findsOneWidget);
      expect(tester.takeException(), isNull);
      // Its timer ends with the page.
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('spots sit at their place on a picture, from the start', (
    tester,
  ) async {
    Map<String, dynamic> spot(String id, num x, num y) => {
      'id': id,
      'type': 'icon',
      'icon': 'add',
      'icon_size': 18,
      'padding': {'top': 6, 'end': 6, 'bottom': 6, 'start': 6},
      'place': {'x': x, 'y': y},
    };
    await appWith([
      {
        'id': 'look',
        'type': 'stack',
        'aspect_ratio': 4 / 3,
        'image_background_url': 'https://example.com/room.png',
        'children': [
          spot('middle', 50, 66),
          spot('corner', 0, 0),
          spot('far', 100, 100),
        ],
      },
    ]).pump(tester);
    await TestApp.settle(tester, 10);

    final look = tester.getRect(find.byKey(const ValueKey('studio-node-look')));
    expect(look.height, closeTo(look.width * 3 / 4, 1));
    final middle = tester.getRect(
      find.byKey(const ValueKey('studio-node-middle')),
    );
    expect(middle.center.dx, closeTo(look.center.dx, 1));
    expect(
      middle.top,
      closeTo(look.top + (look.height - middle.height) * 0.66, 1),
    );
    final corner = tester.getRect(
      find.byKey(const ValueKey('studio-node-corner')),
    );
    expect(corner.topLeft, offsetMoreOrLessEquals(look.topLeft, epsilon: 1));
    final far = tester.getRect(find.byKey(const ValueKey('studio-node-far')));
    expect(
      far.bottomRight,
      offsetMoreOrLessEquals(look.bottomRight, epsilon: 1),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('categories as pictures in a grid and as round pictures', (
    tester,
  ) async {
    final categories = [
      {
        'id': 1,
        'name': 'Bouquets',
        'count': 3,
        'image_url': 'https://example.com/b.jpg',
      },
      {'id': 2, 'name': 'Vases', 'count': 2},
      {'id': 3, 'name': 'Gifts', 'count': 5},
    ];
    await appWith(
      appType: AppType.store,
      api: FakeApi(
        config: {
          ...configJson(lms: null, orders: true),
          'store': storeConfigJson(),
        },
      ),
      [
        {
          'id': 'grid',
          'type': 'categories',
          'source': 'products',
          'style': 'pictures',
          'columns': 3,
          'categories': categories,
        },
        {
          'id': 'row',
          'type': 'categories',
          'source': 'products',
          'style': 'circles',
          'categories': categories,
        },
      ],
    ).pump(tester);
    await TestApp.settle(tester, 10);

    final grid = tester.getRect(find.byKey(const ValueKey('studio-node-grid')));
    final tile = tester.getRect(
      find.byKey(const ValueKey('category-picture-1')),
    );
    expect(tile.width, closeTo((grid.width - 20) / 3, 1));
    expect(tile.height, closeTo(tile.width, 1));
    expect(find.byKey(const ValueKey('category-circle-3')), findsOneWidget);
    // Their names, under each round picture and over each picture.
    expect(find.text('Vases'), findsNWidgets(2));
    // Without a picture: its first letter on a colour.
    expect(find.text('V'), findsNWidgets(2));
    expect(find.bySemanticsLabel(RegExp('^Gifts, ')), findsNWidgets(2));
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'what this person opened lately shows once they open a product, newest first',
    (tester) async {
      final api = FakeApi(
        config: {
          ...configJson(lms: null, orders: true),
          'store': storeConfigJson(),
        },
      );
      final app = appWith(api: api, appType: AppType.store, [
        {'id': 'hello', 'type': 'text', 'text': 'Welcome'},
        {
          'id': 'seen',
          'type': 'items',
          'source': 'products',
          'layout': 'carousel',
          'recent': true,
          'title': 'Seen lately',
          'items': <Object>[],
        },
      ]);
      await app.pump(tester);
      await TestApp.settle(tester, 10);
      expect(find.text('Welcome'), findsOneWidget);
      // Nothing opened yet: no list, no title.
      expect(find.text('Seen lately'), findsNothing);

      app.container.read(appRouterProvider).push('/product/21');
      await TestApp.settle(tester, 10);
      app.container.read(appRouterProvider).pop();
      await TestApp.settle(tester, 10);

      expect(find.text('Seen lately'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('studio-node-seen')),
          matching: find.text('Sunflower Basket'),
        ),
        findsOneWidget,
      );
      final seen = app.container.read(recentlyViewedProvider);
      expect(seen.map((i) => (i.id, i.title)), [('21', 'Sunflower Basket')]);
      // Kept on the phone.
      expect(
        app.container
            .read(sharedPreferencesProvider)
            .getString(RecentlyViewed.storageKey),
        contains('"title":"Sunflower Basket"'),
      );
      expect(tester.takeException(), isNull);
    },
  );
}
