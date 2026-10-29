import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';

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
}
