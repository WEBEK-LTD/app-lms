import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/theme/app_icons.dart';
import 'package:yallapp/core/widgets/app_nav_bar.dart';
import 'package:yallapp/core/widgets/buttons.dart';
import 'package:yallapp/core/widgets/common.dart' show MessageView;
import 'package:yallapp/modules/store/widgets/product_widgets.dart';

import '../screenshots/support/leqaa.dart';
import '../screenshots/support/shot.dart' show loadAppFonts;
import '../screenshots/support/studio_demo.dart';
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 158 Every page reaches its end, on every phone. The owner (18 November)
/// on Leqaa and Kech Flora, made from Leqaa's Signature template: "on some
/// phones, some pages don't scroll down to the end", and the filter doesn't
/// reach its last choice either. Each page of the template (both looks,
/// English and Arabic) and the shop's screens under it, dragged to their
/// end as a customer does, on small and tall phones, with the phone's own
/// bar under the app (a home indicator, Android's three buttons or gesture
/// bar) and a larger font: the last thing on the page must lie above the
/// tab bar floating over it, a call to action pinned at its foot and the
/// phone's bar. The sort and filter sheets show their last choice and
/// their button in reach (with the keyboard up for a price), and a grid's
/// next-page spinner lies across the grid, in its middle.
void main() {
  setUpAll(loadAppFonts);

  const phones = <Phone>[
    (name: '320x568', size: Size(320, 568), top: 20, bottom: 0),
    (name: '360x640', size: Size(360, 640), top: 24, bottom: 0),
    (name: '360x800 three buttons', size: Size(360, 800), top: 24, bottom: 48),
    (name: '375x667', size: Size(375, 667), top: 20, bottom: 0),
    (name: '390x844 home indicator', size: Size(390, 844), top: 47, bottom: 34),
    (name: '412x915 gestures', size: Size(412, 915), top: 24, bottom: 24),
  ];
  const scales = [1.0, 1.3];

  /// How a customer reaches each of the template's pages.
  final pages = <String, Future<void> Function(WidgetTester, TestApp)>{
    'home': (tester, app) async {},
    'Bouquets (the shop)': (tester, app) => _tab(tester, 1),
    'Send (the cart)': (tester, app) => _tab(tester, 2),
    'Orders': (tester, app) => _tab(tester, 3),
    // Account's own lists end past the bar with Roadmap 167 (Sign out).
    'the bouquet': (tester, app) => _push(tester, app, Paths.page('bouquet')),
    'your picks': (tester, app) => _push(tester, app, Paths.page('wishlist')),
    'a bouquet in the shop': (tester, app) =>
        _push(tester, app, Paths.product(101)),
    'Settings': (tester, app) => _push(tester, app, Paths.settings),
    'Notifications': (tester, app) => _push(tester, app, Paths.notifications),
  };

  group('158 Leqaa\'s pages reach their end', () {
    for (final look in ['a', 'b']) {
      for (final language in ['en', 'ar']) {
        for (final MapEntry(key: name, value: open) in pages.entries) {
          // Arabic on the phones where the page is shortest and the font
          // largest; English on all of them.
          final configs = [
            for (final phone in phones)
              for (final scale in scales)
                if (language == 'en' ||
                    (phone.size.height <= 640 || phone.bottom >= 48) &&
                        scale > 1)
                  (phone, scale),
          ];
          testWidgets('look $look, $language: $name', (tester) async {
            await _withoutOverflowErrors(() async {
              await _usePhone(tester, configs.first.$1, configs.first.$2);
              final app = await _leqaa(tester, look: look, language: language);
              await open(tester, app);
              for (final (phone, scale) in configs) {
                await _usePhone(tester, phone, scale);
                await _toTop(tester);
                await _toEnd(tester);
                _expectEndInReach(
                  tester,
                  'look $look, $language, $name, ${phone.name}, text x$scale',
                );
              }
              await _close(tester, app);
            });
          });
        }
      }
    }
  });

  group('158 a call to action pinned at the foot', () {
    for (final style in ['bar', 'card', 'fab']) {
      testWidgets('the home\'s end scrolls clear of "Send flowers" ($style)', (
        tester,
      ) async {
        await _withoutOverflowErrors(() async {
          await _usePhone(tester, phones.first, 1);
          final app = await _leqaa(tester, look: 'a', sendBar: style);
          expect(
            find.byKey(
              ValueKey('premium-${style == 'fab' ? 'fab' : 'cta'}-send-bar'),
            ),
            findsOneWidget,
          );
          for (final phone in phones) {
            for (final scale in scales) {
              await _usePhone(tester, phone, scale);
              await _toTop(tester);
              await _toEnd(tester);
              _expectEndInReach(
                tester,
                'Send flowers ($style), ${phone.name}, text x$scale',
              );
            }
          }
          await _close(tester, app);
        });
      });
    }

    testWidgets('a page around the shop keeps its last row clear of it', (
      tester,
    ) async {
      await _withoutOverflowErrors(() async {
        await _usePhone(tester, phones.first, 1);
        final app = await _leqaa(tester, look: 'b', sendBar: 'bar', on: 'shop');
        await _tab(tester, 1);
        expect(
          find.byKey(const ValueKey('premium-cta-send-bar')),
          findsOneWidget,
        );
        for (final phone in phones) {
          await _usePhone(tester, phone, 1.3);
          await _toTop(tester);
          await _toEnd(tester);
          _expectEndInReach(
            tester,
            'the shop under Send flowers, ${phone.name}',
          );
        }
        await _close(tester, app);
      });
    });
  });

  group('158 the sort and filter sheets reach their last choice', () {
    for (final language in ['en', 'ar']) {
      testWidgets('the shop\'s sort ($language)', (tester) async {
        await _withoutOverflowErrors(() async {
          await _usePhone(tester, phones.first, 1);
          final app = await _leqaa(tester, look: 'a', language: language);
          await _tab(tester, 1);
          for (final phone in phones) {
            for (final scale in [1.0, 1.3, 1.5]) {
              await _usePhone(tester, phone, scale);
              final why = 'sort, ${phone.name}, text x$scale';
              // The sort button in sight (under the page's top on a small
              // phone).
              await _toTop(tester);
              await tester.ensureVisible(_squareButton(AppIcons.sort));
              await TestApp.settle(tester, 6);
              await tester.tap(_squareButton(AppIcons.sort));
              await TestApp.settle(tester, 12);
              final last = find.byKey(const ValueKey('sort-title'));
              await _revealInSheet(tester, last);
              _expectInReach(tester, last, why);
              await tester.tap(last);
              await TestApp.settle(tester, 12);
              expect(
                find.byKey(const ValueKey('sort-title')),
                findsNothing,
                reason: '$why: the sheet closed on the last choice',
              );
              await tester.tap(_squareButton(AppIcons.sort));
              await TestApp.settle(tester, 12);
              // The last choice was taken: it is the one ticked now.
              expect(
                find.descendant(
                  of: find.byKey(const ValueKey('sort-title')),
                  matching: find.byType(Icon),
                ),
                findsOneWidget,
                reason: why,
              );
              await tester.tapAt(const Offset(10, 60));
              await TestApp.settle(tester, 12);
            }
          }
          await _close(tester, app);
        });
      });
    }

    testWidgets('real estate: the sort, and the filters with the keyboard up', (
      tester,
    ) async {
      await _withoutOverflowErrors(() async {
        await _usePhone(tester, phones.first, 1);
        final api = FakeApi(
          config: configJson(lms: null, listings: listingsConfigJson()),
        );
        final app = TestApp(
          api: api,
          appType: AppType.realEstate,
          signedIn: true,
        );
        await app.pump(tester);
        await TestApp.settle(tester, 20);
        for (final phone in phones) {
          for (final scale in [1.0, 1.3, 1.5]) {
            await _usePhone(tester, phone, scale);
            final why = '${phone.name}, text x$scale';
            // The sort: its last choice.
            await tester.tap(_squareButton(AppIcons.sort));
            await TestApp.settle(tester, 12);
            final area = find.text('Largest first');
            await _revealInSheet(tester, area);
            _expectInReach(tester, area, 'sort, $why');
            await tester.tap(area);
            await TestApp.settle(tester, 12);
            expect(
              api.lastListingQuery!.sort,
              ListingSort.areaDesc,
              reason: why,
            );
            // The filters, a price typed with the keyboard up: the last
            // choice and Show results above the keyboard.
            await tester.tap(_squareButton(AppIcons.filters));
            await TestApp.settle(tester, 12);
            final price = find.byType(TextField).last;
            await tester.ensureVisible(price);
            await tester.tap(price);
            await tester.enterText(price, '5000000');
            await _usePhone(tester, phone, scale, keyboard: 300);
            await TestApp.settle(tester, 12);
            final last = find.text('4+').last;
            await _revealInSheet(tester, last);
            _expectInReach(tester, last, 'filters, $why', keyboard: 300);
            _expectInReach(
              tester,
              find.text('Show results'),
              'filters, $why',
              keyboard: 300,
            );
            await tester.tap(find.text('Show results'));
            await _usePhone(tester, phone, scale);
            await TestApp.settle(tester, 12);
            expect(find.text('Show results'), findsNothing, reason: why);
          }
        }
        await _close(tester, app);
      });
    });

    testWidgets('a settings choice in the petal look (the language)', (
      tester,
    ) async {
      await _withoutOverflowErrors(() async {
        await _usePhone(tester, phones.first, 1);
        final app = await _leqaa(tester, look: 'a');
        await _push(tester, app, Paths.settings);
        for (final phone in phones) {
          for (final scale in [1.0, 1.3, 1.5]) {
            await _usePhone(tester, phone, scale);
            await _toTop(tester);
            final why = 'language, ${phone.name}, text x$scale';
            final row = find.byKey(const ValueKey('language-tile'));
            await tester.ensureVisible(row);
            await TestApp.settle(tester, 4);
            await tester.tap(row);
            await TestApp.settle(tester, 12);
            final last = find.text('Türkçe').last;
            await _revealInSheet(tester, last);
            _expectInReach(tester, last, why);
            await tester.tapAt(const Offset(10, 60));
            await TestApp.settle(tester, 12);
          }
        }
        await _close(tester, app);
      });
    });
  });

  group('158 the shop\'s filters stay in sight', () {
    for (final language in ['en', 'ar']) {
      testWidgets(
        'On sale and a category stay first, Clear filters ($language)',
        (tester) async {
          await _usePhone(tester, phones[1], 1);
          final api = _FilterShopApi();
          final app = TestApp(
            api: api,
            appType: AppType.store,
            signedIn: true,
            preferences: {'settings.language': language},
          );
          await app.pump(tester);
          app.container.read(appRouterProvider).go(Paths.shop);
          await TestApp.settle(tester, 20);
          final sale = find.byKey(const ValueKey('shop-filter-sale'));
          final eid = find.byKey(const ValueKey('shop-filter-category-50'));
          final row = find.byKey(const ValueKey('shop-filters'));
          await tester.tap(sale);
          await TestApp.settle(tester, 12);
          // The last category is at the far end of the row.
          await tester.dragUntilVisible(
            eid,
            row,
            Offset(language == 'ar' ? 200 : -200, 0),
          );
          await TestApp.settle(tester, 6);
          await tester.tap(eid);
          await TestApp.settle(tester, 20);
          expect(api.lastProductQuery!.onSale, isTrue);
          expect(api.lastProductQuery!.category, 50);
          // Both on, both in sight, first after All.
          final width = phones[1].size.width;
          for (final chip in [sale, eid]) {
            final rect = tester.getRect(chip);
            expect(rect.left, greaterThanOrEqualTo(0), reason: '$chip');
            expect(rect.right, lessThanOrEqualTo(width), reason: '$chip');
            expect(tester.widget<PillChip>(chip).selected, isTrue);
          }
          final all = tester.getRect(
            find.byKey(const ValueKey('shop-filter-all')),
          );
          final first = tester.getRect(
            find.byKey(const ValueKey('shop-filter-category-30')),
          );
          bool before(Rect a, Rect b) =>
              language == 'ar' ? a.left > b.left : a.left < b.left;
          expect(before(all, tester.getRect(sale)), isTrue);
          expect(before(tester.getRect(eid), first), isTrue);
          // Nothing on sale there: one tap takes the filters off.
          final clear = find.descendant(
            of: find.byType(MessageView),
            matching: find.byType(PrimaryButton),
          );
          expect(clear, findsOneWidget);
          await tester.tap(clear);
          await TestApp.settle(tester, 20);
          expect(api.lastProductQuery!.onSale, isFalse);
          expect(api.lastProductQuery!.category, isNull);
          expect(find.text('Bouquet 1'), findsOneWidget);
          expect(
            tester
                .widget<PillChip>(find.byKey(const ValueKey('shop-filter-all')))
                .selected,
            isTrue,
          );
          await _close(tester, app);
        },
      );
    }
  });

  group('158 the next page\'s spinner lies across the grid', () {
    for (final language in ['en', 'ar']) {
      testWidgets('the shop\'s grid ($language)', (tester) async {
        await _withoutOverflowErrors(() async {
          await _usePhone(tester, phones[1], 1);
          final api = _PagedShopApi();
          final app = TestApp(
            api: api,
            appType: AppType.store,
            signedIn: true,
            preferences: {'settings.language': language},
          );
          await app.pump(tester);
          app.container.read(appRouterProvider).go(Paths.shop);
          await TestApp.settle(tester, 20);
          for (final phone in phones) {
            await _usePhone(tester, phone, 1);
            await _toTop(tester);
            await _toEnd(tester);
            final why = '${phone.name}, $language';
            final spinner = find.byType(CircularProgressIndicator);
            expect(spinner, findsOneWidget, reason: why);
            final width = phone.size.width;
            expect(
              tester.getCenter(spinner).dx,
              moreOrLessEquals(width / 2, epsilon: 0.5),
              reason: '$why: in the middle of the screen',
            );
            final row = tester.getRect(
              find.byKey(const ValueKey('loading-more')),
            );
            expect(row.left, moreOrLessEquals(20, epsilon: 0.5), reason: why);
            expect(
              row.right,
              moreOrLessEquals(width - 20, epsilon: 0.5),
              reason: why,
            );
            // Under the grid's last row, and above the tabs.
            final card = find.byType(ProductCard).last;
            expect(
              row.top,
              greaterThanOrEqualTo(tester.getRect(card).bottom - 0.01),
              reason: why,
            );
            _expectInReach(tester, spinner, why);
          }
          expect(api.asked, contains(2));
          await _close(tester, app);
        });
      });
    }
  });
}

typedef Phone = ({String name, Size size, double top, double bottom});

Finder _squareButton(IconData icon) => find
    .byWidgetPredicate((w) => w is SquareIconButton && w.icon == icon)
    .first;

/// The test's view as [phone], with the phone's font at [scale] and a
/// keyboard [keyboard] points tall.
Future<void> _usePhone(
  WidgetTester tester,
  Phone phone,
  double scale, {
  double keyboard = 0,
}) async {
  const ratio = 3.0;
  tester.view
    ..devicePixelRatio = ratio
    ..physicalSize = phone.size * ratio
    ..viewPadding = FakeViewPadding(
      top: phone.top * ratio,
      bottom: phone.bottom * ratio,
    )
    // The keyboard covers the phone's own bar.
    ..padding = FakeViewPadding(
      top: phone.top * ratio,
      bottom: keyboard > 0 ? 0 : phone.bottom * ratio,
    )
    ..viewInsets = FakeViewPadding(bottom: keyboard * ratio);
  tester.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

/// Large fonts make some elements of a set height overflow (their words
/// clipped): not what these tests look at.
Future<void> _withoutOverflowErrors(Future<void> Function() body) async {
  final previous = FlutterError.onError;
  FlutterError.onError = (details) {
    if (details.exceptionAsString().contains('A RenderFlex overflowed')) {
      return;
    }
    previous?.call(details);
  };
  try {
    await body();
  } finally {
    FlutterError.onError = previous;
  }
}

/// Leqaa's app on its Signature look [look], signed in with a cart; with
/// [sendBar], its "Send flowers" pinned at the foot of the page [on] (the
/// library's `lq_send_bar`, in that style).
Future<TestApp> _leqaa(
  WidgetTester tester, {
  required String look,
  String language = 'en',
  String? sendBar,
  String on = 'home',
}) async {
  StudioDemo.language = language;
  addTearDown(() => StudioDemo.language = 'en');
  final demo = StudioDemo.signature('flowers', look);
  final api = leqaaStudioApi(
    look: demo,
    lang: language,
    primaryColor: look == 'a' ? '#8E2445' : '#2F5D50',
  );
  if (sendBar != null) {
    final studio = api.pages[on]!['studio'] as Map<String, dynamic>;
    final body = studio['body'] as Map<String, dynamic>;
    body['children'] = [
      ...body['children'] as List,
      {
        'id': 'send-bar',
        'type': 'cta_bar',
        'title': 'Leqaa\nFlowers with a card in your words',
        'text': 'Send flowers',
        'cta': {'style': sendBar, 'lead': 'local_florist'},
        'pin': 'bottom',
        'icon': 'local_florist',
        'background': '#8E2445',
        'color': '#2A121C',
        'action': {'type': 'screen', 'screen': 'cart'},
      },
    ];
  }
  final app = TestApp(
    api: api,
    appType: AppType.store,
    signedIn: true,
    preferences: {
      'settings.theme_mode': 'light',
      'settings.language': language,
      ...leqaaCartPreferences(demo, lang: language),
    },
  );
  await app.pump(tester);
  await TestApp.settle(tester, 20);
  expect(find.byType(AppNavBar), findsOneWidget);
  return app;
}

Future<void> _tab(WidgetTester tester, int index) async {
  await tester.tap(
    find
        .descendant(of: find.byType(AppNavBar), matching: find.byType(InkWell))
        .at(index),
  );
  await TestApp.settle(tester, 30);
}

Future<void> _push(WidgetTester tester, TestApp app, String location) async {
  unawaited(app.container.read(appRouterProvider).push(location));
  await TestApp.settle(tester, 30);
}

Future<void> _close(WidgetTester tester, TestApp app) async {
  await tester.pumpWidget(const SizedBox());
  app.container.dispose();
  await TestApp.settle(tester, 2);
}

final _vertical = find.byWidgetPredicate(
  (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
);

List<ScrollPosition> _positions(WidgetTester tester) => [
  for (final e in _vertical.evaluate())
    ((e as StatefulElement).state as ScrollableState).position,
];

Size _screen(WidgetTester tester) =>
    tester.view.physicalSize / tester.view.devicePixelRatio;

Future<void> _toTop(WidgetTester tester) async {
  for (final p in _positions(tester).reversed) {
    if (p.hasPixels && p.pixels != 0) p.jumpTo(0);
  }
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 300));
}

/// Drags the page up, as a finger does, until it goes no further; then
/// nudges it, slowly, as a person does at the end of a page.
Future<void> _toEnd(WidgetTester tester) async {
  final size = _screen(tester);
  final from = Offset(size.width / 2, size.height * 0.5);
  List<double> now() => [for (final p in _positions(tester)) p.pixels];
  for (var i = 0; i < 60; i++) {
    final before = now();
    await tester.dragFrom(from, Offset(0, -size.height * 0.35));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    if (listEquals(before, now())) break;
  }
  for (var i = 0; i < 6; i++) {
    final before = now();
    final finger = await tester.startGesture(from);
    for (var k = 0; k < 8; k++) {
      await finger.moveBy(const Offset(0, -10));
      await tester.pump(const Duration(milliseconds: 16));
    }
    await finger.up();
    await tester.pump(const Duration(milliseconds: 500));
    if (listEquals(before, now())) break;
  }
}

/// Where the foot of the screen is covered from: the tab bar over the
/// page, what is pinned at its foot, a screen's bottom bar, the phone's
/// own bar (or the keyboard).
double _clearAbove(WidgetTester tester, {double keyboard = 0}) {
  final view = tester.view;
  final size = _screen(tester);
  var clear =
      size.height -
      (keyboard > 0
          ? keyboard
          : view.viewPadding.bottom / view.devicePixelRatio);
  for (final finder in [
    find.byType(AppNavBar),
    find.byType(BottomActionBar),
    find.byWidgetPredicate((w) {
      final key = w.key;
      return key is ValueKey<String> &&
          (key.value.startsWith('premium-cta-') ||
              key.value.startsWith('premium-fab-')) &&
          !key.value.startsWith('premium-cta-lead');
    }),
  ]) {
    for (final e in finder.evaluate()) {
      final top = tester.getRect(find.byElementPredicate((x) => x == e)).top;
      if (top < clear) clear = top;
    }
  }
  return clear;
}

/// The page's end is reached and lies above whatever covers the screen's
/// foot: its lists went as far as they go, and the lowest words and
/// pictures they show are above that line.
void _expectEndInReach(WidgetTester tester, String why) {
  final size = _screen(tester);
  for (final p in _positions(tester)) {
    if (p.viewportDimension < size.height * 0.4) continue;
    expect(
      p.pixels,
      greaterThanOrEqualTo(p.maxScrollExtent - 1),
      reason: '$why: the page scrolled to its end',
    );
  }
  var lowest = 0.0;
  var what = '';
  for (final e
      in find
          .descendant(
            of: _vertical,
            matching: find.byWidgetPredicate(
              (w) => w is RichText || w is RawImage,
            ),
          )
          .evaluate()) {
    // A screen's own bottom bar (the cart's) is what covers its foot.
    if (e.findAncestorWidgetOfExactType<BottomActionBar>() != null) continue;
    final box = e.renderObject as RenderBox?;
    if (box == null || !box.attached || !box.hasSize) continue;
    final bottom = box.localToGlobal(Offset(0, box.size.height)).dy;
    if (bottom > lowest) {
      lowest = bottom;
      what = e.widget is RichText
          ? (e.widget as RichText).text.toPlainText()
          : 'a picture';
    }
  }
  expect(lowest, greaterThan(0), reason: '$why: the page shows something');
  final clear = _clearAbove(tester);
  expect(
    lowest,
    lessThanOrEqualTo(clear + 0.5),
    reason:
        '$why: the page\'s last words ("$what", down to $lowest) lie above '
        'what covers the foot of the screen (from $clear)',
  );
}

/// [target] scrolled into sight in the sheet it is in.
Future<void> _revealInSheet(WidgetTester tester, Finder target) async {
  expect(target, findsWidgets);
  final element = target.evaluate().last;
  final scrollable = Scrollable.maybeOf(element);
  if (scrollable != null) {
    await Scrollable.ensureVisible(element);
    await TestApp.settle(tester, 6);
  }
}

/// [target] is whole on the screen, above the phone's bar (or the
/// keyboard), and a tap at its middle reaches it.
void _expectInReach(
  WidgetTester tester,
  Finder target,
  String why, {
  double keyboard = 0,
}) {
  final rect = tester.getRect(target.last);
  final size = _screen(tester);
  final view = tester.view;
  final bottom =
      size.height -
      (keyboard > 0
          ? keyboard
          : view.viewPadding.bottom / view.devicePixelRatio);
  expect(rect.top, greaterThanOrEqualTo(0), reason: why);
  expect(
    rect.bottom,
    lessThanOrEqualTo(bottom + 0.5),
    reason: '$why: whole above the foot of the screen (down to $bottom)',
  );
  // Nothing over it: a tap at its middle hits it.
  final hit = tester.hitTestOnBinding(rect.center);
  final box = target.last.evaluate().first.renderObject!;
  expect(
    hit.path.any(
      (entry) =>
          entry.target is RenderObject &&
          _isAncestor(box, entry.target as RenderObject),
    ),
    isTrue,
    reason: '$why: a tap there reaches it',
  );
}

/// Whether [ancestor] is [of] or holds it.
bool _isAncestor(RenderObject ancestor, RenderObject of) {
  RenderObject? node = of;
  while (node != null) {
    if (node == ancestor) return true;
    node = node.parent;
  }
  return false;
}

/// A shop with more products than its first page holds: the next page is
/// asked for and stays loading.
class _PagedShopApi extends FakeApi {
  _PagedShopApi()
    : super(
        config: {
          ...configJson(lms: null, languages: languagesJson()),
          'store': storeConfigJson(),
        },
      );

  final asked = <int>[];

  @override
  Future<Paged<ProductSummary>> listProducts(ProductQuery query) {
    asked.add(query.page);
    if (query.page > 1) return Completer<Paged<ProductSummary>>().future;
    return Future.value(
      Paged.fromJson({
        ...pageJson([
          for (var id = 21; id <= 30; id++)
            productSummaryJson(id: id, name: 'Bouquet $id'),
        ]),
        'total': 40,
        'total_pages': 2,
      }, ProductSummary.fromJson),
    );
  }
}

/// A shop with many categories, the last "Eid & Ramadan", where nothing is
/// on sale.
class _FilterShopApi extends FakeApi {
  _FilterShopApi()
    : super(
        config: {
          ...configJson(lms: null, languages: languagesJson()),
          'store': storeConfigJson(),
        },
      );

  @override
  Future<List<ProductCategory>> listProductCategories() async => [
    for (final (i, name) in [
      'Signature bouquets',
      'Roses',
      'In season',
      'Plants',
      'Gift sets',
      'Birthdays',
      'Weddings',
      'Eid & Ramadan',
    ].indexed)
      ProductCategory.fromJson(
        productCategoryJson(id: i == 7 ? 50 : 30 + i, name: name),
      ),
  ];

  @override
  Future<Paged<ProductSummary>> listProducts(ProductQuery query) async {
    lastProductQuery = query;
    final none = query.onSale && query.category == 50;
    return Paged.fromJson(
      pageJson([
        if (!none) ...[
          productSummaryJson(id: 1, name: 'Bouquet 1'),
          productSummaryJson(id: 2, name: 'Bouquet 2'),
        ],
      ]),
      ProductSummary.fromJson,
    );
  }
}
