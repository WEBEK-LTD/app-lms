import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/routing/app_module.dart';
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';
import 'package:yallapp/modules/delivery/delivery_routes.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

class FakeLocator implements Locator {
  int reads = 0;

  @override
  Future<LocateResult> current() async {
    reads++;
    return const LocateResult.found((lat: 30.05, lng: 31.33, accuracy: 8));
  }
}

FakeApi deliveryApi({
  bool courier = false,
  String courierApp = 'same',
  String pricing = 'distance',
}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'delivery': deliveryConfigJson(courierApp: courierApp, pricing: pricing),
    },
  );
  if (courier) {
    api.me = {
      ...userJson(),
      'roles': ['courier'],
    };
  }
  return api;
}

TestApp deliveryApp(
  FakeApi api, {
  bool signedIn = true,
  FakeLocator? locator,
}) => TestApp(
  api: api,
  appType: AppType.delivery,
  signedIn: signedIn,
  guest: !signedIn,
  overrides: [locatorProvider.overrideWithValue(locator ?? FakeLocator())],
);

void usePhone(WidgetTester tester) {
  final view = tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

Future<void> go(TestApp app, WidgetTester tester, String location) async {
  app.container.read(appRouterProvider).go(location);
  await TestApp.settle(tester);
}

Future<void> push(TestApp app, WidgetTester tester, String location) async {
  app.container.read(appRouterProvider).push(location);
  await TestApp.settle(tester);
}

/// Types into a field of the send screen, scrolling to it first.
Future<void> typeInto(WidgetTester tester, String key, String text) async {
  final field = find.byKey(ValueKey(key));
  await tester.scrollUntilVisible(
    field,
    200,
    scrollable: find
        .descendant(
          of: find.byKey(const ValueKey('send-parcel')),
          matching: find.byType(Scrollable),
        )
        .first,
  );
  await tester.enterText(field, text);
}

Future<void> tapKey(WidgetTester tester, String key) async {
  final target = find.byKey(ValueKey(key));
  await tester.ensureVisible(target);
  await TestApp.settle(tester);
  await tester.tap(target);
  await TestApp.settle(tester);
}

void main() {
  group('104 Courier tab', () {
    ShellTab tab(String path) =>
        ShellTab(location: path, label: (_) => path, icon: Icons.circle);

    test('is added before Account, for couriers only', () {
      final tabs = [tab(Paths.send), tab(Paths.shipments), tab(Paths.account)];
      expect(withCourierTab(tabs, true).map((t) => t.path), [
        Paths.send,
        Paths.shipments,
        Paths.courier,
        Paths.account,
      ]);
      expect(withCourierTab(tabs, false).map((t) => t.path), [
        Paths.send,
        Paths.shipments,
        Paths.account,
      ]);
      // Not a delivery app: left as it is.
      expect(withCourierTab(tabs, null), same(tabs));
    });

    test('takes the place of the tab before Account when the bar is full', () {
      final tabs = [
        tab(Paths.home),
        tab(Paths.send),
        tab(Paths.shipments),
        tab(Paths.notifications),
        tab(Paths.account),
      ];
      expect(withCourierTab(tabs, true).map((t) => t.path), [
        Paths.home,
        Paths.send,
        Paths.shipments,
        Paths.courier,
        Paths.account,
      ]);
    });

    test('an owner\'s Courier tab is left out for customers', () {
      final tabs = [tab(Paths.send), tab(Paths.courier), tab(Paths.account)];
      expect(withCourierTab(tabs, false).map((t) => t.path), [
        Paths.send,
        Paths.account,
      ]);
      expect(courierTab.path, Paths.courier);
    });
  });

  testWidgets('104 a customer sends a parcel paid in cash', (tester) async {
    usePhone(tester);
    final api = deliveryApi();
    final app = deliveryApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.send);

    expect(find.text('Send a parcel'), findsWidgets);
    expect(find.text('Same-day delivery'), findsOneWidget);
    // Customers never see the couriers' tab.
    expect(find.text('Courier'), findsNothing);

    await typeInto(tester, 'pickup-address', '12 Abbas El Akkad St');
    await typeInto(tester, 'dropoff-address', '9 Road 233, Maadi');
    await tester.pump(const Duration(milliseconds: 700));
    await TestApp.settle(tester);
    expect(api.count('quoteShipment'), greaterThan(0));
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('send-price')),
      200,
      scrollable: find
          .descendant(
            of: find.byKey(const ValueKey('send-parcel')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    expect(find.text('E£62.00'), findsOneWidget);
    expect(find.text('12.4 km'), findsOneWidget);

    await typeInto(tester, 'recipient-name', 'Mona Adel');
    await typeInto(tester, 'recipient-phone', '01001234567');
    await tapKey(tester, 'send-button');

    expect(api.count('createShipment'), 1);
    final sent = api.shipmentRequests.single;
    expect(sent.pickup.address, '12 Abbas El Akkad St');
    expect(sent.recipientName, 'Mona Adel');
    expect(sent.payment, PaymentMethod.cash);
    // Opens the new shipment.
    expect(find.text('Shipment S-1002'), findsOneWidget);
    expect(find.text('Waiting for a courier'), findsWidgets);
  });

  testWidgets('104 a missing recipient is said, nothing is sent', (
    tester,
  ) async {
    usePhone(tester);
    final api = deliveryApi();
    final app = deliveryApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.send);
    await typeInto(tester, 'pickup-address', '12 Abbas El Akkad St');
    await typeInto(tester, 'dropoff-address', '9 Road 233, Maadi');
    await tapKey(tester, 'send-button');
    expect(
      find.text("Enter the recipient's name and mobile number."),
      findsOneWidget,
    );
    expect(api.count('createShipment'), 0);
  });

  testWidgets('104 a customer follows and cancels a waiting shipment', (
    tester,
  ) async {
    usePhone(tester);
    final api = deliveryApi()
      ..shipments = [shipmentJson(status: 'pending', withCourier: false)];
    final app = deliveryApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.shipments);
    expect(find.text('S-1001'), findsWidgets);

    await push(app, tester, Paths.shipment(1));
    expect(find.text('Shipment S-1001'), findsOneWidget);
    await tapKey(tester, 'shipment-cancel');
    expect(find.text('Cancel this shipment?'), findsOneWidget);
    await tester.tap(find.text('Cancel it'));
    await TestApp.settle(tester);
    expect(api.count('cancelMyShipment'), 1);
    expect(find.text('Cancelled'), findsWidgets);
  });

  testWidgets('104 a courier sees the Courier tab and moves a job on', (
    tester,
  ) async {
    usePhone(tester);
    final api = deliveryApi(courier: true);
    final app = deliveryApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.send);
    expect(find.text('Courier'), findsWidgets);

    await go(app, tester, Paths.courier);
    expect(find.text('On duty'), findsOneWidget);
    expect(find.text('S-1001'), findsWidgets);

    await push(app, tester, Paths.courierJob(1));
    expect(find.text('Job S-1001'), findsOneWidget);
    expect(
      find.text('Collect E£62.00 in cash at the drop-off.'),
      findsOneWidget,
    );
    await tapKey(tester, 'job-pickedUp');
    expect(api.jobMoves.single.step, JobStep.pickedUp);
    expect(find.text('Saved. The customer was told.'), findsOneWidget);
  });

  testWidgets('104 Account opens the courier mode for couriers only', (
    tester,
  ) async {
    usePhone(tester);
    final courierApp = deliveryApp(deliveryApi(courier: true));
    await courierApp.pump(tester);
    await go(courierApp, tester, Paths.account);
    expect(find.byKey(const ValueKey('account-shipments')), findsOneWidget);
    await tapKey(tester, 'account-courier');
    expect(find.text('On duty'), findsOneWidget);
  });

  testWidgets('104 customers have no courier mode in Account', (tester) async {
    usePhone(tester);
    final app = deliveryApp(deliveryApi());
    await app.pump(tester);
    await go(app, tester, Paths.account);
    expect(find.byKey(const ValueKey('account-courier')), findsNothing);
    expect(find.byKey(const ValueKey('account-shipments')), findsOneWidget);
  });

  testWidgets('104 a courier takes a waiting job', (tester) async {
    usePhone(tester);
    final api = deliveryApi(courier: true);
    final app = deliveryApp(api);
    await app.pump(tester);
    await push(app, tester, Paths.courierJob(2));
    expect(
      find.text('The numbers show once you take the job.'),
      findsOneWidget,
    );
    await tapKey(tester, 'job-take');
    expect(api.count('acceptCourierJob'), 1);
    expect(find.text("It's yours. Go to the pickup."), findsOneWidget);
  });

  testWidgets('104 couriers of a company with its own courier app see the '
      'customer screens only', (tester) async {
    usePhone(tester);
    final api = deliveryApi(courier: true, courierApp: 'bundle');
    final app = deliveryApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.send);
    expect(find.text('Courier'), findsNothing);
    expect(app.container.read(isCourierProvider), isFalse);
  });

  testWidgets('104 someone who isn\'t a courier opening the courier screen', (
    tester,
  ) async {
    usePhone(tester);
    final api = deliveryApi();
    final app = deliveryApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.courier);
    expect(find.text('For our couriers'), findsOneWidget);
    expect(api.count('listCourierJobs'), 0);
  });

  testWidgets('104 "My location" sets the pickup', (tester) async {
    usePhone(tester);
    final locator = FakeLocator();
    final api = deliveryApi();
    final app = deliveryApp(api, locator: locator);
    await app.pump(tester);
    await go(app, tester, Paths.send);
    await tapKey(tester, 'pickup-here');
    expect(locator.reads, 1);
    expect(find.byKey(const ValueKey('pickup-located')), findsOneWidget);
  });
}
