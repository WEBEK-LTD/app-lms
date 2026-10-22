import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/external_links.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'events_test.dart' show usePhone;

/// 80.4 Shipping: a shop without a website ships with any carrier and gives a
/// tracking link, a tracking number or a waybill. The order shows them, opens
/// the carrier's page and the waybill's link; older servers send nothing.

const _tracking = 'https://kargotakip.example/track?code=3815602243';
const _waybill = 'https://files.example/awb-4471.pdf';

Map<String, dynamic> _shipped({Map<String, dynamic> shipment = const {}}) => {
  ...orderJson(),
  'status': 'processing',
  'status_label': 'Shipped',
  'shipment': {
    'carrier': 'Aras Kargo',
    'tracking_number': '3815602243',
    'tracking_url': _tracking,
    'waybill': null,
    'shipped_at': '2026-10-22T10:00:00Z',
    ...shipment,
  },
};

TestApp _shop(FakeApi api, List<String> opened, [String? language]) => TestApp(
  signedIn: true,
  appType: AppType.store,
  api: api,
  preferences: {'settings.language': ?language},
  overrides: [
    openExternalProvider.overrideWithValue((url) async {
      opened.add(url);
      return true;
    }),
  ],
);

void main() {
  test('the models read the shipment, and older servers mean none', () {
    final order = Order.fromJson(_shipped());
    expect(order.shipment!.carrier, 'Aras Kargo');
    expect(order.shipment!.trackingNumber, '3815602243');
    expect(order.shipment!.trackingUrl, _tracking);
    expect(order.shipment!.shippedAt, DateTime.utc(2026, 10, 22, 10));
    expect(order.trackable, isTrue);
    expect(Order.fromJson(orderJson()).shipment, isNull);
    expect(Order.fromJson(orderJson()).trackable, isFalse);
    // A waybill is a number or a link.
    expect(
      Order.fromJson(_shipped(shipment: {'waybill': _waybill}))
          .shipment!
          .waybillUrl,
      _waybill,
    );
    expect(
      Order.fromJson(_shipped(shipment: {'waybill': 'AWB 4471'}))
          .shipment!
          .waybillUrl,
      isNull,
    );
  });

  testWidgets('a shipped order opens from My orders and its tracking page', (
    tester,
  ) async {
    usePhone(tester);
    final opened = <String>[];
    final api = FakeApi(config: configJson(lms: null, orders: true))
      ..orders = [_shipped()]
      ..order = _shipped(shipment: {'waybill': _waybill});
    final app = _shop(api, opened);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.orders);
    await TestApp.settle(tester);
    expect(find.text('Shipped'), findsOneWidget);
    await tester.tap(find.text('Shipped'));
    await TestApp.settle(tester);
    expect(find.text('Aras Kargo'), findsOneWidget);
    expect(find.text('Tracking number: 3815602243'), findsOneWidget);
    await tester.tap(find.text('Track shipment'));
    await TestApp.settle(tester);
    await tester.tap(find.text('Open the waybill'));
    await TestApp.settle(tester);
    expect(opened, [_tracking, _waybill]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('in Arabic, with only a waybill number', (tester) async {
    usePhone(tester);
    final opened = <String>[];
    final api =
        FakeApi(
            config: configJson(
              lms: null,
              orders: true,
              languages: languagesJson(available: const ['en', 'ar', 'tr']),
            ),
          )
          ..order = _shipped(
            shipment: {
              'carrier': null,
              'tracking_number': null,
              'tracking_url': null,
              'waybill': 'AWB 4471',
            },
          );
    final app = _shop(api, opened, 'ar');
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/account/orders/42');
    await TestApp.settle(tester);
    expect(find.text('الشحنة'), findsOneWidget);
    expect(find.text('البوليصة: AWB 4471'), findsOneWidget);
    expect(find.text('تتبّع الشحنة'), findsNothing);
    expect(opened, isEmpty);
  });
}
