import 'json.dart';

/// 26 Restaurants and cafés: a dish's options, pickup and delivery, the
/// kitchen's times and where an order is.

/// Money in cents from an API amount ("20.00"); 0 when it isn't one.
int centsOf(String? amount) {
  final value = double.tryParse(amount ?? '');
  return value == null ? 0 : (value * 100).round();
}

/// One choice of an [OptionGroup].
class ProductOption {
  const ProductOption({
    required this.id,
    required this.name,
    required this.priceDelta,
    this.priceDeltaFormatted,
  });

  factory ProductOption.fromJson(Json json) => ProductOption(
    id: reqString(json, 'id'),
    name: reqString(json, 'name'),
    priceDelta: optString(json, 'price_delta') ?? '0.00',
    priceDeltaFormatted: optString(json, 'price_delta_formatted'),
  );

  final String id;
  final String name;

  /// Added to the unit price, as an amount.
  final String priceDelta;

  /// "+₺20.00"; null when free.
  final String? priceDeltaFormatted;

  int get priceDeltaCents => centsOf(priceDelta);
}

/// A choice made before adding a product to the cart (`option_groups`).
class OptionGroup {
  const OptionGroup({
    required this.id,
    required this.name,
    required this.min,
    required this.max,
    required this.options,
  });

  factory OptionGroup.fromJson(Json json) => OptionGroup(
    id: reqString(json, 'id'),
    name: reqString(json, 'name'),
    min: intOr(json, 'min', 0),
    max: intOr(json, 'max', 1),
    options: listOf(json, 'options', ProductOption.fromJson),
  );

  final String id;
  final String name;
  final int min;
  final int max;
  final List<ProductOption> options;

  bool get required => min > 0;

  /// One option at most: picked like a radio button.
  bool get single => max == 1;
}

/// Whether [chosen] option IDs satisfy every group's min and max, as the
/// server checks them.
bool optionsComplete(List<OptionGroup> groups, Set<String> chosen) =>
    groups.every((g) {
      final picked = g.options.where((o) => chosen.contains(o.id)).length;
      return picked >= g.min && picked <= g.max;
    });

/// The groups that still need a choice.
List<OptionGroup> missingGroups(List<OptionGroup> groups, Set<String> chosen) =>
    [
      for (final g in groups)
        if (g.options.where((o) => chosen.contains(o.id)).length < g.min) g,
    ];

/// The price the chosen options add, in cents (shown only: the server prices
/// the cart).
int optionsDeltaCents(List<OptionGroup> groups, Set<String> chosen) => [
  for (final g in groups)
    for (final o in g.options)
      if (chosen.contains(o.id)) o.priceDeltaCents,
].fold(0, (a, b) => a + b);

/// An option as the cart priced it.
class CartLineOption {
  const CartLineOption({
    required this.id,
    required this.name,
    required this.group,
  });

  factory CartLineOption.fromJson(Json json) => CartLineOption(
    id: reqString(json, 'id'),
    name: reqString(json, 'name'),
    group: optString(json, 'group') ?? '',
  );

  final String id;
  final String name;
  final String group;
}

enum FulfilmentType { pickup, delivery }

/// Opening hours of one day.
class OpeningRange {
  const OpeningRange({required this.start, required this.end});

  factory OpeningRange.fromJson(Json json) => OpeningRange(
    start: reqString(json, 'start'),
    end: reqString(json, 'end'),
  );

  final String start;
  final String end;
}

/// `StoreConfig.fulfilment`: pickup and delivery of a restaurant or café.
class FulfilmentConfig {
  const FulfilmentConfig({
    required this.pickup,
    required this.delivery,
    required this.prepMinutes,
    required this.timezone,
    required this.hours,
    required this.asap,
    required this.scheduled,
    this.pickupAddress,
    this.minOrder,
    this.minOrderFormatted,
    this.deliveryFee,
    this.deliveryFeeFormatted,
    this.deliveryAreas = const [],
    this.deliveryNote,
  });

  factory FulfilmentConfig.fromJson(Json json) {
    final slots = json['scheduled_slots'] is Map
        ? asJson(json['scheduled_slots'])
        : const <String, dynamic>{};
    final rawHours = json['hours'] is List ? json['hours'] as List : const [];
    return FulfilmentConfig(
      pickup: boolOr(json, 'pickup', false),
      delivery: boolOr(json, 'delivery', false),
      pickupAddress: optString(json, 'pickup_address'),
      minOrder: optString(json, 'min_order'),
      minOrderFormatted: optString(json, 'min_order_formatted'),
      deliveryFee: optString(json, 'delivery_fee'),
      deliveryFeeFormatted: optString(json, 'delivery_fee_formatted'),
      deliveryAreas: stringList(json, 'delivery_areas'),
      deliveryNote: optString(json, 'delivery_note'),
      prepMinutes: intOr(json, 'prep_minutes', 0),
      timezone: optString(json, 'timezone') ?? 'Europe/Istanbul',
      hours: [
        for (final day in rawHours)
          [
            if (day is List)
              for (final range in day)
                if (range is Map) OpeningRange.fromJson(asJson(range)),
          ],
      ],
      asap: boolOr(json, 'asap', true),
      scheduled: boolOr(slots, 'enabled', false),
    );
  }

  final bool pickup;
  final bool delivery;
  final String? pickupAddress;

  /// The smallest subtotal for a delivery, as an amount.
  final String? minOrder;
  final String? minOrderFormatted;
  final String? deliveryFee;
  final String? deliveryFeeFormatted;
  final List<String> deliveryAreas;
  final String? deliveryNote;
  final int prepMinutes;
  final String timezone;

  /// Sunday first.
  final List<List<OpeningRange>> hours;
  final bool asap;
  final bool scheduled;

  List<FulfilmentType> get types => [
    if (pickup) FulfilmentType.pickup,
    if (delivery) FulfilmentType.delivery,
  ];
}

/// `GET /store/order-times`: whether the kitchen is open and when an order
/// can be for.
class OrderTimes {
  const OrderTimes({
    required this.openNow,
    required this.asap,
    required this.readyInMinutes,
    required this.slots,
    this.opensAt,
    this.closesAt,
  });

  factory OrderTimes.fromJson(Json json) => OrderTimes(
    openNow: boolOr(json, 'open_now', false),
    opensAt: optDate(json, 'opens_at'),
    closesAt: optDate(json, 'closes_at'),
    asap: boolOr(json, 'asap', false),
    readyInMinutes: intOr(json, 'ready_in_minutes', 0),
    slots: [
      for (final s
          in (json['slots'] is List ? json['slots'] as List : const []))
        if (s is String && DateTime.tryParse(s) != null) DateTime.parse(s),
    ],
  );

  final bool openNow;
  final DateTime? opensAt;
  final DateTime? closesAt;

  /// An order as soon as possible can be placed now.
  final bool asap;
  final int readyInMinutes;
  final List<DateTime> slots;
}

/// Where the order goes, as the customer typed it.
class DeliveryAddress {
  const DeliveryAddress({required this.address, this.district, this.notes});

  factory DeliveryAddress.fromJson(Json json) => DeliveryAddress(
    address: reqString(json, 'address'),
    district: optString(json, 'district'),
    notes: optString(json, 'notes'),
  );

  final String address;
  final String? district;
  final String? notes;

  Json toJson() => {
    'address': address.trim(),
    'district': district,
    'notes': (notes ?? '').trim().isEmpty ? null : notes!.trim(),
  };
}

/// Where a restaurant's order is: forward only, or cancelled.
enum FulfilmentStatus {
  received,
  preparing,
  ready,
  outForDelivery,
  completed,
  cancelled,
}

FulfilmentStatus? fulfilmentStatusFrom(Object? wire) {
  for (final s in FulfilmentStatus.values) {
    if (snake(s) == wire) return s;
  }
  return null;
}

/// How a restaurant's order is collected (`Order.fulfilment`).
class OrderFulfilment {
  const OrderFulfilment({
    required this.type,
    this.scheduledFor,
    this.address,
    this.deliveryFee,
  });

  factory OrderFulfilment.fromJson(Json json) => OrderFulfilment(
    type: enumFrom(FulfilmentType.values, json['type'], FulfilmentType.pickup),
    scheduledFor: optDate(json, 'scheduled_for'),
    address: optObject(json, 'delivery_address', DeliveryAddress.fromJson),
    deliveryFee: optString(json, 'delivery_fee'),
  );

  final FulfilmentType type;
  final DateTime? scheduledFor;
  final DeliveryAddress? address;
  final String? deliveryFee;
}

/// The steps an order goes through, for its tracking screen.
List<FulfilmentStatus> fulfilmentSteps(FulfilmentType type) => [
  FulfilmentStatus.received,
  FulfilmentStatus.preparing,
  FulfilmentStatus.ready,
  if (type == FulfilmentType.delivery) FulfilmentStatus.outForDelivery,
  FulfilmentStatus.completed,
];
