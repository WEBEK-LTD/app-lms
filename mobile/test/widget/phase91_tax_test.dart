import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fixtures.dart';
import 'phase91_coupon_test.dart' show openCart;
import 'store_test.dart' show storeApi;

/// 91.5 A shop's tax in the cart: its own row when added to the prices, one
/// line under the total when the prices already include it.
/// 110 The total on the cart's bar, by the Checkout button.
Finder onBar(Finder finder) => find.descendant(
  of: find.byKey(const ValueKey('cart-bar-total')),
  matching: finder,
);

void main() {
  testWidgets('a tax inside the prices is a line under the total', (
    tester,
  ) async {
    final api = storeApi(store: storeConfigJson(deliveryDate: false))
      ..cartQuote = {
        ...cartQuoteJson(),
        'shipping': '₺35.00',
        'tax': null,
        'tax_included': '₺72.50',
        'tax_label': 'KDV 20%',
        'total': '₺435.00',
        'total_amount': '435.00',
        'total_final': true,
      };
    await openCart(tester, api);
    // 110 In the summary, and on the bar by the Checkout button.
    expect(find.text('₺435.00'), findsNWidgets(2));
    expect(onBar(find.text('₺435.00')), findsOneWidget);
    expect(find.byKey(const Key('cart-tax-included')), findsOneWidget);
    expect(find.text('Includes ₺72.50 KDV 20%'), findsOneWidget);
    expect(find.text('Taxes'), findsNothing);
  });

  testWidgets('a tax added to the prices is its own row, named by the shop', (
    tester,
  ) async {
    final api = storeApi(store: storeConfigJson(deliveryDate: false))
      ..cartQuote = {
        ...cartQuoteJson(),
        'shipping': '₺35.00',
        'tax': '₺43.50',
        'tax_included': null,
        'tax_label': 'VAT 10%',
        'total': '₺478.50',
        'total_amount': '478.50',
        'total_final': true,
      };
    await openCart(tester, api);
    expect(find.text('VAT 10%'), findsOneWidget);
    expect(find.text('₺43.50'), findsOneWidget);
    // 110 In the summary, and on the bar by the Checkout button.
    expect(find.text('₺478.50'), findsNWidgets(2));
    expect(onBar(find.text('₺478.50')), findsOneWidget);
    expect(find.byKey(const Key('cart-tax-included')), findsNothing);
  });
}
