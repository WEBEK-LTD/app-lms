import 'addon_models.dart';
import 'json.dart';

/// 131 The flower shop's commerce in the app API: a product's sale, the
/// delivery slots of a day, the card messages by occasion, the coupons the
/// shop shows in the app, where it delivers, the gift checkout's look and
/// an order's delivery.

/// `ProductSale`: was and now, the share off, when it ends and how many are
/// left at this price.
class ProductSale {
  const ProductSale({
    required this.was,
    required this.wasFormatted,
    required this.now,
    required this.nowFormatted,
    required this.percentOff,
    this.startsAt,
    this.endsAt,
    this.remaining,
    this.total,
    this.flashSaleId,
  });

  static ProductSale? tryParse(Object? value) {
    if (value is! Map) return null;
    try {
      final json = asJson(value);
      return ProductSale(
        was: reqString(json, 'was'),
        wasFormatted: reqString(json, 'was_formatted'),
        now: reqString(json, 'now'),
        nowFormatted: reqString(json, 'now_formatted'),
        percentOff: intOr(json, 'percent_off', 0).clamp(0, 100),
        startsAt: optDate(json, 'starts_at'),
        endsAt: optDate(json, 'ends_at'),
        remaining: optInt(json, 'remaining'),
        total: optInt(json, 'total'),
        flashSaleId: optInt(json, 'flash_sale_id'),
      );
    } on FormatException {
      return null;
    }
  }

  final String was;
  final String wasFormatted;
  final String now;
  final String nowFormatted;
  final int percentOff;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final int? remaining;
  final int? total;
  final int? flashSaleId;

  /// Still on at [at]: not ended (a sale without an end is on).
  bool liveAt(DateTime at) => endsAt == null || endsAt!.isAfter(at);

  /// Ends within a day of [at]: a small countdown shows.
  bool endsSoon(DateTime at) =>
      endsAt != null &&
      endsAt!.isAfter(at) &&
      endsAt!.difference(at) <= const Duration(days: 1);
}

/// A flash sale element's look.
enum FlashLook { banner, carousel, grid }

/// `StudioNode.flash_sale`: the element's options.
class StudioFlashOptions {
  const StudioFlashOptions({
    this.look = FlashLook.banner,
    this.saleId,
    this.limit = 6,
    this.countdown = true,
    this.stockBar = true,
    this.accent,
  });

  static StudioFlashOptions fromJson(Object? value) {
    final json = value is Map ? asJson(value) : const <String, Object?>{};
    return StudioFlashOptions(
      look: enumFrom(FlashLook.values, json['look'], FlashLook.banner),
      saleId: optInt(json, 'sale_id'),
      limit: intOr(json, 'limit', 6).clamp(1, 12),
      countdown: boolOr(json, 'countdown', true),
      stockBar: boolOr(json, 'stock_bar', true),
      accent: optString(json, 'accent'),
    );
  }

  final FlashLook look;
  final int? saleId;
  final int limit;
  final bool countdown;
  final bool stockBar;
  final String? accent;
}

/// `StudioNode.flash`: the sale the servers filled in.
class StudioFlashServed {
  const StudioFlashServed({
    this.id,
    this.title,
    this.startsAt,
    this.endsAt,
    this.percentOff,
    this.remaining,
    this.total,
  });

  static StudioFlashServed? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    return StudioFlashServed(
      id: optInt(json, 'id'),
      title: optString(json, 'title'),
      startsAt: optDate(json, 'starts_at'),
      endsAt: optDate(json, 'ends_at'),
      percentOff: optInt(json, 'percent_off'),
      remaining: optInt(json, 'remaining'),
      total: optInt(json, 'total'),
    );
  }

  final int? id;
  final String? title;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final int? percentOff;
  final int? remaining;
  final int? total;

  /// Over at [at]: the app hides the element.
  bool overAt(DateTime at) =>
      (endsAt != null && !endsAt!.isAfter(at)) || remaining == 0;
}

/// How a products list's own cards show a sale.
enum SaleBadgeStyle { chip, ribbon, price }

class StudioSaleBadge {
  const StudioSaleBadge({
    this.style = SaleBadgeStyle.chip,
    this.countdown = false,
    this.color,
  });

  static StudioSaleBadge? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    return StudioSaleBadge(
      style: enumFrom(
        SaleBadgeStyle.values,
        json['style'],
        SaleBadgeStyle.chip,
      ),
      countdown: boolOr(json, 'countdown', false),
      color: optString(json, 'color'),
    );
  }

  final SaleBadgeStyle style;
  final bool countdown;
  final String? color;
}

/// A coupon element's look.
enum CouponLook { classic, ticket, glass }

/// `PublicCoupon`: a coupon the shop shows in the app.
class PublicCoupon {
  const PublicCoupon({
    required this.code,
    this.percentOff,
    this.amountOff,
    this.minOrder,
    this.endsAt,
  });

  static PublicCoupon? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final code = optString(json, 'code');
    if (code == null || code.isEmpty) return null;
    return PublicCoupon(
      code: code,
      percentOff: optInt(json, 'percent_off'),
      amountOff: optString(json, 'amount_off_formatted'),
      minOrder: optString(json, 'min_order_formatted'),
      endsAt: optDate(json, 'ends_at'),
    );
  }

  final String code;
  final int? percentOff;
  final String? amountOff;
  final String? minOrder;
  final DateTime? endsAt;
}

/// The commerce parts of a Studio element: the flash sale, the sale on a
/// products list's cards, the coupon's look and the shop's coupon it shows.
class StudioCommerce {
  const StudioCommerce({
    this.flashSale,
    this.flash,
    this.saleBadge,
    this.couponLook = CouponLook.classic,
    this.couponPublic = false,
    this.couponOffer,
  });

  static StudioCommerce? tryParse(Json json) {
    final coupon = json['coupon'];
    final hasFlash = json['flash_sale'] is Map || json['type'] == 'flash_sale';
    final out = StudioCommerce(
      flashSale: hasFlash
          ? StudioFlashOptions.fromJson(json['flash_sale'])
          : null,
      flash: StudioFlashServed.tryParse(json['flash']),
      saleBadge: StudioSaleBadge.tryParse(json['sale_badge']),
      couponLook: coupon is Map
          ? enumFrom(CouponLook.values, coupon['look'], CouponLook.classic)
          : CouponLook.classic,
      couponPublic: coupon is Map && coupon['bind'] == 'public',
      couponOffer: PublicCoupon.tryParse(json['coupon_offer']),
    );
    return out.flashSale == null &&
            out.flash == null &&
            out.saleBadge == null &&
            out.couponLook == CouponLook.classic &&
            !out.couponPublic &&
            out.couponOffer == null
        ? null
        : out;
  }

  final StudioFlashOptions? flashSale;
  final StudioFlashServed? flash;
  final StudioSaleBadge? saleBadge;
  final CouponLook couponLook;
  final bool couponPublic;
  final PublicCoupon? couponOffer;
}

/// `DeliverySlot`: a delivery time of the shop's, and (from
/// `GET /store/delivery-slots`) whether it can still be chosen.
class DeliverySlot {
  const DeliverySlot({
    required this.id,
    required this.start,
    required this.end,
    required this.label,
    this.fee,
    this.capacity,
    this.available = true,
    this.full = false,
    this.remaining,
  });

  factory DeliverySlot.fromJson(Json json) => DeliverySlot(
    id: reqString(json, 'id'),
    start: reqString(json, 'start'),
    end: reqString(json, 'end'),
    label: optString(json, 'label') ?? '',
    fee: optString(json, 'fee_formatted'),
    capacity: optInt(json, 'capacity'),
    available: boolOr(json, 'available', true),
    full: boolOr(json, 'full', false),
    remaining: optInt(json, 'remaining'),
  );

  final String id;
  final String start;
  final String end;
  final String label;

  /// Formatted extra fee; null when free or not charged by the app's checkout.
  final String? fee;
  final int? capacity;
  final bool available;
  final bool full;
  final int? remaining;

  /// Minutes past midnight of [start].
  int get startMinutes {
    final parts = start.split(':');
    return (int.tryParse(parts.first) ?? 0) * 60 +
        (int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0);
  }
}

/// `GET /store/delivery-slots`.
class DeliverySlots {
  const DeliverySlots({
    required this.date,
    required this.open,
    required this.slots,
    this.reason,
  });

  factory DeliverySlots.fromJson(Json json) => DeliverySlots(
    date: reqString(json, 'date'),
    open: reqBool(json, 'open'),
    reason: optString(json, 'reason'),
    slots: reqListOf(json, 'slots', DeliverySlot.fromJson),
  );

  final String date;
  final bool open;
  final String? reason;
  final List<DeliverySlot> slots;
}

/// One ready card message.
class GiftTemplate {
  const GiftTemplate({required this.id, required this.text});

  factory GiftTemplate.fromJson(Json json) =>
      GiftTemplate(id: reqString(json, 'id'), text: reqString(json, 'text'));

  final String id;
  final String text;
}

/// An occasion with its ready messages (`GET /store/gift-messages`).
class GiftOccasion {
  const GiftOccasion({
    required this.id,
    required this.name,
    required this.icon,
    required this.templates,
  });

  factory GiftOccasion.fromJson(Json json) => GiftOccasion(
    id: reqString(json, 'id'),
    name: reqString(json, 'name'),
    icon: optString(json, 'icon') ?? 'redeem',
    templates: reqListOf(json, 'templates', GiftTemplate.fromJson),
  );

  final String id;
  final String name;
  final String icon;
  final List<GiftTemplate> templates;
}

/// Where the shop delivers (`StoreConfig.shipping`).
class StoreShippingRules {
  const StoreShippingRules({
    required this.countries,
    this.needsLocation = false,
    this.charged = true,
    this.freeOver,
  });

  static StoreShippingRules? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final list = json['countries'];
    return StoreShippingRules(
      countries: [
        for (final c in list is List ? list : const [])
          if (c is Map && c['code'] is String)
            ShippingCountry(
              code: c['code'] as String,
              names: {
                if (c['names'] is Map)
                  for (final e in (c['names'] as Map).entries)
                    if (e.value is String) '${e.key}': e.value as String,
              },
              cities: c['cities'] is List
                  ? [
                      for (final city in c['cities'] as List)
                        if (city is String) city,
                    ]
                  : null,
            ),
      ],
      needsLocation: boolOr(json, 'needs_location', false),
      charged: boolOr(json, 'charged', true),
      freeOver: optString(json, 'free_over_formatted'),
    );
  }

  final List<ShippingCountry> countries;
  final bool needsLocation;
  final bool charged;
  final String? freeOver;
}

class ShippingCountry {
  const ShippingCountry({
    required this.code,
    this.names = const {},
    this.cities,
  });

  final String code;
  final Map<String, String> names;

  /// Null: all its cities (the city is typed); else a picker.
  final List<String>? cities;

  String nameIn(String lang) => names[lang] ?? names['en'] ?? code;
}

/// How the checkout is drawn (`Config.screens.checkout`).
enum CheckoutStyle { classic, cards, steps }

/// 131.25 The checkout's premium looks (`Config.screens.checkout.look`):
/// `gift`, the gift checkout in five steps on one screen under a step bar
/// that stays at the top, with the gift card's live preview.
enum CheckoutLookName { gift }

class CheckoutLook {
  const CheckoutLook({
    this.gift = false,
    this.style = CheckoutStyle.classic,
    this.squareChips = false,
    this.glass = false,
    this.accent,
    this.radius,
    this.imageUrl,
    this.title = const {},
    this.look,
    this.darkAccent,
    this.titles = const SectionTitles(),
  });

  static CheckoutLook? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    // 131.25 The premium gift look; one this app doesn't know, none.
    final look = CheckoutLookName.values
        .where((l) => l.name == json['look'])
        .firstOrNull;
    return CheckoutLook(
      // The premium gift look is the gift checkout too.
      gift: json['mode'] == 'gift' || look == CheckoutLookName.gift,
      look: look,
      darkAccent: optString(json, 'dark_accent'),
      style: enumFrom(
        CheckoutStyle.values,
        json['style'],
        CheckoutStyle.classic,
      ),
      squareChips: json['chips'] == 'square',
      glass: json['surface'] == 'glass',
      accent: optString(json, 'accent'),
      radius: optDouble(json, 'radius')?.clamp(0, 32).toDouble(),
      imageUrl: optString(json, 'image_url'),
      title: {
        if (json['title'] is Map)
          for (final e in (json['title'] as Map).entries)
            if (e.value is String) '${e.key}': e.value as String,
      },
      // 131 The add-ons', the card's and the delivery picker's titles.
      titles: SectionTitles.fromLook(json),
    );
  }

  final bool gift;
  final CheckoutStyle style;
  final bool squareChips;
  final bool glass;
  final String? accent;
  final double? radius;
  final String? imageUrl;
  final Map<String, String> title;

  /// 131.25 The premium look; null, the style above.
  final CheckoutLookName? look;

  /// 131.25 The accent by night (#RRGGBB); null, [accent].
  final String? darkAccent;

  /// 131.25 The accent by day or by night, as the app draws it.
  String? accentFor({required bool dark}) =>
      dark ? (darkAccent ?? accent) : accent;

  /// 131 The look's own titles of the add-ons, the card and the delivery
  /// picker, over the store's.
  final SectionTitles titles;
}

/// The gift checkout's people, as the customer typed them.
class GiftPerson {
  const GiftPerson({
    required this.name,
    required this.phone,
    this.email,
    this.address,
    this.country,
    this.city,
    this.lat,
    this.lng,
  });

  final String name;
  final String phone;
  final String? email;
  final String? address;
  final String? country;
  final String? city;

  /// The pin where it goes (the phone's location), for shipping by distance.
  final double? lat;
  final double? lng;

  Json toSender() => {
    'name': name.trim(),
    'phone': phone.trim(),
    'email': (email ?? '').trim(),
  };

  Json toRecipient() => {
    'name': name.trim(),
    'phone': phone.trim(),
    if ((address ?? '').trim().isNotEmpty) 'address': address!.trim(),
    'country': ?country,
    if ((city ?? '').trim().isNotEmpty) 'city': city!.trim(),
    'lat': ?lat,
    'lng': ?lng,
  };
}

/// `Order.delivery`: the day and slot, the people and the card.
class OrderDelivery {
  const OrderDelivery({
    this.date,
    this.slotLabel,
    this.recipientName,
    this.senderName,
    this.message,
    this.anonymous = false,
  });

  static OrderDelivery? tryParse(Object? value) {
    if (value is! Map) return null;
    final json = asJson(value);
    final slot = json['slot'];
    final recipient = json['recipient'];
    final sender = json['sender'];
    return OrderDelivery(
      date: optString(json, 'date'),
      slotLabel: slot is Map && slot['label'] is String
          ? slot['label'] as String
          : null,
      recipientName: recipient is Map && recipient['name'] is String
          ? recipient['name'] as String
          : null,
      senderName: sender is Map && sender['name'] is String
          ? sender['name'] as String
          : null,
      message: optString(json, 'gift_message'),
      anonymous: boolOr(json, 'anonymous', false),
    );
  }

  final String? date;
  final String? slotLabel;
  final String? recipientName;
  final String? senderName;
  final String? message;
  final bool anonymous;
}
