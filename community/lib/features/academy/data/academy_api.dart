import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/json.dart';
import '../../../core/providers.dart';

/// 233.1 (area E) The Academy in the app (`/academy`): courses are bought
/// on the website only. The API answers only `open` or `locked` and never a
/// price, so the app shows a lock and nothing to buy (tested in
/// test/academy_no_payments_test.dart).
enum CourseAccess { open, locked }

enum CourseLevel { beginner, intermediate, advanced }

class CourseSummary {
  const CourseSummary({
    required this.id,
    required this.title,
    this.summary = '',
    this.coverUrl,
    this.level = CourseLevel.beginner,
    this.lessonCount = 0,
    this.access = CourseAccess.locked,
    this.progress,
  });

  factory CourseSummary.fromJson(Json json) => CourseSummary(
    id: str(json, 'slug', str(json, 'id')),
    title: str(json, 'title'),
    summary: str(json, 'summary'),
    coverUrl: optStr(json, 'cover_url'),
    level: switch (optStr(json, 'level')) {
      'intermediate' => CourseLevel.intermediate,
      'advanced' => CourseLevel.advanced,
      _ => CourseLevel.beginner,
    },
    lessonCount: integer(json, 'lesson_count'),
    // Anything but `open` is locked.
    access: optStr(json, 'access') == 'open'
        ? CourseAccess.open
        : CourseAccess.locked,
    progress: optNumber(json, 'progress'),
  );

  final String id;
  final String title;
  final String summary;
  final String? coverUrl;
  final CourseLevel level;
  final int lessonCount;
  final CourseAccess access;
  final double? progress;

  bool get locked => access == CourseAccess.locked;
}

class LessonRef {
  const LessonRef({
    required this.id,
    required this.title,
    this.video = false,
    this.minutes = 0,
    this.done = false,
  });

  factory LessonRef.fromJson(Json json) => LessonRef(
    id: str(json, 'id'),
    title: str(json, 'title'),
    video: optStr(json, 'kind') == 'video',
    minutes: integer(json, 'minutes'),
    done: boolean(json, 'done'),
  );

  final String id;
  final String title;
  final bool video;
  final int minutes;
  final bool done;
}

class Course {
  const Course({
    required this.summary,
    this.description = '',
    this.lessons = const [],
    this.certificateUrl,
  });

  factory Course.fromJson(Json json) => Course(
    summary: CourseSummary.fromJson(json),
    description: str(json, 'description'),
    lessons: listOf(json, 'lessons', LessonRef.fromJson),
    certificateUrl:
        optStr(optObject(json, 'certificate') ?? const {}, 'url') ??
        optStr(optObject(json, 'certificate') ?? const {}, 'verify_url'),
  );

  final CourseSummary summary;
  final String description;
  final List<LessonRef> lessons;
  final String? certificateUrl;
}

class Lesson {
  const Lesson({
    required this.id,
    required this.title,
    this.body = '',
    this.videoUrl,
    this.done = false,
  });

  factory Lesson.fromJson(Json json) => Lesson(
    id: str(json, 'id'),
    title: str(json, 'title'),
    body: str(json, 'body'),
    videoUrl: optStr(json, 'video_url'),
    done: boolean(json, 'done'),
  );

  final String id;
  final String title;
  final String body;
  final String? videoUrl;
  final bool done;
}

abstract class AcademyApi {
  Future<List<CourseSummary>> courses({CourseLevel? level});
  Future<Course> course(String id);
  Future<Lesson> lesson(String course, String lesson);
  Future<void> complete(String course, String lesson);
}

class HttpAcademyApi implements AcademyApi {
  HttpAcademyApi(this._client);

  final ApiClient _client;

  static String _id(String id) => Uri.encodeComponent(id);

  @override
  Future<List<CourseSummary>> courses({CourseLevel? level}) async => listOf(
    await _client.get('/academy/courses', query: {'level': level?.name}),
    'items',
    CourseSummary.fromJson,
  );

  @override
  Future<Course> course(String id) async =>
      Course.fromJson(await _client.get('/academy/courses/${_id(id)}'));

  @override
  Future<Lesson> lesson(String course, String lesson) async => Lesson.fromJson(
    await _client.get('/academy/courses/${_id(course)}/lessons/${_id(lesson)}'),
  );

  @override
  Future<void> complete(String course, String lesson) => _client.post(
    '/academy/courses/${_id(course)}/lessons/${_id(lesson)}/complete',
  );
}

class FakeAcademyApi implements AcademyApi {
  final calls = <String>[];

  static final courses_ = <Json>[
    {
      'id': 'c1',
      'slug': 'first-app',
      'title': 'Your first app in a weekend',
      'summary': 'From the template to the stores, step by step.',
      'level': 'beginner',
      'lesson_count': 6,
      'access': 'open',
      'progress': 0.5,
      'description': 'Build a shop app with Studio and send it to the stores.',
      'lessons': [
        {
          'id': 'l1',
          'title': 'Pick a template',
          'kind': 'video',
          'minutes': 8,
          'done': true,
        },
        {
          'id': 'l2',
          'title': 'Your products',
          'kind': 'article',
          'minutes': 6,
          'done': false,
        },
      ],
    },
    {
      'id': 'c2',
      'slug': 'delivery-deep-dive',
      'title': 'Delivery, start to finish',
      'summary': 'Zones, couriers and tracking in your app.',
      'level': 'advanced',
      'lesson_count': 9,
      'access': 'locked',
      'progress': null,
      'description': 'Every delivery setting explained.',
      'lessons': [
        {
          'id': 'l3',
          'title': 'Delivery zones',
          'kind': 'video',
          'minutes': 12,
          'done': false,
        },
      ],
    },
  ];

  @override
  Future<List<CourseSummary>> courses({CourseLevel? level}) async {
    calls.add('courses:${level?.name ?? ''}');
    return [
      for (final c in courses_)
        if (level == null || c['level'] == level.name)
          CourseSummary.fromJson(c),
    ];
  }

  @override
  Future<Course> course(String id) async => Course.fromJson(
    courses_.firstWhere((c) => c['slug'] == id || c['id'] == id),
  );

  @override
  Future<Lesson> lesson(String course, String lesson) async => Lesson.fromJson({
    'id': lesson,
    'title': 'Pick a template',
    'body': 'Open Studio and choose the template closest to your business.',
    'video_url': 'https://example.com/videos/template',
  });

  @override
  Future<void> complete(String course, String lesson) async =>
      calls.add('complete:$course:$lesson');
}

final academyApiProvider = Provider<AcademyApi>(
  (ref) => ref.watch(configProvider).demo
      ? FakeAcademyApi()
      : HttpAcademyApi(ref.watch(apiClientProvider)),
);
