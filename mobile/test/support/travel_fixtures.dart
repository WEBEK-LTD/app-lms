import 'dart:convert';
import 'dart:io';

import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/format/dates.dart';
import 'package:yallapp/modules/travel/data/travel_providers.dart';

import 'fake_api.dart';
import 'fake_chat_api.dart';
import 'fixtures.dart';

/// 126 The travel API's answers, as the platform serves them
/// (test/support/travel_api.json, written by
/// platform/web/tests/unit/travel-app-fixture.test.ts): a resort in Luxor
/// with its rooms, Cairo ⇄ Luxor flights with their fares and seats, a stay
/// and flight booked with its boarding passes, two price alerts.
final travelApi = jsonDecode(
  File('test/support/travel_api.json').readAsStringSync(),
) as Map<String, dynamic>;

Map<String, dynamic> travelJson(String name) =>
    jsonDecode(jsonEncode(travelApi[name])) as Map<String, dynamic>;

/// A travel app's API: [mode] `both`, `hotels` or `flights`, with chat
/// ([chat]) and one hotel only ([singleHotel]).
FakeApi travelFake({
  String mode = 'both',
  bool chat = false,
  bool singleHotel = false,
}) {
  final travel = travelJson('config')
    ..['mode'] = mode
    ..['hotels'] = mode != 'flights'
    ..['flights'] = mode != 'hotels'
    ..['single_hotel_id'] = singleHotel ? 1 : null;
  final api = FakeApi(
    config: {
      ...configJson(lms: null, languages: languagesJson()),
      'travel': travel,
      if (chat) 'chat': chatConfigJson(),
    },
  );
  final booking = travelJson('booking');
  api.travelHandler = (method, path, query, body) {
    final at = '$method $path';
    if (RegExp(r'^GET /travel/hotels/\d+$').hasMatch(at)) {
      return travelJson('hotel');
    }
    if (RegExp(r'^GET /travel/flights/\d+/seats$').hasMatch(at)) {
      return travelJson('seats');
    }
    if (RegExp(r'^GET /me/travel/bookings/\d+/passes$').hasMatch(at)) {
      return travelJson('passes');
    }
    if (RegExp(r'^POST /me/travel/bookings/\d+/pay$').hasMatch(at)) {
      return {'url': 'https://pay.example.test/checkout/T-SAFRA1'};
    }
    if (RegExp(r'^POST /me/travel/bookings/\d+/(cancel|change)$')
        .hasMatch(at)) {
      return {...booking, 'status': 'cancelled'};
    }
    if (RegExp(r'^GET /me/travel/bookings/\d+$').hasMatch(at)) return booking;
    if (RegExp(r'^(PUT|DELETE) /me/travel/saved/\d+$').hasMatch(at)) {
      return null;
    }
    if (RegExp(r'^DELETE /me/travel/alerts/\d+$').hasMatch(at)) return null;
    return switch (at) {
      'GET /travel/explore' => travelJson('explore'),
      'GET /travel/places' => travelJson('places'),
      'GET /travel/hotels' when mode == 'flights' => throw const ApiException(
        statusCode: 404,
        code: 'not_found',
        message: 'This app has no hotels.',
      ),
      'GET /travel/hotels' => travelJson('hotels'),
      'GET /travel/flights' => travelJson('flights'),
      'GET /travel/flights/calendar' => travelJson('calendar'),
      'POST /travel/quote' when (body as Map)['flight'] == null => travelJson(
        'stayQuote',
      ),
      'POST /travel/quote' => travelJson('quote'),
      'GET /me/travel/saved' => {'items': travelJson('hotels')['items']},
      'GET /me/travel/bookings' when query?['scope'] == 'past' => {
        'items': <Object>[],
        'total': 0,
        'page': 1,
        'per_page': 30,
      },
      'GET /me/travel/bookings' => {
        'items': [booking],
        'total': 1,
        'page': 1,
        'per_page': 30,
      },
      'POST /me/travel/bookings' =>
        (body as Map)['payment'] == 'at_hotel' ? booking : travelJson('unpaid'),
      'GET /me/travel/alerts' => travelJson('alerts'),
      'POST /me/travel/alerts' => (travelJson('alerts')['items'] as List).last,
      _ => throw ApiException(
        statusCode: 404,
        code: 'not_found',
        message: 'No fixture for $at',
      ),
    };
  };
  return api;
}

final travelHotel = TravelHotel.fromJson(travelJson('hotel'));
final travelFlight = TravelFlightSearch.fromJson(travelJson('flights'))
    .items
    .first;
final cairo = travelFlight.outbound.from;
final luxor = travelFlight.outbound.to;

/// The fixture's dates: three nights from 14 November, flights out on the
/// 14th and back on the 18th.
StaySearch fixtureStay() => StaySearch(
  city: 'Luxor',
  checkIn: parseIsoDate('2026-11-14'),
  checkOut: parseIsoDate('2026-11-18'),
);

FlightSearch fixtureFlights() => FlightSearch(
  from: cairo,
  to: luxor,
  depart: parseIsoDate('2026-11-14'),
  back: parseIsoDate('2026-11-18'),
  adults: 2,
);

/// The resort's breakfast rate, and the flights in Classic with seats.
TripChoice stayChoice() {
  final room = travelHotel.rooms.first;
  return TripChoice(
    hotel: travelHotel,
    room: room,
    rate: room.rates.firstWhere((r) => r.id == 'bb'),
  );
}

TripChoice tripChoice() => stayChoice().copyWith(
  flight: travelFlight,
  fareId: 'standard',
  seatsOut: ['14A', '14B'],
  seatsBack: [null, null],
  bags: 1,
  transfer: true,
);
