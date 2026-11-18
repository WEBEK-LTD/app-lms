import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/rendering.dart';
import 'package:yallapp/core/config/build_config.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import '../support/travel_fixtures.dart';

/// 180.18 Safra's cover: the question for a new customer, the next trip's
/// ticket for a signed-in one; signed in without a trip, the question (the
/// cover was empty).
void main() {
  FakeApi safra({required bool trip}) {
    final api = travelFake()
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
            'body': {
              'id': 'root',
              'type': 'column',
              'children': [
                {
                  'id': 'cover',
                  'type': 'photo_hero',
                  'height': 420,
                  'children': [
                    {'id': 'brand', 'type': 'text', 'text': 'SAFRA'},
                    {
                      'id': 'question',
                      'type': 'text',
                      'text': 'Where does the next story begin?',
                      'visibility': 'signed_out',
                    },
                    {
                      'id': 'ticket',
                      'type': 'tracking',
                      'tracking': {'kind': 'trip', 'style': 'ticket'},
                      'visibility': 'signed_in',
                    },
                  ],
                },
              ],
            },
          },
        },
      };
    if (!trip) {
      final served = api.travelHandler!;
      api.travelHandler = (method, path, query, body) =>
          '$method $path' == 'GET /me/travel/bookings'
          ? {'items': <Object>[], 'total': 0, 'page': 1, 'per_page': 30}
          : served(method, path, query, body);
    }
    return api;
  }

  Future<void> open(WidgetTester tester, FakeApi api, bool signedIn) async {
    tester.view
      ..physicalSize = const Size(390, 844) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    await TestApp(
      appType: AppType.travel,
      api: api,
      signedIn: signedIn,
      guest: !signedIn,
    ).pump(tester);
    await TestApp.settle(tester, 20);
  }

  const question = 'Where does the next story begin?';

  testWidgets('signed out: the question', (tester) async {
    await open(tester, safra(trip: false), false);
    expect(find.text(question), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('signed in without a trip: the question, not an empty cover', (
    tester,
  ) async {
    await open(tester, safra(trip: false), true);
    expect(find.text(question), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('signed in with a trip: its ticket, not the question', (
    tester,
  ) async {
    // The bare cover here has none of the template's room for the ticket.
    final previous = FlutterError.onError;
    FlutterError.onError = (d) {
      if (!d.exceptionAsString().contains('A RenderFlex overflowed')) {
        previous?.call(d);
      }
    };
    addTearDown(() => FlutterError.onError = previous);
    await open(tester, safra(trip: true), true);
    expect(find.text(question), findsNothing);
    expect(find.byKey(const ValueKey('studio-node-ticket')), findsWidgets);
  });

  group('180.19 a photo header\'s title reads over its photo', () {
    FakeApi titled(String colour) => FakeApi(config: configJson())
      ..navigation = navigationJson(
        tabs: [
          navTabJson('home', 'Trips', 'home', {
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
            'header': {
              'type': 'title',
              'style': 'photo',
              'title': 'Trips',
              'color': colour,
              'image_url': 'https://yallapp.test/travel-photos/room.jpg',
            },
            'body': {'id': 'root', 'type': 'column', 'children': <Object>[]},
          },
        },
      };

    Color titleColour(WidgetTester tester) {
      final title = tester
          .widgetList<Text>(find.text('Trips'))
          .firstWhere((t) => (t.style?.fontSize ?? 0) >= 30);
      return title.style!.color!;
    }

    testWidgets("the look's navy gives way to white", (tester) async {
      await open(tester, titled('#0E1424'), true);
      expect(titleColour(tester), Colors.white);
    });

    testWidgets("an owner's light colour that reads is kept", (tester) async {
      await open(tester, titled('#F4D9A6'), true);
      expect(titleColour(tester), const Color(0xFFF4D9A6));
    });
  });

  testWidgets('180.21 the photo account in Turkish at a larger text size: '
      'the phone number on one line', (tester) async {
    const ratio = 3.0;
    tester.view
      ..devicePixelRatio = ratio
      ..physicalSize = const Size(360, 800) * ratio;
    tester.platformDispatcher.textScaleFactorTestValue = 1.3;
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final api = FakeApi(
      config: {
        ...configJson(languages: languagesJson()),
        'screens': {
          'system': {'look': 'photo'},
        },
      },
    );
    final app = TestApp(
      api: api,
      signedIn: true,
      preferences: {'settings.language': 'tr'},
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).go('/account');
    await TestApp.settle(tester, 20);
    final phone = find.byKey(const ValueKey('chrome-account-phone'));
    expect(phone, findsOneWidget);
    final line = tester.renderObject<RenderParagraph>(
      find.descendant(of: phone, matching: find.byType(RichText)),
    );
    expect(line.size.height, lessThan(14 * 1.3 * 1.6));
  });

  testWidgets('180.21 the default account in Turkish at a larger text size: '
      'the phone number on one line', (tester) async {
    const ratio = 3.0;
    tester.view
      ..devicePixelRatio = ratio
      ..physicalSize = const Size(360, 800) * ratio;
    tester.platformDispatcher.textScaleFactorTestValue = 1.3;
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final app = TestApp(
      api: FakeApi(config: configJson(languages: languagesJson())),
      appType: AppType.booking,
      signedIn: true,
      preferences: {'settings.language': 'tr'},
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).go('/account');
    await TestApp.settle(tester, 20);
    final phone = find.byKey(const ValueKey('account-phone'));
    expect(phone, findsOneWidget);
    final line = tester.renderObject<RenderParagraph>(
      find.descendant(of: phone, matching: find.byType(RichText)),
    );
    expect(line.size.height, lessThan(14 * 1.3 * 1.6));
  });
}
