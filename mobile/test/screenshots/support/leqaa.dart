import 'dart:convert';
import 'dart:io';

import 'package:yallapp/modules/store/data/cart_controller.dart';

import 'demo_api.dart';
import 'studio_demo.dart';

/// 131.20 Leqaa, the flower shop, as its app is (the platform's
/// lib/demo/flowers.ts): its bouquets and add-ons with their photos
/// (platform/web/public/flower-photos) in Egyptian pounds, its collections
/// and occasions, a bouquet in its three sizes (Deluxe chosen), and a cart;
/// 131 its commerce as the platform serves it: the gift checkout with its
/// days and slots after the 4 pm cut-off, Greater Cairo priced by the
/// distance, the card messages by occasion, its flash sale and its code
/// shown in the app. Each in the shop's language for the language asked
/// (an Arabic shop's in Modern Standard Arabic, a Turkish one's in
/// Turkish); on its demo (test/support/leqaa_demo.json) or one of its two
/// Signature looks (test/support/signatures/flowers_a.json and _b.json).

/// The photos Leqaa's products show, by product (the chocolate box and the
/// card have none: no fitting free photo).
const _photos = {
  101: 'blush-bouquet',
  102: 'red-rose',
  103: 'tulips',
  104: 'ranunculus',
  105: 'white-lilies',
  106: 'sunshine',
  107: 'baby-breath',
  108: 'orchid',
  109: 'sunflowers',
  110: 'garden-jug',
  201: 'ceramic-vase',
};

/// The paths of the photos the products show, for [StudioDemo.prepare].
final leqaaPhotoPaths = [
  for (final name in {..._photos.values, 'atelier', 'stems'})
    '/flower-photos/$name.jpg',
];

/// The products' names in the shop's three languages.
const _names = {
  101: ('Blush Garden', 'حديقة الورد', 'Pembe Bahçe'),
  102: ('Velvet Red Roses', 'ورود حمراء مخملية', 'Kadife Kırmızı Güller'),
  103: ('Morning Tulips', 'توليب الصباح', 'Sabah Laleleri'),
  104: ('Ranunculus Cloud', 'غيمة الحوذان', 'Düğünçiçeği Bulutu'),
  105: ('White Serenity', 'سكينة بيضاء', 'Beyaz Huzur'),
  106: ('Little Sunshine', 'شمس صغيرة', 'Küçük Güneş'),
  107: ('Blue Cloud', 'غيمة زرقاء', 'Mavi Bulut'),
  108: ('Orchid Elegance', 'أناقة الأوركيد', 'Orkide Zarafeti'),
  109: ('Sunflower Field', 'حقل دوّار الشمس', 'Ayçiçeği Tarlası'),
  110: ('Garden Jug', 'إبريق الحديقة', 'Bahçe Testisi'),
  201: ('Ceramic Vase', 'مزهرية خزفية', 'Seramik Vazo'),
  202: ('Chocolate Box', 'علبة شوكولاتة', 'Çikolata Kutusu'),
  203: ('Greeting Card', 'بطاقة تهنئة', 'Tebrik Kartı'),
};

String _pick((String, String, String) t, String lang) => switch (lang) {
  'ar' => t.$2,
  'tr' => t.$3,
  _ => t.$1,
};

/// E£ 1,450 in English and Turkish, 1,450 ج.م in Arabic.
String _egp(int pounds, String lang) {
  final digits = pounds.toString();
  final grouped = digits.length > 3
      ? '${digits.substring(0, digits.length - 3)},${digits.substring(digits.length - 3)}'
      : digits;
  return lang == 'ar' ? '$grouped ج.م' : 'E£ $grouped';
}

Map<String, dynamic> _money(int now, String lang, {int? was}) => {
  'amount': '$now.00',
  'regular_amount': was == null ? null : '$was.00',
  'regular_formatted': was == null ? null : _egp(was, lang),
  'currency': 'EGP',
  'formatted': _egp(now, lang),
  'on_sale': was != null,
  'range': false,
};

/// The flash sale on now: Blush Garden a quarter off, 2:14:36 left, 12
/// bouquets at that price and 4 left (lib/demo/flowers.ts).
final _saleEnds = DateTime.now().toUtc().add(
  const Duration(hours: 2, minutes: 14, seconds: 36),
);

Map<String, dynamic> _sale(int was, int now, String lang) => {
  'was': '$was.00',
  'was_formatted': _egp(was, lang),
  'now': '$now.00',
  'now_formatted': _egp(now, lang),
  'percent_off': ((was - now) * 100 / was).round(),
  'starts_at': null,
  'ends_at': _saleEnds.toIso8601String(),
  'remaining': 4,
  'total': 12,
  'flash_sale_id': 7,
};

/// The bouquet in the flash sale: (id, was, now).
const _onSale = [(101, 1450, 1088)];

Map<String, dynamic> _product(
  String base,
  int id,
  int pounds,
  String lang, {
  int? was,
}) => {
  'id': id,
  'name': _pick(_names[id]!, lang),
  'type': 'simple',
  'image_url': _photos[id] == null
      ? null
      : '$base/flower-photos/${_photos[id]}.jpg',
  'price': _money(pounds, lang, was: was),
  'rating': null,
  'rating_count': 0,
  'stock_status': 'in_stock',
  'purchasable': true,
  'digital': false,
  if (_onSale.where((o) => o.$1 == id).firstOrNull case (_, final w, final n))
    'sale': _sale(w, n, lang),
};

/// Leqaa's products as the shop lists them.
List<Map<String, dynamic>> leqaaProducts(String base, {String lang = 'en'}) => [
  _product(base, 101, 1088, lang, was: 1450),
  _product(base, 102, 1590, lang, was: 1850),
  _product(base, 104, 2400, lang),
  _product(base, 110, 2900, lang),
  _product(base, 108, 2200, lang),
  _product(base, 103, 1100, lang),
  _product(base, 109, 850, lang, was: 980),
  _product(base, 105, 1650, lang),
  _product(base, 106, 950, lang),
  _product(base, 107, 1750, lang),
];

List<Map<String, dynamic>> _categories(String base, String lang) => [
  for (final (i, (name, photo)) in [
    (
      ('Signature bouquets', 'الباقات المميّزة', 'İmza buketler'),
      'blush-bouquet',
    ),
    (('Roses', 'الورود', 'Güller'), 'red-rose'),
    (('In season', 'زهور الموسم', 'Mevsiminde'), 'ranunculus'),
    (('Plants', 'النباتات', 'Bitkiler'), 'orchid'),
    (('Gift sets', 'مجموعات الهدايا', 'Hediye setleri'), 'garden-jug'),
  ].indexed)
    {
      'id': 30 + i,
      'name': _pick(name, lang),
      'parent_id': null,
      'count': 4,
      'image_url': '$base/flower-photos/$photo.jpg',
    },
];

/// The three sizes, as the catalog's variations name them.
const _sizes = [
  ('Classic · 12 stems', 'كلاسيكي · 12 ساقًا', 'Klasik · 12 sap'),
  ('Deluxe · 24 stems', 'فاخر · 24 ساقًا', 'Lüks · 24 sap'),
  ('Grand · 36 stems', 'كبير · 36 ساقًا', 'Büyük · 36 sap'),
];

/// Blush Garden as its page shows it: its photos and its three sizes (its
/// variations, each with its price), Deluxe chosen when it opens, as the
/// platform's catalog serves a bouquet (lib/demo/flowers.ts).
Map<String, dynamic> leqaaBouquet(String base, {String lang = 'en'}) {
  final sizes = [for (final s in _sizes) _pick(s, lang)];
  return {
    ...leqaaProducts(base, lang: lang).first,
    'type': 'variable',
    'price': {
      ..._money(1088, lang, was: 1450),
      'formatted': '${_egp(1088, lang)} – ${_egp(2025, lang)}',
      'range': true,
    },
    'description_html': switch (lang) {
      'ar' =>
        '<p>ورد وردي وليزيانثوس وأوكالبتوس، تُصنع في يوم توصيلها وتُلفّ '
            'بورقنا الوردي وشريط من الحرير.</p>'
            '<p>الكلاسيكي ١٢ ساقًا، والفاخر ٢٤، والكبير ٣٦.</p>',
      'tr' =>
        '<p>Pembe güller, lisianthus ve okaliptüs; teslim edildiği gün '
            'hazırlanır, pembe kâğıdımıza ve ipek kurdeleye sarılır.</p>'
            '<p>Klasik 12 sap, Lüks 24, Büyük 36.</p>',
      _ =>
        '<p>Blush roses, lisianthus and eucalyptus, made on the day it is '
            'delivered and wrapped in our blush paper with a silk ribbon.</p>'
            '<p>Classic has 12 stems, Deluxe 24 and Grand 36.</p>',
    },
    'short_description_html': switch (lang) {
      'ar' => '<p>ورد وردي وليزيانثوس وأوكالبتوس.</p>',
      'tr' => '<p>Pembe güller, lisianthus ve okaliptüs.</p>',
      _ => '<p>Blush roses, lisianthus and eucalyptus.</p>',
    },
    'images': [
      for (final photo in ['blush-bouquet', 'ranunculus', 'atelier'])
        {'url': '$base/flower-photos/$photo.jpg', 'alt': null},
    ],
    'sku': 'LQ-101',
    'max_quantity': 5,
    'attributes': [
      {
        'slug': 'a1',
        'name': switch (lang) {
          'ar' => 'الحجم',
          'tr' => 'Boyut',
          _ => 'Size',
        },
        'variation': true,
        'options': [
          for (final s in sizes) {'value': s, 'label': s},
        ],
      },
    ],
    'variations': [
      for (final (i, (pounds, was)) in [
        (1088, 1450),
        (1575, 2100),
        (2025, 2700),
      ].indexed)
        {
          'id': 1 + i,
          'attributes': {'a1': sizes[i]},
          'price': _money(pounds, lang, was: was),
          'image_url': null,
          'stock_status': 'in_stock',
          'max_quantity': 5,
          'purchasable': true,
        },
    ],
    'default_attributes': {'a1': sizes[1]},
    'categories': [_categories(base, lang).first],
    'related': leqaaProducts(base, lang: lang).skip(1).take(3).toList(),
    'external_url': null,
    'permalink': 'https://leqaa.example/bouquets/blush-garden',
  };
}

/// What the cart holds: Blush Garden (Deluxe), a card and chocolates.
const _cartLines = [(101, 1575, 2), (203, 60, null), (202, 320, null)];

/// The cart as the phone keeps it.
String leqaaCart(String base, {String lang = 'en'}) => jsonEncode([
  for (final (id, pounds, variation) in _cartLines)
    {
      'product_id': id,
      'variation_id': variation,
      'quantity': 1,
      'name': _pick(_names[id]!, lang),
      'attributes': {if (variation != null) 'a1': _pick(_sizes[1], lang)},
      'image_url': _photos[id] == null
          ? null
          : '$base/flower-photos/${_photos[id]}.jpg',
      'price': _egp(pounds, lang),
      'max_quantity': 5,
    },
]);

Map<String, dynamic> _quote(String base, String lang) {
  String t(String en, String ar, String tr) => _pick((en, ar, tr), lang);
  return {
    'lines': [
      for (final (id, pounds, variation) in _cartLines)
        {
          'product_id': id,
          'variation_id': variation,
          'quantity': 1,
          'name': _pick(_names[id]!, lang),
          'image_url': _photos[id] == null
              ? null
              : '$base/flower-photos/${_photos[id]}.jpg',
          'unit_price': _egp(pounds, lang),
          'line_total': _egp(pounds, lang),
          'available': true,
          'problem': null,
          'max_quantity': 5,
          'digital': false,
        },
    ],
    'item_count': 3,
    'subtotal': _egp(1955, lang),
    'subtotal_amount': '1955.00',
    'currency': 'EGP',
    'shipping': _egp(95, lang),
    'delivery_zone': t('Cairo', 'القاهرة', 'Kahire'),
    'shipping_breakdown': [
      {
        'label': t('Base fee', 'الرسوم الأساسية', 'Temel ücret'),
        'formatted': _egp(60, lang),
      },
      {
        'label': t('Distance · 7 km', 'المسافة · 7 كم', 'Mesafe · 7 km'),
        'formatted': _egp(35, lang),
      },
    ],
    'total': _egp(2050, lang),
    // Yallapp's own checkout knows the whole total.
    'total_final': true,
  };
}

/// The four slots: (id, label, fee).
const _slots = [
  ('s1', '10:00–13:00', null),
  ('s2', '13:00–16:00', null),
  ('s3', '16:00–19:00', 50),
  ('s4', '19:00–22:00', 80),
];

/// 131 The shop's commerce as the platform serves it (`StoreConfig`): the
/// gift checkout, the days and slots, the card, Greater Cairo.
Map<String, dynamic> _storeExtras(String lang) => {
  'checkout_mode': 'gift',
  'delivery_date': {
    'enabled': true,
    'required': true,
    'min_days': 0,
    'max_days': 14,
    'closed_weekdays': <int>[],
    'timezone': 'Africa/Cairo',
    'same_day_cutoff': '16:00',
    'slots': [
      for (final (id, label, fee) in _slots)
        {
          'id': id,
          'start': label.substring(0, 5),
          'end': label.substring(6),
          'label': label,
          if (fee != null) 'fee': '$fee.00',
          if (fee != null) 'fee_formatted': _egp(fee, lang),
        },
    ],
  },
  'gift_message': {
    'enabled': true,
    'max_length': 300,
    'starters': <String>[],
    'recipient': true,
    'anonymous': true,
  },
  'shipping': {
    'countries': [
      {
        'code': 'EG',
        'names': {'en': 'Egypt', 'ar': 'مصر', 'tr': 'Mısır'},
        'cities': [
          for (final c in [
            ('Cairo', 'القاهرة', 'Kahire'),
            ('Giza', 'الجيزة', 'Giza'),
            ('New Cairo', 'القاهرة الجديدة', 'Yeni Kahire'),
          ])
            _pick(c, lang),
        ],
      },
    ],
    'needs_location': true,
    'charged': true,
    'free_over_formatted': _egp(2500, lang),
  },
};

/// 131.5 The card messages by occasion (the store's starters).
List<Map<String, dynamic>> _occasions(String lang) {
  String t(String en, String ar, String tr) => _pick((en, ar, tr), lang);
  return [
    {
      'id': 'love',
      'name': t('Love & romance', 'حب ورومانسية', 'Aşk'),
      'icon': 'favorite',
      'templates': [
        {
          'id': 't1',
          'text': t(
            'Every day with you is my favourite.',
            'كل يوم معك هو يومي المفضّل.',
            'Seninle her gün en sevdiğim gün.',
          ),
        },
      ],
    },
    {
      'id': 'birthday',
      'name': t('Birthday', 'عيد ميلاد', 'Doğum günü'),
      'icon': 'cake',
      'templates': [
        {
          'id': 't1',
          'text': t(
            'Happy birthday! May this year bloom like these flowers.',
            'عيد ميلاد سعيد! عسى أن يزهر عامك كهذه الزهور.',
            'Doğum günün kutlu olsun! Bu yıl bu çiçekler gibi açsın.',
          ),
        },
        {
          'id': 't2',
          'text': t(
            'Another year, another reason to celebrate you.',
            'عام جديد وسبب آخر للاحتفال بك.',
            'Yeni bir yıl, seni kutlamak için yeni bir neden.',
          ),
        },
      ],
    },
    {
      'id': 'new_baby',
      'name': t('New baby', 'مولود جديد', 'Yeni bebek'),
      'icon': 'child_care',
      'templates': [
        {
          'id': 't1',
          'text': t(
            'Welcome to the world, little one.',
            'أهلًا بك في الدنيا يا صغيري.',
            'Dünyaya hoş geldin minik.',
          ),
        },
      ],
    },
    {
      'id': 'sympathy',
      'name': t('Sympathy', 'مواساة', 'Taziye'),
      'icon': 'spa',
      'templates': [
        {
          'id': 't1',
          'text': t('Thinking of you.', 'قلوبنا معك.', 'Aklımız sende.'),
        },
      ],
    },
  ];
}

/// Leqaa's app on [look], in [lang], with its shop and its commerce.
DemoApi leqaaStudioApi({
  required StudioDemo look,
  String primaryColor = '#8E2445',
  String lang = 'en',
}) {
  final base = look.base;
  final products = leqaaProducts(base, lang: lang);
  final api = DemoApi.leqaa()
    ..shopProducts = products
    ..shopCategories = _categories(base, lang)
    ..product = leqaaBouquet(base, lang: lang)
    ..cartQuote = _quote(base, lang)
    ..deliverySlotsJson = [
      for (final (id, label, fee) in _slots)
        {
          'id': id,
          'start': label.substring(0, 5),
          'end': label.substring(6),
          'label': label,
          if (fee != null) 'fee_formatted': _egp(fee, lang),
          // The morning's taken already.
          'available': id != 's1',
          'full': id == 's1',
          if (id == 's1') 'remaining': 0,
        },
    ]
    ..giftOccasions = _occasions(lang);
  api.config = {
    ...api.config,
    'store': {
      ...(api.config['store'] as Map<String, dynamic>),
      ..._storeExtras(lang),
    },
  };
  Map<String, dynamic> item(Map<String, dynamic> p) => {
    'source': 'products',
    'id': '${p['id']}',
    'title': p['name'],
    'subtitle': null,
    'image_url': p['image_url'],
    'price_label': (p['price'] as Map)['formatted'],
    'badge': null,
    'sale': ?p['sale'],
    'action': {
      'type': 'item',
      'item': {'source': 'products', 'id': '${p['id']}'},
    },
  };
  return look.apply(
    api,
    appName: lang == 'ar' ? 'لقاء' : 'Leqaa',
    primaryColor: primaryColor,
    items: {
      'products': [for (final p in products) item(p)],
    },
    flashSale: {
      'flash': {
        'id': 7,
        'title': _pick(('Blush hour', 'ساعة الورد', 'Pembe saat'), lang),
        'starts_at': null,
        'ends_at': _saleEnds.toIso8601String(),
        'percent_off': 25,
        'remaining': 4,
        'total': 12,
      },
      'items': [
        for (final (id, _, _) in _onSale)
          item(products.firstWhere((p) => p['id'] == id)),
      ],
    },
    couponOffer: {
      'code': 'LEQAA10',
      'percent_off': 10,
      'min_order_formatted': _egp(1000, lang),
      'ends_at': null,
    },
  );
}

/// The phone's cart, for the cart's page.
Map<String, Object> leqaaCartPreferences(
  StudioDemo look, {
  String lang = 'en',
}) => {CartController.storageKey: leqaaCart(look.base, lang: lang)};

/// The demo, as the platform made it (test/support/leqaa_demo.json).
StudioDemo get leqaaDemo => StudioDemo.file('leqaa_demo.json');

/// Whether the photos are there (public/flower-photos).
bool get leqaaPhotosReady =>
    File('../platform/web/public/flower-photos/blush-bouquet.jpg').existsSync();
