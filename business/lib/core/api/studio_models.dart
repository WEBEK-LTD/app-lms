import 'json.dart';
import 'models.dart' show Money;

/// 125 Yallapp Business 1.0.2: the Owner API's schemas for Studio apps
/// (food orders, restaurants, shipments and couriers, rides and drivers,
/// the marketplace, a school), Prime (insights, smart alerts) and VIP (the
/// account manager), read from JSON.
///
/// IDs are kept as text whatever the server sends (a number or a string);
/// [wireId] gives a number back when the text is one, for request bodies.

Object wireId(String id) => int.tryParse(id) ?? id;

/// `{id, name}` of something an item points to (a restaurant, a courier, a
/// vendor, a teacher).
class ItemRef {
  const ItemRef({required this.id, required this.name});

  factory ItemRef.fromJson(Json json) =>
      ItemRef(id: str(json, 'id'), name: str(json, 'name'));

  static ItemRef? opt(Json json, String key) {
    final value = optObject(json, key);
    return value == null ? null : ItemRef.fromJson(value);
  }

  final String id;
  final String name;
}

/// A pickup or a drop-off: `{name, address}`.
class Place {
  const Place({required this.name, required this.address});

  factory Place.fromJson(Json json) =>
      Place(name: str(json, 'name'), address: str(json, 'address'));

  static Place read(Json json, String key) =>
      Place.fromJson(optObject(json, key) ?? const {});

  final String name;
  final String address;
}

/// One step of an item's history: `{status, label, at, by}`.
class TimelineEntry {
  const TimelineEntry({
    required this.status,
    required this.label,
    required this.at,
    this.by,
  });

  factory TimelineEntry.fromJson(Json json) => TimelineEntry(
    status: str(json, 'status'),
    label: str(json, 'label'),
    at: date(json, 'at'),
    by: optStr(json, 'by'),
  );

  final String status;
  final String label;
  final DateTime at;
  final String? by;
}

// 2. Food orders

class FoodPayment {
  const FoodPayment({
    required this.method,
    required this.paid,
    required this.label,
  });

  factory FoodPayment.fromJson(Json json) => FoodPayment(
    method: str(json, 'method'),
    paid: boolean(json, 'paid'),
    label: str(json, 'label'),
  );

  /// cash or card.
  final String method;
  final bool paid;
  final String label;

  bool get cash => method == 'cash';
}

class FoodOrder {
  const FoodOrder({
    required this.id,
    required this.reference,
    required this.status,
    required this.statusLabel,
    required this.restaurant,
    required this.customerName,
    required this.summary,
    required this.itemCount,
    required this.total,
    required this.payment,
    required this.placedAt,
    this.distanceKm,
    this.readyAt,
    this.courier,
    this.shipmentId,
    this.steps = const [],
  });

  factory FoodOrder.fromJson(Json json) => FoodOrder(
    id: str(json, 'id'),
    reference: str(json, 'reference'),
    status: str(json, 'status'),
    statusLabel: str(json, 'status_label'),
    restaurant: ItemRef.fromJson(optObject(json, 'restaurant') ?? const {}),
    customerName: str(json, 'customer_name'),
    summary: str(json, 'summary'),
    itemCount: integer(json, 'item_count'),
    total: Money.fromJson(optObject(json, 'total') ?? const {}),
    payment: FoodPayment.fromJson(optObject(json, 'payment') ?? const {}),
    distanceKm: optNumber(json, 'distance_km'),
    placedAt: date(json, 'placed_at'),
    readyAt: optDate(json, 'ready_at'),
    courier: ItemRef.opt(json, 'courier'),
    shipmentId: optStr(json, 'shipment_id'),
    steps: strings(json, 'steps'),
  );

  final String id;

  /// F-1048.
  final String reference;

  /// placed, accepted, preparing, ready, on_the_way, delivered, rejected,
  /// cancelled, failed…
  final String status;
  final String statusLabel;
  final ItemRef restaurant;
  final String customerName;

  /// "2 × Smash burger, 1 × Fries".
  final String summary;
  final int itemCount;
  final Money total;
  final FoodPayment payment;
  final double? distanceKm;
  final DateTime placedAt;
  final DateTime? readyAt;
  final ItemRef? courier;
  final String? shipmentId;

  /// What the business may do now: accept, reject, ready, cancel.
  final List<String> steps;

  bool get canAccept => steps.contains('accept');
}

class FoodLine {
  const FoodLine({
    required this.quantity,
    required this.name,
    required this.total,
    this.options = const [],
  });

  factory FoodLine.fromJson(Json json) => FoodLine(
    quantity: number(json, 'quantity', 1),
    name: str(json, 'name'),
    options: strings(json, 'options'),
    total: Money.fromJson(optObject(json, 'total') ?? const {}),
  );

  /// A number: a marketplace line can be weighed (1.5 kg).
  final num quantity;
  final String name;

  /// The choices ("Size: Large") and the line's note last.
  final List<String> options;
  final Money total;
}

class FoodCustomer {
  const FoodCustomer({
    required this.name,
    required this.address,
    this.phone,
    this.note,
  });

  factory FoodCustomer.fromJson(Json json) => FoodCustomer(
    name: str(json, 'name'),
    phone: optStr(json, 'phone'),
    address: str(json, 'address'),
    note: optStr(json, 'note'),
  );

  final String name;
  final String? phone;
  final String address;
  final String? note;
}

/// `{id, label}`: a reason to reject, a decision, a choice.
class Choice {
  const Choice({required this.id, required this.label});

  factory Choice.fromJson(Json json) =>
      Choice(id: str(json, 'id'), label: str(json, 'label'));

  final String id;
  final String label;
}

class FoodOrderDetail {
  const FoodOrderDetail({
    required this.order,
    required this.lines,
    required this.subtotal,
    required this.deliveryFee,
    required this.customer,
    required this.restaurantAddress,
    this.timeline = const [],
    this.refundDue = false,
    this.prepChoices = const [10, 15, 20, 30, 45],
    this.rejectionReasons = const [],
    this.cashToCollect,
  });

  factory FoodOrderDetail.fromJson(Json json) {
    final prep = json['prep_choices'];
    return FoodOrderDetail(
      order: FoodOrder.fromJson(json),
      lines: listOf(json, 'lines', FoodLine.fromJson),
      subtotal: Money.fromJson(optObject(json, 'subtotal') ?? const {}),
      deliveryFee: Money.fromJson(optObject(json, 'delivery_fee') ?? const {}),
      customer: FoodCustomer.fromJson(optObject(json, 'customer') ?? const {}),
      restaurantAddress: str(json, 'restaurant_address'),
      timeline: listOf(json, 'timeline', TimelineEntry.fromJson),
      refundDue: boolean(json, 'refund_due'),
      prepChoices: prep is List
          ? [
              for (final p in prep)
                if (p is num) p.toInt(),
            ]
          : const [10, 15, 20, 30, 45],
      rejectionReasons: listOf(json, 'rejection_reasons', Choice.fromJson),
      cashToCollect: Money.opt(json, 'cash_to_collect'),
    );
  }

  final FoodOrder order;
  final List<FoodLine> lines;
  final Money subtotal;
  final Money deliveryFee;
  final FoodCustomer customer;
  final String restaurantAddress;
  final List<TimelineEntry> timeline;
  final bool refundDue;

  /// Minutes to prepare, as the accept sheet offers them.
  final List<int> prepChoices;
  final List<Choice> rejectionReasons;

  /// Cash on delivery: what the courier collects.
  final Money? cashToCollect;
}

class Restaurant {
  const Restaurant({
    required this.id,
    required this.name,
    required this.active,
    required this.open,
    required this.delayed,
    required this.stateLabel,
    this.busyUntil,
    this.opensAt,
  });

  factory Restaurant.fromJson(Json json) => Restaurant(
    id: str(json, 'id'),
    name: str(json, 'name'),
    active: boolean(json, 'active', true),
    open: boolean(json, 'open'),
    busyUntil: optDate(json, 'busy_until'),
    delayed: boolean(json, 'delayed'),
    opensAt: optDate(json, 'opens_at'),
    stateLabel: str(json, 'state_label'),
  );

  final String id;
  final String name;
  final bool active;
  final bool open;

  /// Busy (no new orders) until then.
  final DateTime? busyUntil;
  final bool delayed;
  final DateTime? opensAt;
  final String stateLabel;
}

// 3. Shipments and couriers

class Shipment {
  const Shipment({
    required this.id,
    required this.reference,
    required this.status,
    required this.statusLabel,
    required this.pickup,
    required this.dropoff,
    required this.price,
    required this.paymentMethod,
    required this.paymentLabel,
    required this.createdAt,
    this.distanceKm,
    this.collect,
    this.courier,
    this.foodOrder,
    this.waitingMinutes,
    this.statuses = const [],
    this.assignable = false,
  });

  factory Shipment.fromJson(Json json) {
    final payment = optObject(json, 'payment') ?? const {};
    final food = optObject(json, 'food_order');
    return Shipment(
      id: str(json, 'id'),
      reference: str(json, 'reference'),
      status: str(json, 'status'),
      statusLabel: str(json, 'status_label'),
      pickup: Place.read(json, 'pickup'),
      dropoff: Place.read(json, 'dropoff'),
      distanceKm: optNumber(json, 'distance_km'),
      price: Money.fromJson(optObject(json, 'price') ?? const {}),
      paymentMethod: str(payment, 'method'),
      paymentLabel: str(payment, 'label'),
      collect: Money.opt(json, 'collect'),
      courier: ItemRef.opt(json, 'courier'),
      foodOrder: food == null
          ? null
          : (id: str(food, 'id'), reference: str(food, 'reference')),
      createdAt: date(json, 'created_at'),
      waitingMinutes: optInt(json, 'waiting_minutes'),
      statuses: strings(json, 'statuses'),
      assignable: boolean(json, 'assignable'),
    );
  }

  final String id;

  /// S-2031.
  final String reference;
  final String status;
  final String statusLabel;
  final Place pickup;
  final Place dropoff;
  final double? distanceKm;
  final Money price;
  final String paymentMethod;
  final String paymentLabel;

  /// Cash the courier collects at the door.
  final Money? collect;
  final ItemRef? courier;
  final ({String id, String reference})? foodOrder;
  final DateTime createdAt;

  /// How long a pending one has waited for a courier.
  final int? waitingMinutes;

  /// The statuses the business may move it to next.
  final List<String> statuses;

  /// It can be given to a courier (again).
  final bool assignable;

  bool get needsCourier => courier == null && status == 'pending';
}

class ShipmentDetail {
  const ShipmentDetail({
    required this.shipment,
    required this.recipientName,
    this.timeline = const [],
    this.note,
    this.recipientPhone,
  });

  factory ShipmentDetail.fromJson(Json json) {
    final recipient = optObject(json, 'recipient') ?? const {};
    return ShipmentDetail(
      shipment: Shipment.fromJson(json),
      timeline: listOf(json, 'timeline', TimelineEntry.fromJson),
      note: optStr(json, 'note'),
      recipientName: str(recipient, 'name'),
      recipientPhone: optStr(recipient, 'phone'),
    );
  }

  final Shipment shipment;
  final List<TimelineEntry> timeline;
  final String? note;
  final String recipientName;
  final String? recipientPhone;
}

class Courier {
  const Courier({
    required this.id,
    required this.name,
    required this.initials,
    required this.active,
    required this.onDuty,
    required this.activeJobs,
    required this.state,
    this.phone,
    this.distanceKm,
  });

  factory Courier.fromJson(Json json) => Courier(
    id: str(json, 'id'),
    name: str(json, 'name'),
    initials: str(json, 'initials'),
    phone: optStr(json, 'phone'),
    active: boolean(json, 'active', true),
    onDuty: boolean(json, 'on_duty'),
    activeJobs: integer(json, 'active_jobs'),
    distanceKm: optNumber(json, 'distance_km'),
    state: str(json, 'state', 'off'),
  );

  final String id;
  final String name;
  final String initials;
  final String? phone;
  final bool active;
  final bool onDuty;
  final int activeJobs;
  final double? distanceKm;

  /// free, busy, off or paused.
  final String state;
}

// 4. Rides and drivers

class RideDriver {
  const RideDriver({
    required this.id,
    required this.name,
    this.phone,
    this.plate,
    this.vehicle,
  });

  factory RideDriver.fromJson(Json json) => RideDriver(
    id: str(json, 'id'),
    name: str(json, 'name'),
    phone: optStr(json, 'phone'),
    plate: optStr(json, 'plate'),
    vehicle: optStr(json, 'vehicle'),
  );

  final String id;
  final String name;
  final String? phone;
  final String? plate;
  final String? vehicle;
}

class Ride {
  const Ride({
    required this.id,
    required this.reference,
    required this.status,
    required this.statusLabel,
    required this.pickup,
    required this.dropoff,
    required this.quoted,
    required this.riderName,
    required this.paymentLabel,
    required this.updatedAt,
    this.vehicleType,
    this.distanceKm,
    this.finalPrice,
    this.driver,
    this.searchingMinutes,
    this.scheduledFor,
    this.eta,
    this.givable = false,
    this.cancellable = false,
  });

  factory Ride.fromJson(Json json) {
    final driver = optObject(json, 'driver');
    return Ride(
      id: str(json, 'id'),
      reference: str(json, 'reference'),
      status: str(json, 'status'),
      statusLabel: str(json, 'status_label'),
      vehicleType: optStr(json, 'vehicle_type'),
      pickup: Place.read(json, 'pickup'),
      dropoff: Place.read(json, 'dropoff'),
      distanceKm: optNumber(json, 'distance_km'),
      quoted: Money.fromJson(optObject(json, 'quoted') ?? const {}),
      finalPrice: Money.opt(json, 'final'),
      riderName: str(json, 'rider_name'),
      paymentLabel: str(json, 'payment_label'),
      driver: driver == null ? null : RideDriver.fromJson(driver),
      searchingMinutes: optInt(json, 'searching_minutes'),
      scheduledFor: optDate(json, 'scheduled_for'),
      eta: optDate(json, 'eta'),
      givable: boolean(json, 'givable'),
      cancellable: boolean(json, 'cancellable'),
      updatedAt: date(json, 'updated_at'),
    );
  }

  final String id;

  /// R-551.
  final String reference;
  final String status;
  final String statusLabel;

  /// Economy, Comfort…
  final String? vehicleType;
  final Place pickup;
  final Place dropoff;
  final double? distanceKm;
  final Money quoted;
  final Money? finalPrice;
  final String riderName;
  final String paymentLabel;
  final RideDriver? driver;

  /// Still looking for a driver, for this long.
  final int? searchingMinutes;
  final DateTime? scheduledFor;
  final DateTime? eta;

  /// It can be given to a driver.
  final bool givable;
  final bool cancellable;
  final DateTime updatedAt;
}

class RideDetail {
  const RideDetail({required this.ride, this.timeline = const []});

  factory RideDetail.fromJson(Json json) => RideDetail(
    ride: Ride.fromJson(json),
    timeline: listOf(json, 'timeline', TimelineEntry.fromJson),
  );

  final Ride ride;
  final List<TimelineEntry> timeline;
}

class Driver {
  const Driver({
    required this.id,
    required this.name,
    required this.initials,
    required this.state,
    this.phone,
    this.plate,
    this.model,
    this.type,
    this.distanceKm,
    this.sameType = false,
  });

  factory Driver.fromJson(Json json) {
    final vehicle = optObject(json, 'vehicle');
    return Driver(
      id: str(json, 'id'),
      name: str(json, 'name'),
      initials: str(json, 'initials'),
      phone: optStr(json, 'phone'),
      plate: vehicle == null ? null : optStr(vehicle, 'plate'),
      model: vehicle == null ? null : optStr(vehicle, 'model'),
      type: vehicle == null ? null : optStr(vehicle, 'type'),
      state: str(json, 'state', 'offline'),
      distanceKm: optNumber(json, 'distance_km'),
      sameType: boolean(json, 'same_type'),
    );
  }

  final String id;
  final String name;
  final String initials;
  final String? phone;
  final String? plate;
  final String? model;
  final String? type;

  /// free, on_ride, offline or suspended.
  final String state;
  final double? distanceKm;

  /// Drives the vehicle type the ride asked for.
  final bool sameType;
}

// 5. Marketplace

class Vendor {
  const Vendor({
    required this.id,
    required this.name,
    required this.kind,
    this.active = true,
    this.open = false,
    this.ordersToday = 0,
  });

  factory Vendor.fromJson(Json json) => Vendor(
    id: str(json, 'id'),
    name: str(json, 'name'),
    kind: str(json, 'kind'),
    active: boolean(json, 'active', true),
    open: boolean(json, 'open'),
    ordersToday: integer(json, 'orders_today'),
  );

  final String id;
  final String name;
  final String kind;
  final bool active;
  final bool open;
  final int ordersToday;
}

class MarketOrder {
  const MarketOrder({
    required this.id,
    required this.reference,
    required this.status,
    required this.statusLabel,
    required this.vendor,
    required this.customerName,
    required this.summary,
    required this.total,
    required this.fulfilment,
    required this.placedAt,
    this.deliveryBy,
  });

  factory MarketOrder.fromJson(Json json) => MarketOrder(
    id: str(json, 'id'),
    reference: str(json, 'reference'),
    status: str(json, 'status'),
    statusLabel: str(json, 'status_label'),
    vendor: Vendor.fromJson(optObject(json, 'vendor') ?? const {}),
    customerName: str(json, 'customer_name'),
    summary: str(json, 'summary'),
    total: Money.fromJson(optObject(json, 'total') ?? const {}),
    fulfilment: str(json, 'fulfilment'),
    deliveryBy: optStr(json, 'delivery_by'),
    placedAt: date(json, 'placed_at'),
  );

  final String id;

  /// M-1042.
  final String reference;
  final String status;
  final String statusLabel;
  final Vendor vendor;
  final String customerName;
  final String summary;
  final Money total;

  /// delivery or pickup.
  final String fulfilment;

  /// Who delivers it: the vendor, Yallapp's couriers…
  final String? deliveryBy;
  final DateTime placedAt;
}

class MarketOrderDetail {
  const MarketOrderDetail({
    required this.order,
    this.lines = const [],
    this.timeline = const [],
  });

  factory MarketOrderDetail.fromJson(Json json) => MarketOrderDetail(
    order: MarketOrder.fromJson(json),
    lines: listOf(json, 'lines', FoodLine.fromJson),
    timeline: listOf(json, 'timeline', TimelineEntry.fromJson),
  );

  final MarketOrder order;
  final List<FoodLine> lines;
  final List<TimelineEntry> timeline;
}

class Complaint {
  const Complaint({
    required this.id,
    required this.status,
    required this.statusLabel,
    required this.subject,
    required this.orderId,
    required this.orderReference,
    required this.orderTotal,
    required this.vendor,
    required this.customerName,
    required this.excerpt,
    required this.createdAt,
    required this.updatedAt,
    this.waitingFor,
    this.refundSuggested,
  });

  factory Complaint.fromJson(Json json) {
    final order = optObject(json, 'order') ?? const {};
    return Complaint(
      id: str(json, 'id'),
      status: str(json, 'status'),
      statusLabel: str(json, 'status_label'),
      waitingFor: optStr(json, 'waiting_for'),
      subject: str(json, 'subject'),
      orderId: str(order, 'id'),
      orderReference: str(order, 'reference'),
      orderTotal: Money.fromJson(optObject(order, 'total') ?? const {}),
      vendor: ItemRef.fromJson(optObject(json, 'vendor') ?? const {}),
      customerName: str(json, 'customer_name'),
      excerpt: str(json, 'excerpt'),
      createdAt: date(json, 'created_at'),
      updatedAt: date(json, 'updated_at'),
      refundSuggested: Money.opt(json, 'refund_suggested'),
    );
  }

  final String id;
  final String status;
  final String statusLabel;

  /// you or customer (vendor in the enum, never sent), or null when closed.
  final String? waitingFor;
  final String subject;
  final String orderId;
  final String orderReference;
  final Money orderTotal;
  final ItemRef vendor;
  final String customerName;
  final String excerpt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Money? refundSuggested;
}

class ComplaintMessage {
  const ComplaintMessage({
    required this.from,
    required this.name,
    required this.text,
    required this.at,
  });

  factory ComplaintMessage.fromJson(Json json) => ComplaintMessage(
    from: str(json, 'from'),
    name: str(json, 'name'),
    text: str(json, 'text'),
    at: date(json, 'at'),
  );

  /// customer or support (vendor in the enum, never sent).
  final String from;
  final String name;
  final String text;
  final DateTime at;
}

/// A decision support may make on a complaint, with its amount's limit.
class ComplaintDecision {
  const ComplaintDecision({
    required this.id,
    required this.label,
    this.amount = 'none',
    this.max,
    this.to = const [],
  });

  factory ComplaintDecision.fromJson(Json json) => ComplaintDecision(
    id: str(json, 'decision'),
    label: str(json, 'label'),
    amount: str(json, 'amount', 'none'),
    max: Money.opt(json, 'max'),
    to: strings(json, 'to'),
  );

  /// refund, partial_refund, compensation or no_refund.
  final String id;
  final String label;

  /// none; fixed (what is left, [max]); required (an amount up to [max],
  /// no limit when null).
  final String amount;
  final Money? max;

  /// Where the money can go: payment, wallet, coupon (the first is the
  /// default).
  final List<String> to;

  bool get needsAmount => amount == 'required';

  /// No refund: the customer reads why.
  bool get needsNote => id == 'no_refund';
}

class ComplaintDetail {
  const ComplaintDetail({
    required this.complaint,
    this.messages = const [],
    this.decisions = const [],
    this.decidedLabel,
  });

  factory ComplaintDetail.fromJson(Json json) => ComplaintDetail(
    complaint: Complaint.fromJson(json),
    messages: listOf(json, 'messages', ComplaintMessage.fromJson),
    decisions: listOf(json, 'decisions', ComplaintDecision.fromJson),
    decidedLabel: switch (optObject(json, 'decision')) {
      final Json d => optStr(d, 'label'),
      null => null,
    },
  );

  final Complaint complaint;
  final List<ComplaintMessage> messages;

  /// What can be decided now (none once decided).
  final List<ComplaintDecision> decisions;

  /// The decision made ("Refunded ₺185.00").
  final String? decidedLabel;
}

// 6. School

class SchoolToday {
  const SchoolToday({
    required this.date,
    required this.students,
    required this.teachers,
    required this.staff,
    required this.needs,
    required this.busesRunning,
    required this.busesLate,
    required this.pickupsToday,
    required this.slips,
    required this.feesDue,
    required this.feesCount,
    this.closesAt,
  });

  factory SchoolToday.fromJson(Json json) {
    final students = optObject(json, 'students') ?? const {};
    final teachers = optObject(json, 'teachers') ?? const {};
    final staff = optObject(json, 'staff') ?? const {};
    final needs = optObject(json, 'needs') ?? const {};
    final buses = optObject(json, 'buses') ?? const {};
    final fees = optObject(json, 'fees') ?? const {};
    return SchoolToday(
      date: str(json, 'date'),
      closesAt: optStr(json, 'closes_at'),
      students: (
        total: integer(students, 'total'),
        inside: integer(students, 'in'),
        late: integer(students, 'late'),
        notYet: integer(students, 'not_yet'),
        absent: integer(students, 'absent'),
        excused: integer(students, 'excused'),
      ),
      teachers: (
        inside: integer(teachers, 'in'),
        total: integer(teachers, 'total'),
      ),
      staff: (inside: integer(staff, 'in'), total: integer(staff, 'total')),
      needs: (
        excuses: integer(needs, 'excuses'),
        reports: integer(needs, 'reports'),
        leave: integer(needs, 'leave'),
      ),
      busesRunning: integer(buses, 'running'),
      busesLate: [
        for (final b in jsonList(buses, 'late'))
          (route: str(b, 'route'), minutes: integer(b, 'minutes')),
      ],
      pickupsToday: integer(json, 'pickups_today'),
      slips: listOf(json, 'slips', Slip.fromJson),
      feesDue: Money.fromJson(optObject(fees, 'due') ?? const {}),
      feesCount: integer(fees, 'count'),
    );
  }

  final String date;

  /// "08:30": when the morning's check-in closes.
  final String? closesAt;
  final ({int total, int inside, int late, int notYet, int absent, int excused})
  students;
  final ({int inside, int total}) teachers;
  final ({int inside, int total}) staff;
  final ({int excuses, int reports, int leave}) needs;
  final int busesRunning;
  final List<({String route, int minutes})> busesLate;
  final int pickupsToday;

  /// Permission slips still open.
  final List<Slip> slips;
  final Money feesDue;
  final int feesCount;
}

class Slip {
  const Slip({
    required this.id,
    required this.title,
    required this.yes,
    required this.no,
    required this.waiting,
  });

  factory Slip.fromJson(Json json) => Slip(
    id: str(json, 'id'),
    title: str(json, 'title'),
    yes: integer(json, 'yes'),
    no: integer(json, 'no'),
    waiting: integer(json, 'waiting'),
  );

  final String id;
  final String title;
  final int yes;
  final int no;
  final int waiting;
}

class Attachment {
  const Attachment({required this.name, required this.size, required this.url});

  factory Attachment.fromJson(Json json) => Attachment(
    name: str(json, 'name'),
    size: optInt(json, 'size'),
    url: str(json, 'url'),
  );

  static Attachment? opt(Json json, String key) {
    final value = optObject(json, key);
    return value == null ? null : Attachment.fromJson(value);
  }

  final String name;

  /// Bytes; null when the server doesn't keep it.
  final int? size;
  final String url;
}

class Excuse {
  const Excuse({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.classLabel,
    required this.from,
    required this.to,
    required this.reasonLabel,
    required this.text,
    required this.sentAt,
    required this.status,
    required this.statusLabel,
    this.sentByName,
    this.sentByRelation,
    this.attachment,
    this.answer,
  });

  factory Excuse.fromJson(Json json) {
    final student = optObject(json, 'student') ?? const {};
    final sentBy = optObject(json, 'sent_by') ?? const {};
    return Excuse(
      id: str(json, 'id'),
      studentId: str(student, 'id'),
      studentName: str(student, 'name'),
      classLabel: str(student, 'class_label'),
      from: str(json, 'from'),
      to: str(json, 'to'),
      reasonLabel: str(json, 'reason_label'),
      text: str(json, 'text'),
      attachment: Attachment.opt(json, 'attachment'),
      sentByName: optStr(sentBy, 'name'),
      sentByRelation: optStr(sentBy, 'relation'),
      answer: optStr(json, 'answer'),
      sentAt: date(json, 'sent_at'),
      status: str(json, 'status'),
      statusLabel: str(json, 'status_label'),
    );
  }

  final String id;
  final String studentId;
  final String studentName;

  /// "Grade 5 · Class B".
  final String classLabel;

  /// YYYY-MM-DD.
  final String from;
  final String to;

  /// The first line of what the parent wrote.
  final String reasonLabel;
  final String text;
  final Attachment? attachment;
  final String? sentByName;

  /// "mother", in the person's language; null while the server keeps none.
  final String? sentByRelation;
  final DateTime sentAt;

  /// pending, accepted, declined or cancelled.
  final String status;
  final String statusLabel;

  /// The school's note.
  final String? answer;
}

class SchoolReport {
  const SchoolReport({
    required this.id,
    required this.teacher,
    required this.aboutLabel,
    required this.kind,
    required this.status,
    required this.statusLabel,
    this.sentAt,
    this.unread = false,
    this.title,
    this.text,
    this.fields = const [],
    this.comments = const [],
    this.reviewable = true,
  });

  factory SchoolReport.fromJson(Json json) => SchoolReport(
    id: str(json, 'id'),
    teacher: ItemRef.fromJson(optObject(json, 'teacher') ?? const {}),
    aboutLabel: str(json, 'about_label'),
    kind: str(json, 'kind'),
    status: str(json, 'status'),
    statusLabel: str(json, 'status_label'),
    unread: boolean(json, 'unread'),
    sentAt: optDate(json, 'sent_at'),
    title: optStr(json, 'title'),
    text: optStr(json, 'text'),
    fields: [
      for (final f in jsonList(json, 'fields'))
        (label: str(f, 'label'), value: str(f, 'value')),
    ],
    comments: [
      for (final c in jsonList(json, 'comments'))
        (
          by: str(c, 'by'),
          name: str(c, 'name'),
          text: str(c, 'text'),
          at: date(c, 'at'),
        ),
    ],
    reviewable: json.containsKey('reviewable')
        ? boolean(json, 'reviewable')
        : str(json, 'status') == 'sent',
  );

  final String id;
  final ItemRef teacher;

  /// The student or the class it is about.
  final String aboutLabel;

  /// student or class.
  final String kind;

  /// sent, returned or approved.
  final String status;
  final String statusLabel;
  final bool unread;
  final DateTime? sentAt;

  /// The template's name.
  final String? title;
  final String? text;

  /// Its detail: the template's fields ("4/5" for a rating) and comments.
  final List<({String label, String value})> fields;
  final List<({String by, String name, String text, DateTime at})> comments;

  /// Sent and waiting for the school.
  final bool reviewable;
}

class LeaveRequest {
  const LeaveRequest({
    required this.id,
    required this.personName,
    required this.roleLabel,
    required this.from,
    required this.to,
    required this.reasonLabel,
    required this.text,
    required this.sentAt,
    required this.status,
    required this.statusLabel,
    this.days,
    this.attachment,
    this.answer,
  });

  factory LeaveRequest.fromJson(Json json) {
    final person = optObject(json, 'person') ?? const {};
    return LeaveRequest(
      id: str(json, 'id'),
      personName: str(person, 'name'),
      roleLabel: optStr(person, 'role') ?? str(person, 'role_label'),
      from: str(json, 'from'),
      to: str(json, 'to'),
      reasonLabel: optStr(json, 'kind_label') ?? str(json, 'reason_label'),
      text: optStr(json, 'note') ?? str(json, 'text'),
      days: optInt(json, 'days'),
      attachment: Attachment.opt(json, 'attachment'),
      sentAt: date(json, 'sent_at'),
      status: str(json, 'status'),
      statusLabel: str(json, 'status_label'),
      answer: optStr(json, 'answer'),
    );
  }

  final String id;
  final String personName;

  /// The person's role (`person.role`: "teacher").
  final String roleLabel;
  final String from;
  final String to;

  /// `kind_label`: Sick, Annual, Other.
  final String reasonLabel;

  /// `note`: what the person wrote.
  final String text;
  final int? days;
  final Attachment? attachment;
  final DateTime sentAt;

  /// pending, approved, refused or cancelled.
  final String status;
  final String statusLabel;

  /// The school's note.
  final String? answer;
}

// 7. Today

/// 125 A Prime app's today against the same weekday last week.
class TodayCompare {
  const TodayCompare({
    required this.label,
    this.salesChangePct,
    this.ordersChangePct,
  });

  factory TodayCompare.fromJson(Json json) => TodayCompare(
    salesChangePct: optNumber(json, 'sales_change_pct'),
    ordersChangePct: optNumber(json, 'orders_change_pct'),
    label: str(json, 'label'),
  );

  static TodayCompare? opt(Json json, String key) {
    final value = optObject(json, key);
    return value == null ? null : TodayCompare.fromJson(value);
  }

  final double? salesChangePct;
  final double? ordersChangePct;

  /// "vs last Friday", in the person's language.
  final String label;
}

// 9. Prime

class InsightDay {
  const InsightDay({
    required this.label,
    required this.nowCents,
    required this.beforeCents,
  });

  factory InsightDay.fromJson(Json json) => InsightDay(
    label: str(json, 'label'),
    nowCents: integer(json, 'now_cents'),
    beforeCents: integer(json, 'before_cents'),
  );

  final String label;
  final int nowCents;
  final int beforeCents;
}

class PrimeInsights {
  const PrimeInsights({
    required this.period,
    required this.rangeLabel,
    required this.salesNow,
    required this.salesBefore,
    required this.ordersNow,
    required this.ordersBefore,
    this.salesChangePct,
    this.ordersChangePct,
    this.days = const [],
    this.peakHours = const [],
    this.peakRows = const [],
    this.busiestLabel,
    this.returningPct,
    this.returningChangePts,
    this.averageNow,
    this.averageBefore,
    this.best = const [],
  });

  factory PrimeInsights.fromJson(Json json) {
    final sales = optObject(json, 'sales') ?? const {};
    final orders = optObject(json, 'orders') ?? const {};
    final peak = optObject(json, 'peak') ?? const {};
    final returning = optObject(json, 'returning') ?? const {};
    final average = optObject(json, 'average_order') ?? const {};
    final hours = peak['hours'];
    return PrimeInsights(
      period: str(json, 'period', 'week'),
      rangeLabel: str(json, 'range_label'),
      salesNow: Money.fromJson(optObject(sales, 'now') ?? const {}),
      salesBefore: Money.fromJson(optObject(sales, 'before') ?? const {}),
      salesChangePct: optNumber(sales, 'change_pct'),
      ordersNow: integer(orders, 'now'),
      ordersBefore: integer(orders, 'before'),
      ordersChangePct: optNumber(orders, 'change_pct'),
      days: listOf(json, 'days', InsightDay.fromJson),
      peakHours: hours is List
          ? [
              for (final h in hours)
                if (h is num) h.toInt(),
            ]
          : const [],
      peakRows: [
        for (final r in jsonList(peak, 'rows'))
          (
            dayLabel: str(r, 'day_label'),
            cells: [
              for (final c in (r['cells'] is List ? r['cells'] as List : []))
                if (c is num) c.toDouble().clamp(0.0, 1.0),
            ],
          ),
      ],
      busiestLabel: optStr(peak, 'busiest_label'),
      returningPct: optNumber(returning, 'pct'),
      returningChangePts: optNumber(returning, 'change_pts'),
      averageNow: Money.opt(average, 'now'),
      averageBefore: Money.opt(average, 'before'),
      best: [
        for (final b in jsonList(json, 'best'))
          (
            name: str(b, 'name'),
            total: Money.fromJson(optObject(b, 'total') ?? const {}),
          ),
      ],
    );
  }

  /// week or month.
  final String period;
  final String rangeLabel;
  final Money salesNow;
  final Money salesBefore;
  final double? salesChangePct;
  final int ordersNow;
  final int ordersBefore;
  final double? ordersChangePct;
  final List<InsightDay> days;

  /// The hours the peak grid's columns start at (10, 12, … 20).
  final List<int> peakHours;

  /// Each row's cells from 0 (quiet) to 1 (busiest).
  final List<({String dayLabel, List<double> cells})> peakRows;
  final String? busiestLabel;
  final double? returningPct;
  final double? returningChangePts;
  final Money? averageNow;
  final Money? averageBefore;
  final List<({String name, Money total})> best;
}

/// One smart alert's switch and its number or time.
class AlertSetting {
  const AlertSetting({
    required this.kind,
    required this.on,
    this.minutes,
    this.amountCents,
    this.byTime,
    this.stars,
  });

  factory AlertSetting.fromJson(Json json) => AlertSetting(
    kind: str(json, 'kind'),
    on: boolean(json, 'on'),
    minutes: optInt(json, 'minutes'),
    amountCents: optInt(json, 'amount_cents'),
    byTime: optStr(json, 'by_time'),
    stars: optInt(json, 'stars'),
  );

  /// order_waiting, shipment_unassigned, sales_low, message_unanswered,
  /// low_rating or ride_no_driver.
  final String kind;
  final bool on;
  final int? minutes;
  final int? amountCents;

  /// "18:00".
  final String? byTime;
  final int? stars;

  AlertSetting copyWith({
    bool? on,
    int? minutes,
    int? amountCents,
    String? byTime,
    int? stars,
  }) => AlertSetting(
    kind: kind,
    on: on ?? this.on,
    minutes: minutes ?? this.minutes,
    amountCents: amountCents ?? this.amountCents,
    byTime: byTime ?? this.byTime,
    stars: stars ?? this.stars,
  );

  Json toJson() => {
    'kind': kind,
    'on': on,
    'minutes': minutes,
    'amount_cents': amountCents,
    'by_time': byTime,
    'stars': stars,
  };
}

class PrimeAlerts {
  const PrimeAlerts({
    required this.items,
    required this.briefOn,
    required this.briefTime,
  });

  factory PrimeAlerts.fromJson(Json json) {
    final brief = optObject(json, 'morning_brief') ?? const {};
    return PrimeAlerts(
      items: listOf(json, 'items', AlertSetting.fromJson),
      briefOn: boolean(brief, 'on'),
      briefTime: str(brief, 'time', '08:30'),
    );
  }

  final List<AlertSetting> items;
  final bool briefOn;

  /// "08:30", in the app's time zone.
  final String briefTime;

  /// The alerts switched on (the morning brief has its own switch).
  int get onCount => items.where((a) => a.on).length;

  PrimeAlerts copyWith({
    List<AlertSetting>? items,
    bool? briefOn,
    String? briefTime,
  }) => PrimeAlerts(
    items: items ?? this.items,
    briefOn: briefOn ?? this.briefOn,
    briefTime: briefTime ?? this.briefTime,
  );

  Json toJson() => {
    'items': [for (final a in items) a.toJson()],
    'morning_brief': {'on': briefOn, 'time': briefTime},
  };
}

// 10. VIP

/// The business's account manager at Yallapp.
class AccountManager {
  const AccountManager({
    required this.name,
    this.photoUrl,
    this.whatsappUrl,
    this.phone,
    this.hoursLabel,
  });

  factory AccountManager.fromJson(Json json) => AccountManager(
    name: str(json, 'name'),
    photoUrl: optStr(json, 'photo_url'),
    whatsappUrl: optStr(json, 'whatsapp_url'),
    phone: optStr(json, 'phone'),
    hoursLabel: optStr(json, 'hours_label'),
  );

  static AccountManager? opt(Json json, String key) {
    final value = optObject(json, key);
    return value == null ? null : AccountManager.fromJson(value);
  }

  final String name;
  final String? photoUrl;
  final String? whatsappUrl;
  final String? phone;

  /// "09:00–21:00, Mon–Sat".
  final String? hoursLabel;
}

class CallDay {
  const CallDay({required this.date, required this.label, required this.times});

  factory CallDay.fromJson(Json json) => CallDay(
    date: str(json, 'date'),
    label: str(json, 'label'),
    times: strings(json, 'times'),
  );

  /// YYYY-MM-DD.
  final String date;
  final String label;

  /// "11:00", "14:30"…
  final List<String> times;
}

class BookedCall {
  const BookedCall({
    required this.id,
    required this.date,
    required this.time,
    required this.status,
  });

  factory BookedCall.fromJson(Json json) => BookedCall(
    id: str(json, 'id'),
    date: str(json, 'date'),
    time: str(json, 'time'),
    status: str(json, 'status'),
  );

  final String id;
  final String date;
  final String time;

  /// requested, confirmed…
  final String status;
}
