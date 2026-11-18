import 'package:flutter/widgets.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import 'fake_api.dart';
import 'fixtures.dart';
import 'test_app.dart';

/// 115.70 Zad Market's vendor app as the approved designs show it
/// (docs/design/2026-11-18-marketplace, screens 08–10): Samir the picker's
/// new orders, Mona's order being picked by aisle, and the stock.

Map<String, String> egp(String amount) => {
  'amount': amount,
  'formatted': 'EGP $amount',
};

/// A demo photo, as the screenshots seed them (test/screenshots/support).
String? zadPhoto(String? name) => name == null
    ? null
    : 'https://yallapp.test/design-pictures/demo-photos/$name.jpg';

Map<String, dynamic> zadLine({
  required int id,
  required String name,
  required num quantity,
  required String unitPrice,
  String unit = 'item',
  String ifMissing = 'similar',
  String? photo,
  Map<String, dynamic>? aisle,
  String? outcome,
  num? picked,
  String? total,
}) {
  final price = double.parse(unitPrice);
  return {
    'id': id,
    'product_id': id,
    'name': name,
    'image_url': zadPhoto(photo),
    'quantity': quantity,
    'unit': unit,
    'choices': const <String>[],
    'note': null,
    'unit_price': egp(unitPrice),
    'before_discount': null,
    'total': egp(total ?? (price * quantity).toStringAsFixed(2)),
    'if_missing': ifMissing,
    'outcome': outcome,
    'picked_quantity': picked,
    'substitute': null,
    'aisle': ?aisle,
  };
}

Map<String, dynamic> zadAisle(int id, String name, int position) => {
  'id': id,
  'name': name,
  'department': null,
  'position': position,
};

Map<String, dynamic> zadOrder({
  int id = 4822,
  String status = 'placed',
  String customer = 'Hany',
  String pay = 'card',
  String fulfilment = 'delivery',
  required List<Map<String, dynamic>> lines,
  String subtotal = '386.50',
  int minutesAgo = 1,
}) {
  final at = DateTime.now().toUtc().subtract(Duration(minutes: minutesAgo));
  return {
    'id': id,
    'reference': '#$id',
    'status': status,
    'fulfilment': fulfilment,
    'scheduled_for': null,
    'lines': lines,
    'subtotal': egp(subtotal),
    'customer': {'first_name': customer},
    'notes': null,
    'dropoff': null,
    'payment': {'method': pay, 'status': pay == 'cash' ? 'unpaid' : 'paid'},
    'prep_minutes': status == 'placed' ? null : 20,
    'ready_at': status == 'placed'
        ? null
        : at.add(const Duration(minutes: 20)).toIso8601String(),
    'courier': null,
    'created_at': at.toIso8601String(),
    'timeline': [
      {'status': 'placed', 'at': at.toIso8601String()},
      if (status != 'placed')
        {
          'status': 'picking',
          'at': at.add(const Duration(minutes: 1)).toIso8601String(),
        },
    ],
  };
}

/// Hany's order (#4822) ringing and Salma's (#4823) under it: design 08.
List<Map<String, dynamic>> zadNewOrders() => [
  zadOrder(
    lines: [
      zadLine(
        id: 1,
        name: 'Tomatoes',
        quantity: 1.5,
        unit: 'kg',
        unitPrice: '18.00',
      ),
      zadLine(
        id: 2,
        name: 'White cheese, sliced',
        quantity: 0.5,
        unit: 'kg',
        unitPrice: '160.00',
      ),
      zadLine(
        id: 3,
        name: 'Full-cream milk, 1 l',
        quantity: 3,
        unitPrice: '42.00',
      ),
      for (var i = 4; i <= 7; i++)
        zadLine(id: i, name: 'Item $i', quantity: 1, unitPrice: '10.00'),
    ],
  ),
  zadOrder(
    id: 4823,
    customer: 'Salma',
    pay: 'cash',
    fulfilment: 'pickup',
    subtotal: '142.00',
    minutesAgo: 0,
    lines: [
      for (var i = 1; i <= 3; i++)
        zadLine(id: 10 + i, name: 'Item $i', quantity: 1, unitPrice: '10.00'),
    ],
  ),
];

/// Mona's order (#4821) being picked: design 09. [pay] card, wallet or
/// cash; [proposal] the rice offered and waiting.
Map<String, dynamic> zadPickOrder({String pay = 'card', bool proposal = true}) {
  final cheese = zadAisle(4, 'Cheese & eggs', 4);
  final rice = zadAisle(7, 'Rice, pasta & pulses', 7);
  final fruit = zadAisle(1, 'Fresh fruit', 1);
  return zadOrder(
    id: 4821,
    status: 'picking',
    customer: 'Mona',
    pay: pay,
    subtotal: '390.25',
    minutesAgo: 6,
    lines: [
      zadLine(
        id: 31,
        name: 'White cheese, sliced',
        quantity: 0.75,
        unit: 'kg',
        unitPrice: '160.00',
        photo: 'white-cheese',
        aisle: cheese,
      ),
      zadLine(
          id: 32,
          name: 'Egyptian rice, 1 kg',
          quantity: 2,
          unitPrice: '38.00',
          photo: 'egyptian-rice',
          aisle: rice,
        )
        ..['proposal'] = proposal
            ? {
                'product': {
                  'id': 77,
                  'name': 'Short-grain rice, 1 kg',
                  'image_url': zadPhoto('vermicelli-rice'),
                },
                'quantity': 2,
                'price': egp('36.00'),
                'expires_at': DateTime.now()
                    .toUtc()
                    .add(const Duration(minutes: 4, seconds: 32))
                    .toIso8601String(),
                'status': 'waiting',
              }
            : null,
      zadLine(
        id: 33,
        name: 'Bananas',
        quantity: 1,
        unit: 'kg',
        unitPrice: '35.00',
        photo: 'bananas',
        aisle: fruit,
        outcome: 'picked',
        picked: 0.95,
        total: '33.25',
      ),
      zadLine(
          id: 34,
          name: 'Eggs, 15 ×2',
          quantity: 1,
          unitPrice: '90.00',
          ifMissing: 'chosen',
          photo: 'eggs',
          aisle: fruit,
          outcome: 'substituted',
        )
        ..['substitute'] = {
          'product_id': 35,
          'name': 'Eggs, 15 ×2',
          'quantity': 1,
          'total': egp('90.00'),
        },
      zadLine(
        id: 36,
        name: 'Mineral water, 1.5 l',
        quantity: 6,
        unitPrice: '8.00',
        photo: 'mineral-water',
        aisle: fruit,
        outcome: 'picked',
        picked: 6,
      ),
    ],
  );
}

/// The stock of design 10.
List<Map<String, dynamic>> zadStock() => [
  {
    'id': 1,
    'name': 'Bananas',
    'sku': 'FRT-BAN',
    'price': egp('35.00'),
    'unit': 'kg',
    'step': 0.5,
    'image_url': zadPhoto('bananas'),
    'in_stock': true,
  },
  {
    'id': 2,
    'name': 'Oranges',
    'sku': 'FRT-ORA',
    'price': egp('25.00'),
    'unit': 'kg',
    'step': 0.5,
    'image_url': zadPhoto('oranges'),
    'in_stock': true,
  },
  {
    'id': 3,
    'name': 'Egyptian rice, 1 kg',
    'sku': 'PAN-RIC',
    'barcode': '6221034500127',
    'price': egp('38.00'),
    'image_url': zadPhoto('egyptian-rice'),
    'in_stock': false,
  },
  {
    'id': 4,
    'name': 'Eggs, 30',
    'sku': 'DAI-EGG',
    'barcode': '6224008211306',
    'price': egp('165.00'),
    'stock': 40,
    'image_url': zadPhoto('eggs'),
    'in_stock': true,
  },
  {
    'id': 5,
    'name': 'Mineral water, 1.5 l',
    'sku': 'DRK-WAT',
    'price': egp('8.00'),
    'image_url': zadPhoto('mineral-water'),
    'in_stock': true,
  },
  {
    'id': 77,
    'name': 'Short-grain rice, 1 kg',
    'sku': 'PAN-SGR',
    'price': egp('36.00'),
    'image_url': zadPhoto('vermicelli-rice'),
    'in_stock': true,
  },
];

/// Zad Market's vendor app: Samir, a picker unless [role] says otherwise.
FakeApi zadVendorApi({String role = 'manager'}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'site': {...(configJson(lms: null)['site'] as Map), 'name': 'Zad'},
      // Zad's look A: deep green and amber, Plus Jakarta Sans.
      'appearance': appearanceJson(
        themeMode: 'light',
        secondaryColor: '#F2A93B',
        font: 'Plus Jakarta Sans',
      ),
      'languages': {
        'available': ['en', 'ar', 'tr'],
        'default': 'en',
      },
      'branding': {
        'logo_url': null,
        'primary_color': '#1B644C',
        'secondary_color': '#F2A93B',
      },
      'market': {
        'currency': 'EGP',
        'kinds': ['grocery'],
        'payment': {'cash': true, 'card': true},
        'vendor_app': 'bundle',
        'weight_tolerance_percent': 10,
      },
    },
  );
  api.me = userJson()
    ..['name'] = 'Samir Fathy'
    ..['roles'] = ['vendor'];
  api.vendorDesk
    ..['name'] = 'Zad Market'
    ..['kind'] = 'grocery'
    ..['role'] = role
    ..['prep_minutes'] = 20
    ..['today'] = {
      'orders': 38,
      'sales': egp('14820.00')..['formatted'] = 'EGP 14,820',
      'new_orders': 2,
    };
  return api;
}

/// The vendor app, signed in, on [api].
TestApp zadVendorApp(
  FakeApi api, {
  String lang = 'en',
  bool dark = false,
  Map<String, Object> preferences = const {},
  Widget Function(Widget app)? wrap,
}) => TestApp(
  api: api,
  wrap: wrap,
  appType: AppType.food,
  build: (b) => b.copyWith(role: AppRole.vendor, appName: 'Zad Partner'),
  signedIn: true,
  preferences: {
    'settings.language': lang,
    'settings.theme_mode': dark ? 'dark' : 'light',
    ...preferences,
  },
);
