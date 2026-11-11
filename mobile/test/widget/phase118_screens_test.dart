import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'phase91_points_test.dart' show loyaltyJson;
import 'store_test.dart' show storeApi;

/// 118.3 A Studio app's sign-in screen look and account menu
/// (`Config.screens`).
void main() {
  setUp(() {
    final binding = TestWidgetsFlutterBinding.ensureInitialized();
    binding.platformDispatcher.views.first
      ..physicalSize = const Size(1170, 2532)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  Map<String, dynamic> withScreens(Map<String, dynamic> screens) {
    final config = configJson();
    config['screens'] = screens;
    return config;
  }

  test('reads Config.screens and picks the language', () {
    final screens = StudioScreens.fromJson({
      'sign_in': {
        'style': 'photo',
        'image_url': null,
        'title': {'en': 'Welcome to Safra', 'ar': 'أهلًا بك'},
        'show_logo': true,
      },
      'account_menu': {
        'header': 'card',
        'items': [
          {'key': 'settings', 'hidden': false},
          {
            'key': 'link',
            'hidden': false,
            'label': {'en': 'Our blog'},
            'url': 'https://safra.example/blog',
          },
        ],
      },
    })!;
    // A photo look without its photo is the classic one.
    expect(screens.signIn!.style, SignInLookStyle.classic);
    expect(textFor(screens.signIn!.title, 'ar'), 'أهلًا بك');
    expect(textFor(screens.signIn!.title, 'tr'), 'Welcome to Safra');
    expect(textFor(const {}, 'en'), isNull);
    expect(screens.accountMenu!.header, AccountMenuHeader.card);
    expect(screens.accountMenu!.items.last.isLink, isTrue);
    expect(StudioScreens.fromJson(null), isNull);
  });

  testWidgets('shows the owner\'s words over a full photo', (tester) async {
    final app = TestApp(
      api: FakeApi(
        config: withScreens({
          'sign_in': {
            'style': 'photo',
            'image_url': 'https://yallapp.test/media/hotel.jpg',
            'title': {'en': 'Stay somewhere unforgettable'},
            'subtitle': {'en': 'Sign in to see your trips.'},
            'show_logo': false,
          },
        }),
      ),
    );
    await app.pump(tester);

    expect(find.byKey(const ValueKey('sign-in-photo-panel')), findsOneWidget);
    expect(find.text('Stay somewhere unforgettable'), findsOneWidget);
    expect(find.text('Sign in to see your trips.'), findsOneWidget);
    expect(find.text('Welcome'), findsNothing);
    expect(find.text('Send code'), findsOneWidget);
  });

  testWidgets('puts the form in a card under the photo', (tester) async {
    final app = TestApp(
      api: FakeApi(
        config: withScreens({
          'sign_in': {
            'style': 'card',
            'image_url': 'https://yallapp.test/media/hotel.jpg',
            'show_logo': true,
          },
        }),
      ),
    );
    await app.pump(tester);
    expect(find.byKey(const ValueKey('sign-in-card')), findsOneWidget);
    expect(
      find.text('Welcome'),
      findsOneWidget,
      reason: 'no words: the app\'s',
    );
  });

  testWidgets('orders, renames and hides the account menu\'s entries', (
    tester,
  ) async {
    final app = TestApp(
      signedIn: true,
      api: FakeApi(
        config: withScreens({
          'account_menu': {
            'header': 'card',
            'items': [
              {
                'key': 'link',
                'hidden': false,
                'label': {'en': 'Our blog'},
                'icon': 'article',
                'url': 'https://safra.example/blog',
              },
              {
                'key': 'settings',
                'hidden': false,
                'label': {'en': 'Preferences'},
              },
              {'key': 'notifications', 'hidden': true},
              // Never hidden: the stores ask for it.
              {'key': 'privacy', 'hidden': true},
            ],
          },
        }),
      ),
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).go(Paths.account);
    await TestApp.settle(tester);

    expect(find.byKey(const ValueKey('account-card')), findsOneWidget);
    expect(find.text('Our blog'), findsOneWidget);
    expect(find.text('Preferences'), findsOneWidget);
    expect(find.text('Settings'), findsNothing);
    expect(find.text('Notifications'), findsNothing);
    expect(
      tester.getTopLeft(find.text('Our blog')).dy,
      lessThan(tester.getTopLeft(find.text('Preferences')).dy),
    );
    expect(find.text('Log out'), findsOneWidget);
  });

  /// A shop with points, and the owner's menu in [header].
  Future<TestApp> shopAccount(
    WidgetTester tester,
    String header, {
    int balance = 840,
    String? accent,
  }) async {
    final api = storeApi(
      store: {
        ...storeConfigJson(deliveryDate: false),
        'loyalty': loyaltyJson(),
      },
    );
    api.config['screens'] = {
      'account_menu': {
        'header': header,
        'accent': ?accent,
        'items': [
          {'key': 'orders', 'hidden': false},
          {'key': 'points', 'hidden': false},
          {
            'key': 'link',
            'hidden': false,
            'label': {'en': 'This week\'s offers'},
            'icon': 'redeem',
            'page_slug': 'offers',
          },
          {
            'key': 'help',
            'hidden': false,
            'label': {'en': 'WhatsApp us'},
          },
          {'key': 'notifications', 'hidden': true},
        ],
      },
    };
    api.points = {
      'balance': balance,
      'value': '₺84.00',
      'entries': <Map<String, dynamic>>[],
    };
    final app = TestApp(signedIn: true, appType: AppType.store, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).go(Paths.account);
    await TestApp.settle(tester);
    return app;
  }

  test('reads the new looks and the card colour', () {
    final menu = AccountMenuDesign.fromJson({
      'header': 'night',
      'accent': '#C9CED6',
      'items': <Object>[],
    });
    expect(menu.header, AccountMenuHeader.night);
    expect(menu.accent, const Color(0xFFC9CED6));
    expect(
      AccountMenuDesign.fromJson({'header': 'newer', 'accent': 'gold'}).header,
      AccountMenuHeader.plain,
      reason: 'a look this app doesn\'t know',
    );
    expect(AccountMenuDesign.fromJson({'accent': 'gold'}).accent, isNull);
  });

  testWidgets('cover: the points and the first entries as shortcuts', (
    tester,
  ) async {
    final app = await shopAccount(tester, 'cover');
    expect(find.byKey(const ValueKey('account-cover')), findsOneWidget);
    expect(find.byKey(const ValueKey('account-points-count')), findsOneWidget);
    expect(find.text('840'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('account-shortcut-orders')),
      findsOneWidget,
    );
    expect(find.text('This week\'s offers'), findsOneWidget);
    expect(find.text('WhatsApp us'), findsOneWidget);
    expect(find.text('Notifications'), findsNothing, reason: 'hidden');
    expect(find.text('Settings'), findsOneWidget, reason: 'always shown');
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('account-sign-out')),
      200,
    );
    await tester.tap(find.byKey(const ValueKey('account-sign-out')));
    await TestApp.settle(tester);
    expect(find.text('Log out'), findsWidgets, reason: 'asks first');
    expect(app.api.calls, contains('getMyPoints'));
  });

  testWidgets('tiles: the first entries as tiles and the owner\'s banner', (
    tester,
  ) async {
    final app = await shopAccount(tester, 'tiles');
    expect(find.byKey(const ValueKey('account-tile-orders')), findsOneWidget);
    expect(find.byKey(const ValueKey('account-tile-points')), findsOneWidget);
    expect(find.text('840 points'), findsOneWidget);
    expect(find.byKey(const ValueKey('account-link-2')), findsOneWidget);
    expect(find.text('Welcome'), findsOneWidget);
    await tester.tap(find.text('This week\'s offers'));
    await TestApp.settle(tester);
    expect(
      app.container.read(appRouterProvider).state.uri.path,
      Paths.page('offers'),
    );
  });

  testWidgets('night: the membership card counts toward using the points', (
    tester,
  ) async {
    await shopAccount(tester, 'night', balance: 40, accent: '#C9CED6');
    expect(find.byKey(const ValueKey('account-member-card')), findsOneWidget);
    expect(find.text('Membership card'), findsOneWidget);
    expect(find.text('40 points'), findsOneWidget);
    expect(find.text('60 more points and you can use them'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('account-shortcut-orders')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('account-sign-out')), findsOneWidget);
  });

  testWidgets('night: once there are enough, what they are worth', (
    tester,
  ) async {
    await shopAccount(tester, 'night');
    expect(find.text('840 points'), findsOneWidget);
    expect(find.text('Worth ₺84.00'), findsOneWidget);
  });

  // 119 Every look in light and dark mode.
  Color pageColour(WidgetTester tester) => tester
      .widget<Scaffold>(
        find
            .ancestor(
              of: find.byKey(const ValueKey('account-member-card')),
              matching: find.byType(Scaffold),
            )
            .first,
      )
      .backgroundColor!;

  testWidgets('premium: a warm light page in light mode, its card dark', (
    tester,
  ) async {
    await shopAccount(tester, 'night');
    expect(pageColour(tester), const Color(0xFFF6F2EA));
    expect(
      tester
          .widget<Material>(find.byKey(const ValueKey('account-member-card')))
          .color,
      const Color(0xFF18211D),
    );
  });

  testWidgets('premium: a dark page in dark mode', (tester) async {
    tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
    addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
    await shopAccount(tester, 'night');
    expect(pageColour(tester), const Color(0xFF0D1210));
  });

  for (final header in ['plain', 'card', 'cover', 'tiles']) {
    testWidgets('$header draws in dark mode', (tester) async {
      tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
      await shopAccount(tester, header);
      expect(tester.takeException(), isNull);
      expect(find.text('Log out'), findsWidgets);
      expect(
        Theme.of(tester.element(find.text('Log out').first)).brightness,
        Brightness.dark,
      );
    });
  }
}
