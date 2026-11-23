import 'json.dart';

/// 214 Pause the shop: not taking new orders until [until] (null: until
/// reopened), with the reason customers read.
class ShopPause {
  const ShopPause({
    required this.until,
    required this.reason,
    required this.since,
  });

  static ShopPause? opt(Json json, String key) {
    final o = optObject(json, key);
    return o == null
        ? null
        : ShopPause(
            until: optDate(o, 'until'),
            reason: optStr(o, 'reason'),
            since: optDate(o, 'since') ?? DateTime.now(),
          );
  }

  final DateTime? until;
  final String? reason;
  final DateTime since;
}

class PausePlace {
  const PausePlace({required this.id, required this.name, this.paused});

  factory PausePlace.fromJson(Json json) => PausePlace(
    id: '${json['id']}',
    name: str(json, 'name'),
    paused: ShopPause.opt(json, 'paused'),
  );

  final String id;
  final String name;
  final ShopPause? paused;
}

/// 214 `GET /apps/{id}/pause`: a shop pauses as a whole (`shop`), a food
/// app's restaurants and a marketplace's places one by one (`places`).
class ShopPauseState {
  const ShopPauseState({required this.places, this.shop, this.byPlace = false});

  factory ShopPauseState.fromJson(Json json) => ShopPauseState(
    byPlace: str(json, 'kind') == 'places',
    shop: ShopPause.opt(json, 'shop'),
    places: listOf(json, 'places', PausePlace.fromJson),
  );

  final bool byPlace;
  final ShopPause? shop;
  final List<PausePlace> places;

  List<PausePlace> get pausedPlaces => [
    for (final p in places)
      if (p.paused != null) p,
  ];

  bool get anyPaused => shop != null || pausedPlaces.isNotEmpty;
}

class DayAmount {
  const DayAmount(this.cents, this.formatted);

  static DayAmount? opt(Json json, String key) {
    final o = optObject(json, key);
    return o == null
        ? null
        : DayAmount(integer(o, 'amount_cents'), str(o, 'formatted'));
  }

  final int cents;
  final String formatted;
}

/// 214 A day's summary (`GET /apps/{id}/day-summary`), against the same
/// weekday a week before.
class DaySummary {
  const DaySummary({
    required this.date,
    required this.sales,
    required this.orders,
    required this.compareDate,
    required this.compareWeekday,
    required this.compareSales,
    required this.compareOrders,
    this.average,
    this.bestSeller,
    this.changePct,
  });

  factory DaySummary.fromJson(Json json) {
    final c = optObject(json, 'compare') ?? const {};
    return DaySummary(
      date: str(json, 'date'),
      sales: DayAmount.opt(json, 'sales') ?? const DayAmount(0, ''),
      orders: integer(json, 'orders'),
      average: DayAmount.opt(json, 'average'),
      bestSeller: optStr(json, 'best_seller'),
      compareDate: str(c, 'date'),
      compareWeekday: str(c, 'weekday'),
      compareSales: DayAmount.opt(c, 'sales') ?? const DayAmount(0, ''),
      compareOrders: integer(c, 'orders'),
      changePct: optNumber(c, 'change_pct'),
    );
  }

  final String date;
  final DayAmount sales;
  final int orders;
  final DayAmount? average;
  final String? bestSeller;
  final String compareDate;
  final String compareWeekday;
  final DayAmount compareSales;
  final int compareOrders;
  final double? changePct;
}
