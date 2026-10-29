import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart'
    show pageClockProvider;

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 107.2 More style in Studio's pages: each corner on its own, turning, a
/// colour over a picture, capitals and struck-through text, a row that
/// scrolls sideways, and elements hidden in the app.
void main() {
  Map<String, dynamic> studioJson() => {
    'body': {
      'id': 'root',
      'type': 'column',
      'gap': 8,
      'children': [
        {
          'id': 'banner',
          'type': 'column',
          'height': 160,
          'image_background_url': 'https://example.com/banner.jpg',
          'overlay': {'color': '#0E0D24', 'opacity': 0.4},
          'corners': {'top_start': 24, 'bottom_end': 24},
          'rotation': -3,
          'font': {'uppercase': true},
          'children': [
            {
              'id': 'title',
              'type': 'text',
              'text': 'Summer sale',
              'color': '#FFFFFF',
            },
          ],
        },
        {
          'id': 'old',
          'type': 'text',
          'text': 'EGP 300',
          'font': {'strike': true, 'underline': true},
        },
        {
          'id': 'chips',
          'type': 'row',
          'scroll': true,
          'gap': 8,
          'children': [
            for (var i = 1; i <= 8; i++)
              {
                'id': 'chip$i',
                'type': 'button',
                'width': 'fill',
                'text': 'Category number $i',
                'background': '#E8B04B',
              },
          ],
        },
        {'id': 'draft', 'type': 'text', 'text': 'Coming soon', 'hidden': true},
      ],
    },
  };

  test('reads the new style', () {
    final page = AppPage.fromJson({
      ...appPageJson(blocks: []),
      'studio': studioJson(),
    });
    final body = page.studio!.body;
    final banner = body.children[0];
    expect(banner.corners?.topStart, 24);
    expect(banner.corners?.topEnd, 0);
    expect(banner.rotation, -3);
    expect(banner.overlay?.opacity, 0.4);
    expect(banner.font?.uppercase, isTrue);
    expect(body.children[1].font?.strike, isTrue);
    expect(body.children[2].scroll, isTrue);
    expect(body.children[3].hidden, isTrue);
    // Out of range, held in range.
    final turned = StudioNode.tryParse({
      'id': 'x',
      'type': 'text',
      'rotation': 900,
      'corners': {'top_start': 9000},
    })!;
    expect(turned.rotation, 180);
    expect(turned.corners?.topStart, 500);
  });

  testWidgets('draws them as the editor shows them', (tester) async {
    final app = TestApp(
      api: FakeApi()
        ..navigation = navigationJson()
        ..pages = {
          'home': {...appPageJson(blocks: []), 'studio': studioJson()},
        },
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);

    // In capitals, as the banner holding it asks.
    expect(find.text('SUMMER SALE'), findsOneWidget);
    expect(find.text('Summer sale'), findsNothing);
    // The colour over the picture.
    final overlay = tester.widget<ColoredBox>(
      find.byKey(const ValueKey('studio-overlay-banner')),
    );
    expect(overlay.color.a, closeTo(0.4, 0.01));
    // Turned.
    final turned = tester.widget<Transform>(
      find.byKey(const ValueKey('studio-turned-banner')),
    );
    expect(
      math.atan2(turned.transform.entry(1, 0), turned.transform.entry(0, 0)),
      closeTo(-3 * math.pi / 180, 0.001),
    );
    // Each corner on its own.
    final box = tester.widget<DecoratedBox>(
      find
          .descendant(
            of: find.byKey(const ValueKey('studio-node-banner')),
            matching: find.byType(DecoratedBox),
          )
          .first,
    );
    final radius = (box.decoration as BoxDecoration).borderRadius!.resolve(
      TextDirection.ltr,
    );
    expect(radius.topLeft, const Radius.circular(24));
    expect(radius.topRight, Radius.zero);
    expect(radius.bottomRight, const Radius.circular(24));
    // Struck through and underlined.
    final old = tester.widget<DefaultTextStyle>(
      find
          .ancestor(
            of: find.text('EGP 300'),
            matching: find.byType(DefaultTextStyle),
          )
          .first,
    );
    expect(
      old.style.decoration,
      TextDecoration.combine([
        TextDecoration.underline,
        TextDecoration.lineThrough,
      ]),
    );
    // The row scrolls sideways: wider than the screen, nothing overflows.
    final strip = find.byKey(const ValueKey('studio-scroll-chips'));
    expect(strip, findsOneWidget);
    final screen = tester.getSize(find.byKey(const ValueKey('studio-home')));
    final before = tester
        .getRect(find.byKey(const ValueKey('studio-node-chip8')))
        .right;
    expect(before, greaterThan(screen.width));
    await tester.drag(strip, const Offset(-600, 0));
    await TestApp.settle(tester, 5);
    final after = tester
        .getRect(find.byKey(const ValueKey('studio-node-chip8')))
        .right;
    expect(after, lessThan(before - 300));
    // Hidden in the app.
    expect(find.text('Coming soon'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  group('107.3 new elements', () {
    final now = DateTime.utc(2026, 11, 1, 10);
    Map<String, dynamic> page({required String endsAt, String ended = ''}) => {
      'body': {
        'id': 'root',
        'type': 'column',
        'gap': 8,
        'children': [
          {
            'id': 'faq',
            'type': 'accordion',
            'children': [
              {
                'id': 'q1',
                'type': 'column',
                'title': 'How long does delivery take?',
                'children': [
                  {'id': 'a1', 'type': 'text', 'text': 'Two to three days.'},
                ],
              },
              {
                'id': 'q2',
                'type': 'column',
                'title': 'Can I pay on delivery?',
                'children': [
                  {'id': 'a2', 'type': 'text', 'text': 'Yes, cash or card.'},
                ],
              },
            ],
          },
          {
            'id': 'tabs',
            'type': 'tabs',
            'children': [
              {
                'id': 'men',
                'type': 'column',
                'title': 'Men',
                'children': [
                  {'id': 'm', 'type': 'text', 'text': 'Shirts for men'},
                ],
              },
              {
                'id': 'women',
                'type': 'column',
                'title': 'Women',
                'children': [
                  {'id': 'w', 'type': 'text', 'text': 'Dresses for women'},
                ],
              },
            ],
          },
          {'id': 'sale', 'type': 'countdown', 'ends_at': endsAt, 'text': ended},
          {
            'id': 'perks',
            'type': 'bullets',
            'text': 'Free delivery\nPay on delivery\n\nReturns in 14 days',
          },
        ],
      },
    };

    TestApp appWith(Map<String, dynamic> studio) => TestApp(
      api: FakeApi()
        ..navigation = navigationJson()
        ..pages = {
          'home': {...appPageJson(blocks: []), 'studio': studio},
        },
      signedIn: true,
      overrides: [pageClockProvider.overrideWithValue(() => now)],
    );

    test('reads them', () {
      final body = AppPage.fromJson({
        ...appPageJson(blocks: []),
        'studio': page(endsAt: '2026-11-03T12:30:15Z'),
      }).studio!.body;
      expect(body.children.map((n) => n.type), [
        StudioNodeType.accordion,
        StudioNodeType.tabs,
        StudioNodeType.countdown,
        StudioNodeType.bullets,
      ]);
      expect(body.children[0].holdsChildren, isTrue);
      expect(
        body.children[0].children.first.title,
        'How long does delivery take?',
      );
      expect(body.children[2].endsAt, DateTime.utc(2026, 11, 3, 12, 30, 15));
    });

    testWidgets('questions open one at a time, tabs switch, the countdown '
        'counts and each line has its icon', (tester) async {
      await appWith(page(endsAt: '2026-11-03T12:30:15Z')).pump(tester);
      await TestApp.settle(tester, 10);

      // Closed until tapped; one open at a time.
      expect(find.text('Two to three days.'), findsNothing);
      await tester.tap(find.text('How long does delivery take?'));
      await TestApp.settle(tester, 5);
      expect(find.text('Two to three days.'), findsOneWidget);
      await tester.tap(find.text('Can I pay on delivery?'));
      await TestApp.settle(tester, 5);
      expect(find.text('Yes, cash or card.'), findsOneWidget);
      expect(find.text('Two to three days.'), findsNothing);

      // The first tab, then the second.
      expect(find.text('Shirts for men'), findsOneWidget);
      expect(find.text('Dresses for women'), findsNothing);
      await tester.tap(find.byKey(const ValueKey('studio-tab-women')));
      await TestApp.settle(tester, 5);
      expect(find.text('Dresses for women'), findsOneWidget);
      expect(find.text('Shirts for men'), findsNothing);

      // 2 days, 2 hours, 30 minutes and 15 seconds left.
      final clock = find.byKey(const ValueKey('studio-countdown-sale'));
      expect(clock, findsOneWidget);
      for (final digits in ['02', '30', '15']) {
        expect(
          find.descendant(of: clock, matching: find.text(digits)),
          findsWidgets,
        );
      }

      // Each line with its icon; the empty line left out.
      expect(find.text('Free delivery'), findsOneWidget);
      expect(find.text('Returns in 14 days'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('studio-node-perks')),
          matching: find.byType(Row),
        ),
        findsNWidgets(3),
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('once the time is up, the owner\'s text, or nothing', (
      tester,
    ) async {
      await appWith(
        page(endsAt: '2026-10-30T00:00:00Z', ended: 'The offer ended.'),
      ).pump(tester);
      await TestApp.settle(tester, 10);
      expect(find.byKey(const ValueKey('studio-countdown-sale')), findsNothing);
      expect(find.text('The offer ended.'), findsOneWidget);
    });

    testWidgets('a past countdown without a text disappears', (tester) async {
      await appWith(page(endsAt: '2026-10-30T00:00:00Z')).pump(tester);
      await TestApp.settle(tester, 10);
      expect(find.byKey(const ValueKey('studio-countdown-sale')), findsNothing);
      expect(
        find.byKey(const ValueKey('studio-countdown-ended-sale')),
        findsNothing,
      );
      expect(tester.takeException(), isNull);
    });
  });
}
