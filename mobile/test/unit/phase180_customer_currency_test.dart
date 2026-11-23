import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';

import '../support/travel_fixtures.dart';

/// 180.12–180.13 Travel, events, homes and campaigns in the customer's
/// currency when the server sent it (`display`); as before when it didn't.
void main() {
  const egp = {'currency': 'EGP', 'rate': 50, 'rate_date': '2026-11-18'};

  test('a stay: its cheapest night and its price, in Egyptian pounds', () {
    final json = travelJson('hotels')['items'][0] as Map<String, dynamic>;
    final plain = TravelHotel.fromJson(json);
    final card = {
      ...json,
      'display': {...egp, 'from_nightly_formatted': 'E£7,500.00'},
      'price': {
        ...(json['price'] as Map<String, dynamic>),
        'display': {
          ...egp,
          'total_formatted': 'E£28,200.00',
          'nightly_formatted': 'E£9,400.00',
        },
      },
    };
    final shown = TravelHotel.fromJson(card);
    expect(shown.fromNightlyFormatted, '≈ E£7,500.00');
    expect(shown.price!.totalFormatted, '≈ E£28,200.00');
    expect(shown.price!.nightlyFormatted, '≈ E£9,400.00');
    // An older server: the company's prices, as before.
    expect(plain.price!.totalFormatted, startsWith(r'$'));
  });

  test('a fare and the calendar\'s days', () {
    final option = travelJson('flights')['items'][0] as Map<String, dynamic>;
    final fare = {
      ...(option['fares'] as List).first as Map<String, dynamic>,
      'display': {...egp, 'price_formatted': 'E£12,000.00'},
    };
    expect(TravelFare.fromJson(fare).priceFormatted, '≈ E£12,000.00');
  });

  test('the quote and the booking: what the card is charged, in the '
      'company\'s currency', () {
    final quote = {
      ...travelJson('quote'),
      'display': {...egp, 'total_formatted': 'E£50,000.00'},
    };
    expect(
      TravelQuote.fromJson(quote).totalFormatted,
      travelJson('quote')['total_formatted'],
    );
  });

  test('an event\'s cheapest ticket beside its words', () {
    String? label(Map<String, dynamic> extra) =>
        eventPriceLabel({'price_label': 'From E£150.00', ...extra});
    expect(
      label({
        'price_from': {
          'amount': '150.00',
          'currency': 'EGP',
          'formatted': 'E£150.00',
          'display': {'currency': 'USD', 'rate': 0.02, 'formatted': r'$3.00'},
        },
      }),
      allOf(contains('From E£150.00'), contains(r'≈ $3.00')),
    );
    expect(label({}), 'From E£150.00');
    expect(eventPriceLabel({'price_label': null}), isNull);
  });

  test('a home\'s price', () {
    final price = ListingPrice.fromJson({
      'amount': '4250000.00',
      'currency': 'EGP',
      'formatted': 'EGP 4,250,000',
      'period': null,
      'display': {'currency': 'USD', 'rate': 0.02, 'formatted': r'$85,000.00'},
    });
    expect(price.formatted, r'≈ $85,000.00');
    expect(price.amount, '4250000.00');
  });
}
