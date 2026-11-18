/// 115.40 Zad Market as the approved designs of 18 November 2026 show it
/// (docs/design/2026-11-18-marketplace): its departments and aisles, its
/// offers, its products with the demo's real CC0 photos
/// (platform/web/public/demo-photos), a cart of weighed and unit items, and
/// an order being picked with a live substitute, then on its way weighed.
library;

import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:yallapp/core/api/models/market_api_models.dart' as api;
import 'package:yallapp/modules/market/data/market_basket.dart';
import 'package:yallapp/modules/market/data/market_models.dart';
import 'package:yallapp/modules/market/data/market_providers.dart';
import 'package:yallapp/modules/market/data/market_samples.dart';
import 'package:yallapp/modules/market/data/market_store.dart';

import 'market_order_fixtures.dart';

abstract final class ZadMarket {
  static const id = '3';

  /// The fixtures' words in Arabic (the screenshots in Arabic set it).
  static bool arabic = false;

  static String t(String en, String ar) => arabic ? ar : en;

  static String photo(String name) =>
      MarketSamples.picture('demo-photos/$name.jpg');

  static Map<String, dynamic> egp(String amount) => {
    'amount': amount,
    'formatted': 'EGP $amount',
  };

  /// The customer's place in Zamalek, as the app keeps it.
  static const place =
      '{"address":"14 Brazil Street, Zamalek","lat":30.0626,"lng":31.2197}';

  /// `Config.market` for the tests' API.
  static Map<String, dynamic> config() => {
    'country': 'EG',
    'currency': 'EGP',
    'currency_decimals': 2,
    'timezone': 'Africa/Cairo',
    'kinds': ['restaurant', 'grocery'],
    'payment': {'cash': true, 'card': true},
    'weight_tolerance_percent': 10,
    'pickup': true,
    'scheduling': true,
    'club': true,
    'wallet': true,
  };

  static MarketVendor get vendor => MarketVendor(
    id: id,
    kind: MarketVendorKind.grocery,
    name: t('Zad Market', 'زاد ماركت'),
    coverUrl: MarketSamples.picture('demo-photos/cover-market.jpg'),
    logoUrl: '',
    tags: [t('Supermarket', 'سوبر ماركت')],
    rating: 4.7,
    ratings: 2100,
    etaMin: 25,
    etaMax: 40,
    deliveryFee: 'EGP 25.00',
    minOrder: 'EGP 50.00',
    club: true,
    clubBenefit: 'Free with Club',
    distanceKm: 1.6,
    freeOver: 150,
    freeOverText: 'EGP 150.00',
  );

  static MarketItem kilo(
    String id,
    String name,
    double price, {
    required String picture,
    String? description,
    double step = 0.5,
    double? was,
    String? badge,
  }) => MarketItem(
    id: id,
    name: name,
    description: description,
    price: 'EGP ${price.toStringAsFixed(2)}',
    priceValue: price,
    oldPrice: was == null ? null : 'EGP ${was.toStringAsFixed(2)}',
    imageUrl: photo(picture),
    photos: [photo(picture)],
    unit: MarketUnit.kg,
    step: step,
    badge: badge,
    maxQuantity: 5,
  );

  static MarketItem piece(
    String id,
    String name,
    double price, {
    required String picture,
    String? description,
  }) => MarketItem(
    id: id,
    name: name,
    description: description,
    price: 'EGP ${price.toStringAsFixed(2)}',
    priceValue: price,
    imageUrl: photo(picture),
    photos: [photo(picture)],
  );

  static MarketItem get bananas => kilo(
    '32',
    t(t('Bananas', 'موز'), 'موز'),
    35,
    picture: 'bananas',
    description: t('Egyptian · about 6 a kilo', 'مصري · نحو 6 في الكيلو'),
  );
  static MarketItem get oranges => kilo(
    '33',
    t('Oranges', 'برتقال'),
    25,
    picture: 'oranges',
    description: t('Baladi, for juice', 'بلدي، للعصير'),
  );
  static MarketItem get tomatoes => kilo(
    '35',
    t('Tomatoes', 'طماطم'),
    18,
    picture: 'tomatoes',
    description: t('Red, firm', 'حمراء، متماسكة'),
    was: 22,
    badge: '−18%',
  );
  static MarketItem get potatoes => kilo(
    '39',
    t('Potatoes', 'بطاطس'),
    15,
    picture: 'potatoes',
    description: t('For frying and baking', 'للقلي والخَبز'),
  );
  static MarketItem get cheese => MarketItem(
    id: '41',
    name: t('White cheese', 'جبنة بيضاء'),
    price: 'EGP 160.00',
    priceValue: 160,
    imageUrl: photo('white-cheese'),
    photos: [photo('white-cheese'), photo('cheese'), photo('roumi-cheese')],
    unit: MarketUnit.kg,
    step: 0.25,
    minQuantity: 0.25,
    maxQuantity: 3,
  );
  static MarketItem get eggs30 => piece(
    '51',
    t(t('Eggs, 30', 'بيض، 30 بيضة'), 'بيض، 30 بيضة'),
    165,
    picture: 'eggs',
    description: t('White, medium', 'أبيض، وسط'),
  );
  static MarketItem get eggs15 =>
      piece('52', t('Eggs, 15', 'بيض، 15 بيضة'), 80, picture: 'eggs');
  static MarketItem get rice => piece(
    '61',
    t('Egyptian rice, 1 kg', 'أرز مصري، 1 كجم'),
    38,
    picture: 'egyptian-rice',
  );

  static MarketVendorPage get page => MarketVendorPage(
    vendor: vendor,
    currency: 'EGP',
    about: 'The neighbourhood supermarket: fruit and vegetables by the kilo.',
    address: 'Mohandessin',
    hours: '08:00–23:00',
    offers: [
      MarketOffer(
        id: 'fresh15',
        title: t('15% off fruit & veg', '15% على الفاكهة والخضار'),
        text: t('This week only', 'هذا الأسبوع فقط'),
        imageUrl: photo('oranges'),
        from: '#1B644C',
        to: '#134A36',
        code: 'FRESH15',
        vendorId: id,
      ),
      MarketOffer(
        id: 'croissants',
        title: t('−15% Butter croissants', '−15% كرواسون بالزبدة'),
        text: t('Fresh every morning', 'طازج كل صباح'),
        imageUrl: photo('croissants'),
        from: '#F2A93B',
        to: '#D9822B',
        vendorId: id,
      ),
    ],
    shelves: [
      MarketShelf(
        id: '1',
        name: t('Fruit & vegetables', 'فاكهة وخضار'),
        imageUrl: photo('tomatoes'),
        aisles: [
          MarketShelfAisle(id: '11', name: t('Fresh fruit', 'فاكهة طازجة')),
          MarketShelfAisle(id: '12', name: t('Vegetables', 'خضار')),
        ],
        items: [bananas, oranges, tomatoes, potatoes],
      ),
      MarketShelf(
        id: '2',
        name: t('Dairy & eggs', 'ألبان وبيض'),
        imageUrl: photo('dairy'),
        items: [cheese, eggs30],
      ),
      MarketShelf(
        id: '3',
        name: t('Bakery', 'مخبوزات'),
        imageUrl: photo('toast-bread'),
        items: const [],
      ),
      MarketShelf(
        id: '4',
        name: t('Pantry', 'البقالة'),
        imageUrl: photo('pantry'),
        items: [rice],
      ),
      MarketShelf(
        id: '5',
        name: t('Drinks', 'مشروبات'),
        imageUrl: photo('drinks'),
        items: const [],
      ),
    ],
  );

  /// A product as `GET /market/vendors/3/products` sends it.
  static Map<String, dynamic> productJson(
    MarketItem item, {
    required int department,
    int? aisle,
    String? barcode,
  }) => {
    'id': int.parse(item.id),
    'name': item.name,
    'description': item.description,
    'image_url': item.imageUrl,
    'images': item.photos,
    'brand': null,
    'price': egp(item.priceValue.toStringAsFixed(2)),
    'was_price': item.oldPrice == null
        ? null
        : egp(item.oldPrice!.replaceFirst('EGP ', '')),
    'unit': item.unit == MarketUnit.piece ? 'item' : 'kg',
    'step': item.step,
    'max_quantity': item.maxQuantity,
    'in_stock': true,
    'choices': const [],
    'tags': item.badge == null ? const [] : const ['popular'],
    'department_id': department,
    'aisle_id': aisle,
    'barcode': barcode,
    'sku': 'zad-${item.id}',
    'stock': 40,
    'sold_by': {
      'unit': item.unit == MarketUnit.piece ? 'unit' : 'weight',
      'step': item.step,
      'min': item.minQuantity ?? item.step,
      'max': item.maxQuantity,
    },
  };

  /// Nine products in two aisles of Fruit & vegetables, and the others.
  static List<Map<String, dynamic>> products() => [
    productJson(bananas, department: 1, aisle: 11),
    productJson(oranges, department: 1, aisle: 11),
    productJson(tomatoes, department: 1, aisle: 12),
    productJson(potatoes, department: 1, aisle: 12),
    productJson(
      kilo('34', t('Mangoes', 'مانجو'), 70, picture: 'mangoes'),
      department: 1,
      aisle: 11,
    ),
    productJson(
      kilo('31', t('Red apples', 'تفاح أحمر'), 90, picture: 'red-apples'),
      department: 1,
      aisle: 11,
    ),
    productJson(
      kilo('36', t('Cucumbers', 'خيار'), 20, picture: 'cucumbers'),
      department: 1,
      aisle: 12,
    ),
    productJson(
      kilo('37', t('Lemons', 'ليمون'), 40, picture: 'lemons', step: 0.25),
      department: 1,
      aisle: 12,
    ),
    productJson(
      kilo('38', t('Onions', 'بصل'), 12, picture: 'onions'),
      department: 1,
      aisle: 12,
    ),
    productJson(cheese, department: 2),
    productJson(eggs30, department: 2, barcode: '6221024000303'),
    productJson(eggs15, department: 2),
    productJson(rice, department: 4, barcode: '6223000123456'),
    productJson(
      piece(
        '62',
        t('Short-grain rice, 1 kg', 'أرز قصير الحبة، 1 كجم'),
        42,
        picture: 'egyptian-rice',
      ),
      department: 4,
    ),
  ];

  /// The cart of design 04: white cheese, bananas, eggs and rice.
  static MarketBasket basket() => MarketBasket(
    vendor: vendor,
    currency: 'EGP',
    lines: [
      MarketBasketLine(
        item: cheese,
        quantity: 0.75,
        note: t('sliced', 'شرائح'),
      ),
      MarketBasketLine(
        item: bananas,
        quantity: 1,
        ifMissing: api.MarketIfMissing.remove,
      ),
      MarketBasketLine(
        item: eggs30,
        quantity: 1,
        ifMissing: api.MarketIfMissing.chosen,
        substitute: eggs15,
      ),
      MarketBasketLine(item: rice, quantity: 2),
    ],
  );

  static Map<String, dynamic> _line(
    int id,
    int productId,
    String name,
    num quantity,
    String unit,
    String price,
    String estimate, {
    required String picture,
    String ifMissing = 'similar',
    String? outcome,
    num? picked,
    String? total,
    Map<String, dynamic>? substitute,
    Map<String, dynamic>? proposal,
  }) => {
    'id': id,
    'product_id': productId,
    'name': name,
    'image_url': photo(picture),
    'quantity': quantity,
    'unit': unit,
    'choices': const <String>[],
    'note': null,
    'unit_price': egp(price),
    'before_discount': null,
    'total': egp(total ?? estimate),
    'estimated_total': egp(estimate),
    'weighed_total': outcome == null ? null : egp(total ?? estimate),
    'if_missing': ifMissing,
    'outcome': outcome,
    'picked_quantity': picked,
    'substitute': substitute,
    'proposal': proposal,
  };

  static Map<String, dynamic> _vendorJson() => {
    ...marketVendorSummaryJson(id: 3, kind: 'grocery'),
    'name': t('Zad Market', 'زاد ماركت'),
    'categories': const <String>[],
    'delivery_minutes': {'min': 25, 'max': 40},
    'delivery_fee': egp('25.00'),
  };

  /// Order #4821 being picked: three lines done, the rice out and a
  /// similar one proposed, [left] to answer.
  static Map<String, dynamic> picking({
    Duration left = const Duration(minutes: 4, seconds: 32),
    DateTime? now,
  }) {
    final at = now ?? DateTime.now();
    return {
      ...marketOrderJson(id: 4821, status: 'picking'),
      'reference': '#4821',
      'vendor': _vendorJson(),
      'if_missing': 'similar',
      'estimated': true,
      'lines': [
        _line(
          1,
          61,
          t('Egyptian rice, 1 kg', 'أرز مصري، 1 كجم'),
          2,
          'item',
          '38.00',
          '76.00',
          picture: 'egyptian-rice',
          proposal: {
            'product_id': 62,
            'name': t('Short-grain rice, 1 kg', 'أرز قصير الحبة، 1 كجم'),
            'image_url': photo('egyptian-rice'),
            'quantity': 2,
            'total': egp('76.00'),
            'difference': egp('0.00'),
            'proposed_at': at
                .subtract(const Duration(minutes: 5))
                .add(left)
                .toUtc()
                .toIso8601String(),
            'expires_at': at.add(left).toUtc().toIso8601String(),
            'answer': null,
            'answered_by': null,
          },
        ),
        _line(
          2,
          41,
          t('White cheese, sliced', 'جبنة بيضاء، شرائح'),
          0.75,
          'kg',
          '160.00',
          '120.00',
          picture: 'white-cheese',
          outcome: 'picked',
          picked: 0.74,
          total: '118.40',
        ),
        _line(
          3,
          32,
          t(t('Bananas', 'موز'), 'موز'),
          1,
          'kg',
          '35.00',
          '35.00',
          picture: 'bananas',
          ifMissing: 'remove',
          outcome: 'picked',
          picked: 0.95,
          total: '33.25',
        ),
        _line(
          4,
          51,
          t(t('Eggs, 30', 'بيض، 30 بيضة'), 'بيض، 30 بيضة'),
          1,
          'item',
          '165.00',
          '165.00',
          picture: 'eggs',
          ifMissing: 'chosen',
          outcome: 'substituted',
          total: '160.00',
          substitute: {
            'product_id': 52,
            'name': t('Eggs, 15', 'بيض، 15 بيضة'),
            'quantity': 2,
            'total': egp('160.00'),
          },
        ),
      ],
      'eta': at.add(const Duration(minutes: 32)).toUtc().toIso8601String(),
      'created_at': at
          .subtract(const Duration(minutes: 12))
          .toUtc()
          .toIso8601String(),
      'timeline': [
        {
          'status': 'placed',
          'at': at
              .subtract(const Duration(minutes: 12))
              .toUtc()
              .toIso8601String(),
        },
        {
          'status': 'accepted',
          'at': at
              .subtract(const Duration(minutes: 10))
              .toUtc()
              .toIso8601String(),
        },
        {
          'status': 'picking',
          'at': at
              .subtract(const Duration(minutes: 10))
              .toUtc()
              .toIso8601String(),
        },
      ],
      'total': egp('396.00'),
      'payment': {'method': 'card', 'status': 'paid', 'wallet_used': null},
    };
  }

  /// Order #4821 on its way: weighed, the rice swapped as accepted.
  static Map<String, dynamic> onTheWay({String payment = 'card'}) {
    final at = DateTime.now();
    final order = picking(now: at);
    final lines = (order['lines'] as List).cast<Map<String, dynamic>>();
    lines[0] = {
      ...lines[0],
      'outcome': 'substituted',
      'total': egp('76.00'),
      'weighed_total': null,
      'substitute': {
        'product_id': 62,
        'name': t('Short-grain rice, 1 kg', 'أرز قصير الحبة، 1 كجم'),
        'quantity': 2,
        'total': egp('76.00'),
      },
      'proposal': {
        ...(lines[0]['proposal'] as Map<String, dynamic>),
        'answer': 'accepted',
        'answered_by': 'customer',
      },
    };
    return {
      ...order,
      'status': 'on_the_way',
      'estimated': false,
      'lines': lines,
      // 396 paid: 1.60, 1.75 and 5.00 less once weighed and swapped.
      'total': egp('387.65'),
      'price': [
        {
          'kind': 'items',
          'label': t('Items', 'الأصناف'),
          'amount': egp('387.65'),
        },
        {
          'kind': 'delivery',
          'label': t('Delivery', 'التوصيل'),
          'amount': egp('0.00'),
        },
        {
          'kind': 'total',
          'label': t('Total', 'الإجمالي'),
          'amount': egp('387.65'),
        },
      ],
      'payment': {'method': payment, 'status': 'paid', 'wallet_used': null},
      'timeline': [
        ...(order['timeline'] as List),
        {'status': 'ready', 'at': at.toUtc().toIso8601String()},
        {'status': 'on_the_way', 'at': at.toUtc().toIso8601String()},
      ],
      'tracking': {
        'mode': 'map',
        'courier': {
          'name': t('Karim', 'كريم'),
          'photo_url': null,
          'vehicle': t('Motorbike', 'دراجة نارية'),
        },
        'position': {'lat': 30.0548, 'lng': 31.2195},
        'updated_at': at.toUtc().toIso8601String(),
        'route': const [],
      },
    };
  }

  /// The quote of design 04's cart: free delivery with the Club.
  static Map<String, dynamic> quote() => {
    'quote_id': 'q_zad',
    'expires_at': DateTime.now()
        .add(const Duration(minutes: 15))
        .toUtc()
        .toIso8601String(),
    'lines': const [],
    'price': [
      {
        'kind': 'items',
        'label': t('Items, estimated', 'الأصناف، تقديريًا'),
        'amount': egp('396.00'),
      },
      {
        'kind': 'delivery',
        'label': t('Delivery', 'التوصيل'),
        'amount': egp('25.00'),
      },
      {'kind': 'club', 'label': t('Club', 'النادي'), 'amount': egp('-25.00')},
      {
        'kind': 'total',
        'label': t('Estimated total', 'الإجمالي التقديري'),
        'amount': egp('396.00'),
      },
    ],
    'total': egp('396.00'),
    'pay_now': egp('396.00'),
    'coupon': null,
    'delivery_minutes': {'min': 25, 'max': 40},
    'warnings': const <String>[],
  };

  /// Zad Market's page, its "Buy again", and (with [basket]) design 04's cart.
  static List<Override> overrides({bool basket = false}) => [
    marketVendorPageProvider.overrideWith((ref, vendorId) async => page),
    marketBuyAgainProvider.overrideWith(
      (ref, vendorId) async =>
          MarketBuyAgain(items: [eggs30, rice, bananas], orders: 4),
    ),
    if (basket) marketBasketProvider.overrideWith(_ZadBasket.new),
  ];
}

class _ZadBasket extends MarketBasketController {
  @override
  MarketBasket build() => ZadMarket.basket();
}
