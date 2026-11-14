import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';
import 'package:video_player_platform_interface/video_player_platform_interface.dart';
import 'package:yallapp/core/theme/fonts/font_cache.dart';
import 'package:yallapp/core/theme/fonts/remote_fonts.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart'
    show pageClockProvider;

import '../../support/fixtures.dart';
import 'demo_api.dart';
import 'studio_demo.dart';

/// 123 The premium academy's demo, Ufuq Academy, as the platform makes it
/// (test/support/premium_academy_demo.json, written by
/// platform/web/tests/unit/studio-demo-templates.test.ts): its pages, tabs,
/// bar, look and screens, with the academy demo's courses, Sara's day (her
/// streak, her live class, this week's learning), a lesson with her note
/// and its files, and the cart. 128.8 In the template's Manrope (bundled;
/// Arabic in Alexandria), each course with its photo.

final Map<String, dynamic> _demo = jsonDecode(
  File('test/support/premium_academy_demo.json').readAsStringSync(),
) as Map<String, dynamic>;

Map<String, dynamic> get _layout => _demo['layout'] as Map<String, dynamic>;

/// Where the platform served the demo from (its pictures' addresses).
String get _base => RegExp(r'^https?://[^/]+')
    .firstMatch((_demo['screens'] as Map)['sign_in']['image_url'] as String)!
    .group(0)!;

/// When the pictures were taken: 128.8 a Thursday evening in November,
/// before Sara's live class at 19:30.
final premiumAcademyNow = DateTime(2026, 11, 12, 18, 10);

/// 128.8 Each course's photo (the academy story's, platform/web/public/
/// stories/academy), by its ID in the academy's demo API, as Ufuq
/// Academy's courses have them (platform/web/src/lib/demo/ufuq-courses.ts).
const _photos = {
  1: 'academy-phone',
  2: 'academy-evening',
  3: 'academy-graduation',
  4: 'academy-breakfast',
  5: 'academy-live',
  6: 'academy-graduation',
  7: 'academy-desk',
};

String _photo(int id) => '$_base/stories/academy/${_photos[id]}.jpg';

/// The demo's courses on its home, as the hosted API fills its lists: the
/// teacher under the title and the rating.
List<Map<String, dynamic>> _items(int limit, String sort) {
  const courses = [
    (1, 'UX Design Fundamentals', 'Deniz Kaya', '₺1,450', 4.9),
    (3, 'Excel for Small Business Owners', 'Omar Farouk', 'Free', 4.7),
    (7, 'Python for Data Analysis', 'Mert Şahin', '₺1,600', 4.9),
    (5, 'Social Media Marketing That Sells', 'Yasmin Adel', '₺1,100', 4.8),
    (4, 'Product Photography with Your Phone', 'Emre Aydın', '₺890', 4.6),
    (6, 'Everyday English Conversation', 'Hannah Clarke', '₺650', 4.7),
  ];
  final order = sort == 'newest' ? [4, 5, 1, 3, 0, 2] : [0, 1, 2, 3, 4, 5];
  return [
    for (final i in order.take(limit))
      {
        'source': 'courses',
        'id': '${courses[i].$1}',
        'title': courses[i].$2,
        'subtitle': courses[i].$3,
        'image_url': _photo(courses[i].$1),
        'price_label': courses[i].$4,
        'badge': null,
        'rating': courses[i].$5,
        'favorited': false,
        'action': {'type': 'course', 'course_id': courses[i].$1},
      },
  ];
}

/// A Studio element as the hosted API serves it: its lists filled, in
/// [StudioDemo.language].
Map<String, dynamic> _served(Map<String, dynamic> node) {
  final out = StudioDemo.localized(node)..remove('query');
  if (node['type'] == 'items') {
    final q = node['query'] as Map<String, dynamic>;
    out['items'] = _items(q['limit'] as int, q['sort'] as String);
  }
  if (node['type'] == 'categories') {
    const names = [
      'Design',
      'Coding',
      'Marketing',
      'Photography',
      'Business',
      'Languages',
    ];
    out['categories'] = [
      for (final (i, n) in names.indexed)
        {
          'id': i + 1,
          'name': n,
          'count': 4 + i * 3,
          'image_url': _photo(i + 1),
        },
    ];
  }
  if (node['children'] case final List children) {
    out['children'] = [
      for (final c in children) _served(c as Map<String, dynamic>),
    ];
  }
  return out;
}

/// Ufuq Academy's app, signed in as Sara; [enrolled] in the course whose
/// page and lesson show.
DemoApi premiumAcademyApi({bool enrolled = true}) {
  final api = DemoApi.academy(
    appearance: _layout['appearance'] as Map<String, dynamic>,
  );
  api.config = {
    ...api.config,
    'site': {
      ...(api.config['site'] as Map<String, dynamic>),
      'name': 'Ufuq Academy',
    },
    'branding': {'logo_url': null, 'primary_color': '#1D2B4F'},
    // The demo's lessons have no watermark.
    'content': {
      ...(api.config['content'] as Map<String, dynamic>),
      'watermark': 'off',
    },
    'screens': _demo['screens'],
    'features': {
      ...(api.config['features'] as Map<String, dynamic>),
      'gamification': true,
      'notes': true,
      'lesson_discussion': true,
      'live_classes': true,
    },
    // The cart where card payments are allowed (WordPress with WooCommerce).
    'purchases': {
      ...(api.config['purchases'] as Map<String, dynamic>),
      'enroll_button': true,
      'course_cart': true,
    },
  };
  api.achievements = {...achievementsJson(), 'streak_days': 12};
  api.liveSessions = [
    {
      ...liveSessionJson(),
      'title': 'Content marketing',
      'starts_at': premiumAcademyNow
          .add(const Duration(hours: 1, minutes: 20))
          .toUtc()
          .toIso8601String(),
      'ends_at': premiumAcademyNow
          .add(const Duration(hours: 2, minutes: 20))
          .toUtc()
          .toIso8601String(),
    },
  ];
  // A lesson of the design course: its video, Sara's note, its files, the
  // next lesson and the unit's quiz.
  api.lessons[301] = {
    ...videoLessonJson(),
    'id': 301,
    'course_id': 1,
    'title': 'Layout principles',
    'video': {
      ...(videoLessonJson()['video'] as Map<String, dynamic>),
      'duration_seconds': 1080,
    },
    'position_seconds': 372,
    'previous_id': null,
    'next_id': null,
    'note_count': 1,
    'discussion_count': 24,
    'attachments': [
      {
        'name': 'Spacing guide.pdf',
        'url': '$_base/files/guide.pdf',
        'size_bytes': 1258291,
        'mime_type': 'application/pdf',
      },
      {
        'name': 'Practice file.fig',
        'url': '$_base/files/practice.fig',
        'size_bytes': 3565158,
        'mime_type': null,
      },
    ],
  };
  Map<String, dynamic> item(
    int id,
    String type,
    String title,
    int? minutes, {
    int? questions,
    bool done = false,
    bool locked = false,
  }) => {
    'id': id,
    'type': type,
    'title': title,
    'duration_minutes': minutes,
    'question_count': questions,
    'preview': false,
    'locked': locked,
    'completed': done,
  };
  api.curriculum = {
    'topics': [
      {
        'id': 1,
        'title': 'Unit 1',
        'items': [
          item(291, 'lesson', 'What design is for', 10, done: true),
          item(292, 'lesson', 'The designer\'s tools', 12, done: true),
        ],
      },
      {
        'id': 2,
        'title': 'Unit 2',
        'items': [
          item(300, 'lesson', 'Colour', 15, done: true),
          item(301, 'lesson', 'Layout principles', 18),
          item(302, 'lesson', 'Grids and spacing', 22),
          item(401, 'quiz', 'Unit 2 quiz', null, questions: 10, locked: true),
        ],
      },
    ],
  };
  api.notes.add({
    ...noteJson(
      id: 1,
      lessonId: 301,
      text: 'The rule: 8 px for every space, doubled between sections.',
    ),
    'position_seconds': 272,
    'created_at': DateTime.now()
        .subtract(const Duration(minutes: 2))
        .toUtc()
        .toIso8601String(),
  });
  // The cart: two courses and the card Sara saved before.
  api.cartPrices
    ..clear()
    ..addAll({1: 1450, 3: 1100});
  api.cartMoney = (v) =>
      '₺${v.round().toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+$)'), (_) => ',')}';
  api.cartTitles.addAll({
    1: 'UX Design Fundamentals',
    3: 'Social Media That Sells',
  });
  api.cartImages.addAll({1: _photo(1), 3: _photo(5)});
  api.courseImages.addAll({for (final id in _photos.keys) id: _photo(id)});
  api.course = {
    ...api.course,
    'enrolled': enrolled,
    'image_url': _photo(1),
    // A regular academy on Yallapp: the course's teacher, nobody to follow.
    'instructor': {
      'id': 0,
      'name': (api.course['instructor'] as Map<String, dynamic>)['name'],
      'avatar_url': null,
      'bio': null,
    },
  };

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
            StudioDemo.localized,
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
              'header': StudioDemo.localized(header),
            'body': _served(studio['body'] as Map<String, dynamic>),
          },
      },
  };
  return api;
}

/// The template's font for the app's remote fonts, and the page clock.
final premiumAcademyOverrides = <Override>[
  remoteFontDepsProvider.overrideWithValue(
    RemoteFontDeps(
      fetch: (_) async =>
          File('test/screenshots/support/fonts/Alexandria.ttf')
              .readAsBytesSync(),
      cache: _Cache(),
      register: flutterFontRegistrar,
    ),
  ),
  pageClockProvider.overrideWithValue(() => premiumAcademyNow),
];

class _Cache implements FontCache {
  final _files = <String, Uint8List>{};
  @override
  Future<Uint8List?> read(String key) async => _files[key];
  @override
  Future<void> write(String key, Uint8List bytes) async => _files[key] = bytes;
}

final _pictures = <String, ui.Image>{};

/// Puts the demo's pictures (platform/web/public/design-pictures and 128.8
/// the academy story's photos, public/stories/academy) in the image cache
/// at the addresses the demo serves them from, and gives the lesson a video
/// that is ready at once.
Future<void> preparePremiumAcademy(WidgetTester tester) async {
  VideoPlayerPlatform.instance = _ReadyVideo();
  if (_pictures.isEmpty) {
    await tester.runAsync(() async {
      for (final folder in ['design-pictures', 'stories/academy']) {
        final files = Directory('../platform/web/public/$folder').listSync();
        for (final file in files.whereType<File>()) {
          final name = file.uri.pathSegments.last;
          if (!name.startsWith('art-course') && !name.startsWith('academy-')) {
            continue;
          }
          final codec = await ui.instantiateImageCodec(
            file.readAsBytesSync(),
            targetWidth: 900,
          );
          _pictures['$_base/$folder/$name'] =
              (await codec.getNextFrame()).image;
        }
      }
    });
  }
  final cache = PaintingBinding.instance.imageCache
    ..maximumSizeBytes = 1 << 30
    ..maximumSize = 4000;
  for (final MapEntry(:key, :value) in _pictures.entries) {
    cache.putIfAbsent(
      NetworkImage(key),
      () => OneFrameImageStreamCompleter(
        SynchronousFuture(ImageInfo(image: value.clone())),
      ),
    );
  }
}

/// A video that is ready at once: 18 minutes on a dark picture.
class _ReadyVideo extends VideoPlayerPlatform with MockPlatformInterfaceMixin {
  var _at = Duration.zero;
  @override
  Future<void> init() async {}
  @override
  Future<int?> create(DataSource dataSource) async => 1;
  @override
  Future<int?> createWithOptions(VideoCreationOptions options) async => 1;
  @override
  Stream<VideoEvent> videoEventsFor(int playerId) => Stream.value(
    VideoEvent(
      eventType: VideoEventType.initialized,
      duration: const Duration(minutes: 18),
      size: const Size(1280, 720),
    ),
  );
  @override
  Future<void> dispose(int playerId) async {}
  @override
  Future<void> setLooping(int playerId, bool looping) async {}
  @override
  Future<void> play(int playerId) async {}
  @override
  Future<void> pause(int playerId) async {}
  @override
  Future<void> setVolume(int playerId, double volume) async {}
  @override
  Future<void> seekTo(int playerId, Duration position) async => _at = position;
  @override
  Future<void> setPlaybackSpeed(int playerId, double speed) async {}
  @override
  Future<Duration> getPosition(int playerId) async => _at;
  @override
  Future<void> setMixWithOthers(bool mixWithOthers) async {}
  @override
  Widget buildView(int playerId) => const DecoratedBox(
    decoration: BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Color(0xFF1A1636), Color(0xFF3A2A62), Color(0xFF15122A)],
      ),
    ),
  );
  @override
  Widget buildViewWithOptions(VideoViewOptions options) => buildView(1);
}
