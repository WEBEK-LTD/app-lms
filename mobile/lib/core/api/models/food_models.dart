import 'delivery_models.dart';
import 'json.dart';

/// 105.1 Food delivery from many restaurants: `Config.food`, the
/// restaurants and their menus, a cart priced by the server, the
/// customer's orders and the restaurant's (tags Food and Restaurant in
/// docs/api/openapi.yaml).

/// A cuisine the company files its restaurants under.
class Cuisine {
  const Cuisine({required this.id, required this.name});

  factory Cuisine.fromJson(Json json) =>
      Cuisine(id: reqString(json, 'id'), name: reqString(json, 'name'));

  final String id;
  final String name;
}

/// When an order's courier job is made (`FoodConfig.courier_job`).
enum FoodCourierJob { accepted, ready }

/// `Config.food`.
class FoodConfig {
  const FoodConfig({
    this.currency = 'EGP',
    this.timezone = 'Africa/Cairo',
    this.cuisines = const [],
    this.cash = true,
    this.card = false,
    this.tracking = DeliveryTracking.stages,
    this.courierJob = FoodCourierJob.accepted,
    this.tilesUrl,
    this.attribution,
  });

  factory FoodConfig.fromJson(Json json) {
    final payment = optObject(json, 'payment', (j) => j) ?? const {};
    final map = optObject(json, 'map', (j) => j) ?? const {};
    return FoodConfig(
      currency: optString(json, 'currency') ?? 'EGP',
      timezone: optString(json, 'timezone') ?? 'Africa/Cairo',
      cuisines: listOf(json, 'cuisines', Cuisine.fromJson),
      cash: boolOr(payment, 'cash', true),
      card: boolOr(payment, 'card', false),
      tracking: enumFrom(
        DeliveryTracking.values,
        json['tracking'],
        DeliveryTracking.stages,
      ),
      courierJob: enumFrom(
        FoodCourierJob.values,
        json['courier_job'],
        FoodCourierJob.accepted,
      ),
      tilesUrl: optString(map, 'tiles_url'),
      attribution: optString(map, 'attribution'),
    );
  }

  final String currency;
  final String timezone;
  final List<Cuisine> cuisines;
  final bool cash;
  final bool card;
  final DeliveryTracking tracking;
  final FoodCourierJob courierJob;
  final String? tilesUrl;
  final String? attribution;

  /// What the delivery screens' map and place picker read.
  DeliveryConfig get mapConfig => DeliveryConfig(
    currency: currency,
    cash: cash,
    card: card,
    tracking: tracking,
    tilesUrl: tilesUrl,
    attribution: attribution,
  );
}

/// A restaurant in the list (`RestaurantSummary`).
class RestaurantSummary {
  const RestaurantSummary({
    required this.id,
    required this.name,
    this.logoUrl,
    this.coverUrl,
    this.cuisines = const [],
    this.rating,
    this.ratingsCount = 0,
    this.open = true,
    this.opensAt,
    this.busy = false,
    this.prepMinutes = 20,
    this.deliveryMinutes,
    this.minOrderFormatted,
    this.deliveryFeeFormatted,
    this.distanceKm,
    this.delivers,
  });

  factory RestaurantSummary.fromJson(Json json) => RestaurantSummary(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    logoUrl: optString(json, 'logo_url'),
    coverUrl: optString(json, 'cover_url'),
    cuisines: stringList(json, 'cuisines'),
    rating: optDouble(json, 'rating'),
    ratingsCount: intOr(json, 'ratings_count', 0),
    open: boolOr(json, 'open', true),
    opensAt: optDate(json, 'opens_at'),
    busy: boolOr(json, 'busy', false),
    prepMinutes: intOr(json, 'prep_minutes', 20),
    deliveryMinutes: optInt(json, 'delivery_minutes'),
    minOrderFormatted: optString(json, 'min_order_formatted'),
    deliveryFeeFormatted: optString(json, 'delivery_fee_formatted'),
    distanceKm: optDouble(json, 'distance_km'),
    delivers: json['delivers'] is bool ? json['delivers'] as bool : null,
  );

  final int id;
  final String name;
  final String? logoUrl;
  final String? coverUrl;
  final List<String> cuisines;
  final double? rating;
  final int ratingsCount;

  /// Taking orders now.
  final bool open;

  /// While closed: the next opening.
  final DateTime? opensAt;
  final bool busy;
  final int prepMinutes;
  final int? deliveryMinutes;
  final String? minOrderFormatted;
  final String? deliveryFeeFormatted;
  final double? distanceKm;

  /// Null when it isn't known (no position, or prices by area).
  final bool? delivers;
}

class DishChoice {
  const DishChoice({
    required this.id,
    required this.name,
    this.extraFormatted,
    this.available = true,
  });

  factory DishChoice.fromJson(Json json) => DishChoice(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    extraFormatted: optString(json, 'extra_formatted'),
    available: boolOr(json, 'available', true),
  );

  final int id;
  final String name;
  final String? extraFormatted;
  final bool available;
}

/// A dish's choices: one to pick (`min` 1) or extras up to `max`.
class DishChoiceGroup {
  const DishChoiceGroup({
    required this.id,
    required this.name,
    this.min = 0,
    this.max = 1,
    this.choices = const [],
  });

  factory DishChoiceGroup.fromJson(Json json) => DishChoiceGroup(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    min: intOr(json, 'min', 0),
    max: intOr(json, 'max', 1),
    choices: listOf(json, 'choices', DishChoice.fromJson),
  );

  final int id;
  final String name;
  final int min;
  final int max;
  final List<DishChoice> choices;

  bool get required => min > 0;

  /// Whether these choices of the group are enough and not too many.
  bool fits(Iterable<int> chosen) {
    final n = chosen.where((id) => choices.any((c) => c.id == id)).length;
    return n >= min && n <= max;
  }
}

class Dish {
  const Dish({
    required this.id,
    required this.name,
    required this.priceFormatted,
    this.description,
    this.imageUrl,
    this.available = true,
    this.popular = false,
    this.choiceGroups = const [],
  });

  factory Dish.fromJson(Json json) => Dish(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    description: optString(json, 'description'),
    imageUrl: optString(json, 'image_url'),
    priceFormatted: optString(json, 'price_formatted') ?? '',
    available: boolOr(json, 'available', true),
    popular: boolOr(json, 'popular', false),
    choiceGroups: listOf(json, 'choice_groups', DishChoiceGroup.fromJson),
  );

  final int id;
  final String name;
  final String? description;
  final String? imageUrl;
  final String priceFormatted;

  /// False while sold out.
  final bool available;
  final bool popular;
  final List<DishChoiceGroup> choiceGroups;
}

class FoodMenuSection {
  const FoodMenuSection({
    required this.id,
    required this.name,
    this.dishes = const [],
  });

  factory FoodMenuSection.fromJson(Json json) => FoodMenuSection(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    dishes: listOf(json, 'dishes', Dish.fromJson),
  );

  final int id;
  final String name;
  final List<Dish> dishes;
}

class OpeningHours {
  const OpeningHours({
    required this.day,
    required this.opens,
    required this.closes,
  });

  factory OpeningHours.fromJson(Json json) => OpeningHours(
    day: reqString(json, 'day'),
    opens: reqString(json, 'opens'),
    closes: reqString(json, 'closes'),
  );

  /// `mon` to `sun`.
  final String day;
  final String opens;
  final String closes;
}

/// A restaurant with its menu (`Restaurant`).
class Restaurant {
  const Restaurant({
    required this.summary,
    this.description,
    this.address = const Place(address: ''),
    this.phone,
    this.hours = const [],
    this.menu = const [],
  });

  factory Restaurant.fromJson(Json json) => Restaurant(
    summary: RestaurantSummary.fromJson(json),
    description: optString(json, 'description'),
    address:
        optObject(json, 'address', Place.fromJson) ?? const Place(address: ''),
    phone: optString(json, 'phone'),
    hours: listOf(json, 'hours', OpeningHours.fromJson),
    menu: listOf(json, 'menu', FoodMenuSection.fromJson),
  );

  final RestaurantSummary summary;
  final String? description;
  final Place address;
  final String? phone;
  final List<OpeningHours> hours;
  final List<FoodMenuSection> menu;

  int get id => summary.id;
  String get name => summary.name;

  Dish? dish(int id) {
    for (final section in menu) {
      for (final dish in section.dishes) {
        if (dish.id == id) return dish;
      }
    }
    return null;
  }
}

/// A line of the cart, as it goes to the server (`FoodCartInput.lines`).
class FoodCartLine {
  const FoodCartLine({
    required this.dishId,
    required this.name,
    required this.quantity,
    this.choices = const [],
    this.choiceNames = const [],
    this.note,
  });

  final int dishId;
  final String name;
  final int quantity;
  final List<int> choices;

  /// What the customer chose, to show in the cart.
  final List<String> choiceNames;
  final String? note;

  FoodCartLine withQuantity(int quantity) => FoodCartLine(
    dishId: dishId,
    name: name,
    quantity: quantity,
    choices: choices,
    choiceNames: choiceNames,
    note: note,
  );

  /// The same dish with the same choices and note.
  bool sameAs(FoodCartLine other) =>
      dishId == other.dishId &&
      note == other.note &&
      choices.length == other.choices.length &&
      choices.toSet().containsAll(other.choices);

  Json toJson() => {
    'dish_id': dishId,
    'quantity': quantity,
    'choices': choices,
    'note': (note?.trim().isEmpty ?? true) ? null : note!.trim(),
  };
}

/// What the customer orders: one restaurant's cart, where to and how to pay.
class FoodOrderRequest {
  const FoodOrderRequest({
    required this.restaurantId,
    required this.lines,
    required this.dropoff,
    this.zoneId,
    this.payment = PaymentMethod.cash,
    this.phone,
    this.notes,
  });

  final int restaurantId;
  final List<FoodCartLine> lines;
  final Place dropoff;
  final String? zoneId;
  final PaymentMethod payment;
  final String? phone;
  final String? notes;

  Json cartJson() => {
    'restaurant_id': restaurantId,
    'lines': [for (final l in lines) l.toJson()],
    'dropoff': dropoff.toJson(),
    'zone_id': zoneId,
  };

  Json toJson() => {
    ...cartJson(),
    'payment': payment.name,
    'phone': (phone?.trim().isEmpty ?? true) ? null : phone!.trim(),
    'notes': (notes?.trim().isEmpty ?? true) ? null : notes!.trim(),
  };
}

/// A line of a priced cart or an order (`FoodOrderLine`).
class FoodOrderLine {
  const FoodOrderLine({
    required this.name,
    required this.quantity,
    required this.totalFormatted,
    this.dishId,
    this.choices = const [],
    this.note,
  });

  factory FoodOrderLine.fromJson(Json json) => FoodOrderLine(
    dishId: optInt(json, 'dish_id'),
    name: reqString(json, 'name'),
    quantity: intOr(json, 'quantity', 1),
    choices: stringList(json, 'choices'),
    note: optString(json, 'note'),
    totalFormatted: optString(json, 'total_formatted') ?? '',
  );

  final int? dishId;
  final String name;
  final int quantity;
  final List<String> choices;
  final String? note;
  final String totalFormatted;
}

/// The cart's prices before ordering (`FoodQuote`).
class FoodQuote {
  const FoodQuote({
    required this.lines,
    required this.subtotalFormatted,
    required this.deliveryFeeFormatted,
    required this.totalFormatted,
    this.distanceKm,
    this.deliveryMinutes,
  });

  factory FoodQuote.fromJson(Json json) => FoodQuote(
    lines: listOf(json, 'lines', FoodOrderLine.fromJson),
    subtotalFormatted: optString(json, 'subtotal_formatted') ?? '',
    deliveryFeeFormatted: optString(json, 'delivery_fee_formatted') ?? '',
    totalFormatted: optString(json, 'total_formatted') ?? '',
    distanceKm: optDouble(json, 'distance_km'),
    deliveryMinutes: optInt(json, 'delivery_minutes'),
  );

  final List<FoodOrderLine> lines;
  final String subtotalFormatted;
  final String deliveryFeeFormatted;
  final String totalFormatted;
  final double? distanceKm;
  final int? deliveryMinutes;
}

enum FoodOrderStatus {
  awaitingPayment,
  placed,
  accepted,
  ready,
  pickedUp,
  onTheWay,
  delivered,
  rejected,
  cancelled,
  failed,
}

extension FoodOrderStatusX on FoodOrderStatus {
  /// Not yet delivered, turned down, cancelled or failed.
  bool get active => index <= FoodOrderStatus.onTheWay.index;

  /// The courier has it: the live position shows.
  bool get live =>
      this == FoodOrderStatus.pickedUp || this == FoodOrderStatus.onTheWay;

  /// The customer may still cancel (the restaurant hasn't accepted it).
  bool get cancellable =>
      this == FoodOrderStatus.awaitingPayment || this == FoodOrderStatus.placed;
}

FoodOrderStatus foodOrderStatusFrom(Object? wire) =>
    enumFromSnake(FoodOrderStatus.values, wire, FoodOrderStatus.placed);

/// Why a restaurant turned an order down.
enum FoodRejection { closing, tooBusy, itemUnavailable, other }

class FoodOrderStage {
  const FoodOrderStage({required this.status, required this.at, this.note});

  factory FoodOrderStage.fromJson(Json json) => FoodOrderStage(
    status: foodOrderStatusFrom(json['status']),
    at: reqDate(json, 'at'),
    note: optString(json, 'note'),
  );

  final FoodOrderStatus status;
  final DateTime at;
  final String? note;
}

/// A food order as its customer follows it (`FoodOrder`).
class FoodOrder {
  const FoodOrder({
    required this.id,
    required this.reference,
    required this.status,
    required this.restaurantName,
    required this.totalFormatted,
    required this.createdAt,
    this.restaurantId,
    this.restaurantLogoUrl,
    this.restaurantPhone,
    this.lines = const [],
    this.subtotalFormatted = '',
    this.deliveryFeeFormatted = '',
    this.payment = PaymentMethod.cash,
    this.paid = false,
    this.dropoff = const Place(address: ''),
    this.notes,
    this.readyAt,
    this.rejection,
    this.rejectionNote,
    this.courierName,
    this.courierPhone,
    this.courierPosition,
    this.ratedRestaurant,
    this.ratedCourier,
    this.timeline = const [],
  });

  factory FoodOrder.fromJson(Json json) {
    final restaurant = optObject(json, 'restaurant', (j) => j) ?? const {};
    final payment = optObject(json, 'payment', (j) => j) ?? const {};
    final courier = optObject(json, 'courier', (j) => j);
    final rejection = optObject(json, 'rejection', (j) => j);
    final rating = optObject(json, 'rating', (j) => j);
    return FoodOrder(
      id: reqInt(json, 'id'),
      reference: reqString(json, 'reference'),
      status: foodOrderStatusFrom(json['status']),
      restaurantId: optInt(restaurant, 'id'),
      restaurantName: optString(restaurant, 'name') ?? '',
      restaurantLogoUrl: optString(restaurant, 'logo_url'),
      restaurantPhone: optString(restaurant, 'phone'),
      lines: listOf(json, 'lines', FoodOrderLine.fromJson),
      subtotalFormatted: optString(json, 'subtotal_formatted') ?? '',
      deliveryFeeFormatted: optString(json, 'delivery_fee_formatted') ?? '',
      totalFormatted: optString(json, 'total_formatted') ?? '',
      payment: enumFrom(
        PaymentMethod.values,
        payment['method'],
        PaymentMethod.cash,
      ),
      paid: payment['status'] == 'paid',
      dropoff:
          optObject(json, 'dropoff', Place.fromJson) ??
          const Place(address: ''),
      notes: optString(json, 'notes'),
      readyAt: optDate(json, 'ready_at'),
      rejection: rejection == null
          ? null
          : enumFromSnake(
              FoodRejection.values,
              rejection['reason'],
              FoodRejection.other,
            ),
      rejectionNote: rejection == null ? null : optString(rejection, 'note'),
      courierName: courier == null ? null : optString(courier, 'name'),
      courierPhone: courier == null ? null : optString(courier, 'phone'),
      courierPosition: optObject(
        json,
        'courier_location',
        CourierPosition.fromJson,
      ),
      ratedRestaurant: rating == null ? null : optInt(rating, 'restaurant'),
      ratedCourier: rating == null ? null : optInt(rating, 'courier'),
      timeline: listOf(json, 'timeline', FoodOrderStage.fromJson),
      createdAt: reqDate(json, 'created_at'),
    );
  }

  final int id;
  final String reference;
  final FoodOrderStatus status;
  final int? restaurantId;
  final String restaurantName;
  final String? restaurantLogoUrl;
  final String? restaurantPhone;
  final List<FoodOrderLine> lines;
  final String subtotalFormatted;
  final String deliveryFeeFormatted;
  final String totalFormatted;
  final PaymentMethod payment;
  final bool paid;
  final Place dropoff;
  final String? notes;

  /// Once accepted: about when it is ready.
  final DateTime? readyAt;
  final FoodRejection? rejection;
  final String? rejectionNote;
  final String? courierName;
  final String? courierPhone;
  final CourierPosition? courierPosition;

  /// The stars given, once rated.
  final int? ratedRestaurant;
  final int? ratedCourier;
  final List<FoodOrderStage> timeline;
  final DateTime createdAt;

  bool get rated => ratedRestaurant != null;
}

/// The restaurant the signed-in staff work for (`RestaurantDesk`).
class RestaurantDesk {
  const RestaurantDesk({
    required this.id,
    required this.name,
    this.logoUrl,
    this.open = true,
    this.busyUntil,
    this.accepting = true,
    this.todayOrders = 0,
    this.todaySalesFormatted = '',
  });

  factory RestaurantDesk.fromJson(Json json) {
    final today = optObject(json, 'today', (j) => j) ?? const {};
    return RestaurantDesk(
      id: reqInt(json, 'id'),
      name: reqString(json, 'name'),
      logoUrl: optString(json, 'logo_url'),
      open: boolOr(json, 'open', true),
      busyUntil: optDate(json, 'busy_until'),
      accepting: boolOr(json, 'accepting', true),
      todayOrders: intOr(today, 'orders', 0),
      todaySalesFormatted: optString(today, 'sales_formatted') ?? '',
    );
  }

  final int id;
  final String name;
  final String? logoUrl;

  /// Within its opening hours.
  final bool open;
  final DateTime? busyUntil;

  /// Taking new orders now.
  final bool accepting;
  final int todayOrders;
  final String todaySalesFormatted;
}

/// The restaurant's lists.
enum RestaurantScope { newOrders, active, done }

extension RestaurantScopeX on RestaurantScope {
  String get wire => this == RestaurantScope.newOrders ? 'new' : name;
}

/// An order as the restaurant's staff see it (`RestaurantOrder`).
class RestaurantOrder {
  const RestaurantOrder({
    required this.id,
    required this.reference,
    required this.status,
    required this.customerName,
    required this.createdAt,
    this.lines = const [],
    this.subtotalFormatted = '',
    this.notes,
    this.payment = PaymentMethod.cash,
    this.paid = false,
    this.readyAt,
    this.courierName,
    this.courierPhone,
    this.timeline = const [],
  });

  factory RestaurantOrder.fromJson(Json json) {
    final customer = optObject(json, 'customer', (j) => j) ?? const {};
    final payment = optObject(json, 'payment', (j) => j) ?? const {};
    final courier = optObject(json, 'courier', (j) => j);
    return RestaurantOrder(
      id: reqInt(json, 'id'),
      reference: reqString(json, 'reference'),
      status: foodOrderStatusFrom(json['status']),
      lines: listOf(json, 'lines', FoodOrderLine.fromJson),
      subtotalFormatted: optString(json, 'subtotal_formatted') ?? '',
      customerName: optString(customer, 'name') ?? '',
      notes: optString(json, 'notes'),
      payment: enumFrom(
        PaymentMethod.values,
        payment['method'],
        PaymentMethod.cash,
      ),
      paid: payment['status'] == 'paid',
      readyAt: optDate(json, 'ready_at'),
      courierName: courier == null ? null : optString(courier, 'name'),
      courierPhone: courier == null ? null : optString(courier, 'phone'),
      createdAt: reqDate(json, 'created_at'),
      timeline: listOf(json, 'timeline', FoodOrderStage.fromJson),
    );
  }

  final int id;
  final String reference;
  final FoodOrderStatus status;
  final List<FoodOrderLine> lines;
  final String subtotalFormatted;
  final String customerName;
  final String? notes;
  final PaymentMethod payment;
  final bool paid;
  final DateTime? readyAt;
  final String? courierName;
  final String? courierPhone;
  final DateTime createdAt;
  final List<FoodOrderStage> timeline;
}
