import 'food_models.dart' show DishChoiceGroup;
import 'json.dart';

/// 115 The marketplace (docs/api/openapi.yaml, the Market tag): restaurants,
/// groceries and shops in one app. Amounts are the server's, already
/// written in the app's currency (`Money.formatted`).

enum VendorKind { restaurant, grocery, shop }

/// Who brings the order: the app's couriers, followed on the map, or the
/// vendor's own drivers, followed by stages.
enum VendorDelivery { app, vendor }

enum ProductUnit { item, kg, g, l }

enum MarketCouponKind { percent, amount, freeDelivery }

enum MarketVendorSort {
  recommended,
  distance,
  rating,
  deliveryTime,
  deliveryFee,
}

/// `Money`: a decimal string and how it reads ("EGP 125.50").
class MarketMoney {
  const MarketMoney({required this.amount, required this.formatted});

  factory MarketMoney.fromJson(Json json) => MarketMoney(
    amount: reqString(json, 'amount'),
    formatted: reqString(json, 'formatted'),
  );

  /// With `MarketConfig.currency_decimals` decimals; negative for discounts.
  final String amount;
  final String formatted;

  bool get isZero => (double.tryParse(amount) ?? 0) == 0;
}

/// `MarketConfig.categories`: a cuisine or a department, for the filters.
class MarketCategory {
  const MarketCategory({
    required this.id,
    required this.name,
    required this.kind,
    this.imageUrl,
  });

  factory MarketCategory.fromJson(Json json) => MarketCategory(
    id: reqString(json, 'id'),
    name: reqString(json, 'name'),
    kind: enumFrom(VendorKind.values, json['kind'], VendorKind.restaurant),
    imageUrl: optString(json, 'image_url'),
  );

  final String id;
  final String name;
  final VendorKind kind;
  final String? imageUrl;
}

/// `MarketConfig.payment`: how customers can pay.
class MarketPayment {
  const MarketPayment({
    this.cash = false,
    this.card = false,
    this.applePay = false,
    this.googlePay = false,
    this.wallet = false,
    this.cashMax,
  });

  factory MarketPayment.fromJson(Json json) => MarketPayment(
    cash: boolOr(json, 'cash', false),
    card: boolOr(json, 'card', false),
    applePay: boolOr(json, 'apple_pay', false),
    googlePay: boolOr(json, 'google_pay', false),
    wallet: boolOr(json, 'wallet', false),
    cashMax: optString(json, 'cash_max'),
  );

  final bool cash;
  final bool card;
  final bool applePay;
  final bool googlePay;
  final bool wallet;
  final String? cashMax;
}

/// `Config.market`: a marketplace app's settings (roadmap 115).
class MarketConfig {
  const MarketConfig({
    required this.currency,
    this.country,
    this.currencyDecimals = 2,
    this.timezone,
    this.kinds = const [VendorKind.restaurant],
    this.categories = const [],
    this.payment = const MarketPayment(cash: true),
    this.taxLabel,
    this.taxIncluded = true,
    this.pickup = false,
    this.scheduling = false,
    this.daysAhead = 0,
    this.club = false,
    this.wallet = false,
    this.weightTolerancePercent = 0,
    this.vendorAppBundled = false,
  });

  factory MarketConfig.fromJson(Json json) {
    final tax = optObject(json, 'tax', (j) => j);
    final scheduling = optObject(json, 'scheduling', (j) => j);
    final kinds = json['kinds'];
    return MarketConfig(
      country: optString(json, 'country'),
      currency: optString(json, 'currency') ?? 'EGP',
      currencyDecimals: intOr(json, 'currency_decimals', 2),
      timezone: optString(json, 'timezone'),
      kinds: [
        for (final k in kinds is List ? kinds : const [])
          ?enumOrNull(VendorKind.values, k),
      ],
      categories: listOf(json, 'categories', MarketCategory.fromJson),
      payment:
          optObject(json, 'payment', MarketPayment.fromJson) ??
          const MarketPayment(cash: true),
      taxLabel: tax == null ? null : optString(tax, 'label'),
      taxIncluded: tax == null ? true : boolOr(tax, 'included', true),
      pickup: boolOr(json, 'pickup', false),
      scheduling: scheduling == null
          ? false
          : boolOr(scheduling, 'enabled', false),
      daysAhead: scheduling == null ? 0 : intOr(scheduling, 'days_ahead', 0),
      club: boolOr(json, 'club', false),
      wallet: boolOr(json, 'wallet', false),
      weightTolerancePercent: intOr(json, 'weight_tolerance_percent', 0),
      vendorAppBundled: json['vendor_app'] == 'bundle',
    );
  }

  final String? country;
  final String currency;
  final int currencyDecimals;
  final String? timezone;

  /// The vendor kinds the app has, in the owner's order.
  final List<VendorKind> kinds;
  final List<MarketCategory> categories;
  final MarketPayment payment;
  final String? taxLabel;
  final bool taxIncluded;
  final bool pickup;
  final bool scheduling;
  final int daysAhead;
  final bool club;
  final bool wallet;
  final int weightTolerancePercent;

  /// Vendors have their own app in the bundle: no Vendor tab here.
  final bool vendorAppBundled;

  MarketCategory? category(String id) {
    for (final c in categories) {
      if (c.id == id) return c;
    }
    return null;
  }
}

/// `MarketVendorSummary`: a vendor on a card or in a list. No phone, no
/// email, no chat: customers reach the app's support only.
class MarketVendorSummary {
  const MarketVendorSummary({
    required this.id,
    required this.kind,
    required this.name,
    this.logoUrl,
    this.coverUrl,
    this.categories = const [],
    this.rating,
    this.ratingsCount = 0,
    this.open = true,
    this.opensAt,
    this.busy = false,
    this.deliveryBy = VendorDelivery.app,
    this.deliveryMinutes,
    this.deliveryFee,
    this.freeDeliveryOver,
    this.minOrder,
    this.distanceKm,
    this.delivers,
    this.pickup = false,
    this.scheduling = false,
    this.offer,
    this.clubBenefit,
  });

  factory MarketVendorSummary.fromJson(Json json) {
    final minutes = optObject(json, 'delivery_minutes', (j) => j);
    return MarketVendorSummary(
      id: reqInt(json, 'id'),
      kind: enumFrom(VendorKind.values, json['kind'], VendorKind.restaurant),
      name: reqString(json, 'name'),
      logoUrl: optString(json, 'logo_url'),
      coverUrl: optString(json, 'cover_url'),
      categories: stringList(json, 'categories'),
      rating: optDouble(json, 'rating'),
      ratingsCount: intOr(json, 'ratings_count', 0),
      open: boolOr(json, 'open', true),
      opensAt: optDate(json, 'opens_at'),
      busy: boolOr(json, 'busy', false),
      deliveryBy: enumFrom(
        VendorDelivery.values,
        json['delivery_by'],
        VendorDelivery.app,
      ),
      deliveryMinutes: minutes == null
          ? null
          : (min: intOr(minutes, 'min', 0), max: intOr(minutes, 'max', 0)),
      deliveryFee: optObject(json, 'delivery_fee', MarketMoney.fromJson),
      freeDeliveryOver: optObject(
        json,
        'free_delivery_over',
        MarketMoney.fromJson,
      ),
      minOrder: optObject(json, 'min_order', MarketMoney.fromJson),
      distanceKm: optDouble(json, 'distance_km'),
      delivers: json['delivers'] is bool ? json['delivers'] as bool : null,
      pickup: boolOr(json, 'pickup', false),
      scheduling: boolOr(json, 'scheduling', false),
      offer: optString(json, 'offer'),
      clubBenefit: optString(json, 'club_benefit'),
    );
  }

  final int id;
  final VendorKind kind;
  final String name;
  final String? logoUrl;
  final String? coverUrl;

  /// `MarketConfig.categories` ids.
  final List<String> categories;
  final double? rating;
  final int ratingsCount;

  /// Taking orders now: within its hours, not busy and not paused.
  final bool open;
  final DateTime? opensAt;
  final bool busy;
  final VendorDelivery deliveryBy;

  /// With the customer's position; null without it.
  final ({int min, int max})? deliveryMinutes;

  /// Zero for free delivery; null without the customer's position.
  final MarketMoney? deliveryFee;
  final MarketMoney? freeDeliveryOver;
  final MarketMoney? minOrder;
  final double? distanceKm;
  final bool? delivers;
  final bool pickup;
  final bool scheduling;

  /// Its best offer in a few words, for the card.
  final String? offer;

  /// The club's benefit here ("Free delivery").
  final String? clubBenefit;

  bool get freeDelivery => deliveryFee?.isZero ?? false;
}

/// A day's opening hours ("09:00" to "23:00").
class MarketHours {
  const MarketHours({
    required this.day,
    required this.opens,
    required this.closes,
  });

  factory MarketHours.fromJson(Json json) => MarketHours(
    day: reqString(json, 'day'),
    opens: reqString(json, 'opens'),
    closes: reqString(json, 'closes'),
  );

  /// `mon` to `sun`.
  final String day;
  final String opens;
  final String closes;
}

/// A restaurant's menu section with its dishes.
class MarketMenuSection {
  const MarketMenuSection({
    required this.id,
    required this.name,
    this.items = const [],
  });

  factory MarketMenuSection.fromJson(Json json) => MarketMenuSection(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    items: listOf(json, 'items', MarketProduct.fromJson),
  );

  final int id;
  final String name;
  final List<MarketProduct> items;
}

class MarketAisle {
  const MarketAisle({required this.id, required this.name});

  factory MarketAisle.fromJson(Json json) =>
      MarketAisle(id: reqInt(json, 'id'), name: reqString(json, 'name'));

  final int id;
  final String name;
}

/// A grocery's or shop's department with its aisles; its products come from
/// `GET /market/vendors/{id}/products?department=`.
class MarketDepartment {
  const MarketDepartment({
    required this.id,
    required this.name,
    this.imageUrl,
    this.aisles = const [],
  });

  factory MarketDepartment.fromJson(Json json) => MarketDepartment(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    imageUrl: optString(json, 'image_url'),
    aisles: listOf(json, 'aisles', MarketAisle.fromJson),
  );

  final int id;
  final String name;
  final String? imageUrl;
  final List<MarketAisle> aisles;
}

/// `MarketVendor`: a vendor's page.
class MarketVendorDetail {
  const MarketVendorDetail({
    required this.summary,
    this.description,
    this.area,
    this.hours = const [],
    this.minItems,
    this.maxItems,
    this.taxRatePercent,
    this.sections = const [],
    this.departments = const [],
    this.offers = const [],
  });

  factory MarketVendorDetail.fromJson(Json json) {
    final quantity = optObject(json, 'quantity', (j) => j);
    return MarketVendorDetail(
      summary: MarketVendorSummary.fromJson(json),
      description: optString(json, 'description'),
      area: optString(json, 'area'),
      hours: listOf(json, 'hours', MarketHours.fromJson),
      minItems: quantity == null ? null : optInt(quantity, 'min_items'),
      maxItems: quantity == null ? null : optInt(quantity, 'max_items'),
      taxRatePercent: optDouble(json, 'tax_rate_percent'),
      sections: listOf(json, 'sections', MarketMenuSection.fromJson),
      departments: listOf(json, 'departments', MarketDepartment.fromJson),
      offers: listOf(json, 'offers', MarketCoupon.fromJson),
    );
  }

  final MarketVendorSummary summary;
  final String? description;

  /// Its district; its exact place only for pick-up orders.
  final String? area;
  final List<MarketHours> hours;
  final int? minItems;
  final int? maxItems;
  final double? taxRatePercent;

  /// A restaurant's menu; empty for groceries and shops.
  final List<MarketMenuSection> sections;

  /// A grocery's or shop's departments; empty for restaurants.
  final List<MarketDepartment> departments;
  final List<MarketCoupon> offers;
}

/// `MarketProduct`: a dish or a product.
class MarketProduct {
  const MarketProduct({
    required this.id,
    required this.name,
    required this.price,
    this.description,
    this.imageUrl,
    this.images = const [],
    this.brand,
    this.wasPrice,
    this.unit = ProductUnit.item,
    this.step = 1,
    this.maxQuantity,
    this.inStock = true,
    this.choices = const [],
    this.tags = const [],
  });

  factory MarketProduct.fromJson(Json json) => MarketProduct(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    description: optString(json, 'description'),
    imageUrl: optString(json, 'image_url'),
    images: stringList(json, 'images'),
    brand: optString(json, 'brand'),
    price: MarketMoney.fromJson(asJson(json['price'], 'price')),
    wasPrice: optObject(json, 'was_price', MarketMoney.fromJson),
    unit: enumFrom(ProductUnit.values, json['unit'], ProductUnit.item),
    step: optDouble(json, 'step') ?? 1,
    maxQuantity: optDouble(json, 'max_quantity'),
    inStock: boolOr(json, 'in_stock', true),
    choices: listOf(json, 'choices', DishChoiceGroup.fromJson),
    tags: stringList(json, 'tags'),
  );

  final int id;
  final String name;
  final String? description;
  final String? imageUrl;

  /// All the photos, the main one first (missing from older servers).
  final List<String> images;
  final String? brand;

  /// The photos to show: [images], else the main one.
  List<String> get photos => images.isNotEmpty
      ? images
      : [if (imageUrl != null && imageUrl!.isNotEmpty) imageUrl!];

  /// For one item, or per `unit` (kilogram, gram, litre).
  final MarketMoney price;
  final MarketMoney? wasPrice;
  final ProductUnit unit;

  /// The amount added each time: 1 for items, 0.25 for a quarter kilo.
  final double step;
  final double? maxQuantity;
  final bool inStock;
  final List<DishChoiceGroup> choices;

  /// spicy, vegetarian, vegan, new, popular, organic, frozen, age_restricted.
  final List<String> tags;

  bool get byWeight => unit != ProductUnit.item;
}

/// `MarketCoupon`: an offer or a coupon the customer can use.
class MarketCoupon {
  const MarketCoupon({
    required this.id,
    required this.title,
    required this.kind,
    this.description,
    this.code,
    this.vendorId,
    this.value,
    this.minOrder,
    this.endsAt,
    this.firstOrderOnly = false,
  });

  factory MarketCoupon.fromJson(Json json) => MarketCoupon(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    description: optString(json, 'description'),
    code: optString(json, 'code'),
    vendorId: optInt(json, 'vendor_id'),
    kind: json['kind'] == 'free_delivery'
        ? MarketCouponKind.freeDelivery
        : enumFrom(
            MarketCouponKind.values,
            json['kind'],
            MarketCouponKind.amount,
          ),
    value: optString(json, 'value'),
    minOrder: optObject(json, 'min_order', MarketMoney.fromJson),
    endsAt: optDate(json, 'ends_at'),
    firstOrderOnly: boolOr(json, 'first_order_only', false),
  );

  final int id;
  final String title;
  final String? description;

  /// Null for an automatic offer.
  final String? code;

  /// Null for the whole app.
  final int? vendorId;
  final MarketCouponKind kind;
  final String? value;
  final MarketMoney? minOrder;
  final DateTime? endsAt;
  final bool firstOrderOnly;
}

/// `GET /market/search`: vendors, and dishes or products with their vendor.
class MarketSearchResult {
  const MarketSearchResult({this.vendors = const [], this.items = const []});

  factory MarketSearchResult.fromJson(Json json) => MarketSearchResult(
    vendors: listOf(json, 'vendors', MarketVendorSummary.fromJson),
    items: listOf(
      json,
      'items',
      (j) => (
        vendor: MarketVendorSummary.fromJson(asJson(j['vendor'], 'vendor')),
        product: MarketProduct.fromJson(asJson(j['product'], 'product')),
      ),
    ),
  );

  final List<MarketVendorSummary> vendors;
  final List<({MarketVendorSummary vendor, MarketProduct product})> items;
}

/// The query of `GET /market/vendors`.
class MarketVendorQuery {
  const MarketVendorQuery({
    this.page = 1,
    this.perPage = 20,
    this.kind,
    this.category,
    this.query,
    this.sort = MarketVendorSort.recommended,
    this.freeDelivery = false,
    this.offers = false,
    this.club = false,
    this.pickup = false,
    this.lat,
    this.lng,
  });

  final int page;
  final int perPage;
  final VendorKind? kind;
  final String? category;
  final String? query;
  final MarketVendorSort sort;
  final bool freeDelivery;
  final bool offers;
  final bool club;
  final bool pickup;
  final double? lat;
  final double? lng;

  Map<String, Object> toQuery() => {
    'page': page,
    'per_page': perPage,
    if (kind != null) 'kind': kind!.name,
    if (category != null && category!.isNotEmpty) 'category': category!,
    if (query != null && query!.trim().isNotEmpty) 'q': query!.trim(),
    if (sort != MarketVendorSort.recommended) 'sort': snake(sort),
    if (freeDelivery) 'free_delivery': true,
    if (offers) 'offers': true,
    if (club) 'club': true,
    if (pickup) 'pickup': true,
    'lat': ?lat,
    'lng': ?lng,
  };
}

/// `MarketOrderStatus`: where an order is.
enum MarketOrderStatus {
  awaitingPayment,
  scheduled,
  placed,
  accepted,
  picking,
  ready,
  onTheWay,
  delivered,
  pickedUp,
  rejected,
  cancelled,
}

enum MarketFulfilment { delivery, pickup }

/// What a shop does when an item is out when it's picked.
enum MarketIfMissing { similar, chosen, remove }

enum MarketPayMethod { cash, card, applePay, googlePay, wallet }

/// `MarketPriceLine`: one line of an order's price, ending with the total.
class MarketPriceLine {
  const MarketPriceLine({
    required this.kind,
    required this.label,
    required this.amount,
  });

  factory MarketPriceLine.fromJson(Json json) => MarketPriceLine(
    kind: reqString(json, 'kind'),
    label: reqString(json, 'label'),
    amount: MarketMoney.fromJson(asJson(json['amount'], 'amount')),
  );

  /// items, item_discounts, coupon, club, delivery, delivery_discount, tax,
  /// tip, wallet or total.
  final String kind;
  final String label;
  final MarketMoney amount;

  bool get isTotal => kind == 'total';
}

/// `MarketOrderLine`: an item of a quote or an order.
class MarketOrderLine {
  const MarketOrderLine({
    required this.productId,
    required this.name,
    required this.quantity,
    required this.unit,
    required this.unitPrice,
    required this.total,
    this.id,
    this.imageUrl,
    this.choices = const [],
    this.note,
    this.beforeDiscount,
    this.ifMissing = MarketIfMissing.remove,
    this.outcome,
    this.pickedQuantity,
    this.substituteName,
  });

  factory MarketOrderLine.fromJson(Json json) => MarketOrderLine(
    id: optInt(json, 'id'),
    productId: reqInt(json, 'product_id'),
    name: reqString(json, 'name'),
    imageUrl: optString(json, 'image_url'),
    quantity: optDouble(json, 'quantity') ?? 1,
    unit: enumFrom(ProductUnit.values, json['unit'], ProductUnit.item),
    choices: stringList(json, 'choices'),
    note: optString(json, 'note'),
    unitPrice: MarketMoney.fromJson(asJson(json['unit_price'], 'unit_price')),
    beforeDiscount: optObject(json, 'before_discount', MarketMoney.fromJson),
    total: MarketMoney.fromJson(asJson(json['total'], 'total')),
    ifMissing: enumFrom(
      MarketIfMissing.values,
      json['if_missing'],
      MarketIfMissing.remove,
    ),
    outcome: optString(json, 'outcome'),
    pickedQuantity: optDouble(json, 'picked_quantity'),
    substituteName: optObject(json, 'substitute', (j) => reqString(j, 'name')),
  );

  final int? id;
  final int productId;
  final String name;
  final String? imageUrl;
  final double quantity;
  final ProductUnit unit;
  final List<String> choices;
  final String? note;
  final MarketMoney unitPrice;
  final MarketMoney? beforeDiscount;
  final MarketMoney total;
  final MarketIfMissing ifMissing;

  /// picked, substituted or missing, once a shop has picked it.
  final String? outcome;
  final double? pickedQuantity;
  final String? substituteName;
}

/// `MarketQuote`: a cart's prices, kept for `POST /market/orders` until
/// `expiresAt`.
class MarketQuote {
  const MarketQuote({
    required this.quoteId,
    required this.lines,
    required this.price,
    required this.total,
    required this.payNow,
    this.expiresAt,
    this.couponTitle,
    this.etaMin,
    this.etaMax,
    this.warnings = const [],
  });

  factory MarketQuote.fromJson(Json json) {
    final eta = optObject(json, 'delivery_minutes', (j) => j);
    return MarketQuote(
      quoteId: reqString(json, 'quote_id'),
      expiresAt: optDate(json, 'expires_at'),
      lines: listOf(json, 'lines', MarketOrderLine.fromJson),
      price: listOf(json, 'price', MarketPriceLine.fromJson),
      total: MarketMoney.fromJson(asJson(json['total'], 'total')),
      payNow: MarketMoney.fromJson(asJson(json['pay_now'], 'pay_now')),
      couponTitle: optObject(json, 'coupon', (j) => reqString(j, 'title')),
      etaMin: eta == null ? null : optInt(eta, 'min'),
      etaMax: eta == null ? null : optInt(eta, 'max'),
      warnings: stringList(json, 'warnings'),
    );
  }

  final String quoteId;
  final DateTime? expiresAt;
  final List<MarketOrderLine> lines;
  final List<MarketPriceLine> price;
  final MarketMoney total;

  /// What is left to pay after the wallet.
  final MarketMoney payNow;
  final String? couponTitle;
  final int? etaMin;
  final int? etaMax;
  final List<String> warnings;
}

/// `MarketTracking`: an order on its way, on the map or by stages only.
class MarketTracking {
  const MarketTracking({
    required this.onMap,
    this.courierName,
    this.courierPhotoUrl,
    this.vehicle,
    this.lat,
    this.lng,
    this.updatedAt,
    this.route = const [],
  });

  factory MarketTracking.fromJson(Json json) {
    final courier = optObject(json, 'courier', (j) => j);
    final position = optObject(json, 'position', (j) => j);
    final route = json['route'];
    return MarketTracking(
      onMap: json['mode'] == 'map',
      courierName: courier == null ? null : optString(courier, 'name'),
      courierPhotoUrl: courier == null ? null : optString(courier, 'photo_url'),
      vehicle: courier == null ? null : optString(courier, 'vehicle'),
      lat: position == null ? null : optDouble(position, 'lat'),
      lng: position == null ? null : optDouble(position, 'lng'),
      updatedAt: optDate(json, 'updated_at'),
      route: [
        if (route is List)
          for (final point in route)
            if (point is List && point.length == 2)
              ((point[0] as num).toDouble(), (point[1] as num).toDouble()),
      ],
    );
  }

  /// The app's couriers (or a vendor's driver with the courier app) on the
  /// map; otherwise the stages only.
  final bool onMap;
  final String? courierName;
  final String? courierPhotoUrl;
  final String? vehicle;
  final double? lat;
  final double? lng;
  final DateTime? updatedAt;

  /// The road ahead as (lat, lng) points.
  final List<(double, double)> route;
}

/// `MarketOrder`: a customer's order from one vendor.
class MarketOrder {
  const MarketOrder({
    required this.id,
    required this.reference,
    required this.vendor,
    required this.status,
    required this.fulfilment,
    required this.lines,
    required this.price,
    required this.total,
    required this.payMethod,
    required this.paymentStatus,
    required this.createdAt,
    this.scheduledFor,
    this.walletUsed,
    this.deliveryBy,
    this.readyAt,
    this.eta,
    this.pickupCode,
    this.tracking,
    this.ratedVendor,
    this.canCancel = false,
    this.canComplain = false,
    this.complaintId,
    this.timeline = const [],
  });

  factory MarketOrder.fromJson(Json json) {
    final payment = asJson(json['payment'], 'payment');
    final rating = optObject(json, 'rating', (j) => j);
    return MarketOrder(
      id: reqInt(json, 'id'),
      reference: reqString(json, 'reference'),
      vendor: MarketVendorSummary.fromJson(asJson(json['vendor'], 'vendor')),
      status: enumFromSnake(
        MarketOrderStatus.values,
        json['status'],
        MarketOrderStatus.placed,
      ),
      fulfilment: enumFrom(
        MarketFulfilment.values,
        json['fulfilment'],
        MarketFulfilment.delivery,
      ),
      scheduledFor: optDate(json, 'scheduled_for'),
      lines: listOf(json, 'lines', MarketOrderLine.fromJson),
      price: listOf(json, 'price', MarketPriceLine.fromJson),
      total: MarketMoney.fromJson(asJson(json['total'], 'total')),
      payMethod: enumFromSnake(
        MarketPayMethod.values,
        payment['method'],
        MarketPayMethod.cash,
      ),
      paymentStatus: optString(payment, 'status') ?? 'unpaid',
      walletUsed: optObject(payment, 'wallet_used', MarketMoney.fromJson),
      deliveryBy: enumOrNull(VendorDelivery.values, json['delivery_by']),
      readyAt: optDate(json, 'ready_at'),
      eta: optDate(json, 'eta'),
      pickupCode: optString(json, 'pickup_code'),
      tracking: optObject(json, 'tracking', MarketTracking.fromJson),
      ratedVendor: rating == null ? null : optInt(rating, 'vendor'),
      canCancel: boolOr(json, 'can_cancel', false),
      canComplain: boolOr(json, 'can_complain', false),
      complaintId: optInt(json, 'complaint_id'),
      createdAt: reqDate(json, 'created_at'),
      timeline: listOf(
        json,
        'timeline',
        (j) => (
          status: enumFromSnake(
            MarketOrderStatus.values,
            j['status'],
            MarketOrderStatus.placed,
          ),
          at: reqDate(j, 'at'),
        ),
      ),
    );
  }

  final int id;
  final String reference;
  final MarketVendorSummary vendor;
  final MarketOrderStatus status;
  final MarketFulfilment fulfilment;
  final DateTime? scheduledFor;
  final List<MarketOrderLine> lines;
  final List<MarketPriceLine> price;
  final MarketMoney total;
  final MarketPayMethod payMethod;

  /// unpaid, paid, partly_refunded or refunded.
  final String paymentStatus;
  final MarketMoney? walletUsed;

  /// Null for pick-up.
  final VendorDelivery? deliveryBy;
  final DateTime? readyAt;
  final DateTime? eta;
  final String? pickupCode;
  final MarketTracking? tracking;
  final int? ratedVendor;
  final bool canCancel;
  final bool canComplain;
  final int? complaintId;
  final DateTime createdAt;
  final List<({MarketOrderStatus status, DateTime at})> timeline;

  bool get finished => const {
    MarketOrderStatus.delivered,
    MarketOrderStatus.pickedUp,
    MarketOrderStatus.rejected,
    MarketOrderStatus.cancelled,
  }.contains(status);
}

/// One line of `MarketCartInput`.
class MarketCartLineInput {
  const MarketCartLineInput({
    required this.productId,
    required this.quantity,
    this.choices = const [],
    this.note,
    this.ifMissing,
  });

  final int productId;
  final double quantity;
  final List<int> choices;
  final String? note;

  /// Groceries and shops only.
  final MarketIfMissing? ifMissing;

  Json toJson() => {
    'product_id': productId,
    'quantity': quantity,
    if (choices.isNotEmpty) 'choices': choices,
    if (note != null && note!.isNotEmpty) 'note': note,
    if (ifMissing != null) 'if_missing': ifMissing!.name,
  };
}

/// `MarketCartInput` (a quote) and, with `quoteId` and `payment`,
/// `MarketOrderInput` (an order).
class MarketCartInput {
  const MarketCartInput({
    required this.vendorId,
    required this.lines,
    required this.fulfilment,
    this.address,
    this.addressDetails,
    this.lat,
    this.lng,
    this.scheduledFor,
    this.couponCode,
    this.useWallet = false,
  });

  final int vendorId;
  final List<MarketCartLineInput> lines;
  final MarketFulfilment fulfilment;
  final String? address;
  final String? addressDetails;
  final double? lat;
  final double? lng;
  final DateTime? scheduledFor;
  final String? couponCode;
  final bool useWallet;

  Json toJson() => {
    'vendor_id': vendorId,
    'lines': [for (final l in lines) l.toJson()],
    'fulfilment': fulfilment.name,
    if (fulfilment == MarketFulfilment.delivery && address != null)
      'dropoff': {
        'address': address,
        if (addressDetails != null && addressDetails!.isNotEmpty)
          'details': addressDetails,
        'lat': ?lat,
        'lng': ?lng,
      },
    if (scheduledFor != null)
      'scheduled_for': scheduledFor!.toUtc().toIso8601String(),
    if (couponCode != null && couponCode!.isNotEmpty) 'coupon_code': couponCode,
    if (useWallet) 'use_wallet': true,
  };

  Json orderJson({
    required String quoteId,
    required MarketPayMethod payment,
    String? notes,
  }) => {
    ...toJson(),
    'quote_id': quoteId,
    'payment': snake(payment),
    if (notes != null && notes.isNotEmpty) 'notes': notes,
  };
}
