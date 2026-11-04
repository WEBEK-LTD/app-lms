import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/http_client.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';
import 'package:yallapp/core/auth/token_manager.dart';
import 'package:yallapp/core/auth/token_store.dart';
import 'package:yallapp/core/config/build_config_data.dart';

/// 115 The marketplace's side of the contract (docs/api/openapi.yaml, the
/// Market tag): what the app reads, and what it asks for.

Map<String, dynamic> money(String amount, [String currency = 'EGP']) => {
  'amount': amount,
  'formatted': '$currency $amount',
};

Map<String, dynamic> vendorJson({int id = 7, String kind = 'restaurant'}) => {
  'id': id,
  'kind': kind,
  'name': 'Abou Tarek',
  'logo_url': null,
  'cover_url': 'https://x.test/cover.jpg',
  'categories': ['grills'],
  'rating': 4.6,
  'ratings_count': 2400,
  'open': true,
  'opens_at': null,
  'busy': false,
  'delivery_by': 'vendor',
  'delivery_minutes': {'min': 20, 'max': 30},
  'delivery_fee': money('0.00'),
  'free_delivery_over': null,
  'min_order': money('150.00'),
  'distance_km': 1.2,
  'delivers': true,
  'pickup': true,
  'scheduling': false,
  'offer': '20% off grills',
  'club_benefit': 'Free delivery',
};

Map<String, dynamic> productJson({int id = 1, String unit = 'item'}) => {
  'id': id,
  'name': 'Mixed grill',
  'description': null,
  'image_url': null,
  'brand': null,
  'price': money('265.00'),
  'was_price': money('320.00'),
  'unit': unit,
  'step': unit == 'kg' ? 0.25 : 1,
  'max_quantity': null,
  'in_stock': true,
  'choices': [
    {
      'id': 3,
      'name': 'Size',
      'min': 1,
      'max': 1,
      'choices': [
        {
          'id': 4,
          'name': 'Large',
          'extra': '30.00',
          'extra_formatted': '+EGP 30.00',
          'available': true,
        },
      ],
    },
  ],
  'tags': ['popular', 'spicy'],
};

class _Server implements HttpClientAdapter {
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final path = options.path;
    final Object body;
    if (path.endsWith('/market/vendors')) {
      body = {
        'items': [vendorJson()],
        'page': 1,
        'per_page': 20,
        'total': 1,
        'total_pages': 1,
      };
    } else if (path.endsWith('/products')) {
      body = {
        'items': [productJson(unit: 'kg')],
        'page': 1,
        'per_page': 40,
        'total': 1,
        'total_pages': 1,
      };
    } else if (path.endsWith('/market/offers')) {
      body = {
        'items': [
          {
            'id': 1,
            'title': 'Free delivery this weekend',
            'description': null,
            'code': null,
            'vendor_id': null,
            'kind': 'free_delivery',
            'value': null,
            'min_order': null,
            'ends_at': '2026-11-09T21:59:59Z',
            'first_order_only': false,
          },
        ],
      };
    } else if (path.endsWith('/market/search')) {
      body = {
        'vendors': [vendorJson()],
        'items': [
          {'vendor': vendorJson(), 'product': productJson()},
        ],
      };
    } else {
      body = {
        ...vendorJson(kind: 'grocery'),
        'description': 'Fresh every morning.',
        'area': 'Maadi',
        'hours': [
          {'day': 'mon', 'opens': '08:00', 'closes': '23:00'},
        ],
        'quantity': {'min_items': null, 'max_items': 50},
        'tax_rate_percent': null,
        'sections': <Object>[],
        'departments': [
          {
            'id': 2,
            'name': 'Fruit & vegetables',
            'image_url': null,
            'aisles': [
              {'id': 5, 'name': 'Fresh fruit'},
            ],
          },
        ],
        'offers': <Object>[],
      };
    }
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  test('Config.market: kinds, categories, payment and the club', () {
    final config = MarketConfig.fromJson({
      'country': 'EG',
      'currency': 'EGP',
      'currency_decimals': 2,
      'timezone': 'Africa/Cairo',
      'kinds': ['restaurant', 'grocery', 'later_kind'],
      'categories': [
        {
          'id': 'grills',
          'name': 'Grills',
          'kind': 'restaurant',
          'image_url': null,
        },
      ],
      'payment': {
        'cash': true,
        'card': true,
        'apple_pay': true,
        'google_pay': false,
        'wallet': true,
        'cash_max': '2000.00',
      },
      'tax': {'label': 'VAT', 'included': false},
      'pickup': true,
      'scheduling': {'enabled': true, 'days_ahead': 3},
      'club': true,
      'wallet': true,
      'weight_tolerance_percent': 10,
      'courier_app': 'bundle',
      'vendor_app': 'bundle',
      'map': {
        'tiles_url': null,
        'attribution': null,
        'search': false,
        'routes': false,
      },
    });
    expect(config.kinds, [VendorKind.restaurant, VendorKind.grocery]);
    expect(config.category('grills')!.name, 'Grills');
    expect(config.payment.applePay, isTrue);
    expect(config.payment.cashMax, '2000.00');
    expect(config.taxIncluded, isFalse);
    expect(config.scheduling, isTrue);
    expect(config.daysAhead, 3);
    expect(config.club, isTrue);
    expect(config.vendorAppBundled, isTrue);
  });

  test('a vendor: no contact, how it delivers, free delivery', () {
    final v = MarketVendorSummary.fromJson(vendorJson());
    expect(v.deliveryBy, VendorDelivery.vendor);
    expect(v.deliveryMinutes, (min: 20, max: 30));
    expect(v.freeDelivery, isTrue);
    expect(v.minOrder!.formatted, 'EGP 150.00');
    expect(v.clubBenefit, 'Free delivery');
    // Without the customer's position the times and fee are unknown.
    final far = MarketVendorSummary.fromJson({
      ...vendorJson(),
      'delivery_minutes': null,
      'delivery_fee': null,
    });
    expect(far.deliveryMinutes, isNull);
    expect(far.freeDelivery, isFalse);
  });

  test('a product by weight, with choices and tags', () {
    final p = MarketProduct.fromJson(productJson(unit: 'kg'));
    expect(p.byWeight, isTrue);
    expect(p.step, 0.25);
    expect(p.wasPrice!.formatted, 'EGP 320.00');
    expect(p.choices.single.choices.single.extraFormatted, '+EGP 30.00');
    expect(p.tags, ['popular', 'spicy']);
  });

  group('the HTTP client', () {
    late _Server server;
    late HttpYallappApi api;

    setUp(() {
      server = _Server();
      api = HttpYallappApi(
        dio: createHttpClient(
          baseUrl: 'https://x.test/api/v1',
          tokens: TokenManager(
            store: MemoryTokenStore(null),
            refresh: (_) async => throw UnimplementedError(),
          ),
          adapter: server,
        ),
        refreshDio: Dio(),
        platform: DevicePlatform.android,
        appVersion: '1.0.0',
        appType: AppType.food,
      );
    });

    test('vendors with their filters', () async {
      final page = await api.listMarketVendors(
        const MarketVendorQuery(
          kind: VendorKind.grocery,
          category: 'fruit',
          query: '  apples ',
          sort: MarketVendorSort.deliveryTime,
          freeDelivery: true,
          lat: 30.0,
          lng: 31.2,
        ),
      );
      expect(page.items.single.name, 'Abou Tarek');
      final q = server.requests.single.queryParameters;
      expect(server.requests.single.path, endsWith('/market/vendors'));
      expect(q['kind'], 'grocery');
      expect(q['category'], 'fruit');
      expect(q['q'], 'apples');
      expect(q['sort'], 'delivery_time');
      expect(q['free_delivery'], true);
      expect(q.containsKey('offers'), isFalse);
      expect(q['lat'], 30.0);
    });

    test(
      'a shop page, its products by department, search and offers',
      () async {
        final shop = await api.getMarketVendor(9);
        expect(shop.summary.kind, VendorKind.grocery);
        expect(shop.departments.single.aisles.single.name, 'Fresh fruit');
        expect(shop.maxItems, 50);
        expect(shop.area, 'Maadi');

        final products = await api.listMarketProducts(9, department: 2);
        expect(products.items.single.unit, ProductUnit.kg);
        expect(
          server.requests.last.path,
          endsWith('/market/vendors/9/products'),
        );
        expect(server.requests.last.queryParameters['department'], 2);

        final found = await api.searchMarket('grill');
        expect(found.items.single.product.name, 'Mixed grill');

        final offers = await api.listMarketOffers();
        expect(offers.single.kind, MarketCouponKind.freeDelivery);
        expect(offers.single.vendorId, isNull);
      },
    );
  });
}
