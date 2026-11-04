/// 115 The marketplace: restaurants and shops (supermarkets, sweets,
/// pharmacies) in one app, with the app owner's couriers or the vendor's own.
///
/// What the marketplace's screens show, read from the contract's Market
/// calls (market_providers.dart); the tests and screenshots fill them from
/// [MarketSamples] (market_samples.dart). Amounts are the server's own
/// words ("EGP 15.00").
library;

enum MarketVendorKind { restaurant, grocery, shop }

/// Who brings the order: the app's couriers (live on the map) or the
/// vendor's own (the order's stages only).
enum MarketDeliveredBy { app, vendor }

enum MarketVendorState { open, busy, closed }

/// A restaurant or a shop as its card shows it.
class MarketVendor {
  const MarketVendor({
    required this.id,
    required this.kind,
    required this.name,
    required this.coverUrl,
    required this.logoUrl,
    required this.tags,
    this.rating,
    this.ratings = 0,
    this.etaMin,
    this.etaMax,
    this.deliveryFee,
    this.freeDelivery = false,
    this.minOrder,
    this.deliveredBy = MarketDeliveredBy.app,
    this.state = MarketVendorState.open,
    this.promo,
    this.club = false,
    this.clubBenefit,
    this.distanceKm,
    this.opensAt,
    this.favorited = false,
  });

  final String id;
  final MarketVendorKind kind;
  final String name;
  final String coverUrl;
  final String logoUrl;

  /// Cuisines or aisles, in the app's language.
  final List<String> tags;

  /// Null for a vendor nobody rated yet.
  final double? rating;
  final int ratings;

  /// Null without the customer's position.
  final int? etaMin;
  final int? etaMax;

  /// "EGP 15.00"; null when it isn't known (no position yet).
  final String? deliveryFee;
  final bool freeDelivery;
  final String? minOrder;
  final MarketDeliveredBy deliveredBy;
  final MarketVendorState state;

  /// The vendor's offer, as the owner words it ("20% off over EGP 300").
  final String? promo;

  /// The club gives something here.
  final bool club;

  /// What the club gives here ("Free delivery"), in the owner's words.
  final String? clubBenefit;
  final double? distanceKm;

  /// "09:00", for a closed vendor.
  final String? opensAt;
  final bool favorited;

  /// A shop or a grocery: aisles rather than a menu.
  bool get sellsGoods => kind != MarketVendorKind.restaurant;
}

/// A tile in the kinds section: Food, Market, Sweets…
class MarketKindTile {
  const MarketKindTile({
    required this.id,
    required this.title,
    required this.imageUrl,
    this.subtitle,
    this.badge,
    this.kind,
  });

  final String id;
  final String title;
  final String? subtitle;
  final String imageUrl;
  final String? badge;
  final MarketVendorKind? kind;
}

/// An offer in the offers section.
class MarketOffer {
  const MarketOffer({
    required this.id,
    required this.title,
    required this.text,
    required this.imageUrl,
    required this.from,
    required this.to,
    this.code,
    this.vendorId,
  });

  final String id;
  final String title;
  final String text;
  final String imageUrl;

  /// The card's colours, as the owner chose them ("#RRGGBB").
  final String from;
  final String to;
  final String? code;
  final String? vendorId;
}

/// A cuisine or an aisle to browse by.
class MarketCuisine {
  const MarketCuisine({
    required this.id,
    required this.name,
    required this.imageUrl,
  });

  final String id;
  final String name;
  final String imageUrl;
}

/// A past order to order again.
class MarketReorder {
  const MarketReorder({
    required this.vendorId,
    required this.summary,
    required this.total,
    required this.when,
  });

  final String vendorId;
  final String summary;
  final String total;
  final String when;
}

/// What the home's sections read.
class MarketHome {
  const MarketHome({
    this.address,
    this.located = false,
    required this.kinds,
    required this.offers,
    required this.cuisines,
    required this.vendors,
    required this.reorders,
    this.clubMember = false,
  });

  /// The delivery address, short ("Home · 9 Road 233, Maadi"); null until
  /// the customer chooses one.
  final String? address;

  /// The customer gave a position (their address, or the phone's).
  final bool located;
  final List<MarketKindTile> kinds;
  final List<MarketOffer> offers;
  final List<MarketCuisine> cuisines;
  final List<MarketVendor> vendors;
  final List<MarketReorder> reorders;
  final bool clubMember;

  MarketVendor? vendor(String id) {
    for (final v in vendors) {
      if (v.id == id) return v;
    }
    return null;
  }
}

/// How an item is sold: one at a time, or by weight.
enum MarketUnit { piece, kg, g, l }

class MarketItem {
  const MarketItem({
    required this.id,
    required this.name,
    required this.price,
    required this.priceValue,
    this.description,
    this.imageUrl,
    this.oldPrice,
    this.unit = MarketUnit.piece,
    this.step = 1,
    this.hasChoices = false,
    this.popular = false,
    this.inStock = true,
    this.badge,
  });

  final String id;
  final String name;
  final String? description;
  final String? imageUrl;

  /// Per piece, or per unit of weight ("EGP 65.00").
  final String price;

  /// The same as a number, for the basket's running total.
  final double priceValue;
  final String? oldPrice;
  final MarketUnit unit;

  /// The amount added each time: 1, or 0.25 for a quarter kilo.
  final double step;
  final bool hasChoices;
  final bool popular;
  final bool inStock;
  final String? badge;
}

/// A menu's section or a shop's aisle.
class MarketShelf {
  const MarketShelf({
    required this.id,
    required this.name,
    required this.items,
    this.imageUrl,
  });

  final String id;
  final String name;
  final String? imageUrl;
  final List<MarketItem> items;
}

/// A vendor's page: its card and what it sells.
class MarketVendorPage {
  const MarketVendorPage({
    required this.vendor,
    required this.shelves,
    required this.currency,
    this.decimals = 2,
    this.about,
    this.address,
    this.hours,
  });

  final MarketVendor vendor;
  final List<MarketShelf> shelves;

  /// The app's currency and its decimals, for the basket's running total
  /// (the checkout's quote has the real one).
  final String currency;
  final int decimals;
  final String? about;

  /// The vendor's area, never a phone number: people reach the app owner.
  final String? address;
  final String? hours;
}
