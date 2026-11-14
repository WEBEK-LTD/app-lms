/// 130.52 Studio's course screens' gallery: the course card (the catalog),
/// a course's page, the lesson and My courses in each academy Signature
/// look (Ufuq A Night cinema, Ufuq B Gold ring, Rawaq A Faculty index,
/// Rawaq B On air), from the projects their templates make
/// (test/support/signatures), drawn by the real app with the academies'
/// demo data, light, dark and in Arabic, written to
/// platform/web/public/screens/premium/ as `course-card-ufuq-a-light.png`,
/// `course-page-rawaq-b-dark.png`, `course-lesson-ufuq-b-ar.png` and so
/// on. Skipped unless run with
/// `--dart-define=YALLAPP_SCREENSHOTS=true --update-goldens`:
///
///   flutter test test/screenshots/course_screens_screenshots_test.dart \
///     --dart-define=YALLAPP_SCREENSHOTS=true --update-goldens
@Tags(['screenshots'])
library;

import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/yallapp_api.dart' show MyCoursesStatus;
import 'package:yallapp/core/config/build_config_data.dart';

import '../support/fixtures.dart';
import 'support/demo_api.dart';
import 'support/premium_academy.dart';
import 'support/screens.dart';
import 'support/studio_demo.dart';

const _enabled = bool.fromEnvironment('YALLAPP_SCREENSHOTS');
const _out = '../../../platform/web/public/screens/premium';
const _ratio = 2.0;

/// The academy photos (platform/web/public/stories/academy) by course.
const _photos = {
  1: 'academy-phone',
  2: 'academy-evening',
  3: 'academy-graduation',
  4: 'academy-breakfast',
  5: 'academy-live',
  6: 'academy-graduation',
  7: 'academy-desk',
};

/// Rawaq's own photos (its demo's), by course.
const _rawaqPhotos = {
  1: 'academy-phone',
  2: 'academy-live',
  3: 'academy-graduation',
  4: 'academy-desk',
  5: 'academy-live',
  6: 'academy-graduation',
  7: 'academy-desk',
};

String _base(DemoApi api) => RegExp(r'^https?://[^/]+')
    .firstMatch(
      ((api.config['screens'] as Map)['sign_in'] as Map)['image_url'] as String,
    )!
    .group(0)!;

/// A student's evening with the course: where they are in it, the lesson
/// with its video, note and files, what the course teaches, and their
/// courses, in the academy's language.
void _courseDay(
  DemoApi api, {
  required bool arabic,
  required bool enrolled,
  required Map<int, String> photos,
}) {
  final base = _base(api);
  String photo(int id) => '$base/stories/academy/${photos[id]}.jpg';
  api.courseImages.addAll({for (final id in photos.keys) id: photo(id)});
  api.course = {
    ...api.course,
    'enrolled': enrolled,
    'image_url': photo(1),
    'student_count': 1840,
    'about': {
      'learn': arabic
          ? [
              'البحث مع المستخدمين ورسم رحلتهم',
              'مخططات أولية تجيب عن الأسئلة',
              'نماذج قابلة للنقر واختبارها مع خمسة أشخاص',
            ]
          : [
              'Talk to users and map their journey',
              'Wireframes that answer real questions',
              'Clickable prototypes, tested with five people',
            ],
    },
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
        'title': arabic ? 'الوحدة الأولى: التفكير كمصمم' : 'Unit 1: Thinking like a designer',
        'items': [
          item(291, 'lesson', arabic ? 'ما التصميم ولماذا' : 'What design is for', 10, done: true),
          item(292, 'lesson', arabic ? 'أدوات المصمم' : "The designer's tools", 12, done: true),
          item(300, 'lesson', arabic ? 'الألوان' : 'Colour', 15, done: true),
        ],
      },
      {
        'id': 2,
        'title': arabic ? 'الوحدة الثانية: التخطيط' : 'Unit 2: Layout',
        'items': [
          item(301, 'lesson', arabic ? 'مبادئ التخطيط' : 'Layout principles', 18),
          item(302, 'lesson', arabic ? 'الشبكات والمسافات' : 'Grids and spacing', 22),
          item(401, 'quiz', arabic ? 'اختبار الوحدة الثانية' : 'Unit 2 quiz', null, questions: 10, locked: true),
        ],
      },
    ],
  };
  api.lessons[301] = {
    ...videoLessonJson(),
    'id': 301,
    'course_id': 1,
    'title': arabic ? 'مبادئ التخطيط' : 'Layout principles',
    'video': {
      ...(videoLessonJson()['video'] as Map<String, dynamic>),
      'duration_seconds': 1080,
      'poster_url': photo(7),
    },
    'position_seconds': 372,
    'previous_id': 300,
    'next_id': 302,
    'note_count': 1,
    'discussion_count': 24,
    'attachments': [
      {
        'name': arabic ? 'دليل المسافات.pdf' : 'Spacing guide.pdf',
        'url': '$base/files/guide.pdf',
        'size_bytes': 1258291,
        'mime_type': 'application/pdf',
      },
      {
        'name': arabic ? 'ملف التمرين.fig' : 'Practice file.fig',
        'url': '$base/files/practice.fig',
        'size_bytes': 3565158,
        'mime_type': null,
      },
    ],
  };
  api.notes
    ..clear()
    ..add({
      ...noteJson(
        id: 1,
        lessonId: 301,
        text: arabic
            ? 'القاعدة: ٨ بكسل لكل مسافة، وضعفها بين الأقسام.'
            : 'The rule: 8 px for every space, doubled between sections.',
      ),
      'position_seconds': 272,
      'created_at': DateTime.now()
          .subtract(const Duration(minutes: 2))
          .toUtc()
          .toIso8601String(),
    });
  final courses = api.academyCourses;
  Map<String, dynamic> mine(
    int at,
    int done,
    int total, {
    String? next,
    String? certificate,
  }) => {
    'course': {...courses[at], 'enrolled': true},
    'progress': {
      'course_id': courses[at]['id'],
      'completed_items': done,
      'total_items': total,
      'percent': (done * 100 / total).round(),
      'course_completed': done == total,
    },
    'next_item': next == null
        ? null
        : item(301, 'lesson', next, 18),
    'certificate_url': certificate,
  };
  api.myCourseLists = {
    MyCoursesStatus.inProgress: [
      mine(0, 3, 8, next: arabic ? 'مبادئ التخطيط' : 'Layout principles'),
      mine(1, 11, 18, next: arabic ? 'حرف الألف والباء بخط النسخ' : 'Alif and Ba in Naskh script'),
      mine(4, 5, 26, next: arabic ? 'قصص تبيع' : 'Stories that sell'),
      mine(3, 14, 21, next: arabic ? 'الضوء الطبيعي' : 'Natural light'),
    ],
    MyCoursesStatus.completed: [
      mine(2, 14, 14, certificate: '$base/files/certificate.pdf'),
    ],
  };
}

/// One of the four looks: its name in the pictures, and its app.
class _Look {
  const _Look(this.name, this.ufuq, this.letter);

  final String name;
  final bool ufuq;
  final String letter;
}

const _looks = [
  _Look('ufuq-a', true, 'a'),
  _Look('ufuq-b', true, 'b'),
  _Look('rawaq-a', false, 'a'),
  _Look('rawaq-b', false, 'b'),
];

const _screens = {
  'card': '/courses',
  'page': '/course/1',
  'lesson': '/lesson/301',
  'mine': '/my-courses',
};

Shot _shot(_Look look, String screen, String variant) {
  final arabic = variant == 'ar';
  final location = _screens[screen]!;
  final rawaq = look.ufuq ? null : StudioDemo.signature('teachers', look.letter);
  return Shot(
    'course-$screen-${look.name}-$variant',
    dark: variant == 'dark',
    language: arabic ? 'ar' : 'en',
    appType: AppType.lms,
    appName: look.ufuq ? 'Ufuq Academy' : 'Rawaq Academy',
    shadows: true,
    api: () {
      StudioDemo.language = arabic ? 'ar' : 'en';
      final DemoApi api;
      if (look.ufuq) {
        api = premiumAcademyApi(
          look: 'signatures/premium-academy_${look.letter}.json',
          arabic: arabic,
          enrolled: screen != 'page',
        );
      } else {
        api = rawaqStudioApi(look: rawaq, arabic: arabic)..useAcademyCourses();
      }
      _courseDay(
        api,
        arabic: arabic,
        enrolled: screen != 'page',
        photos: look.ufuq ? _photos : _rawaqPhotos,
      );
      return api;
    },
    prepare: (tester) async {
      if (rawaq != null) {
        await rawaq.prepare(tester, [
          for (final p in {..._rawaqPhotos.values, 'academy-evening'})
            '/stories/academy/$p.jpg',
        ]);
      }
      await preparePremiumAcademy(tester);
    },
    overrides: premiumAcademyOverrides,
    after: (tester, router) async => router.push(location),
  );
}

void main() {
  setUpAll(() async {
    if (_enabled) await loadAppFonts();
  });
  tearDown(() => StudioDemo.language = 'en');

  for (final look in _looks) {
    for (final screen in _screens.keys) {
      for (final variant in ['light', 'dark', 'ar']) {
        final shot = _shot(look, screen, variant);
        testWidgets(shot.name, skip: !_enabled, (tester) async {
          debugDisableShadows = false;
          await shot.render(tester);
          // The progress filled, the reviews and the player in.
          for (var i = 0; i < 6; i++) {
            await tester.pump(const Duration(milliseconds: 400));
          }
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(shotKey),
          );
          final png = await tester.runAsync(() async {
            final image = await boundary.toImage(pixelRatio: _ratio);
            final data = await image.toByteData(
              format: ui.ImageByteFormat.png,
            );
            image.dispose();
            return Uint8List.view(data!.buffer);
          });
          final file = Uri.parse('$_out/${shot.name}.png');
          await tester.runAsync(() async {
            if (autoUpdateGoldenFiles) {
              await goldenFileComparator.update(file, png!);
            } else {
              expect(await goldenFileComparator.compare(png!, file), isTrue);
            }
          });
          debugDisableShadows = true;
        });
      }
    }
  }
}
