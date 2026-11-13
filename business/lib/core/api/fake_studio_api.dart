part of 'fake_owner_api.dart';

/// 125 The Studio apps, Prime and VIP of the fake API: a food app with its
/// restaurants and couriers, a marketplace, a delivery company, a taxi app
/// and a school, with the server's rules (steps by status, couriers on duty,
/// free drivers, notes required to decline). Items are kept as the server's
/// JSON and read back with the app's own `fromJson`.
mixin _FakeStudio implements OwnerApi {
  DateTime get now;
  Future<void> _call(String name);
  AppSummary _app(String appId, [bool Function(AppFeatures f)? feature]);

  static const foodId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  static const marketId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  static const deliveryId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  static const ridesId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  static const schoolId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

  /// VIP: the business has an account manager (tests turn it off).
  bool accountManagerOn = true;

  /// Calls booked with the account manager.
  final bookedCalls = <BookedCall>[];

  final _food = <String, List<Json>>{};
  final _restaurants = <String, List<Json>>{};
  final _shipments = <String, List<Json>>{};
  final _couriers = <String, List<Json>>{};
  final _rides = <String, List<Json>>{};
  final _drivers = <String, List<Json>>{};
  final _marketOrders = <String, List<Json>>{};
  final _complaints = <String, List<Json>>{};
  final _vendors = <String, List<Json>>{};
  final _excuses = <String, List<Json>>{};
  final _reports = <String, List<Json>>{};
  final _leave = <String, List<Json>>{};
  final _alerts = <String, Json>{};
  int _studioIds = 7000;

  String _at(Duration ago) => now.subtract(ago).toUtc().toIso8601String();
  String _in(Duration ahead) => now.add(ahead).toUtc().toIso8601String();
  static Json _money(int cents, [String currency = 'TRY']) {
    final m = FakeOwnerApi.money(cents, currency);
    return {
      'amount_cents': m.amountCents,
      'currency': m.currency,
      'formatted': m.formatted,
    };
  }

  static String _isoDay(DateTime t) =>
      '${t.year.toString().padLeft(4, '0')}-${t.month.toString().padLeft(2, '0')}-${t.day.toString().padLeft(2, '0')}';

  static Never _invalid(String message, [Map<String, String>? fields]) =>
      throw ApiException(
        code: ApiException.invalidRequest,
        message: message,
        statusCode: 400,
        fieldErrors: fields ?? const {},
      );

  static Never _invalidStatus([
    String message = "This can't be done in its status now.",
  ]) => throw ApiException(
    code: 'invalid_status',
    message: message,
    statusCode: 409,
  );

  static Never _missing() =>
      throw const ApiException(code: ApiException.notFound, statusCode: 404);

  Json _one(Map<String, List<Json>> store, String appId, String id) =>
      (store[appId] ?? const []).where((j) => '${j['id']}' == id).firstOrNull ??
      _missing();

  Paged<T> _pageOf<T>(
    List<Json> all,
    T Function(Json) parse,
    int page, {
    Map<String, int> counts = const {},
  }) {
    const perPage = 20;
    final start = (page - 1) * perPage;
    return Paged(
      items: [for (final j in all.skip(start).take(perPage)) parse(j)],
      page: page,
      perPage: perPage,
      total: all.length,
      totalPages: all.isEmpty ? 1 : (all.length / perPage).ceil(),
      counts: counts,
    );
  }

  bool _matches(Json j, String? query, List<String> keys) {
    final q = query?.trim().toLowerCase() ?? '';
    if (q.isEmpty) return true;
    return keys.any((k) {
      final v = j[k];
      final text = v is Map ? '${v['name'] ?? ''}' : '${v ?? ''}';
      return text.toLowerCase().contains(q);
    });
  }

  void _timeline(Json j, String status, String label, String by) {
    (j['timeline'] as List).add({
      'status': status,
      'label': label,
      'at': now.toUtc().toIso8601String(),
      'by': by,
    });
  }

  // The demo apps.

  List<AppSummary> _studioApps() {
    final studio = PlanSummary(
      id: 'studio_business',
      name: 'Studio App Business',
      expiresAt: now.add(const Duration(days: 300)).toUtc(),
      daysLeft: 300,
    );
    final starter = PlanSummary(
      id: 'studio_starter',
      name: 'Studio Starter',
      expiresAt: now.add(const Duration(days: 200)).toUtc(),
      daysLeft: 200,
    );
    return [
      AppSummary(
        id: foodId,
        name: 'Yalla Food',
        type: 'restaurants',
        vertical: 'food',
        typeName: 'Food delivery',
        backend: 'hosted',
        state: AccountState.active,
        plan: studio,
        features: const AppFeatures(
          foodOrders: true,
          restaurants: true,
          shipments: true,
          chat: true,
          appUsers: true,
          notifications: true,
          media: true,
          analytics: true,
          preview: true,
          builds: true,
          prime: true,
          vip: true,
        ),
      ),
      AppSummary(
        id: marketId,
        name: 'Yalla Market',
        type: 'restaurants',
        vertical: 'marketplace',
        typeName: 'Marketplace',
        backend: 'hosted',
        state: AccountState.active,
        plan: starter,
        features: const AppFeatures(
          market: true,
          shipments: true,
          chat: true,
          appUsers: true,
          notifications: true,
          analytics: true,
          preview: true,
          builds: true,
          prime: true,
        ),
      ),
      AppSummary(
        id: deliveryId,
        name: 'Hızlı Kurye',
        type: 'deliveries',
        vertical: 'delivery',
        typeName: 'Delivery',
        backend: 'hosted',
        state: AccountState.active,
        plan: starter,
        features: const AppFeatures(
          shipments: true,
          chat: true,
          appUsers: true,
          notifications: true,
          analytics: true,
          preview: true,
          builds: true,
          prime: true,
        ),
      ),
      AppSummary(
        id: ridesId,
        name: 'Yalla Taxi',
        type: 'rides',
        vertical: 'taxi',
        typeName: 'Taxi',
        backend: 'hosted',
        state: AccountState.active,
        plan: starter,
        features: const AppFeatures(
          rides: true,
          chat: true,
          appUsers: true,
          notifications: true,
          analytics: true,
          preview: true,
          builds: true,
          prime: true,
        ),
      ),
      AppSummary(
        id: schoolId,
        name: 'Green Hill School',
        type: 'school',
        vertical: 'school',
        typeName: 'School',
        backend: 'hosted',
        state: AccountState.active,
        plan: studio,
        features: const AppFeatures(
          school: true,
          notifications: true,
          appUsers: true,
          analytics: true,
          preview: true,
          builds: true,
          prime: true,
          vip: true,
        ),
      ),
    ];
  }

  void _seedStudio() {
    _seedFood();
    _seedShipments();
    _seedRides();
    _seedMarket();
    _seedSchool();
    _alerts
      ..[foodId] = {
        'items': [
          {'kind': 'order_waiting', 'on': true, 'minutes': 5},
          {'kind': 'shipment_unassigned', 'on': true, 'minutes': 10},
          {
            'kind': 'sales_low',
            'on': true,
            'amount_cents': 800000,
            'by_time': '18:00',
          },
          {'kind': 'message_unanswered', 'on': true, 'minutes': 10},
          {'kind': 'low_rating', 'on': true, 'stars': 2},
        ],
        'morning_brief': {'on': true, 'time': '08:30'},
      }
      ..[ridesId] = {
        'items': [
          {'kind': 'ride_no_driver', 'on': false, 'minutes': 3},
          {
            'kind': 'sales_low',
            'on': true,
            'amount_cents': 500000,
            'by_time': '18:00',
          },
          {'kind': 'message_unanswered', 'on': true, 'minutes': 10},
          {'kind': 'low_rating', 'on': true, 'stars': 2},
        ],
        'morning_brief': {'on': false, 'time': '08:30'},
      };
  }

  Json _foodOrder({
    required int number,
    required String status,
    required String statusLabel,
    required (String, String, String) restaurant,
    required (String, String, String?) customer,
    required List<(int, String, int, List<String>)> lines,
    required bool cash,
    required double distance,
    required Duration ago,
    List<String> steps = const [],
    int deliveryFee = 4000,
  }) {
    final subtotal = lines.fold(0, (n, l) => n + l.$3);
    final total = subtotal + deliveryFee;
    return {
      'id': number - 1000,
      'reference': 'F-$number',
      'status': status,
      'status_label': statusLabel,
      'restaurant': {'id': restaurant.$1, 'name': restaurant.$2},
      'customer_name': customer.$1,
      'summary': lines.map((l) => '${l.$1} × ${l.$2}').join(', '),
      'item_count': lines.fold(0, (n, l) => n + l.$1),
      'total': _money(total),
      'payment': {
        'method': cash ? 'cash' : 'card',
        'paid': !cash,
        'label': cash ? 'Cash on delivery' : 'Card, paid',
      },
      'distance_km': distance,
      'placed_at': _at(ago),
      'ready_at': null,
      'courier': null,
      'shipment_id': null,
      'steps': steps,
      'lines': [
        for (final l in lines)
          {
            'quantity': l.$1,
            'name': l.$2,
            'options': l.$4,
            'total': _money(l.$3),
          },
      ],
      'subtotal': _money(subtotal),
      'delivery_fee': _money(deliveryFee),
      'customer': {
        'name': customer.$1,
        'phone': '+90 532 000 00 00',
        'address': customer.$2,
        'note': customer.$3,
      },
      'restaurant_address': restaurant.$3,
      'timeline': [
        {
          'status': 'placed',
          'label': 'Placed',
          'at': _at(ago),
          'by': customer.$1,
        },
      ],
      'refund_due': false,
      'prep_choices': [10, 15, 20, 30, 45],
      'rejection_reasons': [
        {'id': 'busy', 'label': 'Too busy right now'},
        {'id': 'closed', 'label': 'Closed'},
        {'id': 'out_of_stock', 'label': 'Something is out of stock'},
        {'id': 'too_far', 'label': 'Too far to deliver'},
      ],
      'cash_to_collect': cash ? _money(total) : null,
    };
  }

  void _seedFood() {
    const burger = ('r1', 'Burger Lab', 'Bağdat Cd. 214, Kadıköy');
    const pide = ('r2', 'Pide House', 'Moda Cd. 88, Kadıköy');
    const sushi = ('r3', 'Sushi Moda', 'Şair Nefi Sk. 7, Kadıköy');
    _food[foodId] = [
      _foodOrder(
        number: 1048,
        status: 'placed',
        statusLabel: 'New',
        restaurant: burger,
        customer: ('Selin Aydın', 'Moda Cd. 41, flat 6', 'Ring twice'),
        lines: [
          (2, 'Smash burger', 28000, ['No onions', 'Extra cheddar']),
          (1, 'Fries', 6000, []),
          (2, 'Ayran', 3200, []),
        ],
        cash: true,
        distance: 3.1,
        ago: const Duration(minutes: 2),
        steps: const ['accept', 'reject'],
      ),
      _foodOrder(
        number: 1047,
        status: 'placed',
        statusLabel: 'New',
        restaurant: pide,
        customer: ('Kerem Yıldız', 'Yeldeğirmeni Sk. 3, Kadıköy', null),
        lines: [(1, 'Kıymalı pide', 16600, []), (1, 'Lahmacun', 8000, [])],
        cash: false,
        distance: 1.8,
        ago: const Duration(minutes: 5),
        steps: const ['accept', 'reject'],
      ),
      _foodOrder(
        number: 1046,
        status: 'accepted',
        statusLabel: 'Preparing',
        restaurant: sushi,
        customer: ('Ece Kara', 'Fenerbahçe Cd. 12, Kadıköy', null),
        lines: [(1, 'Salmon roll', 32000, []), (1, 'Miso soup', 9000, [])],
        cash: false,
        distance: 2.4,
        ago: const Duration(minutes: 18),
        steps: const ['ready', 'cancel'],
      )..['ready_at'] = _in(const Duration(minutes: 7)),
      _foodOrder(
        number: 1043,
        status: 'ready',
        statusLabel: 'Ready',
        restaurant: burger,
        customer: ('Deniz Er', 'Moda Cd. 41, flat 2', null),
        lines: [(2, 'Smash burger', 28000, []), (1, 'Fries', 6000, [])],
        cash: true,
        distance: 3.1,
        ago: const Duration(minutes: 31),
      )..['shipment_id'] = 2031,
      _foodOrder(
        number: 1040,
        status: 'delivered',
        statusLabel: 'Delivered',
        restaurant: pide,
        customer: ('Arda Koç', 'Bahariye Cd. 50, Kadıköy', null),
        lines: [(3, 'Lahmacun', 24000, [])],
        cash: false,
        distance: 1.2,
        ago: const Duration(hours: 2),
      ),
      _foodOrder(
        number: 1038,
        status: 'rejected',
        statusLabel: 'Rejected',
        restaurant: sushi,
        customer: ('Mert Şen', 'Acıbadem Cd. 9, Üsküdar', null),
        lines: [(1, 'Sushi platter', 64000, [])],
        cash: true,
        distance: 6.8,
        ago: const Duration(hours: 3),
      ),
    ];
    _restaurants[foodId] = [
      {
        'id': 'r1',
        'name': 'Burger Lab',
        'active': true,
        'open': true,
        'busy_until': _in(const Duration(minutes: 40)),
        'delayed': true,
        'opens_at': null,
        'state_label': 'Busy',
      },
      {
        'id': 'r2',
        'name': 'Pide House',
        'active': true,
        'open': true,
        'busy_until': null,
        'delayed': false,
        'opens_at': null,
        'state_label': 'Open',
      },
      {
        'id': 'r3',
        'name': 'Sushi Moda',
        'active': true,
        'open': false,
        'busy_until': null,
        'delayed': false,
        'opens_at': _in(const Duration(hours: 1)),
        'state_label': 'Closed',
      },
    ];
  }

  Json _shipment({
    required int number,
    required String status,
    required String statusLabel,
    required (String, String) pickup,
    required (String, String) dropoff,
    required double distance,
    required int price,
    required Duration ago,
    int? collect,
    (String, String)? courier,
    (int, String)? food,
    String recipient = 'Selin Aydın',
  }) => {
    'id': number,
    'reference': 'S-$number',
    'status': status,
    'status_label': statusLabel,
    'pickup': {'name': pickup.$1, 'address': pickup.$2},
    'dropoff': {'name': recipient, 'address': dropoff.$2},
    'distance_km': distance,
    'price': _money(price),
    'payment': {
      'method': collect == null ? 'card' : 'cash',
      'label': collect == null ? 'Paid by card' : 'Cash at the door',
    },
    'collect': collect == null ? null : _money(collect),
    'courier': courier == null ? null : {'id': courier.$1, 'name': courier.$2},
    'food_order': food == null
        ? null
        : {'id': food.$1 - 1000, 'reference': 'F-${food.$1}'},
    'created_at': _at(ago),
    'waiting_minutes': status == 'pending' ? ago.inMinutes : null,
    'statuses': _shipmentNext(status),
    'assignable': status == 'pending' || status == 'assigned',
    'timeline': [
      {'status': 'pending', 'label': 'Waiting', 'at': _at(ago), 'by': null},
    ],
    'note': null,
    'recipient': {'name': recipient, 'phone': '+90 532 111 22 33'},
  };

  static List<String> _shipmentNext(String status) => switch (status) {
    'pending' || 'assigned' => const ['cancelled'],
    'accepted' => const ['picked_up', 'cancelled'],
    'picked_up' || 'on_the_way' => const ['delivered', 'failed'],
    _ => const [],
  };

  static const _shipmentLabels = {
    'pending': 'Needs a courier',
    'assigned': 'Courier on the way',
    'accepted': 'Accepted',
    'picked_up': 'Picked up',
    'on_the_way': 'On the way',
    'delivered': 'Delivered',
    'failed': 'Failed',
    'cancelled': 'Cancelled',
  };

  void _seedShipments() {
    for (final appId in [foodId, marketId, deliveryId]) {
      final market = appId == marketId;
      final pickup = market
          ? ('Fresh Mart', 'Caferağa Mh. 5')
          : appId == foodId
          ? ('Burger Lab', 'Bağdat Cd. 214')
          : ('Kadıköy depot', 'Rıhtım Cd. 1');
      _shipments[appId] = [
        _shipment(
          number: market ? 3101 : 2031,
          status: 'pending',
          statusLabel: 'Needs a courier',
          pickup: pickup,
          dropoff: ('', 'Moda Cd. 41'),
          distance: 3.1,
          price: 6000,
          ago: const Duration(minutes: 6),
          collect: appId == foodId ? 41200 : null,
          food: appId == foodId ? (1043, '') : null,
        ),
        _shipment(
          number: market ? 3100 : 2030,
          status: 'pending',
          statusLabel: 'Needs a courier',
          pickup: pickup,
          dropoff: ('', 'Bahariye Cd. 50'),
          distance: 1.2,
          price: 4500,
          ago: const Duration(minutes: 3),
          recipient: 'Arda Koç',
        ),
        if (!market)
          _shipment(
            number: 2029,
            status: 'pending',
            statusLabel: 'Needs a courier',
            pickup: pickup,
            dropoff: ('', 'Fenerbahçe Cd. 12'),
            distance: 2.4,
            price: 5000,
            ago: const Duration(minutes: 1),
            recipient: 'Ece Kara',
          ),
        _shipment(
          number: market ? 3099 : 2028,
          status: 'on_the_way',
          statusLabel: 'On the way',
          pickup: pickup,
          dropoff: ('', 'Acıbadem Cd. 9'),
          distance: 4.0,
          price: 7000,
          ago: const Duration(minutes: 25),
          courier: ('c2', 'Ayşe Demir'),
          recipient: 'Mert Şen',
        ),
        _shipment(
          number: market ? 3098 : 2027,
          status: 'picked_up',
          statusLabel: 'Picked up',
          pickup: pickup,
          dropoff: ('', 'Yeldeğirmeni Sk. 3'),
          distance: 1.8,
          price: 4500,
          ago: const Duration(minutes: 20),
          courier: ('c4', 'Burak Ay'),
          recipient: 'Kerem Yıldız',
        ),
        _shipment(
          number: market ? 3090 : 2020,
          status: 'delivered',
          statusLabel: 'Delivered',
          pickup: pickup,
          dropoff: ('', 'Moda Cd. 12'),
          distance: 2.0,
          price: 5000,
          ago: const Duration(hours: 2),
          courier: ('c1', 'Mehmet Kaya'),
        ),
        _shipment(
          number: market ? 3089 : 2019,
          status: 'failed',
          statusLabel: 'Failed',
          pickup: pickup,
          dropoff: ('', 'Kalamış Cd. 3'),
          distance: 3.6,
          price: 6000,
          ago: const Duration(hours: 3),
          courier: ('c3', 'Emre Şahin'),
        ),
      ];
      _couriers[appId] = [
        {
          'id': 'c1',
          'name': 'Mehmet Kaya',
          'initials': 'MK',
          'phone': '+90 532 200 00 01',
          'active': true,
          'on_duty': true,
          'active_jobs': 0,
          'distance_km': 0.6,
          'state': 'free',
        },
        {
          'id': 'c2',
          'name': 'Ayşe Demir',
          'initials': 'AD',
          'phone': '+90 532 200 00 02',
          'active': true,
          'on_duty': true,
          'active_jobs': 1,
          'distance_km': 1.4,
          'state': 'busy',
        },
        {
          'id': 'c3',
          'name': 'Emre Şahin',
          'initials': 'EŞ',
          'phone': null,
          'active': true,
          'on_duty': true,
          'active_jobs': 0,
          'distance_km': 2.9,
          'state': 'free',
        },
        {
          'id': 'c4',
          'name': 'Burak Ay',
          'initials': 'BA',
          'phone': '+90 532 200 00 04',
          'active': true,
          'on_duty': true,
          'active_jobs': 1,
          'distance_km': null,
          'state': 'busy',
        },
        {
          'id': 'c5',
          'name': 'Can Öz',
          'initials': 'CÖ',
          'phone': null,
          'active': true,
          'on_duty': false,
          'active_jobs': 0,
          'distance_km': null,
          'state': 'off',
        },
      ];
    }
  }

  Json _ride({
    required int number,
    required String status,
    required String statusLabel,
    required String type,
    required (String, String) pickup,
    required (String, String) dropoff,
    required double distance,
    required int quoted,
    required String rider,
    required Duration ago,
    int? finalPrice,
    (String, String, String, String)? driver,
    int? searching,
    DateTime? scheduledFor,
    DateTime? eta,
  }) => {
    'id': number,
    'reference': 'R-$number',
    'status': status,
    'status_label': statusLabel,
    'vehicle_type': type,
    'pickup': {'name': pickup.$1, 'address': pickup.$2},
    'dropoff': {'name': dropoff.$1, 'address': dropoff.$2},
    'distance_km': distance,
    'quoted': _money(quoted),
    'final': finalPrice == null ? null : _money(finalPrice),
    'rider_name': rider,
    'payment_label': 'cash',
    'driver': driver == null
        ? null
        : {
            'id': driver.$1,
            'name': driver.$2,
            'phone': '+90 533 300 00 0${driver.$1.substring(1)}',
            'plate': driver.$3,
            'vehicle': driver.$4,
          },
    'searching_minutes': searching,
    'scheduled_for': scheduledFor?.toUtc().toIso8601String(),
    'eta': eta?.toUtc().toIso8601String(),
    'givable': status == 'searching' || status == 'scheduled',
    'cancellable': const [
      'searching',
      'scheduled',
      'assigned',
      'arrived',
    ].contains(status),
    'updated_at': _at(ago),
    'timeline': [
      {
        'status': 'requested',
        'label': 'Asked for',
        'at': _at(ago),
        'by': rider,
      },
    ],
  };

  void _seedRides() {
    _rides[ridesId] = [
      _ride(
        number: 551,
        status: 'searching',
        statusLabel: 'Searching',
        type: 'Economy',
        pickup: ('Kadıköy İskele', 'Kadıköy İskele'),
        dropoff: ('Ataşehir, Brandium', 'Ataşehir, Brandium'),
        distance: 8.4,
        quoted: 24500,
        rider: 'Deniz Çelik',
        ago: const Duration(minutes: 3),
        searching: 3,
      ),
      _ride(
        number: 552,
        status: 'searching',
        statusLabel: 'Searching',
        type: 'Comfort',
        pickup: ('Moda', 'Moda Cd. 1'),
        dropoff: ('Bostancı', 'Bostancı Sahil'),
        distance: 6.1,
        quoted: 21000,
        rider: 'Cem Aksu',
        ago: const Duration(minutes: 1),
        searching: 1,
      ),
      _ride(
        number: 549,
        status: 'in_progress',
        statusLabel: 'On the ride',
        type: 'Comfort',
        pickup: ('Moda', 'Moda Cd. 7'),
        dropoff: ('Sabiha Gökçen Airport', 'Sabiha Gökçen Airport'),
        distance: 32.0,
        quoted: 85000,
        rider: 'Leyla Tan',
        ago: const Duration(minutes: 12),
        driver: ('d1', 'Ali Yılmaz', '34 ABC 128', 'Toyota Corolla'),
        eta: now.add(const Duration(minutes: 24)),
      ),
      _ride(
        number: 548,
        status: 'arrived',
        statusLabel: 'Driver arrived',
        type: 'Economy',
        pickup: ('Bostancı', 'Bostancı'),
        dropoff: ('Kozyatağı', 'Kozyatağı'),
        distance: 4.2,
        quoted: 14000,
        rider: 'Nil Ateş',
        ago: const Duration(minutes: 2),
        driver: ('d4', 'Burak Arslan', '34 KLM 902', 'Renault Clio'),
      ),
      _ride(
        number: 560,
        status: 'scheduled',
        statusLabel: 'Scheduled',
        type: 'Economy',
        pickup: ('Üsküdar', 'Üsküdar Meydan'),
        dropoff: ('Levent', 'Levent Metro'),
        distance: 14.5,
        quoted: 39000,
        rider: 'Oya Kaplan',
        ago: const Duration(hours: 1),
        scheduledFor: now.add(const Duration(hours: 14)),
      ),
      _ride(
        number: 540,
        status: 'completed',
        statusLabel: 'Done',
        type: 'Economy',
        pickup: ('Moda', 'Moda'),
        dropoff: ('Kadıköy İskele', 'Kadıköy İskele'),
        distance: 2.1,
        quoted: 9000,
        finalPrice: 9500,
        rider: 'Ece Kara',
        ago: const Duration(hours: 2),
        driver: ('d2', 'Selim Kurt', '34 TT 455', 'Fiat Egea'),
      ),
      _ride(
        number: 541,
        status: 'no_driver',
        statusLabel: 'No driver found',
        type: 'Comfort',
        pickup: ('Göztepe', 'Göztepe'),
        dropoff: ('Beşiktaş', 'Beşiktaş'),
        distance: 12.0,
        quoted: 36000,
        rider: 'Murat Er',
        ago: const Duration(hours: 4),
      ),
    ];
    _drivers[ridesId] = [
      {
        'id': 'd2',
        'name': 'Selim Kurt',
        'initials': 'SK',
        'phone': '+90 533 300 00 02',
        'vehicle': {
          'plate': '34 TT 455',
          'model': 'Fiat Egea',
          'type': 'Economy',
        },
        'state': 'free',
        'distance_km': 1.2,
        'same_type': true,
      },
      {
        'id': 'd3',
        'name': 'Murat Can',
        'initials': 'MC',
        'phone': null,
        'vehicle': {
          'plate': '34 MC 310',
          'model': 'Skoda Octavia',
          'type': 'Comfort',
        },
        'state': 'free',
        'distance_km': 2.5,
        'same_type': false,
      },
      {
        'id': 'd1',
        'name': 'Ali Yılmaz',
        'initials': 'AY',
        'phone': '+90 533 300 00 01',
        'vehicle': {
          'plate': '34 ABC 128',
          'model': 'Toyota Corolla',
          'type': 'Comfort',
        },
        'state': 'on_ride',
        'distance_km': null,
        'same_type': false,
      },
      {
        'id': 'd4',
        'name': 'Burak Arslan',
        'initials': 'BA',
        'phone': '+90 533 300 00 04',
        'vehicle': {
          'plate': '34 KLM 902',
          'model': 'Renault Clio',
          'type': 'Economy',
        },
        'state': 'on_ride',
        'distance_km': null,
        'same_type': true,
      },
      {
        'id': 'd5',
        'name': 'Hakan Er',
        'initials': 'HE',
        'phone': null,
        'vehicle': null,
        'state': 'offline',
        'distance_km': null,
        'same_type': false,
      },
    ];
  }

  void _seedMarket() {
    Json vendor(String id, String name, String kind) => {
      'id': id,
      'name': name,
      'kind': kind,
    };
    final fresh = vendor('v1', 'Fresh Mart', 'Grocery');
    final pharmacy = vendor('v2', 'Çiçek Pharmacy', 'Pharmacy');
    final books = vendor('v3', 'Book Corner', 'Books');
    _vendors[marketId] = [
      {...fresh, 'active': true, 'open': true, 'orders_today': 18},
      {...pharmacy, 'active': true, 'open': true, 'orders_today': 7},
      {...books, 'active': true, 'open': false, 'orders_today': 2},
    ];
    Json order(
      int number,
      String status,
      String label,
      Json vendor,
      String customer,
      String summary,
      int total,
      Duration ago,
    ) => {
      'id': number - 1000,
      'reference': 'M-$number',
      'status': status,
      'status_label': label,
      'vendor': vendor,
      'customer_name': customer,
      'summary': summary,
      'total': _money(total),
      'fulfilment': 'delivery',
      'delivery_by': "The vendor's courier",
      'placed_at': _at(ago),
      'lines': [
        {
          'quantity': 1,
          'name': summary
              .split(', ')
              .first
              .replaceFirst(RegExp(r'^\d+ × '), ''),
          'options': <String>[],
          'total': _money(total),
        },
      ],
      'timeline': [
        {'status': 'placed', 'label': 'Placed', 'at': _at(ago), 'by': customer},
      ],
    };
    _marketOrders[marketId] = [
      order(
        1042,
        'placed',
        'New',
        fresh,
        'Zeynep Koç',
        '1 × Olive oil 1 L, 2 × Bread',
        31000,
        const Duration(minutes: 4),
      ),
      order(
        1041,
        'picking',
        'Being picked',
        fresh,
        'Hasan Yurt',
        '3 × Apples 1 kg',
        18000,
        const Duration(minutes: 22),
      ),
      order(
        1039,
        'delivered',
        'Delivered',
        fresh,
        'Zeynep Koç',
        '1 × Olive oil 1 L, 1 × Cheese',
        72000,
        const Duration(hours: 3),
      ),
      order(
        1031,
        'delivered',
        'Delivered',
        pharmacy,
        'Ahmet Er',
        '1 × Vitamin C',
        24000,
        const Duration(hours: 6),
      ),
      order(
        1030,
        'cancelled',
        'Cancelled',
        books,
        'Sena Ak',
        '1 × Atlas',
        45000,
        const Duration(days: 1),
      ),
    ];
    _complaints[marketId] = [
      {
        'id': 'k1',
        'status': 'open',
        'status_label': 'Waiting for you',
        'waiting_for': 'you',
        'subject': 'Missing item: 1 × Olive oil 1 L',
        'order': {'id': 39, 'reference': 'M-1039', 'total': _money(72000)},
        'vendor': {'id': 'v1', 'name': 'Fresh Mart'},
        'customer_name': 'Zeynep Koç',
        'excerpt': 'The bag had everything else but no olive oil.',
        'created_at': _at(const Duration(minutes: 14)),
        'updated_at': _at(const Duration(minutes: 14)),
        'refund_suggested': _money(18500),
        'messages': [
          {
            'from': 'customer',
            'name': 'Zeynep Koç',
            'text': 'The bag had everything else but no olive oil.',
            'at': _at(const Duration(minutes: 14)),
          },
          {
            'from': 'support',
            'name': 'Support',
            'text': 'We are sorry, it was left on the counter.',
            'at': _at(const Duration(minutes: 9)),
          },
        ],
      },
      {
        'id': 'k2',
        'status': 'waiting_for_customer',
        'status_label': 'Waiting on the customer',
        'waiting_for': 'customer',
        'subject': 'Late delivery',
        'order': {'id': 31, 'reference': 'M-1031', 'total': _money(24000)},
        'vendor': {'id': 'v2', 'name': 'Çiçek Pharmacy'},
        'customer_name': 'Ahmet Er',
        'excerpt': 'It came two hours late.',
        'created_at': _at(const Duration(hours: 1)),
        'updated_at': _at(const Duration(hours: 1)),
        'refund_suggested': null,
        'messages': [
          {
            'from': 'customer',
            'name': 'Ahmet Er',
            'text': 'It came two hours late.',
            'at': _at(const Duration(hours: 1)),
          },
        ],
      },
    ];
  }

  void _seedSchool() {
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    Json excuse(
      String id,
      String name,
      String classLabel,
      String reason,
      String text,
      String parent,
      String relation,
      Duration ago, {
      Json? attachment,
    }) => {
      'id': id,
      'student': {'id': 'st-$id', 'name': name, 'class_label': classLabel},
      'from': _isoDay(yesterday),
      'to': _isoDay(today),
      // The server: the reason is the text's first line; it keeps no
      // relation and no file size.
      'reason_label': reason,
      'text': '$reason\n$text',
      'attachment': attachment,
      'sent_by': {'name': parent, 'relation': null},
      'answer': null,
      'sent_at': _at(ago),
      'status': 'pending',
      'status_label': 'Waiting',
    };
    _excuses[schoolId] = [
      excuse(
        'e1',
        'Omar Hassan',
        'Grade 5 · Class B',
        'Illness',
        'Omar has a fever since Wednesday night. The doctor asked him to rest for two days.',
        'Mona Hassan',
        'mother',
        const Duration(hours: 11),
        attachment: {
          'name': 'Doctor’s note.pdf',
          'size': null,
          'url': 'https://yallapp.com.tr/files/doctors-note.pdf',
        },
      ),
      excuse(
        'e2',
        'Lina Saleh',
        'Grade 3 · Class A',
        'Family matter',
        'We are travelling to my grandmother’s, back on Monday.',
        'Rami Saleh',
        'father',
        const Duration(hours: 5),
      ),
      excuse(
        'e3',
        'Yusuf Ali',
        'Grade 7 · Class C',
        'Medical appointment',
        'A dentist appointment in the morning.',
        'Hana Ali',
        'mother',
        const Duration(hours: 2),
      ),
    ];
    _reports[schoolId] = [
      {
        'id': 'p1',
        'teacher': {'id': 't1', 'name': 'Aylin Demir'},
        'about_label': 'Grade 5 · Class B',
        'kind': 'class',
        'status': 'sent',
        'status_label': 'To read',
        'unread': true,
        'sent_at': _at(const Duration(hours: 3)),
        'title': 'Week report',
        'text': 'The class finished the fractions unit. Two students need extra help with homework.',
        'fields': [
          {'label': 'Attendance', 'value': 'Good'},
          {'label': 'Behaviour', 'value': 'Two late arrivals this week'},
        ],
      },
      {
        'id': 'p2',
        'teacher': {'id': 't2', 'name': 'Karim Nabil'},
        'about_label': 'Omar Hassan',
        'kind': 'student',
        'status': 'sent',
        'status_label': 'To read',
        'unread': true,
        'sent_at': _at(const Duration(hours: 1)),
        'title': 'Progress',
        'text': 'Omar reads much better than in September.',
        'fields': [
          {'label': 'Reading', 'value': 'Very good'},
        ],
      },
    ];
    _leave[schoolId] = [
      {
        'id': 'l1',
        'person': {'id': 's1', 'name': 'Selin Arı', 'role': 'teacher'},
        'kind': 'other',
        'kind_label': 'Family',
        'days': 2,
        'note': 'My sister’s wedding in Izmir.',
        'attachment': null,
        'answer': null,
        'from': _isoDay(today.add(const Duration(days: 5))),
        'to': _isoDay(today.add(const Duration(days: 6))),
        'reason_label': 'Family',
        'text': 'My sister’s wedding in Izmir.',
        'sent_at': _at(const Duration(hours: 20)),
        'status': 'pending',
        'status_label': 'Waiting',
      },
    ];
  }

  /// Today's numbers of a Studio app, or null for the others.
  Today? _studioToday(AppSummary app) {
    final f = app.features;
    final id = app.id;
    if (!(f.foodOrders || f.market || f.rides || f.school || f.shipments)) {
      return null;
    }
    int count(Map<String, List<Json>> store, bool Function(Json j) test) =>
        (store[id] ?? const []).where(test).length;
    final newFood = count(_food, (j) => j['status'] == 'placed');
    final waiting = count(_shipments, (j) => j['status'] == 'pending');
    final searching = count(_rides, (j) => j['status'] == 'searching');
    final complaints = count(_complaints, (j) => j['waiting_for'] == 'you');
    final excuses = count(_excuses, (j) => j['status'] == 'pending');
    final reports = count(_reports, (j) => j['status'] == 'sent');
    final leave = count(_leave, (j) => j['status'] == 'pending');
    String plural(int n, String one, String many) =>
        n == 1 ? '1 $one' : '$n $many';
    final weekday = const [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ][now.weekday - 1];
    final (sales, orders) = f.foodOrders
        ? (1842000, 142)
        : f.market
        ? (965000, 61)
        : f.rides
        ? (1290000, 88)
        : f.shipments
        ? (412000, 57)
        : (0, 0);
    return Today(
      date: _isoDay(now),
      timeZone: 'Europe/Istanbul',
      sales: f.school ? const [] : [FakeOwnerApi.money(sales)],
      donations: const [],
      counts: TodayCounts(
        orders: f.school ? null : orders,
        newUsers: f.appUsers ? 12 : null,
        appOpens: f.analytics ? 1280 : null,
      ),
      hasAppOpens: f.analytics,
      compare: f.prime && !f.school
          ? TodayCompare(
              salesChangePct: f.foodOrders ? 12 : 5,
              ordersChangePct: f.foodOrders ? -4 : 2,
              label: 'vs last $weekday',
            )
          : null,
      morningBrief: f.prime && f.foodOrders
          ? 'Yesterday: ₺21,060 from 168 orders. Busiest hour 20:00–21:00. Burger Lab sold most.'
          : null,
      needsYou: [
        if (f.foodOrders && newFood > 0)
          NeedsYou(
            kind: 'food_orders_new',
            count: newFood,
            title: plural(newFood, 'new food order', 'new food orders'),
          ),
        if (f.shipments && waiting > 0)
          NeedsYou(
            kind: 'shipments_waiting',
            count: waiting,
            title: plural(
              waiting,
              'shipment needs a courier',
              'shipments need a courier',
            ),
          ),
        if (f.rides && searching > 0)
          NeedsYou(
            kind: 'rides_searching',
            count: searching,
            title: plural(
              searching,
              'ride needs a driver',
              'rides need a driver',
            ),
          ),
        if (f.market && complaints > 0)
          NeedsYou(
            kind: 'complaints_waiting',
            count: complaints,
            title: plural(
              complaints,
              'complaint waiting for you',
              'complaints waiting for you',
            ),
          ),
        if (f.school && excuses > 0)
          NeedsYou(
            kind: 'school_excuses',
            count: excuses,
            title: plural(excuses, 'absence excuse', 'absence excuses'),
          ),
        if (f.school && reports > 0)
          NeedsYou(
            kind: 'school_reports',
            count: reports,
            title: plural(
              reports,
              'teacher’s report to read',
              'teachers’ reports to read',
            ),
          ),
        if (f.school && leave > 0)
          NeedsYou(
            kind: 'school_leave',
            count: leave,
            title: plural(leave, 'leave request', 'leave requests'),
          ),
      ],
    );
  }

  // 2. Food orders

  static const _foodFilters = {
    'new': ['placed'],
    'active': ['accepted', 'preparing', 'ready', 'picked_up', 'on_the_way'],
    'done': ['delivered'],
    'problems': ['rejected', 'cancelled', 'failed'],
  };

  @override
  Future<Paged<FoodOrder>> foodOrders(
    String appId, {
    String filter = 'new',
    String? query,
    int page = 1,
  }) async {
    await _call('foodOrders:$filter');
    _app(appId, (f) => f.foodOrders);
    final all = _food[appId] ?? const <Json>[];
    final statuses = _foodFilters[filter];
    return _pageOf(
      [
        for (final j in all)
          if ((statuses == null || statuses.contains(j['status'])) &&
              _matches(j, query, ['reference', 'customer_name', 'restaurant']))
            j,
      ],
      FoodOrder.fromJson,
      page,
      counts: {
        'new': all.where((j) => j['status'] == 'placed').length,
        'active': all
            .where((j) => _foodFilters['active']!.contains(j['status']))
            .length,
      },
    );
  }

  @override
  Future<FoodOrderDetail> foodOrder(String appId, String id) async {
    await _call('foodOrder');
    _app(appId, (f) => f.foodOrders);
    return FoodOrderDetail.fromJson(_one(_food, appId, id));
  }

  @override
  Future<FoodOrderDetail> foodOrderStep(
    String appId,
    String id, {
    required String step,
    int? prepMinutes,
    String? reason,
    String? note,
  }) async {
    await _call('foodOrderStep:$step');
    _app(appId, (f) => f.foodOrders);
    final j = _one(_food, appId, id);
    if (!const ['accept', 'reject', 'ready', 'cancel'].contains(step)) {
      _invalid('Choose what to do.');
    }
    if (!(j['steps'] as List).contains(step)) {
      _invalidStatus("This order can't do that now.");
    }
    if (note != null && note.length > 300) {
      _invalid('Keep the note under 300 characters.', {'note': 'Too long'});
    }
    switch (step) {
      case 'accept':
        final minutes = prepMinutes ?? 0;
        if (minutes < 5 || minutes > 90) {
          _invalid('Choose the time to prepare.', {'prep_minutes': 'Choose'});
        }
        j
          ..['status'] = 'accepted'
          ..['status_label'] = 'Preparing'
          ..['ready_at'] = _in(Duration(minutes: minutes))
          ..['steps'] = ['ready', 'cancel'];
        _timeline(j, 'accepted', 'Accepted · ready in $minutes min', 'You');
        // A courier job is made as soon as it is accepted.
        final number = 2000 + (++_studioIds % 1000);
        final restaurant = j['restaurant'] as Map;
        final customer = j['customer'] as Map;
        final cash = (j['payment'] as Map)['method'] == 'cash';
        (_shipments[appId] ??= []).insert(
          0,
          _shipment(
            number: number,
            status: 'pending',
            statusLabel: 'Needs a courier',
            pickup: ('${restaurant['name']}', '${j['restaurant_address']}'),
            dropoff: ('', '${customer['address']}'),
            distance: (j['distance_km'] as num?)?.toDouble() ?? 0,
            price: 6000,
            ago: Duration.zero,
            collect: cash ? (j['total'] as Map)['amount_cents'] as int : null,
            food: (int.parse('${j['id']}') + 1000, ''),
            recipient: '${customer['name']}',
          ),
        );
        j['shipment_id'] = number;
      case 'reject':
        final reasons = [
          for (final r in j['rejection_reasons'] as List) '${(r as Map)['id']}',
        ];
        if (reason == null || !reasons.contains(reason)) {
          _invalid('Choose why.', {'reason': 'Choose why'});
        }
        j
          ..['status'] = 'rejected'
          ..['status_label'] = 'Rejected'
          ..['steps'] = <String>[];
        _timeline(j, 'rejected', 'Rejected', 'You');
      case 'ready':
        j
          ..['status'] = 'ready'
          ..['status_label'] = 'Ready'
          ..['steps'] = <String>[];
        _timeline(j, 'ready', 'Ready', 'You');
      case 'cancel':
        j
          ..['status'] = 'cancelled'
          ..['status_label'] = 'Cancelled'
          ..['steps'] = <String>[]
          ..['refund_due'] = (j['payment'] as Map)['paid'] == true;
        _timeline(j, 'cancelled', 'Cancelled', 'You');
    }
    return FoodOrderDetail.fromJson(j);
  }

  @override
  Future<List<Restaurant>> restaurants(String appId) async {
    await _call('restaurants');
    _app(appId, (f) => f.restaurants);
    return [
      for (final j in _restaurants[appId] ?? const []) Restaurant.fromJson(j),
    ];
  }

  @override
  Future<Restaurant> openRestaurant(String appId, String id) async {
    await _call('openRestaurant');
    _app(appId, (f) => f.restaurants);
    final j = _one(_restaurants, appId, id)
      ..['busy_until'] = null
      ..['delayed'] = false
      ..['open'] = true
      ..['state_label'] = 'Open';
    return Restaurant.fromJson(j);
  }

  @override
  Future<Restaurant> endRestaurantDelay(String appId, String id) async {
    await _call('endRestaurantDelay');
    _app(appId, (f) => f.restaurants);
    final j = _one(_restaurants, appId, id);
    if (j['delayed'] != true && j['busy_until'] == null) {
      throw const ApiException(
        code: 'changed',
        message: 'It changed meanwhile.',
        statusCode: 409,
      );
    }
    j
      ..['busy_until'] = null
      ..['delayed'] = false
      ..['state_label'] = 'Open';
    return Restaurant.fromJson(j);
  }

  // 3. Shipments and couriers

  static const _shipmentFilters = {
    'waiting': ['pending'],
    'active': ['assigned', 'accepted', 'picked_up', 'on_the_way'],
    'done': ['delivered'],
    'problems': ['failed', 'cancelled'],
  };

  @override
  Future<Paged<Shipment>> shipments(
    String appId, {
    String filter = 'waiting',
    String? query,
    int page = 1,
  }) async {
    await _call('shipments:$filter');
    _app(appId, (f) => f.shipments);
    final all = _shipments[appId] ?? const <Json>[];
    final statuses = _shipmentFilters[filter];
    final couriers = _couriers[appId] ?? const <Json>[];
    return _pageOf(
      [
        for (final j in all)
          if ((statuses == null || statuses.contains(j['status'])) &&
              _matches(j, query, ['reference', 'pickup', 'dropoff']))
            j,
      ],
      Shipment.fromJson,
      page,
      counts: {
        'on_duty': couriers.where((c) => c['on_duty'] == true).length,
        'on_the_way': all
            .where((j) => _shipmentFilters['active']!.contains(j['status']))
            .length,
        'waiting': all.where((j) => j['status'] == 'pending').length,
        'today': all.length,
      },
    );
  }

  @override
  Future<ShipmentDetail> shipment(String appId, String id) async {
    await _call('shipment');
    _app(appId, (f) => f.shipments);
    return ShipmentDetail.fromJson(_one(_shipments, appId, id));
  }

  @override
  Future<ShipmentDetail> assignShipment(
    String appId,
    String id,
    String courierId,
  ) async {
    await _call('assignShipment:$courierId');
    _app(appId, (f) => f.shipments);
    final j = _one(_shipments, appId, id);
    final courier = (_couriers[appId] ?? const <Json>[])
        .where((c) => '${c['id']}' == courierId)
        .firstOrNull;
    if (courier == null ||
        courier['active'] != true ||
        courier['on_duty'] != true) {
      _invalid('Choose a courier on duty.', {'courier_id': 'Choose'});
    }
    if (j['assignable'] != true) _invalidStatus();
    final before = j['courier'] as Map?;
    if (before != null && '${before['id']}' == courierId) {
      return ShipmentDetail.fromJson(j);
    }
    j
      ..['status'] = 'assigned'
      ..['status_label'] = 'Courier on the way'
      ..['courier'] = {'id': courier['id'], 'name': courier['name']}
      ..['waiting_minutes'] = null
      ..['statuses'] = _shipmentNext('assigned');
    courier
      ..['active_jobs'] = (courier['active_jobs'] as int) + 1
      ..['state'] = 'busy';
    _timeline(j, 'assigned', 'Given to ${courier['name']}', 'You');
    return ShipmentDetail.fromJson(j);
  }

  @override
  Future<ShipmentDetail> moveShipment(
    String appId,
    String id,
    String status, {
    String? note,
  }) async {
    await _call('moveShipment:$status');
    _app(appId, (f) => f.shipments);
    final j = _one(_shipments, appId, id);
    if (!(j['statuses'] as List).contains(status)) _invalidStatus();
    final label = _shipmentLabels[status] ?? status;
    j
      ..['status'] = status
      ..['status_label'] = label
      ..['statuses'] = _shipmentNext(status)
      ..['assignable'] = false
      ..['waiting_minutes'] = null
      ..['note'] = note ?? j['note'];
    _timeline(j, status, label, 'You');
    return ShipmentDetail.fromJson(j);
  }

  @override
  Future<List<Courier>> couriers(String appId, {String? shipmentId}) async {
    await _call('couriers');
    _app(appId, (f) => f.shipments);
    final list = [...?_couriers[appId]]
      ..sort((a, b) {
        final duty =
            (b['on_duty'] == true ? 1 : 0) - (a['on_duty'] == true ? 1 : 0);
        if (duty != 0) return duty;
        final da = (a['distance_km'] as num?)?.toDouble() ?? 999;
        final db = (b['distance_km'] as num?)?.toDouble() ?? 999;
        if (da != db) return da.compareTo(db);
        return '${a['name']}'.compareTo('${b['name']}');
      });
    return [for (final j in list) Courier.fromJson(j)];
  }

  // 4. Rides and drivers

  static const _rideFilters = {
    'now': ['searching', 'assigned', 'arrived', 'in_progress'],
    'scheduled': ['scheduled'],
    'done': ['completed'],
    'problems': ['cancelled', 'no_driver'],
  };

  @override
  Future<Paged<Ride>> rides(
    String appId, {
    String filter = 'now',
    String? query,
    int page = 1,
  }) async {
    await _call('rides:$filter');
    _app(appId, (f) => f.rides);
    final all = _rides[appId] ?? const <Json>[];
    final drivers = _drivers[appId] ?? const <Json>[];
    final statuses = _rideFilters[filter];
    return _pageOf(
      [
        for (final j in all)
          if ((statuses == null || statuses.contains(j['status'])) &&
              _matches(j, query, ['reference', 'rider_name', 'pickup']))
            j,
      ],
      Ride.fromJson,
      page,
      counts: {
        'free': drivers.where((d) => d['state'] == 'free').length,
        'on_ride': drivers.where((d) => d['state'] == 'on_ride').length,
        'searching': all.where((j) => j['status'] == 'searching').length,
        'today': all.length,
      },
    );
  }

  @override
  Future<RideDetail> ride(String appId, String id) async {
    await _call('ride');
    _app(appId, (f) => f.rides);
    return RideDetail.fromJson(_one(_rides, appId, id));
  }

  @override
  Future<RideDetail> assignRide(
    String appId,
    String id,
    String driverId,
  ) async {
    await _call('assignRide:$driverId');
    _app(appId, (f) => f.rides);
    final j = _one(_rides, appId, id);
    final driver = (_drivers[appId] ?? const <Json>[])
        .where((d) => '${d['id']}' == driverId)
        .firstOrNull;
    if (driver == null || driver['state'] != 'free') {
      _invalid('Choose a free driver.', {'driver_id': 'Choose'});
    }
    if (j['givable'] != true) _invalidStatus();
    final vehicle = driver['vehicle'] as Map?;
    j
      ..['status'] = 'assigned'
      ..['status_label'] = 'Driver on the way'
      ..['driver'] = {
        'id': driver['id'],
        'name': driver['name'],
        'phone': driver['phone'],
        'plate': vehicle?['plate'],
        'vehicle': vehicle?['model'],
      }
      ..['searching_minutes'] = null
      ..['givable'] = false
      ..['cancellable'] = true;
    driver['state'] = 'on_ride';
    _timeline(j, 'assigned', 'Given to ${driver['name']}', 'You');
    return RideDetail.fromJson(j);
  }

  @override
  Future<RideDetail> cancelRide(String appId, String id, {String? note}) async {
    await _call('cancelRide');
    _app(appId, (f) => f.rides);
    final j = _one(_rides, appId, id);
    if (j['cancellable'] != true) _invalidStatus();
    j
      ..['status'] = 'cancelled'
      ..['status_label'] = 'Cancelled'
      ..['givable'] = false
      ..['cancellable'] = false
      ..['searching_minutes'] = null;
    _timeline(j, 'cancelled', 'Cancelled', 'You');
    return RideDetail.fromJson(j);
  }

  @override
  Future<List<Driver>> drivers(String appId, {String? rideId}) async {
    await _call('drivers');
    _app(appId, (f) => f.rides);
    int rank(Json d) => switch (d['state']) {
      'free' => d['same_type'] == true ? 0 : 1,
      'on_ride' => 2,
      'offline' => 3,
      _ => 4,
    };
    final list = [...?_drivers[appId]]
      ..sort((a, b) {
        final r = rank(a) - rank(b);
        if (r != 0) return r;
        final da = (a['distance_km'] as num?)?.toDouble() ?? 999;
        final db = (b['distance_km'] as num?)?.toDouble() ?? 999;
        return da.compareTo(db);
      });
    return [for (final j in list) Driver.fromJson(j)];
  }

  // 5. Marketplace

  static const _marketFilters = {
    'active': [
      'scheduled',
      'placed',
      'accepted',
      'picking',
      'ready',
      'on_the_way',
    ],
    'new': ['placed'],
    'done': ['delivered', 'picked_up'],
    'problems': ['rejected', 'cancelled'],
  };

  @override
  Future<Paged<MarketOrder>> marketOrders(
    String appId, {
    String filter = 'active',
    String? query,
    int page = 1,
  }) async {
    await _call('marketOrders:$filter');
    _app(appId, (f) => f.market);
    final statuses = _marketFilters[filter];
    return _pageOf(
      [
        for (final j in _marketOrders[appId] ?? const <Json>[])
          if ((statuses == null || statuses.contains(j['status'])) &&
              _matches(j, query, ['reference', 'customer_name', 'vendor']))
            j,
      ],
      MarketOrder.fromJson,
      page,
    );
  }

  @override
  Future<MarketOrderDetail> marketOrder(String appId, String id) async {
    await _call('marketOrder');
    _app(appId, (f) => f.market);
    return MarketOrderDetail.fromJson(_one(_marketOrders, appId, id));
  }

  @override
  Future<Paged<Complaint>> complaints(
    String appId, {
    String queue = 'all',
    int page = 1,
  }) async {
    await _call('complaints:$queue');
    _app(appId, (f) => f.market);
    final all = _complaints[appId] ?? const <Json>[];
    bool inQueue(Json j) => switch (queue) {
      'waiting' => j['waiting_for'] == 'you',
      // `vendor` is the same queue as `customer` on the server.
      'customer' || 'vendor' => j['waiting_for'] == 'customer',
      'mine' => j['waiting_for'] != null,
      'closed' => j['waiting_for'] == null,
      _ => true,
    };
    return _pageOf(
      [
        for (final j in all)
          if (inQueue(j)) j,
      ],
      Complaint.fromJson,
      page,
      counts: {'waiting': all.where((j) => j['waiting_for'] == 'you').length},
    );
  }

  ComplaintDetail _complaintDetail(Json j) {
    final open = j['waiting_for'] != null;
    final total = ((j['order'] as Map)['total'] as Map)['amount_cents'] as int;
    final left = _money(total - ((j['given'] as int?) ?? 0));
    return ComplaintDetail.fromJson({
      ...j,
      'decisions': open
          ? [
              {
                'decision': 'refund',
                'label': 'Refund what is left',
                'amount': 'fixed',
                'max': left,
                'to': ['payment', 'wallet'],
              },
              {
                'decision': 'partial_refund',
                'label': 'Refund part',
                'amount': 'required',
                'max': left,
                'to': ['payment', 'wallet'],
              },
              {
                'decision': 'compensation',
                'label': 'Compensation',
                'amount': 'required',
                'max': null,
                'to': ['wallet', 'coupon'],
              },
              {
                'decision': 'no_refund',
                'label': 'No refund',
                'amount': 'none',
                'max': null,
                'to': <String>[],
              },
            ]
          : const [],
    });
  }

  @override
  Future<ComplaintDetail> complaint(String appId, String id) async {
    await _call('complaint');
    _app(appId, (f) => f.market);
    return _complaintDetail(_one(_complaints, appId, id));
  }

  @override
  Future<ComplaintDetail> replyComplaint(
    String appId,
    String id,
    String text,
  ) async {
    await _call('replyComplaint');
    _app(appId, (f) => f.market);
    final j = _one(_complaints, appId, id);
    final body = text.trim();
    if (body.isEmpty || body.length > 2000) {
      _invalid('Write your reply.', {'text': 'Write your reply'});
    }
    if (j['waiting_for'] == null) _invalidStatus();
    (j['messages'] as List).add({
      'from': 'support',
      'name': 'Support',
      'text': body,
      'at': now.toUtc().toIso8601String(),
    });
    j
      ..['waiting_for'] = 'customer'
      ..['status'] = 'waiting_for_customer'
      ..['status_label'] = 'Waiting for the customer'
      ..['updated_at'] = now.toUtc().toIso8601String();
    return _complaintDetail(j);
  }

  @override
  Future<ComplaintDetail> decideComplaint(
    String appId,
    String id, {
    required String decision,
    int? amountCents,
    String? note,
    String? to,
    String funder = 'owner',
    bool shareWithVendor = false,
  }) async {
    await _call('decideComplaint:$decision');
    _app(appId, (f) => f.market);
    final j = _one(_complaints, appId, id);
    if (j['waiting_for'] == null) {
      _invalidStatus('This complaint has a decision already.');
    }
    final options = _complaintDetail(j).decisions;
    final option = options.where((d) => d.id == decision).firstOrNull;
    if (option == null) _invalid('Choose what you decide.');
    if (to != null && !option.to.contains(to)) {
      _invalid("The money can't go there.", {'to': 'Choose where it goes'});
    }
    final max = option.max?.amountCents;
    final amount = option.amount == 'fixed' ? max : amountCents;
    if (option.needsAmount &&
        (amount == null || amount <= 0 || (max != null && amount > max))) {
      _invalid('Enter an amount up to what is left.', {
        'amount_cents': 'Up to what is left',
      });
    }
    if (option.needsNote && (note == null || note.trim().isEmpty)) {
      _invalid('Write why for the customer.', {'note': 'Write why'});
    }
    final label = switch (decision) {
      'refund' ||
      'partial_refund' => 'Refunded ${FakeOwnerApi.money(amount!).formatted}',
      'compensation' => 'Compensation ${FakeOwnerApi.money(amount!).formatted}',
      _ => 'No refund',
    };
    j
      ..['waiting_for'] = null
      ..['status'] = 'closed'
      ..['status_label'] = label
      ..['refund_suggested'] = null
      ..['given'] = ((j['given'] as int?) ?? 0) + (amount ?? 0)
      ..['decision'] = {
        'decision': decision,
        'label': label,
        'amount': amount == null ? null : _money(amount),
        'to': to ?? option.to.firstOrNull,
        'at': now.toUtc().toIso8601String(),
      }
      ..['updated_at'] = now.toUtc().toIso8601String();
    (j['messages'] as List).add({
      'from': 'support',
      'name': 'Support',
      'text': note?.trim().isNotEmpty == true ? note!.trim() : label,
      'at': now.toUtc().toIso8601String(),
    });
    return _complaintDetail(j);
  }

  @override
  Future<List<Vendor>> vendors(String appId) async {
    await _call('vendors');
    _app(appId, (f) => f.market);
    return [for (final j in _vendors[appId] ?? const []) Vendor.fromJson(j)];
  }

  // 6. School

  @override
  Future<SchoolToday> schoolToday(String appId) async {
    await _call('schoolToday');
    _app(appId, (f) => f.school);
    int pending(Map<String, List<Json>> store, String status) =>
        (store[appId] ?? const []).where((j) => j['status'] == status).length;
    return SchoolToday.fromJson({
      'date': _isoDay(now),
      'closes_at': '08:30',
      'students': {
        'total': 466,
        'in': 412,
        'late': 18,
        'not_yet': 23,
        'absent': 9,
        'excused': 4,
      },
      'teachers': {'in': 38, 'total': 40},
      'staff': {'in': 11, 'total': 12},
      'needs': {
        'excuses': pending(_excuses, 'pending'),
        'reports': pending(_reports, 'sent'),
        'leave': pending(_leave, 'pending'),
      },
      'buses': {
        'running': 3,
        'late': [
          {'route': 'Route 2', 'minutes': 6},
        ],
      },
      'pickups_today': 5,
      'slips': [
        {
          'id': 'sl1',
          'title': 'Museum trip',
          'yes': 120,
          'no': 8,
          'waiting': 32,
        },
      ],
      'fees': {'due': _money(8450000), 'count': 61},
    });
  }

  @override
  Future<Paged<Excuse>> excuses(
    String appId, {
    String status = 'pending',
    int page = 1,
  }) async {
    await _call('excuses:$status');
    _app(appId, (f) => f.school);
    return _pageOf(
      [
        for (final j in _excuses[appId] ?? const <Json>[])
          if (status == 'all' || j['status'] == status) j,
      ],
      Excuse.fromJson,
      page,
    );
  }

  @override
  Future<Excuse> excuse(String appId, String id) async {
    await _call('excuse');
    _app(appId, (f) => f.school);
    return Excuse.fromJson(_one(_excuses, appId, id));
  }

  @override
  Future<Excuse> answerExcuse(
    String appId,
    String id, {
    required String answer,
    String? note,
  }) async {
    await _call('answerExcuse:$answer');
    _app(appId, (f) => f.school);
    final j = _one(_excuses, appId, id);
    if (answer != 'accepted' && answer != 'declined') _invalid('Choose.');
    if (answer == 'declined' && (note == null || note.trim().isEmpty)) {
      _invalid('Write a note to the parents to decline.', {
        'note': 'Write a note to the parents',
      });
    }
    if (j['status'] != 'pending') {
      throw const ApiException(
        code: 'changed',
        message: 'Someone answered it meanwhile.',
        statusCode: 409,
      );
    }
    j
      ..['status'] = answer
      ..['status_label'] = answer == 'accepted' ? 'Accepted' : 'Declined';
    return Excuse.fromJson(j);
  }

  @override
  Future<Paged<SchoolReport>> reports(
    String appId, {
    String status = 'sent',
    int page = 1,
  }) async {
    await _call('reports:$status');
    _app(appId, (f) => f.school);
    return _pageOf(
      [
        for (final j in _reports[appId] ?? const <Json>[])
          if (status == 'all' || j['status'] == status) j,
      ],
      SchoolReport.fromJson,
      page,
    );
  }

  @override
  Future<SchoolReport> report(String appId, String id) async {
    await _call('report');
    _app(appId, (f) => f.school);
    final j = _one(_reports, appId, id)..['unread'] = false;
    return SchoolReport.fromJson(j);
  }

  @override
  Future<SchoolReport> reviewReport(
    String appId,
    String id, {
    required String action,
    String? text,
  }) async {
    await _call('reviewReport:$action');
    _app(appId, (f) => f.school);
    final j = _one(_reports, appId, id);
    final body = text?.trim() ?? '';
    if ((action == 'comment' || action == 'return') && body.isEmpty) {
      _invalid('Write what to change.', {'text': 'Write what to change'});
    }
    switch (action) {
      case 'return':
        j
          ..['status'] = 'returned'
          ..['status_label'] = 'Returned';
      case 'approve':
        j
          ..['status'] = 'approved'
          ..['status_label'] = 'Approved';
      case 'comment':
        break;
      default:
        _invalid('Choose.');
    }
    j['unread'] = false;
    return SchoolReport.fromJson(j);
  }

  @override
  Future<Paged<LeaveRequest>> leaveRequests(
    String appId, {
    String status = 'pending',
    int page = 1,
  }) async {
    await _call('leave:$status');
    _app(appId, (f) => f.school);
    return _pageOf(
      [
        for (final j in _leave[appId] ?? const <Json>[])
          if (status == 'all' || j['status'] == status) j,
      ],
      LeaveRequest.fromJson,
      page,
    );
  }

  @override
  Future<LeaveRequest> answerLeave(
    String appId,
    String id, {
    required String answer,
    String? note,
  }) async {
    await _call('answerLeave:$answer');
    _app(appId, (f) => f.school);
    final j = _one(_leave, appId, id);
    if (answer != 'approved' && answer != 'refused') _invalid('Choose.');
    if (j['status'] != 'pending') {
      throw const ApiException(
        code: 'changed',
        message: 'Someone answered it meanwhile.',
        statusCode: 409,
      );
    }
    j
      ..['status'] = answer
      ..['status_label'] = answer == 'approved' ? 'Approved' : 'Refused';
    return LeaveRequest.fromJson(j);
  }

  // 9. Prime

  @override
  Future<PrimeInsights> primeInsights(
    String appId, {
    String period = 'week',
  }) async {
    await _call('primeInsights:$period');
    final app = _app(appId, (f) => f.prime);
    final f = app.features;
    if (f.school) {
      return PrimeInsights.fromJson({
        'period': period,
        'range_label': period == 'month' ? 'This month' : 'This week',
        'sales': {'now': _money(0), 'before': _money(0), 'change_pct': null},
        'orders': {'now': 0, 'before': 0, 'change_pct': null},
        'days': <Json>[],
        'peak': {'hours': <int>[], 'rows': <Json>[], 'busiest_label': null},
        'returning': {'pct': null, 'change_pts': null},
        'average_order': {'now': null, 'before': null},
        'best': <Json>[],
      });
    }
    final week = period != 'month';
    const last = [52, 48, 55, 60, 78, 86, 64];
    const nowShare = [56, 50, 61, 66, 88, 90, 70];
    const grid = [
      [0.15, 0.4, 0.25, 0.2, 0.55, 0.7],
      [0.15, 0.45, 0.25, 0.2, 0.6, 0.75],
      [0.2, 0.5, 0.3, 0.25, 0.65, 0.8],
      [0.2, 0.45, 0.3, 0.3, 0.75, 1],
      [0.25, 0.55, 0.35, 0.35, 0.85, 1],
    ];
    final best = f.foodOrders
        ? const [
            ('Burger Lab', 2431000),
            ('Pide House', 1798000),
            ('Sushi Moda', 1245000),
          ]
        : f.market
        ? const [('Fresh Mart', 1850000), ('Çiçek Pharmacy', 720000)]
        : f.rides
        ? const [('Economy', 2600000), ('Comfort', 1900000)]
        : const [('Kadıköy depot', 980000)];
    return PrimeInsights.fromJson({
      'period': period,
      'range_label': week ? 'This week' : 'This month',
      'sales': {
        'now': _money(week ? 11284000 : 46120000),
        'before': _money(week ? 10352000 : 43100000),
        'change_pct': week ? 9 : 7,
      },
      'orders': {
        'now': week ? 870 : 3540,
        'before': week ? 800 : 3390,
        'change_pct': week ? 8.8 : 4.4,
      },
      'days': week
          ? [
              for (var i = 0; i < 7; i++)
                {
                  'label': const [
                    'Mon',
                    'Tue',
                    'Wed',
                    'Thu',
                    'Fri',
                    'Sat',
                    'Sun',
                  ][i],
                  'now_cents': nowShare[i] * 20000,
                  'before_cents': last[i] * 20000,
                },
            ]
          : [
              // The last 30 days, a bar each (as the server).
              for (var i = 29; i >= 0; i--)
                {
                  'label': _isoDay(now.subtract(Duration(days: i)))
                      .substring(5),
                  'now_cents': nowShare[i % 7] * 20000,
                  'before_cents': last[i % 7] * 20000,
                },
            ],
      'peak': {
        'hours': const [10, 12, 14, 16, 18, 20],
        'rows': [
          for (var i = 0; i < 5; i++)
            {
              'day_label': const ['Mon', 'Wed', 'Thu', 'Fri', 'Sat'][i],
              'cells': grid[i],
            },
        ],
        'busiest_label': 'Friday and Saturday 20:00–22:00',
      },
      'returning': {'pct': 38, 'change_pts': 3},
      'average_order': {'now': _money(12970), 'before': _money(12970)},
      'best': [
        for (final (name, cents) in best)
          {'name': name, 'total': _money(cents)},
      ],
    });
  }

  static Json _defaultAlerts(AppFeatures f) => {
    'items': [
      if (f.foodOrders || f.market)
        {'kind': 'order_waiting', 'on': false, 'minutes': 5},
      if (f.shipments)
        {'kind': 'shipment_unassigned', 'on': false, 'minutes': 10},
      if (f.rides) {'kind': 'ride_no_driver', 'on': false, 'minutes': 3},
      if (!f.school)
        {
          'kind': 'sales_low',
          'on': false,
          'amount_cents': 500000,
          'by_time': '18:00',
        },
      if (f.market) {'kind': 'message_unanswered', 'on': false, 'minutes': 10},
      if (f.foodOrders || f.rides || f.market)
        {'kind': 'low_rating', 'on': false, 'stars': 2},
    ],
    // Every alert and the brief start off, as on the server.
    'morning_brief': {'on': false, 'time': '08:30'},
  };

  @override
  Future<PrimeAlerts> primeAlerts(String appId) async {
    await _call('primeAlerts');
    final app = _app(appId, (f) => f.prime);
    return PrimeAlerts.fromJson(
      _alerts[appId] ??= _defaultAlerts(app.features),
    );
  }

  @override
  Future<PrimeAlerts> setPrimeAlerts(String appId, PrimeAlerts alerts) async {
    await _call('setPrimeAlerts');
    final app = _app(appId, (f) => f.prime);
    final had = PrimeAlerts.fromJson(
      _alerts[appId] ??= _defaultAlerts(app.features),
    );
    final kinds = {for (final a in had.items) a.kind};
    final time = RegExp(r'^([01]\d|2[0-3]):[0-5]\d$');
    for (final a in alerts.items) {
      if (!kinds.contains(a.kind)) {
        _invalid("This app doesn't have that alert.");
      }
      final minutes = a.minutes;
      if (minutes != null && (minutes < 1 || minutes > 240)) {
        _invalid('Choose 1 to 240 minutes.', {'minutes': 'Choose 1 to 240'});
      }
      final stars = a.stars;
      if (stars != null && (stars < 1 || stars > 4)) {
        _invalid('Choose 1 to 4 stars.', {'stars': 'Choose 1 to 4'});
      }
      final by = a.byTime;
      if (by != null && !time.hasMatch(by)) _invalid('Choose a time.');
    }
    if (!time.hasMatch(alerts.briefTime)) _invalid('Choose a time.');
    _alerts[appId] = alerts.toJson();
    return PrimeAlerts.fromJson(_alerts[appId]!);
  }

  // 10. VIP

  AccountManager? _accountManager(List<AppSummary> apps) =>
      accountManagerOn && apps.any((a) => a.features.vip)
      ? const AccountManager(
          name: 'Deniz Aksoy',
          whatsappUrl: 'https://wa.me/905320000099',
          phone: '+90 532 000 00 99',
          hoursLabel: '09:00–21:00, Mon–Sat',
        )
      : null;

  List<CallDay> _slots() {
    final days = <CallDay>[];
    var day = DateTime(now.year, now.month, now.day);
    const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    while (days.length < 5) {
      day = day.add(const Duration(days: 1));
      if (day.weekday == DateTime.sunday) continue;
      final iso = _isoDay(day);
      final times = [
        for (final t in const ['11:00', '14:30', '16:00', '17:30'])
          if (!bookedCalls.any((c) => c.date == iso && c.time == t)) t,
      ];
      days.add(
        CallDay(
          date: iso,
          label:
              '${names[day.weekday - 1]} ${day.day} ${months[day.month - 1]}',
          times: times,
        ),
      );
    }
    return days;
  }

  @override
  Future<List<CallDay>> accountManagerSlots() async {
    await _call('accountManagerSlots');
    if (_accountManager(_appsForVip) == null) _missing();
    return _slots();
  }

  List<AppSummary> get _appsForVip;

  @override
  Future<BookedCall> bookAccountManagerCall({
    required String date,
    required String time,
    String? note,
  }) async {
    await _call('bookAccountManagerCall');
    if (_accountManager(_appsForVip) == null) _missing();
    final free = _slots().any((d) => d.date == date && d.times.contains(time));
    if (!free) {
      throw const ApiException(
        code: 'changed',
        message: "That time isn't free any more. Choose another.",
        statusCode: 409,
      );
    }
    final call = BookedCall(
      id: 'call-${++_studioIds}',
      date: date,
      time: time,
      status: 'requested',
    );
    bookedCalls.add(call);
    return call;
  }
}
