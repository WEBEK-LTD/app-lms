import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart'
    show pageClockProvider;

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 128 The cover layouts and the live elements of a Studio page: a photo
/// hero with its words over it and a card hanging over its foot, a drawn
/// map with its markers and a sheet over it, the person's shipment and
/// ride on their way, and a greeting with their first name; nothing of the
/// person's signed out, or with nothing on its way.
void main() {
  final evening = DateTime(2026, 11, 13, 20, 15);

  Map<String, dynamic> text(String id, String value) => {
    'id': id,
    'type': 'text',
    'text': value,
  };

  Map<String, dynamic> page(List<Map<String, dynamic>> children) => {
    ...appPageJson(blocks: []),
    'studio': {
      'background': '#F3F6FA',
      'dark_background': '#0A121C',
      'body': {'id': 'root', 'type': 'column', 'children': children},
    },
  };

  Map<String, dynamic> hero() => {
    'id': 'hero',
    'type': 'photo_hero',
    'height': 300,
    'background': '#08182C',
    'scrim': {
      'color': '#08182C',
      'from': 0.5,
      'middle': 0.1,
      'at': 40,
      'to': 0.85,
    },
    'align': 'between',
    'padding': {'top': 22, 'end': 18, 'bottom': 74, 'start': 18},
    'overlap': 56,
    'children': [
      {'id': 'greet', 'type': 'greeting', 'color': '#FFFFFF'},
      text('headline', 'Anything, anywhere in the city. Today.'),
      {
        'id': 'card',
        'type': 'column',
        'background': '#FFFFFF',
        'radius': 24,
        'padding': {'top': 16, 'end': 16, 'bottom': 16, 'start': 16},
        'children': [text('where', 'Where to?')],
      },
    ],
  };

  FakeApi api(AppType type, List<Map<String, dynamic>> children) =>
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
        ..pages = {'home': page(children)};

  Future<TestApp> open(
    WidgetTester tester,
    AppType type,
    FakeApi api, {
    bool signedIn = true,
  }) async {
    final app = TestApp(
      appType: type,
      api: api,
      signedIn: signedIn,
      guest: !signedIn,
      overrides: [pageClockProvider.overrideWithValue(() => evening)],
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    return app;
  }

  testWidgets(
    'a photo hero holds its words over the photo, its card over its foot',
    (tester) async {
      final fake = api(AppType.delivery, [hero()])
        ..shipments = [shipmentJson(status: 'on_the_way')];
      await open(tester, AppType.delivery, fake);
      final cover = tester.getRect(
        find.byKey(const ValueKey('studio-cover-hero')),
      );
      // Under the status bar, the page's first element.
      expect(cover.top, 0);
      expect(find.byKey(const ValueKey('studio-scrim-hero')), findsOneWidget);
      expect(find.text('Anything, anywhere in the city. Today.'), findsOne);
      expect(find.text('Good evening, Sara'), findsOneWidget);
      // The card's top is 56 above the photo's foot.
      final card = tester.getRect(
        find.byKey(const ValueKey('studio-node-card')),
      );
      expect(card.top, closeTo(cover.bottom - 56, 0.5));
      expect(
        tester.getRect(find.text('Where to?')).top,
        greaterThan(cover.bottom - 56),
      );
    },
  );

  testWidgets(
    "the person's shipment on its way: its state, courier and stages",
    (tester) async {
      final fake = api(AppType.delivery, [
        {
          'id': 'live',
          'type': 'tracking',
          'tracking': {'kind': 'shipment'},
          'visibility': 'signed_in',
        },
      ])..shipments = [shipmentJson(status: 'on_the_way')];
      await open(tester, AppType.delivery, fake);
      expect(
        find.byKey(const ValueKey('studio-tracking-card')),
        findsOneWidget,
      );
      expect(find.text('S-1001 is on the way'), findsOneWidget);
      expect(
        find.text('Karim is bringing it to 9 Road 233, Maadi'),
        findsOneWidget,
      );
      expect(find.text('Track'), findsOneWidget);
    },
  );

  testWidgets('nothing on its way: no live card, and no greeting name', (
    tester,
  ) async {
    final fake = api(AppType.delivery, [
      {
        'id': 'live',
        'type': 'tracking',
        'tracking': {'kind': 'shipment'},
      },
      {'id': 'greet', 'type': 'greeting'},
    ])..shipments = [shipmentJson(status: 'delivered')];
    await open(tester, AppType.delivery, fake, signedIn: false);
    expect(find.byKey(const ValueKey('studio-tracking-card')), findsNothing);
    expect(find.byKey(const ValueKey('studio-node-live')), findsNothing);
    expect(find.text('Good evening'), findsOneWidget);
  });

  testWidgets("the person's ride: the driver coming, their car and a call", (
    tester,
  ) async {
    final fake = api(AppType.rides, [
      {
        'id': 'live',
        'type': 'tracking',
        'tracking': {'kind': 'ride', 'style': 'driver'},
        'background': '#0E4A44',
        'color': '#FFFFFF',
      },
    ])..rides = [rideJson(status: 'accepted')];
    await open(tester, AppType.rides, fake);
    expect(
      find.byKey(const ValueKey('studio-tracking-driver')),
      findsOneWidget,
    );
    expect(find.text('ARRIVING IN 4 MIN'), findsOneWidget);
    expect(find.textContaining('Mahmoud'), findsOneWidget);
    expect(find.textContaining('4.8', findRichText: true), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-tracking-call')), findsOneWidget);
  });

  testWidgets('a map header draws its markers and the sheet over its foot', (
    tester,
  ) async {
    final fake = api(AppType.rides, [
      {
        'id': 'map',
        'type': 'map_header',
        'height': 470,
        'overlap': 38,
        'map_drawing': {
          'markers': [
            {'x': 15, 'y': 23},
            {'x': 85, 'y': 36},
          ],
          'me': true,
        },
        'children': [
          {
            'id': 'sheet',
            'type': 'column',
            'background': '#FFFFFF',
            'corners': {'top_start': 30, 'top_end': 30},
            'children': [text('title', 'A taxi in a glance.')],
          },
        ],
      },
    ]);
    await open(tester, AppType.rides, fake);
    expect(find.byKey(const ValueKey('studio-map-map')), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-map-marker-0')), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-map-marker-1')), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-map-me')), findsOneWidget);
    final cover = tester.getRect(
      find.byKey(const ValueKey('studio-cover-map')),
    );
    final sheet = tester.getRect(
      find.byKey(const ValueKey('studio-node-sheet')),
    );
    expect(sheet.top, closeTo(cover.bottom - 38, 0.5));
    expect(find.text('A taxi in a glance.'), findsOneWidget);
  });
}
