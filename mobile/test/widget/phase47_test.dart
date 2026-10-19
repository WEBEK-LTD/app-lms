import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'donations_test.dart' show charityApi, charityApp;
import 'events_test.dart' show eventsApi, eventsApp, usePhone;

/// 47 Refunds made from the dashboard reach the app: an order shows what was
/// refunded, a fully refunded one says "Refunded" (a restaurant's too, whatever
/// step it reached), a refunded ticket is cancelled and says "Refunded", and a
/// refunded donation stays in My donations with the amount refunded.

void main() {
  test('the models read the refunds, and older servers mean none', () {
    final partly = Order.fromJson({
      ...orderJson(),
      'refunded_total': '₺100.00',
    });
    expect(partly.refundedTotal, '₺100.00');
    expect(Order.fromJson(orderJson()).refundedTotal, isNull);

    final refunded = Ticket.fromJson({
      ...ticketJson(status: 'cancelled', canCancel: false),
      'refunded': true,
    });
    expect(refunded.status, TicketStatus.cancelled);
    expect(refunded.refunded, isTrue);
    // The offline copy keeps it.
    expect(Ticket.fromJson(refunded.toJson()).refunded, isTrue);
    expect(Ticket.fromJson(ticketJson()).refunded, isFalse);

    final donation = Donation.fromJson({
      ...donationJson(),
      'refunded_total': '₺300.00',
    });
    expect(donation.refundedTotal, '₺300.00');
    expect(Donation.fromJson(donationJson()).refundedTotal, isNull);
  });

  testWidgets('an order shows what the shop refunded of it', (tester) async {
    usePhone(tester);
    final api = FakeApi(config: configJson(lms: null, orders: true))
      ..order = {
        ...orderJson(),
        'status': 'completed',
        'status_label': 'Completed',
        'refunded_total': '₺100.00',
      };
    final app = TestApp(signedIn: true, appType: AppType.store, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/account/orders/1042');
    await TestApp.settle(tester);
    expect(find.text('Refunded ₺100.00'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a refunded restaurant order says Refunded, not its step', (
    tester,
  ) async {
    usePhone(tester);
    final api = FakeApi(config: restaurantConfigJson())
      ..order = {
        ...restaurantOrderJson(status: 'ready'),
        'status': 'refunded',
        'status_label': 'Refunded',
        'refunded_total': '₺680.00',
      };
    final app = TestApp(signedIn: true, appType: AppType.store, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/account/orders/7');
    await TestApp.settle(tester);
    expect(find.text('Refunded ₺680.00'), findsOneWidget);
  });

  testWidgets('a refunded ticket is cancelled and says Refunded', (
    tester,
  ) async {
    usePhone(tester);
    final api = eventsApi()
      ..tickets = [
        {
          ...ticketJson(status: 'cancelled', canCancel: false),
          'refunded': true,
        },
        ticketJson(code: 'AAAABBBBCCCC', status: 'cancelled', canCancel: false),
      ];
    final app = eventsApp(api);
    await app.pump(tester);
    app.container.read(appRouterProvider).go(Paths.tickets);
    await TestApp.settle(tester);
    expect(find.text('Refunded'), findsOneWidget);
    expect(find.text('Cancelled'), findsOneWidget);
    expect(find.text('Valid'), findsNothing);
  });

  testWidgets('My donations keeps a refunded donation, with the amount', (
    tester,
  ) async {
    usePhone(tester);
    final api = charityApi()
      ..donations = [
        {...donationJson(), 'refunded_total': '₺300.00'},
      ];
    final app = charityApp(api, signedIn: true);
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel('My donations').last);
    await TestApp.settle(tester);
    expect(find.textContaining('D-1042'), findsOneWidget);
    expect(find.text('Refunded ₺300.00'), findsOneWidget);
  });
}
