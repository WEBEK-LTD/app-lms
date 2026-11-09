import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart' as api;
import '../../../core/api/api_exception.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import 'market_models.dart';
import 'market_place.dart';

/// 115 The marketplace's settings (`Config.market`); null for an app that
/// isn't a marketplace, or an older server.
final marketConfigProvider = Provider<api.MarketConfig?>((ref) {
  final gate = ref.watch(appGateProvider);
  return gate is GateReady ? gate.config.market : null;
});

/// 115 What the marketplace home's sections read: the vendors
/// (`GET /market/vendors`), the offers (`GET /market/offers`) and, from
/// `Config.market`, the kinds and the cuisines and departments. Tests and
/// screenshots override it with the samples (market_samples.dart).
final marketHomeProvider = FutureProvider.autoDispose<MarketHome>((ref) async {
  final client = ref.contentApi;
  final config = ref.watch(marketConfigProvider);
  final place = ref.watch(marketPlaceProvider);
  final l10n = currentL10n;
  final (vendorsPage, coupons) = await (
    client.listMarketVendors(
      api.MarketVendorQuery(perPage: 40, lat: place?.lat, lng: place?.lng),
    ),
    client.listMarketOffers(),
  ).wait;
  final vendors = [
    for (final v in vendorsPage.items) marketVendorFrom(v, config),
  ];
  return MarketHome(
    address: place?.address,
    located: place != null,
    kinds: _kinds(config, vendors, l10n),
    offers: [
      for (final (i, c) in coupons.indexed) _offerFrom(c, i, vendorsPage.items),
    ],
    cuisines: [
      for (final c in [
        ...?config?.categories.where(
          (c) => c.kind == api.VendorKind.restaurant,
        ),
        ...?config?.categories.where(
          (c) => c.kind != api.VendorKind.restaurant,
        ),
      ])
        MarketCuisine(id: c.id, name: c.name, imageUrl: c.imageUrl ?? ''),
    ],
    vendors: vendors,
    reorders: ref.watch(authControllerProvider).isSignedIn
        ? await _reorders(client)
        : const [],
  );
});

/// 115 The search across the marketplace's places, dishes and products
/// (`GET /market/search`, at least 2 letters), near the customer's place.
/// Tests and screenshots override it with the samples (market_samples.dart).
final marketSearchProvider = FutureProvider.autoDispose
    .family<MarketSearchResults, String>((ref, query) async {
      final config = ref.watch(marketConfigProvider);
      final place = ref.watch(marketPlaceProvider);
      final found = await ref.contentApi.searchMarket(
        query,
        lat: place?.lat,
        lng: place?.lng,
      );
      return MarketSearchResults(
        places: [for (final v in found.vendors) marketVendorFrom(v, config)],
        items: [
          for (final f in found.items)
            MarketFound(
              vendor: marketVendorFrom(f.vendor, config),
              item: marketItemFrom(f.product),
            ),
        ],
      );
    });

/// 115 The customer's last finished orders, one per vendor, to order again
/// from the home (`GET /me/market-orders`). The home shows without them
/// when they can't be read.
Future<List<MarketReorder>> _reorders(YallappApi client) async {
  final api.Paged<api.MarketOrder> page;
  try {
    page = await client.listMyMarketOrders();
  } on ApiException {
    return const [];
  }
  final seen = <int>{};
  return [
    for (final o in page.items)
      if ((o.status == api.MarketOrderStatus.delivered ||
              o.status == api.MarketOrderStatus.pickedUp) &&
          seen.add(o.vendor.id) &&
          seen.length <= 6)
        MarketReorder(
          orderId: o.id,
          vendorId: '${o.vendor.id}',
          summary: [for (final l in o.lines) l.name].join(' · '),
          total: o.total.formatted,
          when: shortDate(o.createdAt),
        ),
  ];
}

/// 115 A vendor's page: a restaurant's menu sections with their dishes, or
/// a shop's departments with their first products
/// (`GET /market/vendors/{id}` and `/products?department=`).
final marketVendorPageProvider = FutureProvider.autoDispose
    .family<MarketVendorPage, String>((ref, id) async {
      final client = ref.contentApi;
      final config = ref.watch(marketConfigProvider);
      final place = ref.watch(marketPlaceProvider);
      final vendorId = int.tryParse(id);
      if (vendorId == null) {
        throw const FormatException('A vendor id is a number');
      }
      final detail = await client.getMarketVendor(
        vendorId,
        lat: place?.lat,
        lng: place?.lng,
      );
      final vendor = marketVendorFrom(detail.summary, config);
      final List<MarketShelf> shelves;
      if (detail.departments.isNotEmpty) {
        final pages = await Future.wait([
          for (final d in detail.departments)
            client.listMarketProducts(vendorId, department: d.id, perPage: 12),
        ]);
        shelves = [
          for (final (i, d) in detail.departments.indexed)
            MarketShelf(
              id: '${d.id}',
              name: d.name,
              imageUrl: d.imageUrl,
              items: [for (final p in pages[i].items) marketItemFrom(p)],
            ),
        ];
      } else {
        shelves = [
          for (final s in detail.sections)
            MarketShelf(
              id: '${s.id}',
              name: s.name,
              items: [for (final p in s.items) marketItemFrom(p)],
            ),
        ];
      }
      return MarketVendorPage(
        vendor: vendor,
        shelves: shelves,
        currency: config?.currency ?? 'EGP',
        decimals: config?.currencyDecimals ?? 2,
        about: detail.description,
        address: detail.area,
        hours: _today(detail.hours),
      );
    });

/// A vendor as the screens show it.
MarketVendor marketVendorFrom(
  api.MarketVendorSummary v,
  api.MarketConfig? config,
) => MarketVendor(
  id: '${v.id}',
  kind: switch (v.kind) {
    api.VendorKind.restaurant => MarketVendorKind.restaurant,
    api.VendorKind.grocery => MarketVendorKind.grocery,
    api.VendorKind.shop => MarketVendorKind.shop,
  },
  name: v.name,
  coverUrl: v.coverUrl ?? '',
  logoUrl: v.logoUrl ?? '',
  tags: [for (final c in v.categories) config?.category(c)?.name ?? c],
  rating: v.rating,
  ratings: v.ratingsCount,
  etaMin: v.deliveryMinutes?.min,
  etaMax: v.deliveryMinutes?.max,
  deliveryFee: v.deliveryFee?.formatted,
  freeDelivery: v.freeDelivery,
  minOrder: v.minOrder?.formatted,
  deliveredBy: v.deliveryBy == api.VendorDelivery.vendor
      ? MarketDeliveredBy.vendor
      : MarketDeliveredBy.app,
  state: !v.open && !v.busy
      ? MarketVendorState.closed
      : (v.busy ? MarketVendorState.busy : MarketVendorState.open),
  promo: v.offer,
  club: v.clubBenefit != null,
  clubBenefit: v.clubBenefit,
  distanceKm: v.distanceKm,
  opensAt: v.opensAt == null ? null : clockTime(v.opensAt!),
);

/// A dish or a product as the screens show it.
MarketItem marketItemFrom(api.MarketProduct p) => MarketItem(
  id: '${p.id}',
  name: p.name,
  description: p.description,
  imageUrl: p.photos.firstOrNull ?? p.imageUrl,
  photos: p.photos,
  price: p.price.formatted,
  priceValue: double.tryParse(p.price.amount) ?? 0,
  oldPrice: p.wasPrice?.formatted,
  unit: switch (p.unit) {
    api.ProductUnit.item => MarketUnit.piece,
    api.ProductUnit.kg => MarketUnit.kg,
    api.ProductUnit.g => MarketUnit.g,
    api.ProductUnit.l => MarketUnit.l,
  },
  step: p.step,
  hasChoices: p.choices.isNotEmpty,
  popular: p.tags.contains('popular'),
  inStock: p.inStock,
);

/// The kinds the app has, in the owner's order, each with how many
/// vendors and a picture: a category's, else a vendor's.
List<MarketKindTile> _kinds(
  api.MarketConfig? config,
  List<MarketVendor> vendors,
  AppLocalizations l10n,
) {
  final kinds = config?.kinds ?? const [api.VendorKind.restaurant];
  return [
    for (final k in kinds)
      () {
        final kind = switch (k) {
          api.VendorKind.restaurant => MarketVendorKind.restaurant,
          api.VendorKind.grocery => MarketVendorKind.grocery,
          api.VendorKind.shop => MarketVendorKind.shop,
        };
        final mine = vendors.where((v) => v.kind == kind).toList();
        final picture =
            config?.categories
                .where((c) => c.kind == k && c.imageUrl != null)
                .firstOrNull
                ?.imageUrl ??
            mine.where((v) => v.coverUrl.isNotEmpty).firstOrNull?.coverUrl ??
            '';
        return MarketKindTile(
          id: k.name,
          title: switch (k) {
            api.VendorKind.restaurant => l10n.marketKindRestaurant,
            api.VendorKind.grocery => l10n.marketKindGrocery,
            api.VendorKind.shop => l10n.marketKindShop,
          },
          subtitle: l10n.marketPlaces(mine.length),
          imageUrl: picture,
          kind: kind,
        );
      }(),
  ];
}

/// The offer cards' colours, one after another (the owner styles the
/// section in the editor; these are only the cards' own).
const _offerColours = [
  ('#FF8A3D', '#E4472B'),
  ('#2C6CDB', '#143B8F'),
  ('#2E9B62', '#156B43'),
  ('#8E5BD9', '#5A2EA6'),
];

MarketOffer _offerFrom(
  api.MarketCoupon c,
  int index,
  List<api.MarketVendorSummary> vendors,
) {
  final (from, to) = _offerColours[index % _offerColours.length];
  final vendor = c.vendorId == null
      ? null
      : vendors.where((v) => v.id == c.vendorId).firstOrNull;
  return MarketOffer(
    id: '${c.id}',
    title: c.title,
    text: c.description ?? vendor?.name ?? '',
    imageUrl: vendor?.coverUrl ?? '',
    from: from,
    to: to,
    code: c.code,
    vendorId: c.vendorId == null ? null : '${c.vendorId}',
  );
}

/// Today's hours ("08:00–23:00"), when the vendor has them.
String? _today(List<api.MarketHours> hours) {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  final today = days[DateTime.now().weekday - 1];
  final open = hours.where((h) => h.day == today).toList();
  if (open.isEmpty) return null;
  return open.map((h) => '${h.opens}–${h.closes}').join(', ');
}
