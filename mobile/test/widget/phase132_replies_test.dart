import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';

import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'phase105_test.dart' show foodApi, foodApp, push, usePhone;

import 'package:yallapp/core/routing/paths.dart';

/// 132 The business's reply under the customer's own rating of a food
/// order, in the business's name (the app's); none on older servers.
void main() {
  testWidgets('the reply shows under the rating, in the business\'s name', (
    tester,
  ) async {
    usePhone(tester);
    final api = foodApi()
      ..foodOrders = [
        foodOrderJson(
          status: 'delivered',
          withCourier: true,
          rating: {
            'restaurant': 2,
            'courier': 4,
            'comment': 'Cold fries',
            'reply': {
              'text': 'Sorry! New insulated bags from today.',
              'at': '2026-11-16T10:00:00Z',
            },
          },
        ),
      ];
    final app = foodApp(api);
    await app.pump(tester);
    await push(app, tester, Paths.foodOrder(1));
    final box = find.byKey(const ValueKey('rating-reply'));
    await tester.ensureVisible(box);
    await TestApp.settle(tester);
    expect(box, findsOneWidget);
    expect(
      find.descendant(of: box, matching: find.textContaining('Reply from')),
      findsOneWidget,
    );
    expect(
      find.text('\u2068Sorry! New insulated bags from today.\u2069'),
      findsOneWidget,
    );
  });

  test('older servers: no reply', () {
    final order = FoodOrder.fromJson(
      foodOrderJson(
        status: 'delivered',
        rating: {'restaurant': 5, 'courier': null, 'comment': null},
      ),
    );
    expect(order.rated, isTrue);
    expect(order.ratingReply, isNull);
  });
}
