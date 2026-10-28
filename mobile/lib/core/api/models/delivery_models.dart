import 'json.dart';

/// 104 Delivery and courier companies: `Config.delivery`, shipments as the
/// customer follows them and jobs as the courier works them (tags Delivery
/// and Courier in docs/api/openapi.yaml).

enum DeliveryPricing { distance, zone, fixed }

enum DeliveryTracking { stages, live }

enum DeliveryAssignment { dispatch, open }

/// Where the couriers' screens are (`DeliveryConfig.courier_app`).
enum CourierApp { same, bundle, yallappCourier }

class DeliveryZone {
  const DeliveryZone({
    required this.id,
    required this.name,
    required this.priceFormatted,
  });

  factory DeliveryZone.fromJson(Json json) => DeliveryZone(
    id: reqString(json, 'id'),
    name: reqString(json, 'name'),
    priceFormatted: optString(json, 'price_formatted') ?? '',
  );

  final String id;
  final String name;
  final String priceFormatted;
}

/// `Config.delivery`.
class DeliveryConfig {
  const DeliveryConfig({
    this.currency = 'EGP',
    this.pricing = DeliveryPricing.fixed,
    this.zones = const [],
    this.maxDistanceKm,
    this.cash = true,
    this.card = false,
    this.tracking = DeliveryTracking.stages,
    this.assignment = DeliveryAssignment.dispatch,
    this.courierApp = CourierApp.same,
    this.tilesUrl,
    this.attribution,
  });

  factory DeliveryConfig.fromJson(Json json) {
    final payment = optObject(json, 'payment', (j) => j) ?? const {};
    final map = optObject(json, 'map', (j) => j) ?? const {};
    return DeliveryConfig(
      currency: optString(json, 'currency') ?? 'EGP',
      pricing: enumFrom(
        DeliveryPricing.values,
        json['pricing'],
        DeliveryPricing.fixed,
      ),
      zones: listOf(json, 'zones', DeliveryZone.fromJson),
      maxDistanceKm: optDouble(json, 'max_distance_km'),
      cash: boolOr(payment, 'cash', true),
      card: boolOr(payment, 'card', false),
      tracking: enumFrom(
        DeliveryTracking.values,
        json['tracking'],
        DeliveryTracking.stages,
      ),
      assignment: enumFrom(
        DeliveryAssignment.values,
        json['assignment'],
        DeliveryAssignment.dispatch,
      ),
      courierApp: enumFromSnake(
        CourierApp.values,
        json['courier_app'],
        CourierApp.same,
      ),
      tilesUrl: optString(map, 'tiles_url'),
      attribution: optString(map, 'attribution'),
    );
  }

  final String currency;
  final DeliveryPricing pricing;
  final List<DeliveryZone> zones;
  final double? maxDistanceKm;
  final bool cash;
  final bool card;
  final DeliveryTracking tracking;
  final DeliveryAssignment assignment;
  final CourierApp courierApp;

  /// The live map's tiles; null: the courier's position without a map.
  final String? tilesUrl;
  final String? attribution;

  /// Both places need their coordinates (pricing by distance).
  bool get needsCoordinates => pricing == DeliveryPricing.distance;
}

/// A service the customer chooses (`DeliveryService`).
class DeliveryService {
  const DeliveryService({
    required this.id,
    required this.name,
    this.description,
    this.imageUrl,
    this.extraFormatted,
    this.eta,
  });

  factory DeliveryService.fromJson(Json json) => DeliveryService(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    description: optString(json, 'description'),
    imageUrl: optString(json, 'image_url'),
    extraFormatted: optString(json, 'extra_formatted'),
    eta: optString(json, 'eta'),
  );

  final int id;
  final String name;
  final String? description;
  final String? imageUrl;
  final String? extraFormatted;
  final String? eta;
}

/// A pickup or drop-off place (`Place`, `PlaceInput`).
class Place {
  const Place({required this.address, this.details, this.lat, this.lng});

  factory Place.fromJson(Json json) => Place(
    address: optString(json, 'address') ?? '',
    details: optString(json, 'details'),
    lat: optDouble(json, 'lat'),
    lng: optDouble(json, 'lng'),
  );

  final String address;
  final String? details;
  final double? lat;
  final double? lng;

  bool get located => lat != null && lng != null;

  Place copyWith({
    String? address,
    String? details,
    double? lat,
    double? lng,
    bool clearLocation = false,
  }) => Place(
    address: address ?? this.address,
    details: details ?? this.details,
    lat: clearLocation ? null : (lat ?? this.lat),
    lng: clearLocation ? null : (lng ?? this.lng),
  );

  Json toJson() => {
    'address': address.trim(),
    'details': (details?.trim().isEmpty ?? true) ? null : details!.trim(),
    'lat': lat,
    'lng': lng,
  };
}

enum PackageSize { small, medium, large }

enum PaymentMethod { cash, card }

/// What the customer sends: the quote's fields, then the parcel's.
class ShipmentRequest {
  const ShipmentRequest({
    required this.pickup,
    required this.dropoff,
    this.serviceId,
    this.zoneId,
    this.recipientName = '',
    this.recipientPhone = '',
    this.size = PackageSize.small,
    this.description,
    this.notes,
    this.payment = PaymentMethod.cash,
  });

  final Place pickup;
  final Place dropoff;
  final int? serviceId;
  final String? zoneId;
  final String recipientName;
  final String recipientPhone;
  final PackageSize size;
  final String? description;
  final String? notes;
  final PaymentMethod payment;

  Json quoteJson() => {
    'pickup': pickup.toJson(),
    'dropoff': dropoff.toJson(),
    'service_id': serviceId,
    'zone_id': zoneId,
  };

  Json toJson() => {
    ...quoteJson(),
    'recipient': {'name': recipientName.trim(), 'phone': recipientPhone.trim()},
    'package': {
      'size': size.name,
      'description': (description?.trim().isEmpty ?? true)
          ? null
          : description!.trim(),
    },
    'notes': (notes?.trim().isEmpty ?? true) ? null : notes!.trim(),
    'payment': payment.name,
  };
}

/// The price before sending (`Quote`).
class Quote {
  const Quote({required this.priceFormatted, this.distanceKm});

  factory Quote.fromJson(Json json) => Quote(
    priceFormatted: reqString(json, 'price_formatted'),
    distanceKm: optDouble(json, 'distance_km'),
  );

  final String priceFormatted;
  final double? distanceKm;
}

enum ShipmentStatus {
  awaitingPayment,
  pending,
  assigned,
  pickedUp,
  onTheWay,
  delivered,
  failed,
  cancelled,
}

extension ShipmentStatusX on ShipmentStatus {
  /// Not yet delivered, failed or cancelled.
  bool get active => index <= ShipmentStatus.onTheWay.index;

  /// The courier has the parcel: the live position shows.
  bool get live =>
      this == ShipmentStatus.pickedUp || this == ShipmentStatus.onTheWay;

  /// The customer may still cancel.
  bool get cancellable =>
      this == ShipmentStatus.awaitingPayment || this == ShipmentStatus.pending;
}

ShipmentStatus shipmentStatusFrom(Object? wire) =>
    enumFromSnake(ShipmentStatus.values, wire, ShipmentStatus.pending);

class ShipmentStage {
  const ShipmentStage({required this.status, required this.at, this.note});

  factory ShipmentStage.fromJson(Json json) => ShipmentStage(
    status: shipmentStatusFrom(json['status']),
    at: reqDate(json, 'at'),
    note: optString(json, 'note'),
  );

  final ShipmentStatus status;
  final DateTime at;
  final String? note;
}

class CourierPosition {
  const CourierPosition({
    required this.lat,
    required this.lng,
    required this.updatedAt,
  });

  factory CourierPosition.fromJson(Json json) => CourierPosition(
    lat: optDouble(json, 'lat') ?? 0,
    lng: optDouble(json, 'lng') ?? 0,
    updatedAt: reqDate(json, 'updated_at'),
  );

  final double lat;
  final double lng;
  final DateTime updatedAt;
}

/// A shipment as its customer follows it (`Shipment`).
class Shipment {
  const Shipment({
    required this.id,
    required this.reference,
    required this.status,
    required this.pickup,
    required this.dropoff,
    required this.recipientName,
    required this.recipientPhone,
    required this.priceFormatted,
    required this.payment,
    required this.paid,
    required this.createdAt,
    this.serviceName,
    this.zoneName,
    this.distanceKm,
    this.size = PackageSize.small,
    this.description,
    this.notes,
    this.courierName,
    this.courierPhone,
    this.courierPosition,
    this.timeline = const [],
  });

  factory Shipment.fromJson(Json json) {
    final package = optObject(json, 'package', (j) => j) ?? const {};
    final recipient = optObject(json, 'recipient', (j) => j) ?? const {};
    final payment = optObject(json, 'payment', (j) => j) ?? const {};
    final courier = optObject(json, 'courier', (j) => j);
    return Shipment(
      id: reqInt(json, 'id'),
      reference: reqString(json, 'reference'),
      status: shipmentStatusFrom(json['status']),
      pickup:
          optObject(json, 'pickup', Place.fromJson) ?? const Place(address: ''),
      dropoff:
          optObject(json, 'dropoff', Place.fromJson) ??
          const Place(address: ''),
      recipientName: optString(recipient, 'name') ?? '',
      recipientPhone: optString(recipient, 'phone') ?? '',
      priceFormatted: optString(json, 'price_formatted') ?? '',
      payment: enumFrom(
        PaymentMethod.values,
        payment['method'],
        PaymentMethod.cash,
      ),
      paid: payment['status'] == 'paid',
      createdAt: reqDate(json, 'created_at'),
      serviceName: optObject<String?>(
        json,
        'service',
        (j) => optString(j, 'name'),
      ),
      zoneName: optObject<String?>(json, 'zone', (j) => optString(j, 'name')),
      distanceKm: optDouble(json, 'distance_km'),
      size: enumFrom(PackageSize.values, package['size'], PackageSize.small),
      description: optString(package, 'description'),
      notes: optString(json, 'notes'),
      courierName: courier == null ? null : optString(courier, 'name'),
      courierPhone: courier == null ? null : optString(courier, 'phone'),
      courierPosition: optObject(
        json,
        'courier_location',
        CourierPosition.fromJson,
      ),
      timeline: listOf(json, 'timeline', ShipmentStage.fromJson),
    );
  }

  final int id;
  final String reference;
  final ShipmentStatus status;
  final Place pickup;
  final Place dropoff;
  final String recipientName;
  final String recipientPhone;
  final String priceFormatted;
  final PaymentMethod payment;
  final bool paid;
  final DateTime createdAt;
  final String? serviceName;
  final String? zoneName;
  final double? distanceKm;
  final PackageSize size;
  final String? description;
  final String? notes;
  final String? courierName;
  final String? courierPhone;
  final CourierPosition? courierPosition;
  final List<ShipmentStage> timeline;
}

/// The signed-in courier (`Courier`).
class CourierProfile {
  const CourierProfile({
    required this.id,
    required this.name,
    this.phone,
    this.vehicle,
    this.onDuty = false,
    this.assignment = DeliveryAssignment.dispatch,
    this.deliveredToday = 0,
  });

  factory CourierProfile.fromJson(Json json) => CourierProfile(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    phone: optString(json, 'phone'),
    vehicle: optString(json, 'vehicle'),
    onDuty: boolOr(json, 'on_duty', false),
    assignment: enumFrom(
      DeliveryAssignment.values,
      json['assignment'],
      DeliveryAssignment.dispatch,
    ),
    deliveredToday: intOr(json, 'delivered_today', 0),
  );

  final int id;
  final String name;
  final String? phone;
  final String? vehicle;
  final bool onDuty;
  final DeliveryAssignment assignment;
  final int deliveredToday;
}

enum JobScope { active, available, done }

/// A courier's next steps from a stage; `released` gives the job back.
enum JobStep { pickedUp, onTheWay, delivered, failed, released }

/// A shipment as its courier works it (`CourierJob`).
class CourierJob {
  const CourierJob({
    required this.id,
    required this.reference,
    required this.status,
    required this.pickup,
    required this.dropoff,
    required this.senderName,
    required this.recipientName,
    required this.createdAt,
    this.service,
    this.distanceKm,
    this.size = PackageSize.small,
    this.description,
    this.notes,
    this.senderPhone,
    this.recipientPhone,
    this.collectFormatted,
    this.timeline = const [],
  });

  factory CourierJob.fromJson(Json json) {
    final package = optObject(json, 'package', (j) => j) ?? const {};
    final sender = optObject(json, 'sender', (j) => j) ?? const {};
    final recipient = optObject(json, 'recipient', (j) => j) ?? const {};
    return CourierJob(
      id: reqInt(json, 'id'),
      reference: reqString(json, 'reference'),
      status: shipmentStatusFrom(json['status']),
      pickup:
          optObject(json, 'pickup', Place.fromJson) ?? const Place(address: ''),
      dropoff:
          optObject(json, 'dropoff', Place.fromJson) ??
          const Place(address: ''),
      senderName: optString(sender, 'name') ?? '',
      senderPhone: optString(sender, 'phone'),
      recipientName: optString(recipient, 'name') ?? '',
      recipientPhone: optString(recipient, 'phone'),
      createdAt: reqDate(json, 'created_at'),
      service: optString(json, 'service'),
      distanceKm: optDouble(json, 'distance_km'),
      size: enumFrom(PackageSize.values, package['size'], PackageSize.small),
      description: optString(package, 'description'),
      notes: optString(json, 'notes'),
      collectFormatted: optString(json, 'collect_formatted'),
      timeline: listOf(json, 'timeline', ShipmentStage.fromJson),
    );
  }

  final int id;
  final String reference;
  final ShipmentStatus status;
  final Place pickup;
  final Place dropoff;
  final String senderName;
  final String? senderPhone;
  final String recipientName;
  final String? recipientPhone;
  final DateTime createdAt;
  final String? service;
  final double? distanceKm;
  final PackageSize size;
  final String? description;
  final String? notes;

  /// Cash to collect at the drop-off; null when paid by card.
  final String? collectFormatted;
  final List<ShipmentStage> timeline;

  /// The steps the courier may take now, in order.
  List<JobStep> get steps => switch (status) {
    ShipmentStatus.assigned => const [JobStep.pickedUp, JobStep.released],
    ShipmentStatus.pickedUp => const [
      JobStep.onTheWay,
      JobStep.delivered,
      JobStep.failed,
    ],
    ShipmentStatus.onTheWay => const [JobStep.delivered, JobStep.failed],
    _ => const [],
  };
}
