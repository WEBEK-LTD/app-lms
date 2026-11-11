import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

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
}
