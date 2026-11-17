import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';

/// The delivery days and the same-day cut-off count in the shop's time
/// (`Config.store.delivery_date.utc_offset_minutes`), wherever the phone is:
/// a gift sent from abroad.
void main() {
  DeliveryDateRules rules({int? offset}) => DeliveryDateRules.fromJson({
    'enabled': true,
    'required': true,
    'min_days': 0,
    'max_days': 14,
    'closed_weekdays': <int>[],
    'timezone': 'Asia/Dubai',
    'utc_offset_minutes': ?offset,
    'same_day_cutoff': '14:00',
  });

  test("the shop's time, from the phone's", () {
    // 11:00 in London is 15:00 in Dubai, after the shop's 14:00 cut-off.
    final phone = DateTime.utc(2026, 11, 20, 11);
    final dubai = rules(offset: 240);
    expect(dubai.utcOffsetMinutes, 240);
    final shop = dubai.shopNow(phone);
    expect([shop.year, shop.month, shop.day, shop.hour], [2026, 11, 20, 15]);
    expect(shop.isUtc, isFalse);
    expect(dubai.todayOpen(shop), isFalse);
    // Before the cut-off in Dubai, today is offered.
    expect(
      dubai.todayOpen(dubai.shopNow(DateTime.utc(2026, 11, 20, 9))),
      isTrue,
    );
  });

  test("late at night the shop's day is already the next one", () {
    final shop = rules(offset: 240).shopNow(DateTime.utc(2026, 11, 20, 22));
    expect([shop.month, shop.day, shop.hour], [11, 21, 2]);
  });

  test("an older server without the offset: the phone's own time", () {
    final phone = DateTime(2026, 11, 20, 11);
    final old = rules();
    expect(old.utcOffsetMinutes, isNull);
    expect(old.shopNow(phone), phone);
  });
}
