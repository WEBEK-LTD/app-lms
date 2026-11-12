import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';

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

  final Map<String, dynamic> _demo;

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
      final out = {...node}
        ..remove('translations')
        ..remove('query');
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
        for (final t in (_layout['tabs'] as List).cast<Map<String, dynamic>>())
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
                'header': {...header}..remove('translations'),
              'body': served(studio['body'] as Map<String, dynamic>),
            },
        },
    };
    return api;
  }

  static final _pictures = <String, ui.Image>{};

  /// Puts the demo's drawn pictures (platform/web/public/design-pictures)
  /// in the image cache at the addresses the demo serves them from.
  Future<void> prepare(WidgetTester tester) async {
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
    final cache = PaintingBinding.instance.imageCache
      ..maximumSizeBytes = 1 << 30
      ..maximumSize = 4000;
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
  Map<String, dynamic>? action,
}) => {
  'source': source,
  'id': '$id',
  'title': title,
  'subtitle': subtitle,
  'image_url': image,
  'price_label': price,
  'badge': badge,
  'action':
      action ??
      {
        'type': 'item',
        'item': {'source': source, 'id': '$id'},
      },
};

/// Sahm Express (Studio's delivery demo) as its app is: its three services
/// on its home, with their drawn pictures (lib/demo/content.ts).
DemoApi sahmStudioApi({bool courier = false}) {
  final demo = StudioDemo.sahm;
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
          'Within 6 hours',
          image: demo.picture('service-sameday'),
        ),
        _item(
          source,
          2,
          'Express',
          'Within 2 hours',
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

/// Sofra Eats (Studio's food delivery demo): its three restaurants on its
/// home, each with its picture and cuisines.
DemoApi sofraStudioApi() {
  final demo = StudioDemo.sofra;
  const source = 'restaurants';
  final api = DemoApi.food();
  // The demo's own drawings of its dishes, Bayt El Koshary's minimum order,
  // and the order as the demo's menu prices it, with Karim on the map
  // between the restaurant and Cairo Tower.
  api
    ..config = {
      ...api.config,
      'food': {
        ...(api.config['food'] as Map<String, dynamic>),
        'map': {'tiles_url': demoTilesUrl, 'attribution': null},
      },
    }
    ..restaurants = [for (final r in api.restaurants) demo.drawn(r)]
    ..restaurantMenus = {
      for (final MapEntry(:key, :value) in api.restaurantMenus.entries)
        key: {
          ...demo.drawn(value),
          'min_order': '50.00',
          'min_order_formatted': 'E£50.00',
        },
    };
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
  api.foodOrders = [
    for (final o in api.foodOrders)
      {
        ...demo.drawn(o),
        'lines': [
          line(2, 'Koshary', 2, ['Size: Large'], '75.00', '150.00'),
          line(3, 'Liver sandwich', 1, [], '35.00', '35.00'),
        ],
        'subtotal_formatted': 'E£185.00',
        'delivery_fee_formatted': 'E£25.00',
        'total': '210.00',
        'total_formatted': 'E£210.00',
        'courier_location': {
          'lat': 30.0466,
          'lng': 31.2312,
          'updated_at': '2026-10-28T10:12:00.000Z',
        },
      },
  ];
  return demo.apply(
    api,
    appName: 'Sofra Eats',
    primaryColor: '#D2552B',
    items: {
      source: [
        _item(
          source,
          1,
          'Bayt El Koshary',
          'Egyptian · Desserts',
          image: demo.picture('dish-soup'),
        ),
        _item(
          source,
          2,
          'Sahara Grill',
          'Grill',
          image: demo.picture('dish-burger'),
        ),
        _item(
          source,
          3,
          'Forno Zamalek',
          'Pizza · Desserts',
          image: demo.picture('dish-cheesecake'),
        ),
      ],
    },
  );
}

/// Masar Rides (Studio's rides demo): its car types on its home; without
/// [ride], no ride on its way.
DemoApi masarStudioApi({bool driver = false, bool ride = true}) =>
    StudioDemo.masar.apply(
      ride
          ? DemoApi.rides(driver: driver)
          : (DemoApi.rides(driver: driver)..rides = []),
      appName: 'Masar Rides',
      primaryColor: '#14857A',
      items: {
        'vehicle_types': [
          _item('vehicle_types', 1, 'Economy', 'Everyday cars'),
          _item('vehicle_types', 2, 'Comfort', 'Newer cars with more room'),
          _item('vehicle_types', 3, 'Van', 'For the family and the luggage'),
        ],
      },
    );

/// Lamha Taxi (Studio's live taxi demo): its car types on its home.
DemoApi lamhaStudioApi({
  bool driver = false,
  bool ride = true,
  bool onBoard = false,
}) => StudioDemo.lamha.apply(
  DemoApi.taxi(driver: driver, ride: ride, onBoard: onBoard),
  appName: 'Lamha Taxi',
  primaryColor: '#1C2541',
  items: {
    'vehicle_types': [
      _item('vehicle_types', 1, 'Taxi', 'Everyday taxis with four seats'),
      _item('vehicle_types', 2, 'Comfort', 'Newer cars with more room'),
      _item(
        'vehicle_types',
        3,
        'XL',
        'Six seats for the family and the luggage',
      ),
    ],
  },
);

/// Nakhla School (Studio's school demo): the school's news on its home.
DemoApi nakhlaStudioApi({bool map = false}) {
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
  return StudioDemo.nakhla.apply(
    DemoApi.school(map: map),
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
/// on its home, each with its teacher and its picture.
DemoApi rawaqStudioApi() {
  final demo = StudioDemo.rawaq;
  Map<String, dynamic> course(
    int id,
    String title,
    String teacher,
    String price,
    String picture,
  ) => _item(
    'courses',
    id,
    title,
    teacher,
    image: demo.picture(picture),
    price: price,
    action: {'type': 'course', 'course_id': id},
  );
  final api = DemoApi.teachers();
  // Deniz Kaya's course in its drawing, at the demo's price.
  final teacher = api.teacher;
  api.teacher = {
    ...teacher,
    'courses': [
      for (final c in (teacher['courses'] as List).cast<Map<String, dynamic>>())
        {
          ...demo.drawn(c),
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
          'E£630.00',
          'course-business',
        ),
        course(
          7,
          'Arabic for Beginners',
          'Salma Nasser',
          'E£475.00',
          'course-arabic',
        ),
        course(
          6,
          'Python for Data Analysis',
          'Mert Şahin',
          'E£1,010.00',
          'course-python',
        ),
        course(
          5,
          'Everyday English Conversation',
          'Hannah Clarke',
          'E£410.00',
          'course-english',
        ),
      ],
    },
  );
}
