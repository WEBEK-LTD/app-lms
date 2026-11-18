import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/widgets/l10n.dart';
import 'package:yallapp_business/features/orders/order_screen.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 175 Yallapp Business's small gaps of the 18 November QA pass: add-ons
/// under the size they were chosen with; a signed card with no name says
/// so; Postpone and Retry offer days from the shop's today, not the
/// phone's clock.
void main() {
  const unit = Money(
    amountCents: 45000,
    currency: 'MAD',
    formatted: 'MAD 450.00',
  );
  OrderLine line(String name, {int? product, int? addonOf}) => OrderLine(
    name: name,
    quantity: 1,
    unit: unit,
    productId: product,
    addonOf: addonOf,
  );

  test('two sizes of one bouquet: each add-on under the size before it', () {
    final lines = [
      line('Atlas Roses · Small', product: 7),
      line('Greeting card', product: 30, addonOf: 7),
      line('Atlas Roses · Large', product: 7),
      line('Chocolate box', product: 31, addonOf: 7),
      line('Vase', product: 32, addonOf: 99),
    ];
    expect(addonOwners(lines), [null, 0, null, 2, null]);
    // An add-on listed before its bouquet still goes under it.
    expect(
      addonOwners([
        line('Greeting card', product: 30, addonOf: 7),
        line('Atlas Roses', product: 7),
      ]),
      [1, null],
    );
  });

  test('who signs the card: the sender, else the customer, else no one', () {
    expect(signerOf('Karim', 'Yasmine'), 'Karim');
    expect(signerOf('  ', 'Yasmine'), 'Yasmine');
    expect(signerOf(null, ''), isNull);
    expect(signerOf(null, null), isNull);
  });

  testWidgets("Postpone offers days from the shop's today", (tester) async {
    final api = FakeOwnerApi()..shopToday = '2031-03-10';
    final app = TestApp(api: api, appId: FakeOwnerApi.flowersId);
    await app.pump(tester, size: const Size(400, 1400));
    await go(tester, app, '/orders/2051');
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Postpone'));
    final element = tester.element(find.text('Postpone #2051'));
    for (final day in [
      '2031-03-10',
      '2031-03-11',
      '2031-03-12',
      '2031-03-13',
    ]) {
      expect(find.widgetWithText(ChoiceChip, element.day(day)), findsOneWidget);
    }
    expect(api.calls, contains('stageSlots'));
  });
}
