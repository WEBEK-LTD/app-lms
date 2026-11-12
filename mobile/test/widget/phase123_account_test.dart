import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 123 The premium academy's account (`account_menu` `header: academy`):
/// the student's card with their courses, certificates and hours, the
/// entries the owner kept, the dark mode and notifications at hand, Sign out.
void main() {
  testWidgets('the academy card, the kept entries, the switches', (
    tester,
  ) async {
    final api = FakeApi(
      config: {
        ...configJson(),
        'screens': {
          'account_menu': {
            'header': 'academy',
            'items': [
              {'key': 'orders', 'hidden': false, 'label': {}, 'icon': null},
              {
                'key': 'certificates',
                'hidden': false,
                'label': {},
                'icon': null,
              },
              {'key': 'wishlist', 'hidden': true, 'label': {}, 'icon': null},
            ],
          },
        },
      },
    );
    final app = TestApp(appType: AppType.lms, api: api, signedIn: true);
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    app.container.read(appRouterProvider).go('/account');
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('account-academy-card')), findsOneWidget);
    expect(find.text('Sara Yilmaz'), findsOneWidget);
    // 38 hours of learning: 2280 minutes.
    expect(find.textContaining('38'), findsWidgets);
    expect(find.byKey(const ValueKey('account-notifications')), findsOneWidget);
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('account-sign-out')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.byKey(const ValueKey('account-sign-out')), findsOneWidget);
    expect(find.text('Wishlist'), findsNothing);
  });
}
