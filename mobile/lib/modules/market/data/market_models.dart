/// 115 The marketplace: restaurants and shops (supermarkets, sweets,
/// pharmacies) in one app, with the app owner's couriers or the vendor's own.
///
/// These are the app's side of the marketplace contract. Until the platform
/// serves it, [MarketSamples] fills them (lib/modules/market/data/market_samples.dart).
library;

enum MarketVendorKind { restaurant, grocery }

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
    required this.rating,
    required this.ratings,
    required this.etaMin,
    required this.etaMax,
    required this.deliveryFeeCents,
    required this.minOrderCents,
    required this.currency,
    this.deliveredBy = MarketDeliveredBy.app,
    this.state = MarketVendorState.open,
    this.promo,
    this.club = false,
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
  final double rating;
  final int ratings;
  final int etaMin;
  final int etaMax;

  /// 0: free delivery.
  final int deliveryFeeCents;
  final int minOrderCents;
  final String currency;
  final MarketDeliveredBy deliveredBy;
  final MarketVendorState state;

  /// The vendor's offer, as the owner words it ("20% off over EGP 300").
  final String? promo;

  /// Free delivery for club members.
  final bool club;
  final double? distanceKm;

  /// "09:00", for a closed vendor.
  final String? opensAt;
  final bool favorited;

  bool get freeDelivery => deliveryFeeCents == 0;
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
    required this.totalCents,
    required this.currency,
    required this.when,
  });

  final String vendorId;
  final String summary;
  final int totalCents;
  final String currency;
  final String when;
}

/// What the home's sections read.
class MarketHome {
  const MarketHome({
    required this.address,
    required this.kinds,
    required this.offers,
    required this.cuisines,
    required this.vendors,
    required this.reorders,
    this.clubMember = false,
  });

  /// The delivery address, short ("Home · 9 Road 233, Maadi").
  final String address;
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
enum MarketUnit { piece, kg }

class MarketItem {
  const MarketItem({
    required this.id,
    required this.name,
    required this.priceCents,
    this.description,
    this.imageUrl,
    this.oldPriceCents,
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

  /// Per piece, or per kilogram.
  final int priceCents;
  final int? oldPriceCents;
  final MarketUnit unit;

  /// For weight: the step in kilograms (0.25).
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
    this.about,
    this.address,
    this.hours,
  });

  final MarketVendor vendor;
  final List<MarketShelf> shelves;
  final String? about;

  /// The vendor's area, never a phone number: people reach the app owner.
  final String? address;
  final String? hours;
}
