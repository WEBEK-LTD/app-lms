import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';
import 'package:yallapp/modules/rides/data/rides_providers.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 112.3 Delivery, food, ride and taxi companies' couriers and drivers work
/// in their own app: the customers' app never shows their screens, whatever
/// the config says (`same` is for the customers' apps built before), and the
/// second app shows theirs only.
class _Kind {
  const _Kind(this.name, this.type, this.role, this.roleTab, this.config);
  final String name;
  final AppType type;
  final AppRole role;
  final String roleTab;
  final Map<String, dynamic> config;
}

final _kinds = [
  _Kind('delivery', AppType.delivery, AppRole.courier, Paths.courier, {
    'delivery': deliveryConfigJson(courierApp: 'same'),
  }),
  _Kind('food', AppType.food, AppRole.courier, Paths.courier, {
    'food': foodConfigJson(courierApp: 'same'),
  }),
  _Kind('rides', AppType.rides, AppRole.driver, Paths.driver, {
    'rides': {
      ...ridesConfigJson(driverApp: 'same'),
      'map': {'tiles_url': null, 'attribution': null},
    },
  }),
  _Kind('taxi', AppType.rides, AppRole.driver, Paths.driver, {
    'vertical': 'taxi',
    'rides': {
      ...ridesConfigJson(driverApp: 'same'),
      'map': {'tiles_url': null, 'attribution': null},
    },
  }),
];

FakeApi _api(_Kind kind) {
  final api = FakeApi(config: {...configJson(lms: null), ...kind.config});
  api.me = {
    ...userJson(),
    'roles': [kind.role == AppRole.driver ? 'driver' : 'courier'],
  };
  if (kind.role == AppRole.driver) api.driver = driverJson(online: false);
  return api;
}

TestApp _app(FakeApi api, _Kind kind, AppRole role) => TestApp(
  api: api,
  appType: kind.type,
  signedIn: true,
  build: (b) => b.copyWith(role: role),
);

void _phone(WidgetTester tester) {
  final view = tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

List<String?> _tabs(TestApp app) =>
    app.container.read(shellTabsProvider).map((t) => t.path).toList();

bool _screensHere(TestApp app, _Kind kind) => kind.role == AppRole.driver
    ? app.container.read(isDriverProvider)
    : app.container.read(isCourierProvider);

void main() {
  for (final kind in _kinds) {
    group('112.3 ${kind.name}', () {
      testWidgets('the customers\' app has no ${kind.roleTab} tab, no role '
          'switch in Account, even for the company\'s own', (tester) async {
        _phone(tester);
        final app = _app(_api(kind), kind, AppRole.customer);
        await app.pump(tester);
        expect(_tabs(app), isNot(contains(kind.roleTab)));
        expect(_screensHere(app, kind), isFalse);
        app.container.read(appRouterProvider).go(Paths.account);
        await TestApp.settle(tester);
        expect(find.byKey(const ValueKey('account-courier')), findsNothing);
        expect(find.byKey(const ValueKey('account-driver')), findsNothing);
      });

      testWidgets('the second app opens on the ${kind.roleTab} screen, with '
          'it and Account only', (tester) async {
        _phone(tester);
        final app = _app(_api(kind), kind, kind.role);
        await app.pump(tester);
        expect(_tabs(app), [kind.roleTab, Paths.account]);
        expect(_screensHere(app, kind), isTrue);
        expect(
          app.container.read(appRouterProvider).state.uri.path,
          kind.roleTab,
        );
        // Nowhere to switch to the customer's screens.
        expect(
          find.byKey(const ValueKey('courier-customer-view')),
          findsNothing,
        );
        expect(find.byKey(const ValueKey('driver-rider-view')), findsNothing);
      });
    });
  }
}
