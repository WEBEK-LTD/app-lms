import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/modules/shared/account/notifications_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 103 A page designed in Yallapp Studio, drawn natively from its canvas.
void main() {
  Map<String, dynamic> canvasJson() => {
    'width': 390,
    'height': 900,
    'background': '#FFFFFF',
    'layers': [
      {
        'id': 'hero',
        'type': 'box',
        'x': 0,
        'y': 0,
        'w': 390,
        'h': 300,
        'fill': '#1F4E5F',
        'radius': 0,
      },
      {
        'id': 'title',
        'type': 'text',
        'x': 20,
        'y': 40,
        'w': 350,
        'h': 80,
        'text': 'Learn faster',
        'font_size': 32,
        'font_weight': 800,
        'color': '#FFFFFF',
      },
      {
        'id': 'go',
        'type': 'button',
        'x': 20,
        'y': 220,
        'w': 200,
        'h': 48,
        'text': 'My notifications',
        'fill': '#E8B04B',
        'radius': 24,
        'action': {'type': 'screen', 'screen': 'notifications'},
      },
      {
        'id': 'star',
        'type': 'icon',
        'x': 330,
        'y': 230,
        'w': 32,
        'h': 32,
        'icon': 'star',
      },
      {
        'id': 'list',
        'type': 'items',
        'x': 0,
        'y': 320,
        'w': 390,
        'h': 300,
        'source': 'courses',
        'layout': 'list',
        'items': [itemJson(), itemJson(id: '2', title: 'Python')],
      },
      // Layers this app doesn't know, or can't draw, are left out.
      {'id': 'clip', 'type': 'video', 'x': 0, 'y': 0, 'w': 10, 'h': 10},
      {
        'id': 'bad',
        'type': 'image',
        'x': 0,
        'y': 0,
        'w': 10,
        'h': 10,
        'image_url': 'javascript:x',
      },
    ],
  };

  test('reads the canvas and the layers it can draw', () {
    final page = AppPage.fromJson({
      ...appPageJson(blocks: []),
      'canvas': canvasJson(),
    });
    final canvas = page.canvas!;
    expect(canvas.width, 390);
    expect(canvas.layers.map((l) => l.id), [
      'hero',
      'title',
      'go',
      'star',
      'list',
    ]);
    expect(canvas.layers[1].fontWeight, 800);
    expect(canvas.layers[2].action?.screen, BuiltInScreen.notifications);
    expect(canvas.layers[4].items?.items, hasLength(2));
    expect(AppPage.fromJson(appPageJson(blocks: [])).canvas, isNull);
  });

  testWidgets('draws the layers where they were placed, scaled, and follows '
      'their taps', (tester) async {
    final app = TestApp(
      api: FakeApi()
        ..navigation = navigationJson()
        ..pages = {
          'home': {...appPageJson(blocks: []), 'canvas': canvasJson()},
        },
      signedIn: true,
    );
    await app.pump(tester);
    expect(find.byKey(const ValueKey('studio-home')), findsOneWidget);
    expect(find.text('Learn faster'), findsOneWidget);
    expect(find.text('Python'), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-layer-clip')), findsNothing);
    // Scaled to the screen's width: the hero fills it.
    final screen = tester.getSize(find.byKey(const ValueKey('studio-home')));
    final hero = tester.getSize(
      find.byKey(const ValueKey('studio-layer-hero')),
    );
    expect(hero.width, closeTo(screen.width, 0.5));
    expect(hero.height, closeTo(300 * screen.width / 390, 0.5));
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('My notifications'));
    await TestApp.settle(tester, 10);
    expect(find.byType(NotificationsScreen), findsOneWidget);
  });
}
