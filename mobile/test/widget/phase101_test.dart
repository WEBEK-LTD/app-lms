import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/modules/shared/account/notifications_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 101 The header chosen in the dashboard, on the pages in the bottom tabs.
void main() {
  test('reads the layout and the buttons, each once, at most four', () {
    final header = Appearance.fromJson({
      ...appearanceJson(),
      'header': {
        'layout': 'search',
        'icons': [
          'cart',
          'wishlist',
          'cart',
          'search',
          'chat',
          'account',
          'notifications',
        ],
      },
    }).header!;
    expect(header.layout, HeaderLayout.search);
    expect(header.icons, [
      HeaderIcon.cart,
      HeaderIcon.search,
      HeaderIcon.chat,
      HeaderIcon.account,
    ]);
    // A layout this app doesn't know: the title header.
    expect(
      AppHeader.fromJson({'layout': 'banner', 'icons': []}).layout,
      HeaderLayout.title,
    );
    expect(Appearance.fromJson(appearanceJson()).header, isNull);
  });

  FakeApi apiWith(Map<String, dynamic> header) =>
      FakeApi(
          config: configJson(
            appearance: {
              ...appearanceJson(template: 'classic', themeMode: 'light'),
              'header': header,
            },
          ),
        )
        ..navigation = navigationJson()
        ..pages = {'home': appPageJson(blocks: [])};

  testWidgets('a centred bar with the buttons this app can open', (
    tester,
  ) async {
    final app = TestApp(
      api: apiWith({
        'layout': 'centered',
        'icons': ['search', 'cart', 'notifications', 'account'],
      }),
      signedIn: true,
    );
    await app.pump(tester);
    expect(find.byKey(const ValueKey('header-centered')), findsOneWidget);
    expect(find.byKey(const ValueKey('header-search')), findsOneWidget);
    expect(find.byKey(const ValueKey('header-notifications')), findsOneWidget);
    expect(find.byKey(const ValueKey('header-account')), findsOneWidget);
    // An academy has no cart.
    expect(find.byKey(const ValueKey('header-cart')), findsNothing);
    expect(tester.takeException(), isNull);

    await tester.tap(find.byKey(const ValueKey('header-notifications')));
    await TestApp.settle(tester, 10);
    expect(find.byType(NotificationsScreen), findsOneWidget);
  });

  testWidgets('the logo bar with a search field, without a title', (
    tester,
  ) async {
    final app = TestApp(
      api: apiWith({
        'layout': 'search',
        'icons': ['chat'],
      }),
      signedIn: true,
    );
    await app.pump(tester);
    expect(find.byKey(const ValueKey('header-search')), findsOneWidget);
    // Without a logo, the app's name.
    expect(find.byKey(const ValueKey('header-name')), findsOneWidget);
    expect(find.byKey(const ValueKey('header-search-field')), findsOneWidget);
    // The chat is off in this app.
    expect(find.byKey(const ValueKey('header-chat')), findsNothing);

    await tester.tap(find.byKey(const ValueKey('header-search-field')));
    await TestApp.settle(tester, 10);
    expect(find.byKey(const ValueKey('header-search-field')), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('without a header, the template\'s', (tester) async {
    final app = TestApp(
      api: FakeApi()..navigation = navigationJson(),
      signedIn: true,
    );
    await app.pump(tester);
    expect(find.byKey(const ValueKey('header-title')), findsNothing);
    expect(find.byKey(const ValueKey('header-centered')), findsNothing);
  });
}
