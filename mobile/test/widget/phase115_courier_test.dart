import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';
import 'package:yallapp/modules/vendor/data/vendor_providers.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 115 A marketplace's couriers and vendors work in their own apps from the
/// bundle: the courier app takes the marketplace's jobs on the marketplace's
/// map, and the vendor app opens on the vendor's orders.
void main() {
  Map<String, dynamic> market({String vendorApp = 'bundle'}) => {
    'currency': 'EGP',
    'kinds': ['restaurant', 'grocery'],
    'payment': {'cash': true, 'card': true},
    'courier_app': 'bundle',
    'vendor_app': vendorApp,
    'map': {
      'tiles_url': 'https://tiles.test/{z}/{x}/{y}.png',
      'attribution': null,
      'search': true,
      'routes': false,
    },
  };

  FakeApi api(String role, {String vendorApp = 'bundle'}) {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'market': market(vendorApp: vendorApp),
      },
    );
    api.me = {
      ...userJson(),
      'roles': [role],
    };
    return api;
  }

  TestApp app(FakeApi api, AppRole role) => TestApp(
    api: api,
    appType: AppType.food,
    signedIn: true,
    build: (b) => b.copyWith(role: role),
  );

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(390, 844) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  List<String?> tabs(TestApp app) =>
      app.container.read(shellTabsProvider).map((t) => t.path).toList();

  testWidgets('the courier app takes marketplace jobs on its map', (
    tester,
  ) async {
    phone(tester);
    final a = app(api('courier'), AppRole.courier);
    await a.pump(tester);
    expect(tabs(a), [Paths.courier, Paths.account]);
    expect(a.container.read(isCourierProvider), isTrue);
    final map = a.container.read(deliveryConfigProvider);
    expect(map.tilesUrl, 'https://tiles.test/{z}/{x}/{y}.png');
    expect(map.search, isTrue);
    expect(map.cash, isTrue);
  });

  testWidgets('the vendor app opens on the orders, with stock and Account', (
    tester,
  ) async {
    phone(tester);
    final a = app(api('vendor'), AppRole.vendor);
    await a.pump(tester);
    expect(tabs(a), [Paths.vendorDesk, Paths.vendorStock, Paths.account]);
    expect(
      a.container.read(appRouterProvider).state.uri.path,
      Paths.vendorDesk,
    );
  });

  testWidgets('the customers\' app has the vendor tab for staff only when '
      'the owner keeps vendors there', (tester) async {
    phone(tester);
    final bundled = app(api('vendor'), AppRole.customer);
    await bundled.pump(tester);
    expect(tabs(bundled), isNot(contains(Paths.vendorDesk)));
    expect(bundled.container.read(isVendorProvider), isFalse);
  });

  testWidgets('with vendor_app same, staff get the vendor tab', (tester) async {
    phone(tester);
    final same = app(api('vendor', vendorApp: 'same'), AppRole.customer);
    await same.pump(tester);
    expect(tabs(same), contains(Paths.vendorDesk));
    expect(same.container.read(isVendorProvider), isTrue);
  });
}
