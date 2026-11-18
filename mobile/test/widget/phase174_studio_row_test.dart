import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart'
    show pageClockProvider;

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 174.3 A column left on Auto (or Hug) inside a row: Studio's canvas draws
/// it as wide as what it holds, and so does the app. A double-clicked
/// corner puts a column back on Auto; in Leqaa's "Collections" row (the
/// kicker and the heading at a fixed width, then "Shop all") the app drew
/// nothing of the row at all, while the canvas still showed it.
void main() {
  Map<String, dynamic> text(
    String id,
    String value, [
    Map<String, dynamic> extra = const {},
  ]) => {'id': id, 'type': 'text', 'text': value, ...extra};

  FakeApi api(List<Map<String, dynamic>> children) =>
      FakeApi(config: configJson())
        ..navigation = navigationJson(
          tabs: [
            navTabJson('home', 'Home', 'home', {
              'type': 'page',
              'page_slug': 'home',
            }),
            navTabJson('account', 'Account', 'person', {
              'type': 'screen',
              'screen': 'account',
            }),
          ],
        )
        ..pages = {
          'home': {
            ...appPageJson(blocks: []),
            'studio': {
              'body': {'id': 'root', 'type': 'column', 'children': children},
            },
          },
        };

  Future<void> open(WidgetTester tester, FakeApi fake) async {
    await TestApp(
      appType: AppType.store,
      api: fake,
      signedIn: true,
      overrides: [
        pageClockProvider.overrideWithValue(() => DateTime(2026, 11, 18, 10)),
      ],
    ).pump(tester);
    await TestApp.settle(tester, 20);
  }

  /// Leqaa's "Collections" heading row (`headOf` in the template), its
  /// column given `width` (null: Auto).
  Map<String, dynamic> collections(Object? width) => {
    'id': 'row',
    'type': 'row',
    'cross': 'end',
    'gap': 12,
    'padding': {'top': 28, 'end': 18, 'bottom': 12, 'start': 18},
    'children': [
      {
        'id': 'heading',
        'type': 'column',
        'width': ?width,
        'gap': 4,
        'children': [
          text('kicker', 'EVERY OCCASION', {
            'font': {'size': 11, 'weight': 700},
          }),
          text('title', 'Collections', {
            'width': 150,
            'max_lines': 2,
            'font': {'size': 27},
          }),
        ],
      },
      text('more', 'Shop all', {
        'font': {'size': 13, 'weight': 700},
      }),
    ],
  };

  for (final width in <Object?>[null, 'hug']) {
    testWidgets('the column on ${width ?? 'Auto'}: the whole row is drawn, '
        'the column as wide as what it holds', (tester) async {
      await open(tester, api([collections(width), text('after', 'Below')]));
      expect(tester.takeException(), isNull);
      for (final words in ['EVERY OCCASION', 'Collections', 'Shop all']) {
        expect(find.text(words), findsOneWidget, reason: words);
        expect(tester.getSize(find.text(words)).width, greaterThan(0));
      }
      final heading = tester.getRect(
        find.byKey(const ValueKey('studio-node-heading')),
      );
      final title = tester.getRect(
        find.byKey(const ValueKey('studio-node-title')),
      );
      final kicker = tester.getRect(find.text('EVERY OCCASION'));
      // As wide as its widest element (the heading's 150, or the kicker).
      expect(title.width, 150);
      expect(
        heading.width,
        closeTo(kicker.width > 150 ? kicker.width : 150, 0.5),
      );
      // "Shop all" after it, inside the row.
      final row = tester.getRect(find.byKey(const ValueKey('studio-node-row')));
      final more = tester.getRect(find.text('Shop all'));
      expect(more.left, greaterThanOrEqualTo(heading.right));
      expect(more.right, lessThanOrEqualTo(row.right));
      // What follows the row is still below it.
      expect(
        tester.getRect(find.text('Below')).top,
        greaterThanOrEqualTo(row.bottom),
      );
    });
  }

  testWidgets('the template\'s own column (Fill) is as before', (tester) async {
    await open(tester, api([collections('fill')]));
    expect(tester.takeException(), isNull);
    final row = tester.getRect(find.byKey(const ValueKey('studio-node-row')));
    final more = tester.getRect(find.text('Shop all'));
    // The heading fills the row; "Shop all" at its end.
    expect(more.right, closeTo(row.right - 18, 0.5));
  });
}
