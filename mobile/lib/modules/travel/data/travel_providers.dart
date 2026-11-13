import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/theme/fonts/remote_fonts.dart';
import 'travel_api.dart';

/// 126 What the travel screens share: the company's choices, what the person
/// is searching for, what they chose on the way to booking, and the data.

final travelConfigProvider = Provider<TravelConfig>((ref) {
  final gate = ref.watch(appGateProvider);
  return gate is GateReady
      ? (gate.config.travel ?? const TravelConfig())
      : const TravelConfig();
});

final travelApiProvider = Provider<TravelApi>(
  (ref) => TravelApi(ref.watch(yallappApiProvider)),
);

/// The large titles' and prices' font, once it is on the phone; null until then (the app's own).
final travelDisplayFontProvider = Provider<String?>((ref) {
  final config = ref.watch(travelConfigProvider);
  final family = config.displayFont;
  if (family == null) return null;
  final ready = ref.watch(remoteFontsProvider);
  if (!ready.contains(family)) {
    final fonts = ref.read(remoteFontsProvider.notifier);
    Future.microtask(() => fonts.ensure(family, config.displayFontFiles));
    return null;
  }
  return family;
});

DateTime _today() {
  final now = DateTime.now();
  return DateTime(now.year, now.month, now.day);
}

/// Where and when the person wants to stay.
class StaySearch {
  const StaySearch({
    this.city,
    this.checkIn,
    this.checkOut,
    this.guests = 2,
    this.rooms = 1,
    this.theme,
    this.freeCancellation = false,
    this.payAtHotel = false,
    this.minScore,
    this.sort = 'recommended',
  });

  final String? city;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final int guests;
  final int rooms;
  final String? theme;
  final bool freeCancellation;
  final bool payAtHotel;
  final double? minScore;
  final String sort;

  int? get nights => checkIn == null || checkOut == null
      ? null
      : checkOut!.difference(checkIn!).inDays;

  StaySearch copyWith({
    String? city,
    bool clearCity = false,
    DateTime? checkIn,
    DateTime? checkOut,
    int? guests,
    int? rooms,
    String? theme,
    bool clearTheme = false,
    bool? freeCancellation,
    bool? payAtHotel,
    double? minScore,
    bool clearScore = false,
    String? sort,
  }) => StaySearch(
    city: clearCity ? null : (city ?? this.city),
    checkIn: checkIn ?? this.checkIn,
    checkOut: checkOut ?? this.checkOut,
    guests: guests ?? this.guests,
    rooms: rooms ?? this.rooms,
    theme: clearTheme ? null : (theme ?? this.theme),
    freeCancellation: freeCancellation ?? this.freeCancellation,
    payAtHotel: payAtHotel ?? this.payAtHotel,
    minScore: clearScore ? null : (minScore ?? this.minScore),
    sort: sort ?? this.sort,
  );

  /// The dates and guests, as the API asks them.
  Map<String, dynamic> get stayQuery => {
    if (checkIn != null && checkOut != null) 'check_in': isoDate(checkIn!),
    if (checkIn != null && checkOut != null) 'check_out': isoDate(checkOut!),
    'guests': guests,
    'rooms': rooms,
  };

  Map<String, dynamic> get query => {
    ...stayQuery,
    'city': ?city,
    'theme': ?theme,
    if (freeCancellation) 'free_cancellation': true,
    if (payAtHotel) 'pay_at_hotel': true,
    'min_score': ?minScore,
    'sort': sort,
  };

  @override
  bool operator ==(Object other) =>
      other is StaySearch &&
      other.city == city &&
      other.checkIn == checkIn &&
      other.checkOut == checkOut &&
      other.guests == guests &&
      other.rooms == rooms &&
      other.theme == theme &&
      other.freeCancellation == freeCancellation &&
      other.payAtHotel == payAtHotel &&
      other.minScore == minScore &&
      other.sort == sort;

  @override
  int get hashCode => Object.hash(
    city,
    checkIn,
    checkOut,
    guests,
    rooms,
    theme,
    freeCancellation,
    payAtHotel,
    minScore,
    sort,
  );
}

class StaySearchController extends Notifier<StaySearch> {
  @override
  StaySearch build() {
    final start = addDays(_today(), 14);
    return StaySearch(checkIn: start, checkOut: addDays(start, 3));
  }

  void set(StaySearch value) => state = value;
}

final staySearchProvider = NotifierProvider<StaySearchController, StaySearch>(
  StaySearchController.new,
);

/// Where and when the person wants to fly.
class FlightSearch {
  const FlightSearch({
    this.from,
    this.to,
    this.depart,
    this.back,
    this.roundTrip = true,
    this.adults = 1,
    this.direct = false,
    this.sort = 'best',
  });

  final TravelAirport? from;
  final TravelAirport? to;
  final DateTime? depart;
  final DateTime? back;
  final bool roundTrip;
  final int adults;
  final bool direct;
  final String sort;

  bool get ready =>
      from != null &&
      to != null &&
      depart != null &&
      (!roundTrip || back != null);

  FlightSearch copyWith({
    TravelAirport? from,
    TravelAirport? to,
    DateTime? depart,
    DateTime? back,
    bool? roundTrip,
    int? adults,
    bool? direct,
    String? sort,
  }) => FlightSearch(
    from: from ?? this.from,
    to: to ?? this.to,
    depart: depart ?? this.depart,
    back: back ?? this.back,
    roundTrip: roundTrip ?? this.roundTrip,
    adults: adults ?? this.adults,
    direct: direct ?? this.direct,
    sort: sort ?? this.sort,
  );

  FlightSearch swapped() => FlightSearch(
    from: to,
    to: from,
    depart: depart,
    back: back,
    roundTrip: roundTrip,
    adults: adults,
    direct: direct,
    sort: sort,
  );

  Map<String, dynamic> get query => {
    'from': from?.code,
    'to': to?.code,
    if (depart != null) 'depart': isoDate(depart!),
    if (roundTrip && back != null) 'return': isoDate(back!),
    'adults': adults,
    if (direct) 'direct': true,
  };

  @override
  bool operator ==(Object other) =>
      other is FlightSearch &&
      other.from?.code == from?.code &&
      other.to?.code == to?.code &&
      other.depart == depart &&
      other.back == back &&
      other.roundTrip == roundTrip &&
      other.adults == adults &&
      other.direct == direct &&
      other.sort == sort;

  @override
  int get hashCode => Object.hash(
    from?.code,
    to?.code,
    depart,
    back,
    roundTrip,
    adults,
    direct,
    sort,
  );
}

class FlightSearchController extends Notifier<FlightSearch> {
  @override
  FlightSearch build() {
    final start = addDays(_today(), 14);
    return FlightSearch(depart: start, back: addDays(start, 6));
  }

  void set(FlightSearch value) => state = value;
}

final flightSearchProvider =
    NotifierProvider<FlightSearchController, FlightSearch>(
      FlightSearchController.new,
    );

/// What the person chose on the way to booking: a room and rate, a flight
/// and fare with seats, bags and meals, the transfer.
class TripChoice {
  const TripChoice({
    this.hotel,
    this.room,
    this.rate,
    this.flight,
    this.fareId = 'standard',
    this.seatsOut = const [],
    this.seatsBack = const [],
    this.bags = 0,
    this.meals = 0,
    this.transfer = false,
  });

  final TravelHotel? hotel;
  final TravelRoom? room;
  final TravelRate? rate;
  final TravelFlightOption? flight;
  final String fareId;
  final List<String?> seatsOut;
  final List<String?> seatsBack;
  final int bags;
  final int meals;
  final bool transfer;

  TravelFare? get fare =>
      flight?.fares.where((f) => f.id == fareId).firstOrNull;

  TripChoice copyWith({
    TravelHotel? hotel,
    TravelRoom? room,
    TravelRate? rate,
    TravelFlightOption? flight,
    String? fareId,
    List<String?>? seatsOut,
    List<String?>? seatsBack,
    int? bags,
    int? meals,
    bool? transfer,
    bool clearStay = false,
    bool clearFlight = false,
  }) => TripChoice(
    hotel: clearStay ? null : (hotel ?? this.hotel),
    room: clearStay ? null : (room ?? this.room),
    rate: clearStay ? null : (rate ?? this.rate),
    flight: clearFlight ? null : (flight ?? this.flight),
    fareId: fareId ?? this.fareId,
    seatsOut: clearFlight ? const [] : (seatsOut ?? this.seatsOut),
    seatsBack: clearFlight ? const [] : (seatsBack ?? this.seatsBack),
    bags: bags ?? this.bags,
    meals: meals ?? this.meals,
    transfer: transfer ?? this.transfer,
  );

  /// The choice as the quote and the booking take it (`TravelChoice`).
  Json body(StaySearch stay, FlightSearch flights) => {
    if (hotel != null &&
        room != null &&
        rate != null &&
        stay.checkIn != null &&
        stay.checkOut != null)
      'stay': {
        'hotel_id': hotel!.id,
        'room_id': room!.id,
        'rate_id': rate!.id,
        'check_in': isoDate(stay.checkIn!),
        'check_out': isoDate(stay.checkOut!),
        'guests': stay.guests,
        'rooms': stay.rooms,
      },
    if (flight != null)
      'flight': {
        'outbound_id': flight!.outbound.flightId,
        'inbound_id': flight!.inbound?.flightId,
        'fare': fareId,
        'travellers': flights.adults,
        'seats_out': seatsOut,
        'seats_back': seatsBack,
        'bags': bags,
        'meals': meals,
      },
    'transfer': transfer,
  };
}

class TripChoiceController extends Notifier<TripChoice> {
  @override
  TripChoice build() => const TripChoice();

  void set(TripChoice value) => state = value;
  void clear() => state = const TripChoice();
}

final tripChoiceProvider = NotifierProvider<TripChoiceController, TripChoice>(
  TripChoiceController.new,
);

// Data

final travelExploreProvider = FutureProvider.autoDispose<TravelExplore>((ref) {
  ref.watch(authControllerProvider.select((a) => a.isSignedIn));
  return ref.watch(travelApiProvider).explore();
});

final travelPlacesProvider = FutureProvider<TravelPlaces>(
  (ref) => ref.watch(travelApiProvider).places(),
);

final hotelSearchProvider = FutureProvider.autoDispose
    .family<({List<TravelHotel> items, int total, int? nights}), StaySearch>((
      ref,
      search,
    ) {
      ref.watch(authControllerProvider.select((a) => a.isSignedIn));
      return ref.watch(travelApiProvider).hotels(search.query);
    });

final hotelProvider = FutureProvider.autoDispose
    .family<TravelHotel, ({int id, StaySearch search})>((ref, key) {
      ref.watch(authControllerProvider.select((a) => a.isSignedIn));
      return ref.watch(travelApiProvider).hotel(key.id, key.search.stayQuery);
    });

final flightSearchResultsProvider = FutureProvider.autoDispose
    .family<TravelFlightSearch, FlightSearch>(
      (ref, search) => ref.watch(travelApiProvider).flights(search.query),
    );

final flightCalendarProvider = FutureProvider.autoDispose
    .family<
      TravelCalendar,
      ({
        String from,
        String to,
        String month,
        int? nights,
        String? depart,
        int adults,
      })
    >(
      (ref, key) => ref.watch(travelApiProvider).calendar({
        'from': key.from,
        'to': key.to,
        'month': key.month,
        'nights': ?key.nights,
        'depart': ?key.depart,
        'adults': key.adults,
      }),
    );

final seatMapProvider = FutureProvider.autoDispose.family<TravelSeatMap, int>(
  (ref, id) => ref.watch(travelApiProvider).seats(id),
);

final travelBookingsProvider = FutureProvider.autoDispose
    .family<({List<TravelBooking> items, int total}), bool>((ref, past) {
      if (!ref.watch(authControllerProvider).isSignedIn) {
        return (items: const <TravelBooking>[], total: 0);
      }
      return ref.watch(travelApiProvider).bookings(past: past);
    });

final travelBookingProvider = FutureProvider.autoDispose
    .family<TravelBooking, int>(
      (ref, id) => ref.watch(travelApiProvider).booking(id),
    );

final boardingPassesProvider = FutureProvider.autoDispose
    .family<List<TravelBoardingPass>, int>(
      (ref, id) => ref.watch(travelApiProvider).passes(id),
    );

final travelAlertsProvider = FutureProvider.autoDispose<List<TravelAlert>>((
  ref,
) {
  if (!ref.watch(authControllerProvider).isSignedIn) return const [];
  return ref.watch(travelApiProvider).alerts();
});

final savedHotelsProvider = FutureProvider.autoDispose<List<TravelHotel>>((
  ref,
) {
  if (!ref.watch(authControllerProvider).isSignedIn) return const [];
  return ref.watch(travelApiProvider).saved();
});
