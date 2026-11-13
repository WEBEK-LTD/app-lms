import '../../../core/api/models/json.dart';
import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';

/// 126 The travel endpoints of the hosted API, typed (tag Travel in
/// docs/api/openapi.yaml). Everything goes through [YallappApi.travel], so
/// the app's sign-in, refresh and errors are the usual ones.
class TravelApi {
  const TravelApi(this.api);

  final YallappApi api;

  Future<Json> _get(
    String path, {
    Map<String, dynamic>? query,
    bool signedIn = false,
  }) async =>
      asJson(await api.travel('GET', path, query: query, signedIn: signedIn));

  Future<Json> _send(
    String method,
    String path, {
    Object? body,
    bool signedIn = true,
  }) async => asJson(
    await api.travel(method, path, body: body, signedIn: signedIn) ??
        const <String, dynamic>{},
  );

  Future<TravelExplore> explore({String? from, int nights = 4}) async =>
      TravelExplore.fromJson(
        await _get('/travel/explore', query: {'from': ?from, 'nights': nights}),
      );

  Future<TravelPlaces> places() async =>
      TravelPlaces.fromJson(await _get('/travel/places'));

  Future<({List<TravelHotel> items, int total, int? nights})> hotels(
    Map<String, dynamic> query,
  ) async {
    final json = await _get('/travel/hotels', query: query);
    return (
      items: listOf(json, 'items', TravelHotel.fromJson),
      total: intOr(json, 'total', 0),
      nights: optInt(json, 'nights'),
    );
  }

  Future<TravelHotel> hotel(int id, Map<String, dynamic> query) async =>
      TravelHotel.fromJson(await _get('/travel/hotels/$id', query: query));

  Future<TravelFlightSearch> flights(Map<String, dynamic> query) async =>
      TravelFlightSearch.fromJson(await _get('/travel/flights', query: query));

  Future<TravelCalendar> calendar(Map<String, dynamic> query) async =>
      TravelCalendar.fromJson(
        await _get('/travel/flights/calendar', query: query),
      );

  Future<TravelSeatMap> seats(int flightId) async =>
      TravelSeatMap.fromJson(await _get('/travel/flights/$flightId/seats'));

  Future<TravelQuote> quote(Json choice) async => TravelQuote.fromJson(
    await _send('POST', '/travel/quote', body: choice, signedIn: false),
  );

  Future<List<TravelHotel>> saved() async => listOf(
    await _get('/me/travel/saved', signedIn: true),
    'items',
    TravelHotel.fromJson,
  );

  Future<void> save(int hotelId, bool saved) => api.travel(
    saved ? 'PUT' : 'DELETE',
    '/me/travel/saved/$hotelId',
    signedIn: true,
  );

  Future<({List<TravelBooking> items, int total})> bookings({
    bool past = false,
    int page = 1,
  }) async {
    final json = await _get(
      '/me/travel/bookings',
      query: {
        'scope': past ? 'past' : 'upcoming',
        'page': page,
        'per_page': 30,
      },
      signedIn: true,
    );
    return (
      items: listOf(json, 'items', TravelBooking.fromJson),
      total: intOr(json, 'total', 0),
    );
  }

  Future<TravelBooking> booking(int id) async => TravelBooking.fromJson(
    await _get('/me/travel/bookings/$id', signedIn: true),
  );

  Future<TravelBooking> book(Json body) async => TravelBooking.fromJson(
    await _send('POST', '/me/travel/bookings', body: body),
  );

  Future<String> pay(int id) async =>
      reqString(await _send('POST', '/me/travel/bookings/$id/pay'), 'url');

  Future<TravelBooking> cancel(int id) async => TravelBooking.fromJson(
    await _send('POST', '/me/travel/bookings/$id/cancel'),
  );

  Future<TravelBooking> change(int id, Json body) async =>
      TravelBooking.fromJson(
        await _send('POST', '/me/travel/bookings/$id/change', body: body),
      );

  Future<TravelBooking> changeSeats(
    int id,
    String leg,
    List<String?> seats,
  ) async => TravelBooking.fromJson(
    await _send(
      'PUT',
      '/me/travel/bookings/$id/seats',
      body: {'leg': leg, 'seats': seats},
    ),
  );

  Future<List<TravelBoardingPass>> passes(int id) async => listOf(
    await _get('/me/travel/bookings/$id/passes', signedIn: true),
    'items',
    TravelBoardingPass.fromJson,
  );

  Future<TravelBooking> review(int id, Json body) async =>
      TravelBooking.fromJson(
        await _send('POST', '/me/travel/bookings/$id/review', body: body),
      );

  Future<List<TravelAlert>> alerts() async => listOf(
    await _get('/me/travel/alerts', signedIn: true),
    'items',
    TravelAlert.fromJson,
  );

  Future<TravelAlert> addAlert(Json body) async => TravelAlert.fromJson(
    await _send('POST', '/me/travel/alerts', body: body),
  );

  Future<void> deleteAlert(int id) =>
      api.travel('DELETE', '/me/travel/alerts/$id', signedIn: true);
}
