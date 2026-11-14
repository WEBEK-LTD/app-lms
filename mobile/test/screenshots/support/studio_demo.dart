import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fixtures.dart';
import 'demo_api.dart';
import 'map_tiles.dart';

/// 124.7 One of Studio's demos as the platform makes it
/// (test/support/`<brand>_demo.json`, written by
/// platform/web/tests/unit/studio-demo-templates.test.ts): its Studio home,
/// the Studio pages around its screens, its tabs, its bar, its look and its
/// screens' settings, as the hosted API serves them. The website's pictures
/// of Sahm Express, Sofra Eats, Masar Rides, Lamha Taxi, Nakhla School and
/// Rawaq Academy draw the app from it, as the premium academy's do
/// (premium_academy.dart).
class StudioDemo {
  StudioDemo._(this._demo);

  factory StudioDemo._load(String file) => StudioDemo._(
    jsonDecode(File('test/support/$file').readAsStringSync())
        as Map<String, dynamic>,
  );

  static final sahm = StudioDemo._load('sahm_demo.json');
  static final sofra = StudioDemo._load('sofra_demo.json');
  static final masar = StudioDemo._load('masar_demo.json');
  static final lamha = StudioDemo._load('lamha_demo.json');
  static final nakhla = StudioDemo._load('nakhla_demo.json');
  static final rawaq = StudioDemo._load('rawaq_demo.json');
  // 128 Zad's whole project too: its photo-first home, its five tabs.
  static final zad = StudioDemo._load('zad_demo.json');
  static final safra = StudioDemo._load('safra_demo.json');
  // 130.13–130.18 The Signature looks of Nakhla School, Rawaq Academy and
  // Ufuq Academy: the projects their templates start
  // (platform/web/tests/unit/studio-signature-learn.test.ts).
  static final nakhlaSigA = StudioDemo._load('nakhla_sig_a.json');
  static final nakhlaSigB = StudioDemo._load('nakhla_sig_b.json');
  static final rawaqSigA = StudioDemo._load('rawaq_sig_a.json');
  static final rawaqSigB = StudioDemo._load('rawaq_sig_b.json');

  /// 130 One of a demo's Signature looks: the project its template starts
  /// (test/support/signatures/`<demo>_<look>.json`, written by
  /// platform/web/tests/unit/signature-looks.test.ts).
  static StudioDemo signature(String demo, String look) =>
      StudioDemo._load('signatures/${demo}_$look.json');

  // 130.1–130.6 The food, marketplace and delivery demos' Signature looks:
  // a project started from each (written by
  // platform/web/tests/unit/studio-signature-food.test.ts).
  static final sigSofraA = StudioDemo._load('sig_sofra_a.json');
  static final sigSofraB = StudioDemo._load('sig_sofra_b.json');
  static final sigZadA = StudioDemo._load('sig_zad_a.json');
  static final sigZadB = StudioDemo._load('sig_zad_b.json');
  static final sigSahmA = StudioDemo._load('sig_sahm_a.json');
  static final sigSahmB = StudioDemo._load('sig_sahm_b.json');

  final Map<String, dynamic> _demo;

  /// The language the demo's texts are served in, as the hosted API picks
  /// it from the app's language (lib/pages/translate.ts `translated`).
  static String language = 'en';

  /// [node]'s texts in [language], without its translations.
  static Map<String, dynamic> localized(Map<String, dynamic> node) {
    final out = {...node}..remove('translations');
    final texts = (node['translations'] as Map?)?[language] as Map?;
    if (texts == null) return out;
    for (final MapEntry(:key, :value) in texts.entries) {
      if (value is String && value.trim().isNotEmpty && out.containsKey(key)) {
        out[key as String] = value;
      }
    }
    return out;
  }

  Map<String, dynamic> get _layout => _demo['layout'] as Map<String, dynamic>;

  /// The demo's look (its template, colour, font, corners and cards).
  Map<String, dynamic> get appearance =>
      _layout['appearance'] as Map<String, dynamic>;

  /// Where the platform served the demo from (its pictures' addresses).
  String get base => RegExp(r'^https?://[^/]+')
      .firstMatch((_demo['screens'] as Map)['sign_in']['image_url'] as String)!
      .group(0)!;

  /// The address of one of the demo's drawn pictures
  /// (platform/web/public/design-pictures/art-[name].png).
  String picture(String name) => '$base/design-pictures/art-$name.png';

  /// 128 The address of one of Yallapp's photos the demo uses
  /// (platform/web/public/demo-photos/[name].jpg).
  String photo(String name) => '$base/demo-photos/$name.jpg';

  /// [json] with the screenshots' painted pictures (demo_images.dart) that
  /// the demo has drawn (a dish, a course) in its own drawings instead.
  T drawn<T>(T json) => _drawn(json) as T;

  Object? _drawn(Object? json) => switch (json) {
    final String url => switch (_painted.firstMatch(url)?.group(1)) {
      final String name
          when File('../platform/web/public/design-pictures/art-$name.png')
              .existsSync() =>
        picture(name),
      _ => url,
    },
    final Map<String, dynamic> map => <String, dynamic>{
      for (final MapEntry(:key, :value) in map.entries) key: _drawn(value),
    },
    final List<dynamic> list => <dynamic>[for (final v in list) _drawn(v)],
    _ => json,
  };

  static final _painted = RegExp(
    r'^https://demo\.yallapp\.test/img/(.+)\.png$',
  );

  /// [api] as the demo's app: its name and colour, its look, its screens'
  /// settings, its tabs and its pages, with each list on a Studio page
  /// filled from [items] (by the list's source, as many as it asks for).
  T apply<T extends DemoApi>(
    T api, {
    required String appName,
    required String primaryColor,
    Map<String, List<Map<String, dynamic>>> items = const {},
  }) {
    api.config = {
      ...api.config,
      'site': {
        ...(api.config['site'] as Map<String, dynamic>),
        'name': appName,
      },
      'branding': {'logo_url': null, 'primary_color': primaryColor},
      'appearance': appearance,
      'screens': _demo['screens'],
    };

    Map<String, dynamic> served(Map<String, dynamic> node) {
      final out = localized(node)..remove('query');
      if (node['type'] == 'items') {
        final q = node['query'] as Map<String, dynamic>;
        out['items'] = (items[node['source']] ?? const [])
            .take(q['limit'] as int)
            .toList();
      }
      if (node['children'] case final List children) {
        out['children'] = [
          for (final c in children) served(c as Map<String, dynamic>),
        ];
      }
      if (node['card'] case final Map<String, dynamic> card) {
        out['card'] = served(card);
      }
      return out;
    }

    final pages = (_layout['pages'] as List).cast<Map<String, dynamic>>();
    String? around(Map<String, dynamic> target) {
      if (target['type'] != 'page') return null;
      final page = pages.where((p) => p['slug'] == target['page_slug']).first;
      return (page['studio'] as Map?)?['screen'] as String?;
    }

    api.navigation = {
      'version': '1',
      'tabs': [
        for (final t
            in (_layout['tabs'] as List).cast<Map<String, dynamic>>().map(
              localized,
            ))
          {
            'id': t['id'],
            'label': t['label'],
            'icon': t['icon'],
            'target': switch (around(t['target'] as Map<String, dynamic>)) {
              final String s => {'type': 'screen', 'screen': s},
              null => t['target'],
            },
          },
      ],
      'more': <dynamic>[],
      'tab_bar': _layout['tab_bar'],
      'menu': <dynamic>[],
      'pages': [
        for (final p in pages)
          {
            'slug': p['slug'],
            'title': p['title'],
            'updated_at': p['updated_at'],
            'screen': ?(p['studio'] as Map?)?['screen'],
          },
      ],
    };
    api.pages = {
      for (final p in pages)
        p['slug'] as String: {
          'slug': p['slug'],
          'title': p['title'],
          'updated_at': p['updated_at'],
          'show_title': false,
          'blocks': <dynamic>[],
          if (p['studio'] case final Map<String, dynamic> studio)
            'studio': {
              ...studio,
              if (studio['header'] case final Map<String, dynamic> header)
                'header': localized(header),
              'body': served(studio['body'] as Map<String, dynamic>),
            },
        },
    };
    return api;
  }

  static final _pictures = <String, ui.Image>{};

  /// 128 Yallapp's photos (public/demo-photos, demo-screens, stories), by
  /// their path, read once.
  static final _photos = <String, ui.Image>{};
  static final _photoPath = RegExp(
    r'^https?://[^/]+(/(?:demo-photos|demo-screens|stories|travel-photos)/[^"]+\.jpg)$',
  );

  /// The paths of the photos [json] names.
  static Iterable<String> _photoPaths(Object? json) sync* {
    switch (json) {
      case final String url:
        if (_photoPath.firstMatch(url)?.group(1) case final path?) yield path;
      case final Map<String, dynamic> map:
        for (final v in map.values) {
          yield* _photoPaths(v);
        }
      case final List<dynamic> list:
        for (final v in list) {
          yield* _photoPaths(v);
        }
    }
  }

  /// Puts the demo's drawn pictures (platform/web/public/design-pictures)
  /// in the image cache at the addresses the demo serves them from; 128
  /// and the photos its pages show.
  Future<void> prepare(
    WidgetTester tester, [
    Iterable<String> extra = const [],
  ]) async {
    if (_pictures.isEmpty) {
      await tester.runAsync(() async {
        final folder = Directory('../platform/web/public/design-pictures');
        for (final file in folder.listSync().whereType<File>()) {
          final name = file.uri.pathSegments.last;
          if (!name.startsWith('art-') || !name.endsWith('.png')) continue;
          final codec = await ui.instantiateImageCodec(
            file.readAsBytesSync(),
            targetWidth: 600,
          );
          _pictures[name] = (await codec.getNextFrame()).image;
        }
      });
    }
    // 128 And the platform's own photos the demo shows (its pages', its
    // sign-in's, and those the screens' data name: [extra]), at the
    // screenshots' width, at the addresses the demo serves them from.
    final paths = {..._photoPaths(_demo), ...extra};
    await tester.runAsync(() async {
      for (final path in paths) {
        if (_photos.containsKey(path)) continue;
        final codec = await ui.instantiateImageCodec(
          File('../platform/web/public$path').readAsBytesSync(),
          targetWidth: 1080,
        );
        _photos[path] = (await codec.getNextFrame()).image;
      }
    });
    final cache = PaintingBinding.instance.imageCache
      ..maximumSizeBytes = 1 << 30
      ..maximumSize = 4000;
    for (final path in paths) {
      cache.putIfAbsent(
        NetworkImage('$base$path'),
        () => OneFrameImageStreamCompleter(
          SynchronousFuture(ImageInfo(image: _photos[path]!.clone())),
        ),
      );
    }
    for (final MapEntry(:key, :value) in _pictures.entries) {
      cache.putIfAbsent(
        NetworkImage('$base/design-pictures/$key'),
        () => OneFrameImageStreamCompleter(
          SynchronousFuture(ImageInfo(image: value.clone())),
        ),
      );
    }
  }
}

/// A list entry on a Studio page, as the hosted API fills it.
Map<String, dynamic> _item(
  String source,
  int id,
  String title,
  String? subtitle, {
  String? image,
  String? price,
  String? badge,
  double? rating,
  Map<String, dynamic>? action,
}) => {
  'source': source,
  'id': '$id',
  'title': title,
  'subtitle': subtitle,
  'image_url': image,
  'price_label': price,
  'badge': badge,
  'rating': ?rating,
  'action':
      action ??
      {
        'type': 'item',
        'item': {'source': source, 'id': '$id'},
      },
};

/// Sahm Express (Studio's delivery demo) as its app is: its three services
/// on its home, with their drawn pictures (lib/demo/content.ts).
/// 130.5–130.6 Or a project from one of its Signature looks ([look],
/// test/support/sig_sahm_a.json, sig_sahm_b.json).
DemoApi sahmStudioApi({bool courier = false, StudioDemo? look}) {
  final demo = look ?? StudioDemo.sahm;
  const source = 'delivery_services';
  return demo.apply(
    DemoApi.sahm(courier: courier),
    appName: 'Sahm Express',
    primaryColor: '#1F6FB2',
    items: {
      source: [
        _item(
          source,
          1,
          'Same day',
          '2 to 4 hours',
          image: demo.picture('service-sameday'),
        ),
        _item(
          source,
          2,
          'Express',
          'Within the hour',
          image: demo.picture('service-express'),
          badge: '+E£45.00',
        ),
        _item(
          source,
          3,
          'Documents',
          'Within 4 hours',
          image: demo.picture('service-documents'),
          badge: '+E£15.00',
        ),
      ],
    },
  );
}

/// 128 Sofra Eats (Studio's food delivery demo) as its app is: its three
/// kitchens in their real photos (lib/demo/content.ts), loved near you on
/// its home, and the demo number's kofta on its way from Sahara Grill with
/// Karim twelve minutes from Cairo Tower.
/// 130.1–130.2 Or a project from one of its Signature looks ([look],
/// test/support/sig_sofra_a.json, sig_sofra_b.json) in the look's main colour.
DemoApi sofraStudioApi({StudioDemo? look, String primaryColor = '#D2552B'}) {
  final demo = look ?? StudioDemo.sofra;
  const source = 'restaurants';
  final api = DemoApi.food();
  Map<String, dynamic> place(
    int id,
    String name,
    String logo,
    String cover,
    List<String> cuisines,
    int minutes,
    double rating,
    int count,
  ) => {
    ...restaurantSummaryJson(id: id, name: name),
    'logo_url': demo.photo(logo),
    'cover_url': demo.photo(cover),
    'cuisines': cuisines,
    'delivery_minutes': minutes,
    'delivery_fee_formatted': 'E£25.00',
    'rating': rating,
    'ratings_count': count,
  };
  Map<String, dynamic> dish(
    int id,
    String name,
    String text,
    String price,
    String photo, {
    bool popular = false,
  }) => {
    'id': id,
    'name': name,
    'description': text,
    'image_url': demo.photo(photo),
    'price': price,
    'price_formatted': 'E£$price',
    'available': true,
    'popular': popular,
    'choice_groups': <Object>[],
  };
  final grill = place(
    1,
    'Sahara Grill',
    'mixed-grill',
    'cover-grill',
    ['Grill'],
    35,
    4.6,
    1240,
  );
  Map<String, dynamic> line(
    int dish,
    String name,
    int quantity,
    List<String> choices,
    String unit,
    String total,
  ) => {
    'dish_id': dish,
    'name': name,
    'quantity': quantity,
    'choices': choices,
    'note': null,
    'unit_price': unit,
    'total': total,
    'total_formatted': 'E£$total',
  };
  api
    ..config = {
      ...api.config,
      'food': {
        ...(api.config['food'] as Map<String, dynamic>),
        'map': {'tiles_url': demoTilesUrl, 'attribution': null},
      },
    }
    ..restaurants = [
      grill,
      place(
        2,
        'Forno Zamalek',
        'margherita',
        'cover-pizza',
        ['Pizza', 'Desserts'],
        30,
        4.8,
        860,
      ),
      place(
        3,
        'Bayt El Koshary',
        'baladi-bread',
        'alexandrian-liver',
        ['Egyptian', 'Desserts'],
        25,
        4.7,
        2310,
      ),
    ]
    ..restaurantMenus = {
      1: {
        ...restaurantJson(),
        ...grill,
        'description': 'Kofta, shish tawook and mixed grills over charcoal, with tahini and salads.',
        'min_order': '100.00',
        'min_order_formatted': 'E£100.00',
        'menu': [
          {
            'id': 1,
            'name': 'Grills',
            'dishes': [
              dish(
                2,
                'Mixed grill',
                'Kofta, shish tawook and lamb chops, with rice and salads.',
                '240.00',
                'mixed-grill',
                popular: true,
              ),
              dish(
                3,
                'Kofta',
                'Half a kilo of charcoal kofta with grilled tomatoes and onions.',
                '190.00',
                'kofta',
                popular: true,
              ),
              dish(
                4,
                'Shish tawook',
                'Marinated chicken skewers with garlic sauce.',
                '150.00',
                'shish-tawook',
              ),
            ],
          },
          {
            'id': 5,
            'name': 'Sides',
            'dishes': [
              dish(
                6,
                'Baba ghanoush',
                'Smoked aubergine with olive oil.',
                '35.00',
                'baba-ghanoush',
              ),
              dish(7, 'Tahini', 'With lemon and cumin.', '25.00', 'tahini'),
            ],
          },
        ],
      },
    };
  api.foodOrders = [
    for (final o in api.foodOrders)
      {
        ...o,
        'restaurant': {
          ...(o['restaurant'] as Map<String, dynamic>),
          'name': 'Sahara Grill',
          'logo_url': demo.photo('mixed-grill'),
        },
        'lines': [
          line(3, 'Kofta', 1, ['Weight: Half a kilo'], '190.00', '190.00'),
          line(6, 'Baba ghanoush', 1, [], '35.00', '35.00'),
        ],
        'subtotal_formatted': 'E£225.00',
        'delivery_fee_formatted': 'E£25.00',
        'total': '250.00',
        'total_formatted': 'E£250.00',
        // Karim past Mohandessin, twelve minutes from Cairo Tower.
        'courier_location': {
          'lat': 30.042,
          'lng': 31.1745,
          'updated_at': '2026-10-28T10:12:00.000Z',
        },
      },
  ];
  return demo.apply(
    api,
    appName: 'Sofra Eats',
    primaryColor: primaryColor,
    items: {
      source: [
        _item(
          source,
          1,
          'Sahara Grill',
          'Grill',
          image: demo.photo('cover-grill'),
          badge: '★ 4.6',
        ),
        _item(
          source,
          2,
          'Forno Zamalek',
          'Pizza · Desserts',
          image: demo.photo('cover-pizza'),
          badge: '★ 4.8',
        ),
        _item(
          source,
          3,
          'Bayt El Koshary',
          'Egyptian · Desserts',
          image: demo.photo('alexandrian-liver'),
          badge: '★ 4.7',
        ),
      ],
    },
  );
}

/// The photos Sofra Eats's screens show besides its pages' (its kitchens'
/// covers and dishes).
/// 128.7 The photos of Rawaq Academy's popular courses its home shows.
const rawaqPhotos = [
  '/stories/academy/academy-desk.jpg',
  '/stories/academy/academy-live.jpg',
  '/stories/academy/academy-phone.jpg',
  '/stories/academy/academy-graduation.jpg',
];

const sofraPhotos = [
  '/demo-photos/mixed-grill.jpg',
  '/demo-photos/margherita.jpg',
  '/demo-photos/baladi-bread.jpg',
  '/demo-photos/cover-grill.jpg',
  '/demo-photos/cover-pizza.jpg',
  '/demo-photos/alexandrian-liver.jpg',
  '/demo-photos/kofta.jpg',
  '/demo-photos/shish-tawook.jpg',
  '/demo-photos/baba-ghanoush.jpg',
  '/demo-photos/tahini.jpg',
];

/// 128 Zad (Studio's marketplace demo) as its app is: its whole project
/// (test/support/zad_demo.json): the photo-first home, the five tabs and
/// Shops, Manrope; its places and the Fathys' groceries from DemoApi.zad.
/// 130.3–130.4 Or a project from one of its Signature looks ([look],
/// test/support/sig_zad_a.json, sig_zad_b.json) in the look's main colour.
DemoApi zadStudioApi({StudioDemo? look, String primaryColor = '#1E6B52'}) =>
    (look ?? StudioDemo.zad).apply(
      DemoApi.zad(),
      appName: 'Zad',
      primaryColor: primaryColor,
    );

/// Masar Rides (Studio's rides demo): its car types on its home, the cars
/// in their drawings (none of a van); without
/// [ride], no ride on its way.
DemoApi masarStudioApi({
  bool driver = false,
  bool ride = true,
  StudioDemo? look,
}) => (look ?? StudioDemo.masar).apply(
  ride
      ? _masarRide(DemoApi.rides(driver: driver))
      : (DemoApi.rides(driver: driver)..rides = []),
  appName: 'Masar Rides',
  primaryColor: '#14857A',
  items: {
    'vehicle_types': [
      _item(
        'vehicle_types',
        1,
        'Economy',
        'Everyday cars',
        image: StudioDemo.masar.picture('car-teal'),
      ),
      _item(
        'vehicle_types',
        2,
        'Comfort',
        'Newer cars with more room',
        image: StudioDemo.masar.picture('car-dark'),
      ),
      _item('vehicle_types', 3, 'Van', 'For the family and the luggage'),
    ],
  },
);

/// 128 The ride on its way on Masar's home: Youssef, one of the demo's
/// drivers (lib/demo/content.ts RIDES_DEMO_DRIVERS), with his car.
DemoApi _masarRide(DemoApi api) => api
  ..rides = [
    for (final r in api.rides)
      {
        ...r,
        'driver': {
          ...(r['driver'] as Map<String, dynamic>),
          'name': 'Youssef Kamal',
          'rating': 4.9,
          'car': {
            'model': 'Compact sedan',
            'color': 'Silver',
            'plate': 'MS 2147',
          },
        },
        'pickup_minutes': 3,
      },
  ];

/// Lamha Taxi (Studio's live taxi demo): its car types on its home, the cars
/// in their drawings (none of a six-seat car).
DemoApi lamhaStudioApi({
  bool driver = false,
  bool ride = true,
  bool onBoard = false,
  StudioDemo? look,
}) => (look ?? StudioDemo.lamha).apply(
  DemoApi.taxi(driver: driver, ride: ride, onBoard: onBoard),
  appName: 'Lamha Taxi',
  primaryColor: '#1C2541',
  items: {
    'vehicle_types': [
      _item(
        'vehicle_types',
        1,
        'Taxi',
        'Everyday taxis with four seats',
        image: StudioDemo.lamha.picture('car-yellow'),
      ),
      _item(
        'vehicle_types',
        2,
        'Comfort',
        'Newer cars with more room',
        image: StudioDemo.lamha.picture('car-dark'),
      ),
      _item(
        'vehicle_types',
        3,
        'XL',
        'Six seats for the family and the luggage',
      ),
    ],
  },
);

/// Nakhla School (Studio's school demo). 128 Its approved home: Lina in at
/// the gate at 07:42, Maths now and the bus home at 14:20; with
/// [staffApp] its teachers work in the staff app, so this app has no
/// Classroom tab (the approved bar).
DemoApi nakhlaStudioApi({
  bool map = false,
  bool staffApp = false,
  // 130 A Signature look's project instead of the demo's.
  StudioDemo? look,
}) {
  String day(int ago) => DateTime.now()
      .subtract(Duration(days: ago, hours: 2))
      .toUtc()
      .toIso8601String()
      .substring(0, 10);
  Map<String, dynamic> news(int id, String title, String body, int ago) =>
      _item(
        'school_news',
        id,
        title,
        body,
        badge: day(ago),
        action: {'type': 'screen', 'screen': 'school'},
      );
  final api = DemoApi.school(map: map);
  if (staffApp) {
    api.config = {
      ...api.config,
      'school': {
        ...(api.config['school'] as Map<String, dynamic>),
        'staff_app': 'bundle',
      },
    };
  }
  final stop = {
    'id': 3,
    'name': 'Road 9',
    'lat': 29.9602,
    'lng': 31.2569,
    'time': '14:45',
    'passed': false,
  };
  api.childDay = {
    ...api.childDay,
    'checkin': {
      ...(api.childDay['checkin'] as Map<String, dynamic>),
      'in_time': '07:42',
    },
    'bus': [
      {
        'trip': 'afternoon',
        'route': {'id': 1, 'name': 'Route 1', 'plate': 'ن ق ص 2741'},
        'stop': stop,
        'stops': [
          {
            'id': 9,
            'name': 'Nakhla School',
            'lat': 30.0911,
            'lng': 31.3225,
            'time': '14:20',
            'passed': false,
          },
          stop,
        ],
        'run': null,
      },
    ],
  };
  return (look ?? StudioDemo.nakhla).apply(
    api,
    appName: 'Nakhla School',
    primaryColor: '#1F4E79',
    items: {
      'school_news': [
        news(
          51,
          "Parents' evening on Thursday",
          "Teachers will meet parents in the classrooms from 17:00 to 19:30. "
              "Your child's timetable shows which room to go to.",
          0,
        ),
        news(
          53,
          'Science fair projects are due next Friday',
          'Each class shows its projects in the hall on the morning of the '
              'fair. Families are welcome from 10:00.',
          1,
        ),
        news(
          54,
          'New school bus times from Monday',
          'The morning bus now leaves the last stop ten minutes earlier, at '
              '7:20. The afternoon times stay the same.',
          2,
        ),
      ],
    },
  );
}

/// Rawaq Academy (Studio's academy with many teachers): its newest courses
/// on its home, each with its teacher and its picture. 128 With [staffApp]
/// its teachers work in the staff app, so this app has no Teacher tab (the
/// approved bar).
DemoApi rawaqStudioApi({
  bool staffApp = false,
  // 130 A Signature look's project instead of the demo's.
  StudioDemo? look,
}) {
  final demo = look ?? StudioDemo.rawaq;
  Map<String, dynamic> course(
    int id,
    String title,
    String teacher,
    double rating,
    String price,
    String picture,
  ) => _item(
    'courses',
    id,
    title,
    teacher,
    // 128.7 The popular courses' real photos, the academy story's
    // (platform/web/src/lib/demo/teachers.ts ACADEMY_COVERS), 128 the
    // others' too.
    image: picture.startsWith('academy-')
        ? '${demo.base}/stories/academy/$picture.jpg'
        : demo.picture(picture),
    price: price,
    rating: rating,
    action: {'type': 'course', 'course_id': id},
  );
  final api = DemoApi.teachers();
  if (staffApp) {
    api.config = {
      ...api.config,
      'instructors': {
        ...(api.config['instructors'] as Map<String, dynamic>),
        'staff_app': 'bundle',
      },
    };
  }
  // Deniz Kaya's course in its photo (128 every Rawaq course has one,
  // platform/web/src/lib/demo/teachers.ts ACADEMY_COVERS), at the demo's
  // price.
  final teacher = api.teacher;
  api.teacher = {
    ...teacher,
    'courses': [
      for (final c in (teacher['courses'] as List).cast<Map<String, dynamic>>())
        {
          ...c,
          'image_url': '${demo.base}/stories/academy/academy-phone.jpg',
          'price': {
            ...(c['price'] as Map<String, dynamic>),
            'amount': '920.00',
            'currency': 'EGP',
            'formatted': 'E£920.00',
          },
        },
    ],
  };
  return demo.apply(
    api,
    appName: 'Rawaq Academy',
    primaryColor: '#2E5E4E',
    items: {
      'courses': [
        course(
          8,
          'Start Your Own Small Business',
          'Omar Farouk',
          4.8,
          'E£630.00',
          'academy-desk',
        ),
        course(
          7,
          'Arabic for Beginners',
          'Salma Nasser',
          4.9,
          'E£475.00',
          'academy-live',
        ),
        course(
          6,
          'Python for Data Analysis',
          'Mert Şahin',
          4.7,
          'E£1,010.00',
          'academy-desk',
        ),
        course(
          5,
          'Everyday English Conversation',
          'Hannah Clarke',
          4.9,
          'E£410.00',
          'academy-graduation',
        ),
      ],
    },
  );
}

/// 126 Safra (Studio's travel demo) as its app is: its hotels on its home,
/// with their photos.
DemoApi safraStudioApi({StudioDemo? look}) {
  final data = jsonDecode(
    File('test/support/safra_api.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  final hotels = ((data['hotels'] as Map)['items'] as List)
      .cast<Map<String, dynamic>>();
  return (look ?? StudioDemo.safra).apply(
    DemoApi.travel(),
    appName: 'Safra',
    primaryColor: '#0E1424',
    items: {
      'hotels': [
        for (final h in hotels)
          _item(
            'hotels',
            h['id'] as int,
            h['name'] as String,
            '${h['area'] ?? h['city']} · ${h['city']}',
            image: (h['photo_urls'] as List).first as String,
            price: (h['price'] as Map?)?['total_formatted'] as String?,
          ),
      ],
    },
  );
}

final _safraPhotos = <String, ui.Image>{};

/// Safra's drawn pictures, and its hotels' photos
/// (platform/web/public/travel-photos) in the image cache at the addresses
/// test/support/safra_api.json serves them from.
Future<void> prepareSafra(WidgetTester tester) async {
  await StudioDemo.safra.prepare(tester);
  if (_safraPhotos.isEmpty) {
    await tester.runAsync(() async {
      final folder = Directory('../platform/web/public/travel-photos');
      for (final file in folder.listSync().whereType<File>()) {
        final name = file.uri.pathSegments.last;
        if (!name.endsWith('.jpg')) continue;
        final codec = await ui.instantiateImageCodec(file.readAsBytesSync());
        _safraPhotos[name] = (await codec.getNextFrame()).image;
      }
    });
  }
  final cache = PaintingBinding.instance.imageCache;
  for (final MapEntry(:key, :value) in _safraPhotos.entries) {
    cache.putIfAbsent(
      NetworkImage('https://demo.yallapp.test/travel-photos/$key'),
      () => OneFrameImageStreamCompleter(
        SynchronousFuture(ImageInfo(image: value.clone())),
      ),
    );
  }
}
