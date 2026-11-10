import 'json.dart';
import 'market_api_models.dart';

/// 115 The vendor app (docs/api/openapi.yaml, the Vendor tag): a vendor's
/// staff take its orders, pick them, mark them ready and hand them over,
/// set it busy or paused, and put items in or out of stock. They never see
/// the customer's phone or email, only the first name and the order.

enum VendorRole { owner, manager, orders, picker }

/// The order lists: waiting for an answer, being worked, for later, and
/// the last seven days' finished ones.
enum VendorOrderScope { fresh, active, scheduled, done }

extension VendorOrderScopeX on VendorOrderScope {
  String get wire => this == VendorOrderScope.fresh ? 'new' : name;
}

enum VendorRejection { closing, tooBusy, itemsUnavailable, outsideArea, other }

/// Who an order is handed over to: the vendor's own driver, delivered by
/// that driver, or picked up by the customer with their code.
enum VendorHandover { driver, delivered, customer }

enum PickOutcome { picked, substituted, missing }

/// `VendorDesk`: the vendor as its staff see it.
class VendorDesk {
  const VendorDesk({
    required this.id,
    required this.kind,
    required this.name,
    required this.open,
    required this.paused,
    required this.accepting,
    required this.deliveryBy,
    required this.role,
    required this.todayOrders,
    required this.todaySales,
    required this.newOrders,
    this.logoUrl,
    this.busyUntil,
    this.delay,
    this.prepMinutes = 20,
    this.hours = const [],
    this.closedDates = const [],
    this.canEditPlace = false,
  });

  factory VendorDesk.fromJson(Json json) {
    final today = optObject(json, 'today', (j) => j) ?? const {};
    return VendorDesk(
      id: reqInt(json, 'id'),
      kind: enumFrom(VendorKind.values, json['kind'], VendorKind.restaurant),
      name: reqString(json, 'name'),
      logoUrl: optString(json, 'logo_url'),
      open: boolOr(json, 'open', true),
      busyUntil: optDate(json, 'busy_until'),
      paused: boolOr(json, 'paused', false),
      accepting: boolOr(json, 'accepting', true),
      deliveryBy: enumFrom(
        VendorDelivery.values,
        json['delivery_by'],
        VendorDelivery.app,
      ),
      role: enumFrom(VendorRole.values, json['role'], VendorRole.orders),
      todayOrders: intOr(today, 'orders', 0),
      todaySales:
          optObject(today, 'sales', MarketMoney.fromJson) ??
          const MarketMoney(amount: '0', formatted: ''),
      newOrders: intOr(today, 'new_orders', 0),
      delay: optObject(json, 'delay', MarketVendorDelay.fromJson),
      prepMinutes: intOr(json, 'prep_minutes', 20),
      hours: listOf(json, 'hours', MarketHours.fromJson),
      closedDates: listOf(json, 'closed_dates', VendorClosedDates.fromJson),
      canEditPlace: boolOr(json, 'can_edit_place', false),
    );
  }

  final int id;
  final VendorKind kind;
  final String name;
  final String? logoUrl;

  /// Within its opening hours.
  final bool open;
  final DateTime? busyUntil;
  final bool paused;

  /// Taking new orders now.
  final bool accepting;
  final VendorDelivery deliveryBy;
  final VendorRole role;
  final int todayOrders;
  final MarketMoney todaySales;
  final int newOrders;

  /// 115.20 Running late (still taking orders); null otherwise.
  final MarketVendorDelay? delay;

  /// How long an order usually takes, in minutes.
  final int prepMinutes;

  /// The weekly hours: up to two periods a day; a day left out is closed.
  final List<MarketHours> hours;

  /// The days off from today on, soonest first.
  final List<VendorClosedDates> closedDates;

  /// The signed-in person may change the hours, days off and preparation
  /// time (the place's owner and managers).
  final bool canEditPlace;

  /// A picker only picks; the others also answer orders and set the
  /// vendor busy or running late.
  bool get answers => role != VendorRole.picker;
}

/// 115.20 Days off: closed all day from [from] to [to] (`YYYY-MM-DD`, both
/// included), in the app's time zone.
class VendorClosedDates {
  const VendorClosedDates({required this.from, required this.to});

  factory VendorClosedDates.fromJson(Json json) => VendorClosedDates(
    from: reqString(json, 'from'),
    to: optString(json, 'to') ?? reqString(json, 'from'),
  );

  final String from;
  final String to;

  Json toJson() => {'from': from, 'to': to};
}

/// 115.20 What the vendor sets when it runs late: [forMinutes] null lasts
/// until it ends it.
class VendorDelaySet {
  const VendorDelaySet({
    required this.minutes,
    required this.reason,
    this.note,
    this.forMinutes,
  });

  final int minutes;
  final MarketDelayReason reason;
  final String? note;
  final int? forMinutes;

  Json toJson() => {
    'minutes': minutes,
    'reason': reason.name,
    if (reason == MarketDelayReason.other) 'note': note,
    'for_minutes': forMinutes,
  };
}

/// Where the vendor's own driver takes the order.
class VendorDropoff {
  const VendorDropoff({
    required this.address,
    this.details,
    this.lat,
    this.lng,
    this.notes,
  });

  factory VendorDropoff.fromJson(Json json) => VendorDropoff(
    address: reqString(json, 'address'),
    details: optString(json, 'details'),
    lat: optDouble(json, 'lat'),
    lng: optDouble(json, 'lng'),
    notes: optString(json, 'notes'),
  );

  final String address;
  final String? details;
  final double? lat;
  final double? lng;
  final String? notes;
}

/// `VendorOrder`: an order as the vendor sees it.
class VendorOrder {
  const VendorOrder({
    required this.id,
    required this.reference,
    required this.status,
    required this.fulfilment,
    required this.lines,
    required this.subtotal,
    required this.customerName,
    required this.payMethod,
    required this.paymentStatus,
    required this.createdAt,
    this.scheduledFor,
    this.notes,
    this.dropoff,
    this.collect,
    this.prepMinutes,
    this.readyAt,
    this.courierName,
    this.timeline = const [],
  });

  factory VendorOrder.fromJson(Json json) {
    final payment = asJson(json['payment'], 'payment');
    final customer = optObject(json, 'customer', (j) => j) ?? const {};
    final courier = optObject(json, 'courier', (j) => j);
    return VendorOrder(
      id: reqInt(json, 'id'),
      reference: reqString(json, 'reference'),
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
      subtotal: MarketMoney.fromJson(asJson(json['subtotal'], 'subtotal')),
      customerName: optString(customer, 'first_name') ?? '',
      notes: optString(json, 'notes'),
      dropoff: optObject(json, 'dropoff', VendorDropoff.fromJson),
      payMethod: enumFromSnake(
        MarketPayMethod.values,
        payment['method'],
        MarketPayMethod.cash,
      ),
      paymentStatus: optString(payment, 'status') ?? 'unpaid',
      collect: optObject(payment, 'collect', MarketMoney.fromJson),
      prepMinutes: optInt(json, 'prep_minutes'),
      readyAt: optDate(json, 'ready_at'),
      courierName: courier == null ? null : optString(courier, 'name'),
      createdAt: reqDate(json, 'created_at'),
      timeline: [
        for (final t in listOf(json, 'timeline', (j) => j))
          if (optDate(t, 'at') case final at?)
            (
              status: enumFromSnake(
                MarketOrderStatus.values,
                t['status'],
                MarketOrderStatus.placed,
              ),
              at: at,
            ),
      ],
    );
  }

  final int id;
  final String reference;
  final MarketOrderStatus status;
  final MarketFulfilment fulfilment;
  final DateTime? scheduledFor;
  final List<MarketOrderLine> lines;
  final MarketMoney subtotal;
  final String customerName;
  final String? notes;

  /// Only when the vendor delivers itself.
  final VendorDropoff? dropoff;
  final MarketPayMethod payMethod;
  final String paymentStatus;

  /// Cash to collect, when the vendor's driver delivers or for pick-up.
  final MarketMoney? collect;
  final int? prepMinutes;
  final DateTime? readyAt;

  /// The app's courier taking it, once one has the job.
  final String? courierName;
  final DateTime createdAt;
  final List<({MarketOrderStatus status, DateTime at})> timeline;

  bool get pickup => fulfilment == MarketFulfilment.pickup;
}

/// One line of a picked grocery order (`PATCH /vendor/orders/{id}/lines`).
class PickLine {
  const PickLine({
    required this.lineId,
    required this.outcome,
    this.quantity,
    this.substituteProductId,
  });

  final int lineId;
  final PickOutcome outcome;
  final double? quantity;
  final int? substituteProductId;

  Json toJson() => {
    'line_id': lineId,
    'outcome': outcome.name,
    if (quantity != null) 'quantity': quantity,
    if (substituteProductId != null)
      'substitute_product_id': substituteProductId,
  };
}

/// One month's statement for the vendor (`GET /vendor/statements`): the
/// orders delivered that month, what the vendor earns on each and the
/// app's commission, the refunds and compensations decided on them, and
/// what is due between the vendor and the app.
class VendorStatement {
  const VendorStatement({
    required this.month,
    required this.orderCount,
    required this.total,
    required this.commission,
    required this.vendorEarns,
    required this.net,
    this.orders = const [],
    this.adjustments = const [],
  });

  factory VendorStatement.fromJson(Json json) {
    final totals = asJson(json['totals'], 'totals');
    MarketMoney money(String key) =>
        optObject(totals, key, MarketMoney.fromJson) ??
        const MarketMoney(amount: '0', formatted: '');
    return VendorStatement(
      month: reqString(json, 'month'),
      orderCount: intOr(totals, 'orders', 0),
      total: money('total'),
      commission: money('commission'),
      vendorEarns: money('vendor_earns'),
      net: money('net'),
      orders: listOf(
        json,
        'orders',
        (o) => (
          id: reqInt(o, 'id'),
          reference: reqString(o, 'reference'),
          at: reqDate(o, 'at'),
          total: MarketMoney.fromJson(asJson(o['total'], 'total')),
          dueToVendor: MarketMoney.fromJson(
            asJson(o['due_to_vendor'], 'due_to_vendor'),
          ),
        ),
      ),
      adjustments: listOf(
        json,
        'adjustments',
        (a) => (
          reference: reqString(a, 'reference'),
          at: reqDate(a, 'at'),
          refund: a['kind'] == 'refund',
          amount: MarketMoney.fromJson(asJson(a['amount'], 'amount')),
          byVendor: a['funder'] == 'vendor',
        ),
      ),
    );
  }

  /// `YYYY-MM`.
  final String month;
  final int orderCount;
  final MarketMoney total;
  final MarketMoney commission;
  final MarketMoney vendorEarns;

  /// What the app owes the vendor (positive) or the vendor owes the app
  /// (negative) after refunds.
  final MarketMoney net;
  final List<
    ({
      int id,
      String reference,
      DateTime at,
      MarketMoney total,
      MarketMoney dueToVendor,
    })
  >
  orders;
  final List<
    ({
      String reference,
      DateTime at,
      bool refund,
      MarketMoney amount,
      bool byVendor,
    })
  >
  adjustments;
}

/// A complaint the app's support shared with the vendor
/// (`GET /vendor/complaints`), read only: what was wrong and the
/// decision, never the customer or the conversation.
class VendorComplaint {
  const VendorComplaint({
    required this.complaint,
    required this.orderReference,
    this.byVendor = false,
  });

  factory VendorComplaint.fromJson(Json json) {
    final decision = optObject(json, 'decision', (j) => j);
    return VendorComplaint(
      complaint: MarketComplaint.fromJson(json),
      orderReference: reqString(json, 'order_reference'),
      byVendor: decision != null && decision['funder'] == 'vendor',
    );
  }

  final MarketComplaint complaint;
  final String orderReference;

  /// The vendor pays the decision's refund or compensation.
  final bool byVendor;
}
