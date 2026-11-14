import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart'
    show pageClockProvider;

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 130 The live cards' premium looks (`live_status` and `tracking` with a
/// `style` of hero, ring, pill or steps): the person's own order or
/// shipment, its state, what it is, its stages and a tap to open it; light,
/// dark and right to left; nothing signed out or with nothing on its way,
/// and the 128 card when the element has no look.
void main() {
  final evening = DateTime.utc(2026, 10, 28, 10, 15);

  FakeApi api(AppType type, Map<String, dynamic> element) =>
      FakeApi(config: configJson(languages: languagesJson()))
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
              'background': '#F6F0E6',
              'dark_background': '#110B08',
              'body': {
                'id': 'root',
                'type': 'column',
                'children': [element],
              },
            },
          },
        };

  Future<void> open(
    WidgetTester tester,
    AppType type,
    FakeApi fake, {
    bool dark = false,
    String language = 'en',
    bool signedIn = true,
  }) async {
    final app = TestApp(
      appType: type,
      api: fake,
      signedIn: signedIn,
      guest: !signedIn,
      overrides: [pageClockProvider.overrideWithValue(() => evening)],
      preferences: {
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
  }

  Map<String, dynamic> order(String style) => {
    'id': 'live',
    'type': 'live_status',
    'live_status': {
      'source': 'food_order',
      'style': style,
      'accent': '#B13F1A',
      'dark_accent': '#FF9A6B',
    },
    'icon': 'two_wheeler',
    'visibility': 'signed_in',
    'background': '#FFFBF5',
    'dark_background': '#241913',
    'color': '#1F140E',
    'dark_color': '#F6ECE2',
    'padding': {'top': 14, 'end': 14, 'bottom': 12, 'start': 16},
  };

  for (final (dark, language) in const [
    (false, 'en'),
    (true, 'en'),
    (false, 'ar'),
  ]) {
    testWidgets('an order on its way as a hero: its state, the dish and the '
        'place, its stages (${dark ? 'dark' : 'light'}, $language)', (
      tester,
    ) async {
      final fake = api(AppType.food, order('hero'))
        ..foodOrders = [foodOrderJson(status: 'accepted', withCourier: true)];
      await open(tester, AppType.food, fake, dark: dark, language: language);
      expect(tester.takeException(), isNull);
      expect(
        find.byKey(const ValueKey('studio-live-look-live')),
        findsOneWidget,
      );
      // The dish over the place it comes from, the state as the kicker.
      expect(find.text('Koshari'), findsOneWidget);
      expect(find.text('Abou Tarek'), findsOneWidget);
      // Being cooked, ready at 10:25: ten minutes from 10:15 (Cairo's 12:15).
      expect(
        find.text(language == 'ar' ? 'قيد التحضير' : 'BEING PREPARED'),
        findsOneWidget,
      );
      // The 128 card is not drawn.
      expect(find.byKey(const ValueKey('studio-live-live')), findsNothing);
      if (language == 'ar') {
        // Right to left: the dish on the right of the minutes.
        expect(
          tester.getCenter(find.text('Koshari')).dx,
          greaterThan(tester.getCenter(find.text('10')).dx),
        );
      }
    });
  }

  for (final style in ['ring', 'pill', 'steps']) {
    testWidgets('an order on its way as a $style', (tester) async {
      final fake = api(AppType.food, order(style))
        ..foodOrders = [foodOrderJson(status: 'on_the_way', withCourier: true)];
      await open(tester, AppType.food, fake);
      expect(tester.takeException(), isNull, reason: style);
      expect(
        find.byKey(const ValueKey('studio-live-look-live')),
        findsOneWidget,
        reason: style,
      );
      switch (style) {
        case 'ring':
          expect(find.text('Abou Tarek · step 3 of 4'), findsOneWidget);
          expect(find.byType(CircularProgressIndicator), findsOneWidget);
        case 'pill':
          expect(find.text('Abou Tarek is on the way'), findsOneWidget);
          expect(find.text('Karim Hassan · 2 items'), findsOneWidget);
          expect(find.text('Track'), findsOneWidget);
        case 'steps':
          for (final stage in [
            'Placed',
            'Cooking',
            'On its way',
            'Delivered',
          ]) {
            expect(find.text(stage), findsOneWidget, reason: stage);
          }
      }
    });
  }

  testWidgets('a shipment in the steps: its reference, the courier heading '
      'to the drop-off', (tester) async {
    final fake = api(AppType.delivery, {
      'id': 'live',
      'type': 'tracking',
      'tracking': {'kind': 'shipment', 'style': 'steps', 'accent': '#1F6FB2'},
      'visibility': 'signed_in',
    })..shipments = [shipmentJson(status: 'on_the_way')];
    await open(tester, AppType.delivery, fake);
    expect(tester.takeException(), isNull);
    expect(find.byKey(const ValueKey('studio-live-look-live')), findsOne);
    expect(find.text('S-1001'), findsOneWidget);
    expect(find.text('Karim is heading to 9 Road 233, Maadi'), findsOneWidget);
    expect(find.text('Picked up'), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-tracking-card')), findsNothing);
  });

  testWidgets('nothing signed out', (tester) async {
    final fake = api(AppType.food, order('hero'))
      ..foodOrders = [foodOrderJson(status: 'accepted')];
    await open(tester, AppType.food, fake, signedIn: false);
    expect(find.byKey(const ValueKey('studio-live-look-live')), findsNothing);
  });

  testWidgets('the 128 card without a look', (tester) async {
    final plain = {...order('hero')}
      ..['live_status'] = {'source': 'food_order'};
    await open(
      tester,
      AppType.food,
      api(AppType.food, plain)..foodOrders = [foodOrderJson()],
    );
    expect(find.byKey(const ValueKey('studio-live-look-live')), findsNothing);
    expect(find.byKey(const ValueKey('studio-live-live')), findsOneWidget);
  });
}
