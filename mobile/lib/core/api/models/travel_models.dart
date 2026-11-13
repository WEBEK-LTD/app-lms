import 'config_models.dart' show FontFileRef;
import 'json.dart';

/// 126 Travel: hotels and flights (tag Travel in docs/api/openapi.yaml):
/// `Config.travel`, the hotels and their rooms, the flights and their fares,
/// the quote, the person's bookings, boarding passes and price alerts.

/// What Yallapp turned on for the project; it decides the app's tabs.
enum TravelMode { both, hotels, flights }

/// `Config.travel`.
class TravelConfig {
  const TravelConfig({
    this.mode = TravelMode.both,
    this.hotels = true,
    this.flights = true,
    this.currency = 'USD',
    this.singleHotelId,
    this.payNow = true,
    this.payAtHotel = false,
    this.memberOffPercent = 0,
    this.bundleOffPercent = 0,
    this.transfer,
    this.displayFont,
    this.displayFontFiles = const [],
    this.themes = const [],
    this.amenities = const [],
    this.helpPhone,
    this.helpEmail,
    this.helpWhatsapp,
  });

  factory TravelConfig.fromJson(Json json) {
    final payment = asJson(json['payment'] ?? const <String, dynamic>{});
    final font = json['display_font'] is Map
        ? asJson(json['display_font'])
        : null;
    final help = asJson(json['help'] ?? const <String, dynamic>{});
    return TravelConfig(
      mode: enumFrom(TravelMode.values, json['mode'], TravelMode.both),
      hotels: boolOr(json, 'hotels', true),
      flights: boolOr(json, 'flights', true),
      currency: optString(json, 'currency') ?? 'USD',
      singleHotelId: optInt(json, 'single_hotel_id'),
      payNow: boolOr(payment, 'now', true),
      payAtHotel: boolOr(payment, 'at_hotel', false),
      memberOffPercent: intOr(json, 'member_off_percent', 0),
      bundleOffPercent: intOr(json, 'bundle_off_percent', 0),
      transfer: optObject(json, 'transfer', TravelTransfer.fromJson),
      displayFont: font == null ? null : optString(font, 'family'),
      displayFontFiles: font == null
          ? const []
          : listOf(font, 'files', FontFileRef.fromJson),
      themes: stringList(json, 'themes'),
      amenities: listOf(
        json,
        'amenities',
        (j) => TravelAmenityInfo(
          id: optString(j, 'id') ?? '',
          icon: optString(j, 'icon') ?? 'check',
        ),
      ),
      helpPhone: optString(help, 'phone'),
      helpEmail: optString(help, 'email'),
      helpWhatsapp: optString(help, 'whatsapp'),
    );
  }

  final TravelMode mode;
  final bool hotels;
  final bool flights;
  final String currency;

  /// The one hotel of a company with only one: the app opens on its page.
  final int? singleHotelId;
  final bool payNow;
  final bool payAtHotel;
  final int memberOffPercent;
  final int bundleOffPercent;
  final TravelTransfer? transfer;
  final String? displayFont;
  final List<FontFileRef> displayFontFiles;
  final List<String> themes;
  final List<TravelAmenityInfo> amenities;
  final String? helpPhone;
  final String? helpEmail;
  final String? helpWhatsapp;
}

class TravelAmenityInfo {
  const TravelAmenityInfo({required this.id, required this.icon});
  final String id;
  final String icon;
}

class TravelTransfer {
  const TravelTransfer({required this.priceFormatted, this.note});
  factory TravelTransfer.fromJson(Json json) => TravelTransfer(
    priceFormatted: optString(json, 'price_formatted') ?? '',
    note: optString(json, 'note'),
  );
  final String priceFormatted;
  final String? note;
}

class TravelAirport {
  const TravelAirport({
    required this.code,
    required this.city,
    this.airport,
    this.terminal,
  });
  factory TravelAirport.fromJson(Json json) => TravelAirport(
    code: optString(json, 'code') ?? '',
    city: optString(json, 'city') ?? '',
    airport: optString(json, 'airport'),
    terminal: optString(json, 'terminal'),
  );
  final String code;
  final String city;
  final String? airport;
  final String? terminal;
}

/// A stay's price for the dates, taxes in.
class TravelPrice {
  const TravelPrice({
    required this.nights,
    required this.totalFormatted,
    required this.nightlyFormatted,
    this.wasTotalFormatted,
    this.member = false,
  });
  factory TravelPrice.fromJson(Json json) => TravelPrice(
    nights: intOr(json, 'nights', 0),
    totalFormatted: optString(json, 'total_formatted') ?? '',
    nightlyFormatted: optString(json, 'nightly_formatted') ?? '',
    wasTotalFormatted: optString(json, 'was_total_formatted'),
    member: boolOr(json, 'member', false),
  );
  final int nights;
  final String totalFormatted;
  final String nightlyFormatted;
  final String? wasTotalFormatted;
  final bool member;
}

class TravelReview {
  const TravelReview({
    required this.name,
    required this.score,
    this.trip,
    this.text,
    required this.stayed,
  });
  factory TravelReview.fromJson(Json json) => TravelReview(
    name: optString(json, 'name') ?? '',
    score: intOr(json, 'score', 0),
    trip: optString(json, 'trip'),
    text: optString(json, 'text'),
    stayed: optString(json, 'stayed') ?? '',
  );
  final String name;
  final int score;
  final String? trip;
  final String? text;
  final String stayed;
}

/// A hotel on a list (`TravelHotelCard`), and with [rooms] its page.
class TravelHotel {
  const TravelHotel({
    required this.id,
    required this.name,
    this.kind = 'hotel',
    this.stars = 0,
    required this.city,
    this.country,
    this.area,
    this.landmark,
    this.lat,
    this.lng,
    this.photoUrls = const [],
    this.score,
    this.reviews = 0,
    this.badge,
    this.themes = const [],
    this.amenities = const [],
    this.freeCancellation = false,
    this.breakfast = false,
    this.payAtHotel = false,
    this.memberPrice = false,
    this.fromNightlyFormatted,
    this.price,
    this.saved = false,
    this.description,
    this.address,
    this.phone,
    this.checkInTime = '15:00',
    this.checkOutTime = '12:00',
    this.policies,
    this.scores = const {},
    this.quote,
    this.reviewsList = const [],
    this.rooms = const [],
    this.nights,
  });

  factory TravelHotel.fromJson(Json json) {
    final scores = json['scores'] is Map
        ? asJson(json['scores'])
        : const <String, dynamic>{};
    return TravelHotel(
      id: reqInt(json, 'id'),
      name: optString(json, 'name') ?? '',
      kind: optString(json, 'kind') ?? 'hotel',
      stars: intOr(json, 'stars', 0),
      city: optString(json, 'city') ?? '',
      country: optString(json, 'country'),
      area: optString(json, 'area'),
      landmark: optString(json, 'landmark'),
      lat: optDouble(json, 'lat'),
      lng: optDouble(json, 'lng'),
      photoUrls: stringList(json, 'photo_urls'),
      score: optDouble(json, 'score'),
      reviews: intOr(json, 'reviews', 0),
      badge: optString(json, 'badge'),
      themes: stringList(json, 'themes'),
      amenities: stringList(json, 'amenities'),
      freeCancellation: boolOr(json, 'free_cancellation', false),
      breakfast: boolOr(json, 'breakfast', false),
      payAtHotel: boolOr(json, 'pay_at_hotel', false),
      memberPrice: boolOr(json, 'member_price', false),
      fromNightlyFormatted: optString(json, 'from_nightly_formatted'),
      price: optObject(json, 'price', TravelPrice.fromJson),
      saved: boolOr(json, 'saved', false),
      description: optString(json, 'description'),
      address: optString(json, 'address'),
      phone: optString(json, 'phone'),
      checkInTime: optString(json, 'check_in_time') ?? '15:00',
      checkOutTime: optString(json, 'check_out_time') ?? '12:00',
      policies: optString(json, 'policies'),
      scores: {
        for (final k in const ['staff', 'clean', 'location', 'value'])
          k: optDouble(scores, k),
      },
      quote: optObject(json, 'quote', TravelReview.fromJson),
      reviewsList: listOf(json, 'reviews_list', TravelReview.fromJson),
      rooms: listOf(json, 'rooms', TravelRoom.fromJson),
      nights: optInt(json, 'nights'),
    );
  }

  final int id;
  final String name;
  final String kind;
  final int stars;
  final String city;
  final String? country;
  final String? area;
  final String? landmark;
  final double? lat;
  final double? lng;
  final List<String> photoUrls;
  final double? score;
  final int reviews;
  final String? badge;
  final List<String> themes;
  final List<String> amenities;
  final bool freeCancellation;
  final bool breakfast;
  final bool payAtHotel;
  final bool memberPrice;
  final String? fromNightlyFormatted;
  final TravelPrice? price;
  final bool saved;
  final String? description;
  final String? address;
  final String? phone;
  final String checkInTime;
  final String checkOutTime;
  final String? policies;
  final Map<String, double?> scores;
  final TravelReview? quote;
  final List<TravelReview> reviewsList;
  final List<TravelRoom> rooms;
  final int? nights;
}

class TravelRoom {
  const TravelRoom({
    required this.id,
    required this.name,
    this.description,
    this.photoUrls = const [],
    this.sizeM2,
    this.beds,
    this.sleeps = 2,
    this.features = const [],
    this.available = true,
    this.left,
    this.rates = const [],
  });
  factory TravelRoom.fromJson(Json json) => TravelRoom(
    id: reqInt(json, 'id'),
    name: optString(json, 'name') ?? '',
    description: optString(json, 'description'),
    photoUrls: stringList(json, 'photo_urls'),
    sizeM2: optInt(json, 'size_m2'),
    beds: optString(json, 'beds'),
    sleeps: intOr(json, 'sleeps', 2),
    features: stringList(json, 'features'),
    available: boolOr(json, 'available', true),
    left: optInt(json, 'left'),
    rates: listOf(json, 'rates', TravelRate.fromJson),
  );
  final int id;
  final String name;
  final String? description;
  final List<String> photoUrls;
  final int? sizeM2;
  final String? beds;
  final int sleeps;
  final List<String> features;
  final bool available;
  final int? left;
  final List<TravelRate> rates;
}

class TravelRate {
  const TravelRate({
    required this.id,
    required this.name,
    this.board = 'room_only',
    this.refundable = false,
    this.freeCancelUntil,
    this.payNow = true,
    this.payAtHotel = false,
    this.popular = false,
    this.price,
  });
  factory TravelRate.fromJson(Json json) => TravelRate(
    id: optString(json, 'id') ?? '',
    name: optString(json, 'name') ?? '',
    board: optString(json, 'board') ?? 'room_only',
    refundable: boolOr(json, 'refundable', false),
    freeCancelUntil: optString(json, 'free_cancel_until'),
    payNow: boolOr(json, 'pay_now', true),
    payAtHotel: boolOr(json, 'pay_at_hotel', false),
    popular: boolOr(json, 'popular', false),
    price: optObject(json, 'price', TravelPrice.fromJson),
  );
  final String id;
  final String name;
  final String board;
  final bool refundable;
  final String? freeCancelUntil;
  final bool payNow;
  final bool payAtHotel;
  final bool popular;
  final TravelPrice? price;
}

class TravelCarrier {
  const TravelCarrier({
    required this.name,
    required this.code,
    required this.color,
  });
  factory TravelCarrier.fromJson(Json json) => TravelCarrier(
    name: optString(json, 'name') ?? '',
    code: optString(json, 'code') ?? '',
    color: optString(json, 'color') ?? '#0E1424',
  );
  final String name;
  final String code;
  final String color;
}

/// One flight (`TravelLeg`); in a booking with its fare and seats.
class TravelLeg {
  const TravelLeg({
    required this.flightId,
    required this.number,
    required this.carrier,
    required this.from,
    required this.to,
    required this.departs,
    required this.arrives,
    this.daysLater = 0,
    this.minutes = 0,
    this.stops = 0,
    this.via,
    this.aircraft,
    this.amenities = const [],
    this.status = 'scheduled',
    this.statusNote,
    this.gate,
    this.boardsAt,
    this.delayedDeparts,
    this.leg,
    this.fareId,
    this.fareName,
    this.seats = const [],
    this.hasSeatMap = false,
  });

  factory TravelLeg.fromJson(Json json) => TravelLeg(
    flightId: reqInt(json, 'flight_id'),
    number: optString(json, 'number') ?? '',
    carrier: TravelCarrier.fromJson(
      asJson(json['carrier'] ?? const <String, dynamic>{}),
    ),
    from: TravelAirport.fromJson(
      asJson(json['from'] ?? const <String, dynamic>{}),
    ),
    to: TravelAirport.fromJson(asJson(json['to'] ?? const <String, dynamic>{})),
    departs: optString(json, 'departs') ?? '',
    arrives: optString(json, 'arrives') ?? '',
    daysLater: intOr(json, 'days_later', 0),
    minutes: intOr(json, 'minutes', 0),
    stops: intOr(json, 'stops', 0),
    via: optString(json, 'via'),
    aircraft: optString(json, 'aircraft'),
    amenities: stringList(json, 'amenities'),
    status: optString(json, 'status') ?? 'scheduled',
    statusNote: optString(json, 'status_note'),
    gate: optString(json, 'gate'),
    boardsAt: optString(json, 'boards_at'),
    delayedDeparts: optString(json, 'delayed_departs'),
    leg: optString(json, 'leg'),
    fareId: optString(json, 'fare_id'),
    fareName: optString(json, 'fare_name'),
    seats: (json['seats'] is List)
        ? [for (final s in json['seats'] as List) s is String ? s : null]
        : const [],
    hasSeatMap: boolOr(json, 'has_seat_map', false),
  );

  final int flightId;
  final String number;
  final TravelCarrier carrier;
  final TravelAirport from;
  final TravelAirport to;

  /// Local "YYYY-MM-DDTHH:MM".
  final String departs;
  final String arrives;
  final int daysLater;
  final int minutes;
  final int stops;
  final String? via;
  final String? aircraft;
  final List<String> amenities;
  final String status;
  final String? statusNote;
  final String? gate;
  final String? boardsAt;
  final String? delayedDeparts;
  final String? leg;
  final String? fareId;
  final String? fareName;
  final List<String?> seats;
  final bool hasSeatMap;

  String get departTime =>
      departs.length >= 16 ? departs.substring(11, 16) : '';
  String get arriveTime =>
      arrives.length >= 16 ? arrives.substring(11, 16) : '';
  DateTime? get departDay =>
      DateTime.tryParse(departs.length >= 10 ? departs.substring(0, 10) : '');
}

class TravelFare {
  const TravelFare({
    required this.id,
    required this.name,
    required this.price,
    required this.priceFormatted,
    this.available = true,
    this.seatsLeft,
    this.cabinKg = 0,
    this.bags = 0,
    this.bagKg = 0,
    this.changeAllowed = false,
    this.changeFeeFormatted,
    this.refundAllowed = false,
    this.refundFeeFormatted,
    this.seat = 'standard',
    this.priority = false,
  });
  factory TravelFare.fromJson(Json json) {
    final change = asJson(json['change'] ?? const <String, dynamic>{});
    final refund = asJson(json['refund'] ?? const <String, dynamic>{});
    return TravelFare(
      id: optString(json, 'id') ?? 'standard',
      name: optString(json, 'name') ?? '',
      price: double.tryParse(optString(json, 'price') ?? '') ?? 0,
      priceFormatted: optString(json, 'price_formatted') ?? '',
      available: boolOr(json, 'available', true),
      seatsLeft: optInt(json, 'seats_left'),
      cabinKg: intOr(json, 'cabin_kg', 0),
      bags: intOr(json, 'bags', 0),
      bagKg: intOr(json, 'bag_kg', 0),
      changeAllowed: boolOr(change, 'allowed', false),
      changeFeeFormatted: optString(change, 'fee_formatted'),
      refundAllowed: boolOr(refund, 'allowed', false),
      refundFeeFormatted: optString(refund, 'fee_formatted'),
      seat: optString(json, 'seat') ?? 'standard',
      priority: boolOr(json, 'priority', false),
    );
  }
  final String id;
  final String name;
  final double price;
  final String priceFormatted;
  final bool available;
  final int? seatsLeft;
  final int cabinKg;
  final int bags;
  final int bagKg;
  final bool changeAllowed;
  final String? changeFeeFormatted;
  final bool refundAllowed;
  final String? refundFeeFormatted;
  final String seat;
  final bool priority;
}

class TravelFlightOption {
  const TravelFlightOption({
    required this.id,
    required this.outbound,
    this.inbound,
    this.fares = const [],
    required this.fromPriceFormatted,
    this.minutes = 0,
    this.tags = const [],
  });
  factory TravelFlightOption.fromJson(Json json) => TravelFlightOption(
    id: optString(json, 'id') ?? '',
    outbound: TravelLeg.fromJson(asJson(json['outbound'])),
    inbound: optObject(json, 'inbound', TravelLeg.fromJson),
    fares: listOf(json, 'fares', TravelFare.fromJson),
    fromPriceFormatted: optString(json, 'from_price_formatted') ?? '',
    minutes: intOr(json, 'minutes', 0),
    tags: stringList(json, 'tags'),
  );
  final String id;
  final TravelLeg outbound;
  final TravelLeg? inbound;
  final List<TravelFare> fares;
  final String fromPriceFormatted;
  final int minutes;
  final List<String> tags;
}

class TravelFlightSearch {
  const TravelFlightSearch({
    this.items = const [],
    this.bestFormatted,
    this.cheapestFormatted,
    this.fastestMinutes,
    this.priceLevel,
    this.position,
    this.usualFrom,
    this.usualTo,
  });
  factory TravelFlightSearch.fromJson(Json json) {
    final level = json['price_level'] is Map
        ? asJson(json['price_level'])
        : null;
    return TravelFlightSearch(
      items: listOf(json, 'items', TravelFlightOption.fromJson),
      bestFormatted: optString(json, 'best_formatted'),
      cheapestFormatted: optString(json, 'cheapest_formatted'),
      fastestMinutes: optInt(json, 'fastest_minutes'),
      priceLevel: level == null ? null : optString(level, 'level'),
      position: level == null ? null : optDouble(level, 'position'),
      usualFrom: level == null
          ? null
          : optString(level, 'usual_from_formatted'),
      usualTo: level == null ? null : optString(level, 'usual_to_formatted'),
    );
  }
  final List<TravelFlightOption> items;
  final String? bestFormatted;
  final String? cheapestFormatted;
  final int? fastestMinutes;
  final String? priceLevel;
  final double? position;
  final String? usualFrom;
  final String? usualTo;
}

class TravelCalendarDay {
  const TravelCalendarDay({
    required this.date,
    this.priceFormatted,
    this.level,
  });
  final String date;
  final String? priceFormatted;
  final String? level;
}

class TravelCalendar {
  const TravelCalendar({
    required this.month,
    this.days = const [],
    this.tipDate,
    this.tipSaving,
  });
  factory TravelCalendar.fromJson(Json json) {
    final tip = json['tip'] is Map ? asJson(json['tip']) : null;
    return TravelCalendar(
      month: optString(json, 'month') ?? '',
      days: listOf(
        json,
        'days',
        (d) => TravelCalendarDay(
          date: optString(d, 'date') ?? '',
          priceFormatted: optString(d, 'price_formatted'),
          level: optString(d, 'level'),
        ),
      ),
      tipDate: tip == null ? null : optString(tip, 'date'),
      tipSaving: tip == null ? null : optString(tip, 'saving_formatted'),
    );
  }
  final String month;
  final List<TravelCalendarDay> days;
  final String? tipDate;
  final String? tipSaving;
}

class TravelSeatRow {
  const TravelSeatRow({
    required this.number,
    this.extraLegroom = false,
    this.seats = const [],
  });
  final int number;
  final bool extraLegroom;
  final List<({String id, bool taken})> seats;
}

class TravelSeatMap {
  const TravelSeatMap({
    required this.flightId,
    this.columns = const [],
    this.rows = const [],
    this.seatPriceFormatted,
    this.extraPriceFormatted,
  });
  factory TravelSeatMap.fromJson(Json json) => TravelSeatMap(
    flightId: intOr(json, 'flight_id', 0),
    columns: stringList(json, 'columns'),
    rows: listOf(
      json,
      'rows',
      (r) => TravelSeatRow(
        number: intOr(r, 'number', 0),
        extraLegroom: boolOr(r, 'extra_legroom', false),
        seats: listOf(
          r,
          'seats',
          (s) =>
              (id: optString(s, 'id') ?? '', taken: boolOr(s, 'taken', false)),
        ),
      ),
    ),
    seatPriceFormatted: optString(json, 'seat_price_formatted'),
    extraPriceFormatted: optString(json, 'extra_price_formatted'),
  );
  final int flightId;
  final List<String> columns;
  final List<TravelSeatRow> rows;
  final String? seatPriceFormatted;
  final String? extraPriceFormatted;
}

class TravelLine {
  const TravelLine({
    required this.kind,
    this.count = 1,
    this.unitFormatted,
    required this.amountFormatted,
  });
  factory TravelLine.fromJson(Json json) => TravelLine(
    kind: optString(json, 'kind') ?? '',
    count: intOr(json, 'count', 1),
    unitFormatted: optString(json, 'unit_formatted'),
    amountFormatted: optString(json, 'amount_formatted') ?? '',
  );
  final String kind;
  final int count;
  final String? unitFormatted;
  final String amountFormatted;
}

class TravelQuote {
  const TravelQuote({
    this.lines = const [],
    required this.totalFormatted,
    this.savingFormatted,
    this.refundable = false,
    this.freeCancelUntil,
    this.payNow = true,
    this.payAtHotel = false,
  });
  factory TravelQuote.fromJson(Json json) {
    final payment = asJson(json['payment'] ?? const <String, dynamic>{});
    return TravelQuote(
      lines: listOf(json, 'lines', TravelLine.fromJson),
      totalFormatted: optString(json, 'total_formatted') ?? '',
      savingFormatted: optString(json, 'saving_formatted'),
      refundable: boolOr(json, 'refundable', false),
      freeCancelUntil: optString(json, 'free_cancel_until'),
      payNow: boolOr(payment, 'now', true),
      payAtHotel: boolOr(payment, 'at_hotel', false),
    );
  }
  final List<TravelLine> lines;
  final String totalFormatted;
  final String? savingFormatted;
  final bool refundable;
  final String? freeCancelUntil;
  final bool payNow;
  final bool payAtHotel;
}

class TravelStay {
  const TravelStay({
    required this.hotelId,
    required this.hotelName,
    this.city = '',
    this.photoUrl,
    this.phone,
    this.address,
    this.checkInTime = '15:00',
    this.checkOutTime = '12:00',
    required this.roomName,
    required this.rateName,
    this.board = 'room_only',
    required this.checkIn,
    required this.checkOut,
    this.nights = 1,
    this.guests = 2,
    this.rooms = 1,
    this.refundable = false,
    this.freeCancelUntil,
    this.canReview = false,
    this.review,
  });
  factory TravelStay.fromJson(Json json) {
    final hotel = asJson(json['hotel'] ?? const <String, dynamic>{});
    return TravelStay(
      hotelId: intOr(hotel, 'id', 0),
      hotelName: optString(hotel, 'name') ?? '',
      city: optString(hotel, 'city') ?? '',
      photoUrl: optString(hotel, 'photo_url'),
      phone: optString(hotel, 'phone'),
      address: optString(hotel, 'address'),
      checkInTime: optString(hotel, 'check_in_time') ?? '15:00',
      checkOutTime: optString(hotel, 'check_out_time') ?? '12:00',
      roomName: optString(json, 'room_name') ?? '',
      rateName: optString(json, 'rate_name') ?? '',
      board: optString(json, 'board') ?? 'room_only',
      checkIn: optString(json, 'check_in') ?? '',
      checkOut: optString(json, 'check_out') ?? '',
      nights: intOr(json, 'nights', 1),
      guests: intOr(json, 'guests', 2),
      rooms: intOr(json, 'rooms', 1),
      refundable: boolOr(json, 'refundable', false),
      freeCancelUntil: optString(json, 'free_cancel_until'),
      canReview: boolOr(json, 'can_review', false),
      review: optObject(json, 'review', TravelReview.fromJson),
    );
  }
  final int hotelId;
  final String hotelName;
  final String city;
  final String? photoUrl;
  final String? phone;
  final String? address;
  final String checkInTime;
  final String checkOutTime;
  final String roomName;
  final String rateName;
  final String board;
  final String checkIn;
  final String checkOut;
  final int nights;
  final int guests;
  final int rooms;
  final bool refundable;
  final String? freeCancelUntil;
  final bool canReview;
  final TravelReview? review;
}

class TravelBooking {
  const TravelBooking({
    required this.id,
    required this.reference,
    this.kind = 'stay',
    this.status = 'confirmed',
    this.starts = '',
    this.ends = '',
    this.stay,
    this.flights = const [],
    this.transferNote,
    this.hasTransfer = false,
    this.travellers = const [],
    this.contactName = '',
    this.paymentMethod = 'now',
    this.paymentStatus = 'unpaid',
    this.paidFormatted,
    this.dueFormatted,
    this.lines = const [],
    required this.totalFormatted,
    this.cancelled = false,
    this.refundFormatted,
    this.canCancel = false,
    this.cancelRefundFormatted,
    this.canChange = false,
    this.passesOpen = false,
  });
  factory TravelBooking.fromJson(Json json) {
    final payment = asJson(json['payment'] ?? const <String, dynamic>{});
    final cancellation = json['cancellation'] is Map
        ? asJson(json['cancellation'])
        : null;
    final transfer = json['transfer'] is Map ? asJson(json['transfer']) : null;
    return TravelBooking(
      id: reqInt(json, 'id'),
      reference: optString(json, 'reference') ?? '',
      kind: optString(json, 'kind') ?? 'stay',
      status: optString(json, 'status') ?? 'confirmed',
      starts: optString(json, 'starts') ?? '',
      ends: optString(json, 'ends') ?? '',
      stay: optObject(json, 'stay', TravelStay.fromJson),
      flights: listOf(json, 'flights', TravelLeg.fromJson),
      hasTransfer: transfer != null,
      transferNote: transfer == null ? null : optString(transfer, 'note'),
      travellers: listOf(
        json,
        'travellers',
        (t) =>
            '${optString(t, 'first_name') ?? ''} ${optString(t, 'last_name') ?? ''}'
                .trim(),
      ),
      contactName:
          optString(
            asJson(json['contact'] ?? const <String, dynamic>{}),
            'name',
          ) ??
          '',
      paymentMethod: optString(payment, 'method') ?? 'now',
      paymentStatus: optString(payment, 'status') ?? 'unpaid',
      paidFormatted: optString(payment, 'paid_formatted'),
      dueFormatted: optString(payment, 'due_formatted'),
      lines: listOf(json, 'lines', TravelLine.fromJson),
      totalFormatted: optString(json, 'total_formatted') ?? '',
      cancelled: cancellation != null,
      refundFormatted: cancellation == null
          ? null
          : optString(cancellation, 'refund_formatted'),
      canCancel: boolOr(json, 'can_cancel', false),
      cancelRefundFormatted: optString(json, 'cancel_refund_formatted'),
      canChange: boolOr(json, 'can_change', false),
      passesOpen: boolOr(json, 'passes_open', false),
    );
  }
  final int id;
  final String reference;
  final String kind;
  final String status;
  final String starts;
  final String ends;
  final TravelStay? stay;
  final List<TravelLeg> flights;
  final bool hasTransfer;
  final String? transferNote;
  final List<String> travellers;
  final String contactName;
  final String paymentMethod;
  final String paymentStatus;
  final String? paidFormatted;
  final String? dueFormatted;
  final List<TravelLine> lines;
  final String totalFormatted;
  final bool cancelled;
  final String? refundFormatted;
  final bool canCancel;
  final String? cancelRefundFormatted;
  final bool canChange;
  final bool passesOpen;
}

class TravelBoardingPass {
  const TravelBoardingPass({
    required this.leg,
    required this.flight,
    required this.passenger,
    this.seat,
    this.group = 3,
    this.fareName = '',
    required this.code,
  });
  factory TravelBoardingPass.fromJson(Json json) => TravelBoardingPass(
    leg: optString(json, 'leg') ?? 'out',
    flight: TravelLeg.fromJson(asJson(json['flight'])),
    passenger: optString(json, 'passenger') ?? '',
    seat: optString(json, 'seat'),
    group: intOr(json, 'group', 3),
    fareName: optString(json, 'fare_name') ?? '',
    code: optString(json, 'code') ?? '',
  );
  final String leg;
  final TravelLeg flight;
  final String passenger;
  final String? seat;
  final int group;
  final String fareName;
  final String code;
}

class TravelAlert {
  const TravelAlert({
    required this.id,
    this.kind = 'flight',
    required this.from,
    this.to,
    this.month,
    this.roundTrip = true,
    this.nights,
    this.travellers = 1,
    this.priceFormatted,
    this.changeFormatted,
    this.direction,
    this.advice,
    this.maxPriceFormatted,
    this.matches,
    this.photoUrl,
  });
  factory TravelAlert.fromJson(Json json) => TravelAlert(
    id: reqInt(json, 'id'),
    kind: optString(json, 'kind') ?? 'flight',
    from: TravelAirport.fromJson(
      asJson(json['from'] ?? const <String, dynamic>{}),
    ),
    to: optObject(json, 'to', TravelAirport.fromJson),
    month: optString(json, 'month'),
    roundTrip: boolOr(json, 'return', true),
    nights: optInt(json, 'nights'),
    travellers: intOr(json, 'travellers', 1),
    priceFormatted: optString(json, 'price_formatted'),
    changeFormatted: optString(json, 'change_formatted'),
    direction: optString(json, 'direction'),
    advice: optString(json, 'advice'),
    maxPriceFormatted: optString(json, 'max_price_formatted'),
    matches: optInt(json, 'matches'),
    photoUrl: optString(json, 'photo_url'),
  );
  final int id;
  final String kind;
  final TravelAirport from;
  final TravelAirport? to;
  final String? month;
  final bool roundTrip;
  final int? nights;
  final int travellers;
  final String? priceFormatted;
  final String? changeFormatted;
  final String? direction;
  final String? advice;
  final String? maxPriceFormatted;
  final int? matches;
  final String? photoUrl;
}

class TravelDestination {
  const TravelDestination({
    required this.city,
    this.country,
    this.code,
    this.photoUrl,
    this.hotels = 0,
    this.stayFromFormatted,
    this.tripFromFormatted,
  });
  factory TravelDestination.fromJson(Json json) => TravelDestination(
    city: optString(json, 'city') ?? '',
    country: optString(json, 'country'),
    code: optString(json, 'code'),
    photoUrl: optString(json, 'photo_url'),
    hotels: intOr(json, 'hotels', 0),
    stayFromFormatted: optString(json, 'stay_from_formatted'),
    tripFromFormatted: optString(json, 'trip_from_formatted'),
  );
  final String city;
  final String? country;
  final String? code;
  final String? photoUrl;
  final int hotels;
  final String? stayFromFormatted;
  final String? tripFromFormatted;
}

class TravelExplore {
  const TravelExplore({
    this.from,
    this.nights = 4,
    this.destinations = const [],
    this.featured = const [],
    this.alert,
  });
  factory TravelExplore.fromJson(Json json) => TravelExplore(
    from: optObject(json, 'from', TravelAirport.fromJson),
    nights: intOr(json, 'nights', 4),
    destinations: listOf(json, 'destinations', TravelDestination.fromJson),
    featured: listOf(json, 'featured', TravelHotel.fromJson),
    alert: optObject(json, 'alert', TravelAlert.fromJson),
  );
  final TravelAirport? from;
  final int nights;
  final List<TravelDestination> destinations;
  final List<TravelHotel> featured;
  final TravelAlert? alert;
}

class TravelPlaces {
  const TravelPlaces({this.cities = const [], this.airports = const []});
  factory TravelPlaces.fromJson(Json json) => TravelPlaces(
    cities: listOf(
      json,
      'cities',
      (c) => (
        city: optString(c, 'city') ?? '',
        country: optString(c, 'country'),
        hotels: intOr(c, 'hotels', 0),
        code: optString(c, 'code'),
      ),
    ),
    airports: listOf(json, 'airports', TravelAirport.fromJson),
  );
  final List<({String city, String? country, int hotels, String? code})> cities;
  final List<TravelAirport> airports;
}
