import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/modules/shared/account/order_journey.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 132.160 The owner ships an order in the dashboard and the app follows:
/// the order's notification arriving while the app is open (or tapped), and
/// the app coming back to the front, ask for the orders again; the stage
/// shows on every order still on its way, whatever its status; and "How
/// your flowers travel" follows the person's newest order on its way, its
/// steps as drawn without one, signed out, and on a source it doesn't know.

class _Push implements PushService {
  final received = StreamController<Map<String, dynamic>>.broadcast();
  final opened = StreamController<Map<String, dynamic>>.broadcast();

  @override
  PushProvider get provider => PushProvider.fcm;

  @override
  bool get isAvailable => true;

  @override
  Future<void> init() async {}

  @override
  Future<String?> token() async => null;

  @override
  Stream<String> get tokenRefreshes => const Stream.empty();

  @override
  Stream<Map<String, dynamic>> get openedMessages => opened.stream;

  @override
  Future<Map<String, dynamic>?> initialMessage() async => null;

  @override
  Stream<Map<String, dynamic>> get receivedMessages => received.stream;
}

Map<String, dynamic> _order({
  int id = 1042,
  String status = 'processing',
  Map<String, Object?>? stage,
  String created = '2026-11-15T10:00:00Z',
  String? fulfilmentStatus,
}) => {
  ...orderJson(),
  'id': id,
  'number': '$id',
  'status': status,
  'status_label': switch (status) {
    'processing' => 'Processing',
    'on_hold' => 'On hold',
    'completed' => 'Completed',
    _ => status,
  },
  'created_at': created,
  'items': [
    {'name': 'Red roses', 'product_id': 7, 'quantity': 1},
  ],
  'stage': stage,
  'fulfilment_status': ?fulfilmentStatus,
};

const _shipped = {'code': 'shipped', 'label': 'Out for delivery'};

Map<String, dynamic> _timeline({String source = 'latest_order'}) => {
  'id': 'track',
  'type': 'timeline',
  'timeline': {'style': 'vertical', 'source': source},
  'entries': [
    {'title': 'Order placed', 'text': 'We have your order.', 'highlight': true},
    {'title': 'Arranged', 'text': 'Made on the day.'},
    {'title': 'On its way', 'text': 'In the slot you chose.'},
    {'title': 'Delivered', 'text': 'Handed over.'},
  ],
};

FakeApi _api({Map<String, dynamic>? timeline}) =>
    FakeApi(
        config: {
          ...configJson(lms: null, orders: true, languages: languagesJson()),
          'store': storeConfigJson(),
        },
      )
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
          ...appPageJson(blocks: [], showTitle: false),
          'studio': {
            'body': {
              'id': 'root',
              'type': 'column',
              'children': [timeline ?? _timeline()],
            },
          },
        },
      };

Future<TestApp> _open(
  WidgetTester tester,
  FakeApi api, {
  bool signedIn = true,
  bool guest = false,
  _Push? push,
  String language = 'en',
  bool dark = false,
}) async {
  tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  final app = TestApp(
    api: api,
    appType: AppType.store,
    signedIn: signedIn,
    guest: guest,
    preferences: {
      'settings.language': language,
      'settings.theme_mode': dark ? 'dark' : 'light',
    },
    overrides: [if (push != null) pushServiceProvider.overrideWithValue(push)],
  );
  await app.pump(tester);
  await TestApp.settle(tester, 30);
  return app;
}

Finder _chip() => find.byKey(const ValueKey('order-status'));

void main() {
  group('the stage on every order on its way', () {
    testWidgets('on hold and preparing: the stage, not "On hold"', (
      tester,
    ) async {
      final api = _api()
        ..orders = [
          _order(
            status: 'on_hold',
            stage: {'code': 'preparing', 'label': 'Preparing'},
          ),
        ];
      final app = await _open(tester, api);
      app.container.read(appRouterProvider).push(Paths.orders);
      await TestApp.settle(tester, 20);
      expect(
        find.descendant(
          of: _chip(),
          matching: find.text('Your order is being prepared'),
        ),
        findsOneWidget,
      );
      expect(find.text('On hold'), findsNothing);
    });

    testWidgets(
      "a WordPress shop's postponed order: the stage before the step",
      (tester) async {
        final api = _api()
          ..orders = [
            _order(
              stage: {'code': 'postponed', 'label': 'Delivery postponed'},
              fulfilmentStatus: 'preparing',
            ),
          ];
        final app = await _open(tester, api);
        app.container.read(appRouterProvider).push(Paths.orders);
        await TestApp.settle(tester, 20);
        expect(
          find.descendant(
            of: _chip(),
            matching: find.text('Delivery postponed'),
          ),
          findsOneWidget,
        );
      },
    );

    testWidgets('a completed order: its status', (tester) async {
      final api = _api()
        ..orders = [
          _order(
            status: 'completed',
            stage: {'code': 'delivered', 'label': 'Delivered'},
          ),
        ];
      final app = await _open(tester, api);
      app.container.read(appRouterProvider).push(Paths.orders);
      await TestApp.settle(tester, 20);
      expect(
        find.descendant(of: _chip(), matching: find.text('Completed')),
        findsOneWidget,
      );
    });
  });

  group('asked again', () {
    testWidgets(
      "a foreground order notification refreshes the list and the order",
      (tester) async {
        final push = _Push();
        final api = _api()..orders = [_order()];
        api.order = _order();
        final app = await _open(tester, api, push: push);
        final router = app.container.read(appRouterProvider);
        router.push(Paths.orders);
        await TestApp.settle(tester, 20);
        router.push(Paths.order(1042));
        await TestApp.settle(tester, 20);
        expect(find.byKey(const ValueKey('order-stage')), findsNothing);
        final lists = api.count('listOrders');
        final orders = api.count('getOrder');

        // The owner ships it in the dashboard; its notification arrives.
        api
          ..orders = [_order(stage: _shipped)]
          ..order = _order(stage: _shipped);
        push.received.add({'type': 'order_update', 'order_id': '1042'});
        await TestApp.settle(tester, 20);

        expect(api.count('getOrder'), greaterThan(orders));
        expect(api.count('listOrders'), greaterThan(lists));
        expect(find.byKey(const ValueKey('order-stage')), findsOneWidget);
        // And the list under it.
        router.pop();
        await TestApp.settle(tester, 20);
        expect(
          find.descendant(of: _chip(), matching: find.text('Out for delivery')),
          findsOneWidget,
        );
      },
    );

    testWidgets('a notification without an order asks for nothing', (
      tester,
    ) async {
      final push = _Push();
      final api = _api()..orders = [_order()];
      final app = await _open(tester, api, push: push);
      app.container.read(appRouterProvider).push(Paths.orders);
      await TestApp.settle(tester, 20);
      final lists = api.count('listOrders');
      push.received.add({'type': 'announcement'});
      await TestApp.settle(tester, 10);
      expect(api.count('listOrders'), lists);
    });

    testWidgets('the app back in the front refreshes the orders', (
      tester,
    ) async {
      final api = _api()..orders = [_order()];
      final app = await _open(tester, api);
      app.container.read(appRouterProvider).push(Paths.orders);
      await TestApp.settle(tester, 20);
      expect(
        find.descendant(of: _chip(), matching: find.text('Processing')),
        findsOneWidget,
      );
      api.orders = [_order(stage: _shipped)];
      final lists = api.count('listOrders');
      for (final state in [
        AppLifecycleState.inactive,
        AppLifecycleState.hidden,
        AppLifecycleState.paused,
        AppLifecycleState.hidden,
        AppLifecycleState.inactive,
        AppLifecycleState.resumed,
      ]) {
        tester.binding.handleAppLifecycleStateChanged(state);
        await tester.pump();
      }
      await TestApp.settle(tester, 20);
      expect(api.count('listOrders'), greaterThan(lists));
      expect(
        find.descendant(of: _chip(), matching: find.text('Out for delivery')),
        findsOneWidget,
      );
    });
  });

  group('How your flowers travel, live', () {
    testWidgets("the newest order on its way: its step, its number", (
      tester,
    ) async {
      final api = _api()
        ..orders = [
          _order(id: 1043, stage: _shipped, created: '2026-11-16T09:00:00Z'),
          _order(
            id: 1040,
            stage: {'code': 'preparing', 'label': 'Preparing'},
            created: '2026-11-10T09:00:00Z',
          ),
          _order(
            id: 1050,
            status: 'completed',
            created: '2026-11-16T12:00:00Z',
          ),
        ];
      await _open(tester, api);
      expect(
        find.bySemanticsLabel(RegExp('Step 3 of 4, Current step')),
        findsOneWidget,
      );
      expect(find.text('Order #1043'), findsOneWidget);
      // A tap opens it.
      await tester.tap(find.byKey(const ValueKey('order-journey-track')));
      await TestApp.settle(tester, 20);
      expect(api.count('getOrder'), greaterThan(0));
    });

    testWidgets('no order on its way: the steps as drawn', (tester) async {
      // 168 Completed more than three days ago: let go.
      final api = _api()
        ..orders = [
          _order(status: 'completed', created: '2026-10-01T10:00:00Z'),
        ];
      await _open(tester, api);
      expect(
        find.bySemanticsLabel(RegExp('Step 1 of 4, Current step')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('order-journey-track')), findsNothing);
    });

    // 168 Delivered just now: all four steps done on the order, not the
    // drawn steps back at "Order placed" (docs/qa/2026-11-18-gift-checkout).
    testWidgets('just delivered: its number, every step done', (tester) async {
      final recently = DateTime.now()
          .toUtc()
          .subtract(const Duration(hours: 1))
          .toIso8601String();
      final api = _api()
        ..orders = [
          _order(
            id: 1037,
            status: 'completed',
            stage: {'code': 'delivered', 'label': 'Delivered'},
            created: recently,
          ),
        ];
      await _open(tester, api);
      expect(find.text('Order #1037'), findsOneWidget);
      expect(
        find.bySemanticsLabel(RegExp('Step 4 of 4, Current step')),
        findsOneWidget,
      );
      expect(
        find.bySemanticsLabel(RegExp('Step 1 of 4, Current step')),
        findsNothing,
      );
    });

    test('168 the order the journey follows', () {
      Order order(Map<String, dynamic> json) => Order.fromJson(json);
      final now = DateTime.utc(2026, 11, 18, 12);
      final delivered = order(
        _order(
          id: 7,
          status: 'completed',
          stage: {'code': 'delivered', 'label': 'Delivered'},
          created: '2026-11-18T05:30:00Z',
        ),
      );
      final open = order(_order(id: 8, created: '2026-11-17T09:00:00Z'));
      expect(orderToFollow([delivered], now)?.id, 7);
      // One still on its way comes first.
      expect(orderToFollow([delivered, open], now)?.id, 8);
      // Older than three days, or cancelled: none.
      expect(
        orderToFollow([
          order(_order(status: 'completed', created: '2026-11-14T11:00:00Z')),
        ], now),
        isNull,
      );
      expect(
        orderToFollow([
          order(_order(status: 'cancelled', created: '2026-11-18T05:00:00Z')),
        ], now),
        isNull,
      );
      expect(orderToFollow(const [], now), isNull);
    });

    testWidgets('signed out: the steps as drawn, no orders asked', (
      tester,
    ) async {
      final api = _api()..orders = [_order(stage: _shipped)];
      await _open(tester, api, signedIn: false, guest: true);
      expect(
        find.bySemanticsLabel(RegExp('Step 1 of 4, Current step')),
        findsOneWidget,
      );
      expect(api.count('listOrders'), 0);
    });

    testWidgets('a source this app does not know: the steps as drawn', (
      tester,
    ) async {
      final api = _api(timeline: _timeline(source: 'next_booking'))
        ..orders = [_order(stage: _shipped)];
      await _open(tester, api);
      expect(
        find.bySemanticsLabel(RegExp('Step 1 of 4, Current step')),
        findsOneWidget,
      );
      expect(api.count('listOrders'), 0);
    });

    testWidgets('in Arabic, right to left, dark', (tester) async {
      final api = _api()..orders = [_order(stage: _shipped)];
      await _open(tester, api, language: 'ar', dark: true);
      expect(tester.takeException(), isNull);
      expect(
        Theme.of(
          tester.element(find.byKey(const ValueKey('order-journey-track'))),
        ).brightness,
        Brightness.dark,
      );
      expect(
        Directionality.of(
          tester.element(find.byKey(const ValueKey('order-journey-track'))),
        ),
        TextDirection.rtl,
      );
    });
  });

  group('the journey step', () {
    Order order(Map<String, dynamic> json) => Order.fromJson(json);
    test('stages, shipments and statuses to the four steps', () {
      expect(orderJourneyStep(order(_order())), OrderJourneyStep.ordered);
      expect(
        orderJourneyStep(order(_order(status: 'pending'))),
        OrderJourneyStep.ordered,
      );
      for (final (code, step) in [
        ('preparing', OrderJourneyStep.prepared),
        ('postponed', OrderJourneyStep.prepared),
        ('returned', OrderJourneyStep.prepared),
        ('shipped', OrderJourneyStep.onItsWay),
        ('failed', OrderJourneyStep.onItsWay),
        ('delivered', OrderJourneyStep.delivered),
      ]) {
        expect(
          orderJourneyStep(order(_order(stage: {'code': code, 'label': code}))),
          step,
          reason: code,
        );
      }
      // A WordPress shop's shipped status, without a stage.
      expect(
        orderJourneyStep(order(_order(fulfilmentStatus: 'out_for_delivery'))),
        OrderJourneyStep.onItsWay,
      );
      // Its paid order reads "preparing": still ordered.
      expect(
        orderJourneyStep(order(_order(fulfilmentStatus: 'preparing'))),
        OrderJourneyStep.ordered,
      );
      expect(
        orderJourneyStep(order(_order(status: 'completed'))),
        OrderJourneyStep.delivered,
      );
    });

    test('the four steps over the entries drawn', () {
      expect(journeyEntryIndex(OrderJourneyStep.onItsWay, 4), 2);
      expect(journeyEntryIndex(OrderJourneyStep.delivered, 3), 2);
      expect(journeyEntryIndex(OrderJourneyStep.prepared, 3), 1);
      expect(journeyEntryIndex(OrderJourneyStep.ordered, 1), 0);
      expect(journeyEntryIndex(OrderJourneyStep.delivered, 0), -1);
    });

    test("an order notification's order", () {
      expect(pushOrderId({'type': 'order_update', 'order_id': '1042'}), 1042);
      expect(pushOrderId({'type': 'announcement'}), isNull);
    });
  });
}
