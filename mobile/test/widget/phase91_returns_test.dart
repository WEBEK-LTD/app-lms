import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'events_test.dart' show usePhone;

/// 91.3 Returns: a completed order the shop takes back within its days is
/// returned from the order: a reason, a note (needed with "Another reason"),
/// then the request and the shop's answer show on it.

Map<String, dynamic> _completed({
  bool canReturn = true,
  Map<String, dynamic>? request,
}) => {
  ...orderJson(),
  'status': 'completed',
  'status_label': 'Completed',
  'items': [
    {'name': 'Chocolate Box', 'quantity': 2, 'course_id': null},
  ],
  'can_return': canReturn,
  'return_request': request,
};

TestApp _shop(FakeApi api, [String? language]) => TestApp(
  signedIn: true,
  appType: AppType.store,
  api: api,
  preferences: {'settings.language': ?language},
);

void main() {
  test('the models read the return, and older servers mean none', () {
    final order = Order.fromJson(
      _completed(
        canReturn: false,
        request: {
          'status': 'approved',
          'reason': 'wrong_item',
          'note': null,
          'requested_at': '2026-10-24T10:00:00Z',
          'decided_at': '2026-10-25T09:00:00Z',
          'reply': 'Our courier picks it up on Monday.',
        },
      ),
    );
    expect(order.returnRequest!.status, ReturnStatus.approved);
    expect(order.returnRequest!.reason, ReturnReason.wrongItem);
    expect(order.returnRequest!.decidedAt, DateTime.utc(2026, 10, 25, 9));
    expect(order.opensScreen, isTrue);
    final old = Order.fromJson(orderJson());
    expect(old.returnRequest, isNull);
    expect(old.canReturn, isFalse);
    expect(old.opensScreen, isFalse);
    expect(
      StoreConfig.fromJson({
        ...storeConfigJson(),
        'returns': {'enabled': true, 'days': 14},
      }).returns!.days,
      14,
    );
    expect(StoreConfig.fromJson(storeConfigJson()).returns, isNull);
  });

  testWidgets('a completed order opens from My orders and is returned', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi(config: configJson(lms: null, orders: true))
      ..orders = [_completed()]
      ..order = _completed();
    final app = _shop(api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.orders);
    await TestApp.settle(tester);
    await tester.tap(find.text('Completed'));
    await TestApp.settle(tester);
    await tester.tap(find.byKey(const Key('order-return')));
    await TestApp.settle(tester);
    expect(find.text('Why are you returning it?'), findsOneWidget);

    // "Another reason" needs a note before it can be sent.
    await tester.tap(find.byKey(const Key('return-reason-other')));
    await tester.pump();
    expect(find.text('Tell the shop why'), findsOneWidget);
    await tester.tap(find.byKey(const Key('return-send')));
    await tester.pump();
    expect(api.count('requestReturn'), 0);

    await tester.tap(find.byKey(const Key('return-reason-damaged')));
    await tester.enterText(
      find.byKey(const Key('return-note')),
      ' The box arrived crushed ',
    );
    await tester.pump();
    await tester.tap(find.byKey(const Key('return-send')));
    await TestApp.settle(tester);
    expect(api.lastReturn?.reason, ReturnReason.damaged);
    expect(api.lastReturn?.note, 'The box arrived crushed');
    expect(
      find.text('Return requested. The shop will answer here.'),
      findsOneWidget,
    );
    expect(find.text('Return requested'), findsOneWidget);
    expect(find.text('It arrived damaged'), findsOneWidget);
    expect(find.byKey(const Key('order-return')), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('in Arabic, the shop\'s answer with its reply', (tester) async {
    usePhone(tester);
    final api =
        FakeApi(
            config: configJson(
              lms: null,
              orders: true,
              languages: languagesJson(available: const ['en', 'ar', 'tr']),
            ),
          )
          ..order = _completed(
            canReturn: false,
            request: {
              'status': 'declined',
              'reason': 'no_longer_needed',
              'note': null,
              'requested_at': '2026-10-24T10:00:00Z',
              'decided_at': '2026-10-25T09:00:00Z',
              'reply': 'المنتج مفتوح.',
            },
          );
    final app = _shop(api, 'ar');
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/account/orders/1042');
    await TestApp.settle(tester);
    expect(find.text('تم رفض الإرجاع'), findsOneWidget);
    expect(find.text('لم أعد بحاجة إليه'), findsOneWidget);
    expect(find.text('المتجر: المنتج مفتوح.'), findsOneWidget);
    expect(find.byKey(const Key('order-return')), findsNothing);
  });
}
