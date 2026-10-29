import 'delivery_models.dart';
import 'json.dart';

/// 105.2 Ride hailing: `Config.rides`, the fares before asking, the
/// rider's rides and the driver's (tags Rides and Driver in
/// docs/api/openapi.yaml).

/// How fares are worked out (`RidesConfig.fare_mode`).
enum FareMode { upfront, metered }

/// How rides reach the drivers (`RidesConfig.matching`).
enum RideMatching { nearest, dispatch }

/// Where the drivers' screens are (`RidesConfig.driver_app`).
enum DriverApp { same, bundle }

/// A kind of vehicle riders choose (`VehicleType`).
class VehicleType {
  const VehicleType({
    required this.id,
    required this.name,
    this.description,
    this.icon = 'directions_car',
    this.imageUrl,
    this.seats = 4,
  });

  factory VehicleType.fromJson(Json json) => VehicleType(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    description: optString(json, 'description'),
    icon: optString(json, 'icon') ?? 'directions_car',
    imageUrl: optString(json, 'image_url'),
    seats: intOr(json, 'seats', 4),
  );

  final int id;
  final String name;
  final String? description;
  final String icon;
  final String? imageUrl;
  final int seats;
}

/// `Config.rides`.
class RidesConfig {
  const RidesConfig({
    this.currency = 'EGP',
    this.timezone = 'Africa/Cairo',
    this.vehicleTypes = const [],
    this.cash = true,
    this.card = false,
    this.fareMode = FareMode.upfront,
    this.scheduling = false,
    this.matching = RideMatching.nearest,
    this.freeCancelMinutes = 2,
    this.cancelFeeFormatted,
    this.noShowMinutes = 5,
    this.pin = false,
    this.emergencyPhone,
    this.driverApp = DriverApp.same,
    this.tilesUrl,
    this.attribution,
  });

  factory RidesConfig.fromJson(Json json) {
    final payment = optObject(json, 'payment', (j) => j) ?? const {};
    final map = optObject(json, 'map', (j) => j) ?? const {};
    final cancellation = optObject(json, 'cancellation', (j) => j) ?? const {};
    return RidesConfig(
      currency: optString(json, 'currency') ?? 'EGP',
      timezone: optString(json, 'timezone') ?? 'Africa/Cairo',
      vehicleTypes: listOf(json, 'vehicle_types', VehicleType.fromJson),
      cash: boolOr(payment, 'cash', true),
      card: boolOr(payment, 'card', false),
      fareMode: enumFrom(FareMode.values, json['fare_mode'], FareMode.upfront),
      scheduling: boolOr(json, 'scheduling', false),
      matching: enumFrom(
        RideMatching.values,
        json['matching'],
        RideMatching.nearest,
      ),
      freeCancelMinutes: intOr(cancellation, 'free_minutes', 2),
      cancelFeeFormatted: optString(cancellation, 'fee_formatted'),
      noShowMinutes: intOr(cancellation, 'no_show_minutes', 5),
      pin: boolOr(json, 'pin', false),
      emergencyPhone: optString(json, 'emergency_phone'),
      driverApp: enumFrom(DriverApp.values, json['driver_app'], DriverApp.same),
      tilesUrl: optString(map, 'tiles_url'),
      attribution: optString(map, 'attribution'),
    );
  }

  final String currency;
  final String timezone;
  final List<VehicleType> vehicleTypes;
  final bool cash;
  final bool card;
  final FareMode fareMode;
  final bool scheduling;
  final RideMatching matching;
  final int freeCancelMinutes;
  final String? cancelFeeFormatted;
  final int noShowMinutes;
  final bool pin;

  /// The company's number the SOS button calls; null: the phone's emergency number.
  final String? emergencyPhone;
  final DriverApp driverApp;
  final String? tilesUrl;
  final String? attribution;

  /// What the delivery screens' map and place picker read.
  DeliveryConfig get mapConfig => DeliveryConfig(
    currency: currency,
    cash: cash,
    card: card,
    // Both places need their coordinates.
    pricing: DeliveryPricing.distance,
    tracking: DeliveryTracking.live,
    tilesUrl: tilesUrl,
    attribution: attribution,
  );
}

/// What the rider asks for: the places, when, a promo code.
class RideRequest {
  const RideRequest({
    required this.pickup,
    required this.dropoff,
    this.scheduledAt,
    this.promoCode,
    this.vehicleTypeId,
    this.payment = PaymentMethod.cash,
    this.notes,
  });

  final Place pickup;
  final Place dropoff;
  final DateTime? scheduledAt;
  final String? promoCode;
  final int? vehicleTypeId;
  final PaymentMethod payment;
  final String? notes;

  Json estimateJson() => {
    'pickup': pickup.toJson(),
    'dropoff': dropoff.toJson(),
    'scheduled_at': scheduledAt?.toUtc().toIso8601String(),
    'promo_code': (promoCode?.trim().isEmpty ?? true)
        ? null
        : promoCode!.trim(),
  };

  Json toJson() => {
    ...estimateJson(),
    'vehicle_type_id': vehicleTypeId,
    'payment': payment.name,
    'notes': (notes?.trim().isEmpty ?? true) ? null : notes!.trim(),
  };

  RideRequest copyWith({
    int? vehicleTypeId,
    PaymentMethod? payment,
    String? notes,
  }) => RideRequest(
    pickup: pickup,
    dropoff: dropoff,
    scheduledAt: scheduledAt,
    promoCode: promoCode,
    vehicleTypeId: vehicleTypeId ?? this.vehicleTypeId,
    payment: payment ?? this.payment,
    notes: notes ?? this.notes,
  );
}

/// One vehicle type's fare between the two places.
class RideOption {
  const RideOption({
    required this.vehicleType,
    required this.fareFormatted,
    required this.available,
    this.pickupMinutes,
  });

  factory RideOption.fromJson(Json json) => RideOption(
    vehicleType: VehicleType.fromJson(
      asJson(json['vehicle_type'], 'vehicle_type'),
    ),
    fareFormatted: reqString(json, 'fare_formatted'),
    available: boolOr(json, 'available', false),
    pickupMinutes: optInt(json, 'pickup_minutes'),
  );

  final VehicleType vehicleType;
  final String fareFormatted;

  /// An online driver of this type is near.
  final bool available;
  final int? pickupMinutes;
}

/// The fares before asking (`RideEstimate`).
class RideEstimate {
  const RideEstimate({
    required this.distanceKm,
    required this.minutes,
    required this.options,
    this.discountFormatted,
    this.previousFeeFormatted,
  });

  factory RideEstimate.fromJson(Json json) => RideEstimate(
    distanceKm: optDouble(json, 'distance_km') ?? 0,
    minutes: intOr(json, 'minutes', 1),
    options: listOf(json, 'options', RideOption.fromJson),
    discountFormatted: optString(json, 'discount_formatted'),
    previousFeeFormatted: optString(json, 'previous_fee_formatted'),
  );

  final double distanceKm;
  final int minutes;
  final List<RideOption> options;
  final String? discountFormatted;
  final String? previousFeeFormatted;
}

enum RideStatus {
  scheduled,
  searching,
  accepted,
  arrived,
  inProgress,
  completed,
  cancelled,
  noDriver,
}

extension RideStatusX on RideStatus {
  /// Not yet over (scheduled ones too).
  bool get active => index <= RideStatus.inProgress.index;

  /// A driver has it and it isn't over: their position shows.
  bool get withDriver =>
      this == RideStatus.accepted ||
      this == RideStatus.arrived ||
      this == RideStatus.inProgress;

  /// The rider may still cancel.
  bool get cancellable => index <= RideStatus.arrived.index;
}

RideStatus rideStatusFrom(Object? wire) =>
    enumFromSnake(RideStatus.values, wire, RideStatus.searching);

class RideStage {
  const RideStage({required this.status, required this.at, this.note});

  factory RideStage.fromJson(Json json) => RideStage(
    status: rideStatusFrom(json['status']),
    at: reqDate(json, 'at'),
    note: optString(json, 'note'),
  );

  final RideStatus status;
  final DateTime at;
  final String? note;
}

/// The driver of a ride, as the rider sees them.
class RideDriver {
  const RideDriver({
    required this.name,
    this.phone,
    this.photoUrl,
    this.rating,
    this.carModel,
    this.carColor,
    this.plate,
  });

  factory RideDriver.fromJson(Json json) {
    final car = optObject(json, 'car', (j) => j) ?? const {};
    return RideDriver(
      name: reqString(json, 'name'),
      phone: optString(json, 'phone'),
      photoUrl: optString(json, 'photo_url'),
      rating: optDouble(json, 'rating'),
      carModel: optString(car, 'model'),
      carColor: optString(car, 'color'),
      plate: optString(car, 'plate'),
    );
  }

  final String name;
  final String? phone;
  final String? photoUrl;
  final double? rating;
  final String? carModel;
  final String? carColor;
  final String? plate;

  /// "White Toyota Corolla".
  String get car => [carColor, carModel].whereType<String>().join(' ');
}

/// Where the driver is.
class DriverPosition {
  const DriverPosition({
    required this.lat,
    required this.lng,
    this.heading,
    required this.updatedAt,
  });

  factory DriverPosition.fromJson(Json json) => DriverPosition(
    lat: optDouble(json, 'lat') ?? 0,
    lng: optDouble(json, 'lng') ?? 0,
    heading: optDouble(json, 'heading'),
    updatedAt: reqDate(json, 'updated_at'),
  );

  final double lat;
  final double lng;
  final double? heading;
  final DateTime updatedAt;
}

/// Who cancelled a ride, why, and the fee charged.
class RideCancellation {
  const RideCancellation({required this.by, this.reason, this.feeFormatted});

  factory RideCancellation.fromJson(Json json) => RideCancellation(
    by: optString(json, 'by') ?? 'rider',
    reason: optString(json, 'reason'),
    feeFormatted: optString(json, 'fee_formatted'),
  );

  final String by;
  final String? reason;
  final String? feeFormatted;
}

/// A ride as its rider follows it (`Ride`).
class Ride {
  const Ride({
    required this.id,
    required this.reference,
    required this.status,
    required this.vehicleTypeName,
    this.vehicleTypeIcon = 'directions_car',
    required this.pickup,
    required this.dropoff,
    this.scheduledAt,
    this.distanceKm = 0,
    this.minutes = 0,
    required this.fareFormatted,
    this.isFinal = false,
    this.payment = PaymentMethod.cash,
    this.paid = false,
    this.pin,
    this.notes,
    this.driver,
    this.driverLocation,
    this.pickupMinutes,
    this.shareUrl,
    this.cancellation,
    this.rated,
    this.timeline = const [],
    required this.createdAt,
  });

  factory Ride.fromJson(Json json) {
    final type = optObject(json, 'vehicle_type', (j) => j) ?? const {};
    final payment = optObject(json, 'payment', (j) => j) ?? const {};
    final rating = optObject(json, 'rating', (j) => j);
    return Ride(
      id: reqInt(json, 'id'),
      reference: reqString(json, 'reference'),
      status: rideStatusFrom(json['status']),
      vehicleTypeName: optString(type, 'name') ?? '',
      vehicleTypeIcon: optString(type, 'icon') ?? 'directions_car',
      pickup: Place.fromJson(asJson(json['pickup'], 'pickup')),
      dropoff: Place.fromJson(asJson(json['dropoff'], 'dropoff')),
      scheduledAt: optDate(json, 'scheduled_at'),
      distanceKm: optDouble(json, 'distance_km') ?? 0,
      minutes: intOr(json, 'minutes', 0),
      fareFormatted: optString(json, 'fare_formatted') ?? '',
      isFinal: boolOr(json, 'final', false),
      payment: enumFrom(
        PaymentMethod.values,
        payment['method'],
        PaymentMethod.cash,
      ),
      paid: payment['status'] == 'paid',
      pin: optString(json, 'pin'),
      notes: optString(json, 'notes'),
      driver: optObject(json, 'driver', RideDriver.fromJson),
      driverLocation: optObject(
        json,
        'driver_location',
        DriverPosition.fromJson,
      ),
      pickupMinutes: optInt(json, 'pickup_minutes'),
      shareUrl: optString(json, 'share_url'),
      cancellation: optObject(json, 'cancellation', RideCancellation.fromJson),
      rated: rating == null ? null : intOr(rating, 'driver', 5),
      timeline: listOf(json, 'timeline', RideStage.fromJson),
      createdAt: reqDate(json, 'created_at'),
    );
  }

  final int id;
  final String reference;
  final RideStatus status;
  final String vehicleTypeName;
  final String vehicleTypeIcon;
  final Place pickup;
  final Place dropoff;
  final DateTime? scheduledAt;
  final double distanceKm;
  final int minutes;
  final String fareFormatted;

  /// The fare is the one charged (or a cancellation fee).
  final bool isFinal;
  final PaymentMethod payment;
  final bool paid;

  /// The code to tell the driver, until the ride starts.
  final String? pin;
  final String? notes;
  final RideDriver? driver;
  final DriverPosition? driverLocation;
  final int? pickupMinutes;
  final String? shareUrl;
  final RideCancellation? cancellation;

  /// The stars the rider gave, once rated.
  final int? rated;
  final List<RideStage> timeline;
  final DateTime createdAt;

  /// A card ride ended and not paid yet.
  bool get toPay =>
      status == RideStatus.completed && payment == PaymentMethod.card && !paid;
}

/// The signed-in driver (`Driver`).
class DriverProfile {
  const DriverProfile({
    required this.id,
    required this.name,
    this.photoUrl,
    this.vehicleTypeName,
    this.vehicleTypeId,
    this.car = '',
    this.plate,
    this.online = false,
    this.rating,
    this.ratingsCount = 0,
    this.activeRideId,
    this.ridesToday = 0,
    this.earnedToday = '',
  });

  factory DriverProfile.fromJson(Json json) {
    final type = optObject(json, 'vehicle_type', (j) => j);
    final car = optObject(json, 'car', (j) => j) ?? const {};
    final today = optObject(json, 'today', (j) => j) ?? const {};
    return DriverProfile(
      id: reqInt(json, 'id'),
      name: reqString(json, 'name'),
      photoUrl: optString(json, 'photo_url'),
      vehicleTypeName: type == null ? null : optString(type, 'name'),
      vehicleTypeId: type == null ? null : optInt(type, 'id'),
      car: [
        optString(car, 'color'),
        optString(car, 'model'),
      ].whereType<String>().join(' '),
      plate: optString(car, 'plate'),
      online: boolOr(json, 'online', false),
      rating: optDouble(json, 'rating'),
      ratingsCount: intOr(json, 'ratings_count', 0),
      activeRideId: optInt(json, 'active_ride_id'),
      ridesToday: intOr(today, 'rides', 0),
      earnedToday: optString(today, 'earned_formatted') ?? '',
    );
  }

  final int id;
  final String name;
  final String? photoUrl;
  final String? vehicleTypeName;

  /// 105.9 Written with the driver's live position.
  final int? vehicleTypeId;
  final String car;
  final String? plate;
  final bool online;
  final double? rating;
  final int ratingsCount;
  final int? activeRideId;
  final int ridesToday;
  final String earnedToday;
}

/// The driver's lists (`GET /driver/rides?scope=`).
enum DriverRideScope { active, done }

/// A driver's step (`POST /driver/rides/{id}/status`).
enum DriverStep { arrived, inProgress, completed, cancelled }

/// Why a driver cancels.
enum DriverCancelReason { riderNoShow, other }

/// A ride as its driver sees it (`DriverRide`).
class DriverRide {
  const DriverRide({
    required this.id,
    required this.reference,
    required this.status,
    this.vehicleTypeName = '',
    required this.pickup,
    required this.dropoff,
    this.distanceKm = 0,
    this.minutes = 0,
    required this.fareFormatted,
    this.isFinal = false,
    this.payment = PaymentMethod.cash,
    this.collectFormatted,
    this.notes,
    required this.riderName,
    this.riderPhone,
    this.offerExpiresAt,
    this.pickupKm,
    this.waitingSince,
    this.startedAt,
    this.timeline = const [],
  });

  factory DriverRide.fromJson(Json json) {
    final payment = optObject(json, 'payment', (j) => j) ?? const {};
    final rider = optObject(json, 'rider', (j) => j) ?? const {};
    return DriverRide(
      id: reqInt(json, 'id'),
      reference: reqString(json, 'reference'),
      status: rideStatusFrom(json['status']),
      vehicleTypeName: optString(json, 'vehicle_type') ?? '',
      pickup: Place.fromJson(asJson(json['pickup'], 'pickup')),
      dropoff: Place.fromJson(asJson(json['dropoff'], 'dropoff')),
      distanceKm: optDouble(json, 'distance_km') ?? 0,
      minutes: intOr(json, 'minutes', 0),
      fareFormatted: optString(json, 'fare_formatted') ?? '',
      isFinal: boolOr(json, 'final', false),
      payment: enumFrom(
        PaymentMethod.values,
        payment['method'],
        PaymentMethod.cash,
      ),
      collectFormatted: optString(json, 'collect_formatted'),
      notes: optString(json, 'notes'),
      riderName: optString(rider, 'name') ?? '',
      riderPhone: optString(rider, 'phone'),
      offerExpiresAt: optDate(json, 'offer_expires_at'),
      pickupKm: optDouble(json, 'pickup_km'),
      waitingSince: optDate(json, 'waiting_since'),
      startedAt: optDate(json, 'started_at'),
      timeline: listOf(json, 'timeline', RideStage.fromJson),
    );
  }

  final int id;
  final String reference;
  final RideStatus status;
  final String vehicleTypeName;
  final Place pickup;
  final Place dropoff;
  final double distanceKm;
  final int minutes;
  final String fareFormatted;
  final bool isFinal;
  final PaymentMethod payment;

  /// Cash to collect; null for a card ride.
  final String? collectFormatted;
  final String? notes;
  final String riderName;
  final String? riderPhone;

  /// On an offer: when it goes to the next driver.
  final DateTime? offerExpiresAt;
  final double? pickupKm;
  final DateTime? waitingSince;
  final DateTime? startedAt;
  final List<RideStage> timeline;
}

/// What the driver made over a period (`DriverEarnings`).
class DriverEarnings {
  const DriverEarnings({
    required this.rides,
    required this.faresFormatted,
    required this.cashFormatted,
    required this.companyShareFormatted,
    required this.earnedFormatted,
    this.days = const [],
  });

  factory DriverEarnings.fromJson(Json json) => DriverEarnings(
    rides: intOr(json, 'rides', 0),
    faresFormatted: optString(json, 'fares_formatted') ?? '',
    cashFormatted: optString(json, 'cash_formatted') ?? '',
    companyShareFormatted: optString(json, 'company_share_formatted') ?? '',
    earnedFormatted: optString(json, 'earned_formatted') ?? '',
    days: listOf(
      json,
      'days',
      (d) => (
        date: optString(d, 'date') ?? '',
        rides: intOr(d, 'rides', 0),
        earned: optString(d, 'earned_formatted') ?? '',
      ),
    ),
  );

  final int rides;
  final String faresFormatted;
  final String cashFormatted;
  final String companyShareFormatted;
  final String earnedFormatted;
  final List<({String date, int rides, String earned})> days;
}

/// The period of the driver's earnings.
enum EarningsPeriod { today, week, month }

/// Why a rider cancels (`POST /me/rides/{id}/cancel`).
enum RiderCancelReason {
  changedPlans,
  driverLate,
  driverAsked,
  wrongPlace,
  other,
}
