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
import 'package:yallapp/modules/shared/pages/page_actions.dart';

import '../support/fixtures.dart';

/// Answers every request with an empty page and keeps what was asked.
class _Server implements HttpClientAdapter {
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final body = options.path.endsWith('/pages')
        ? {'version': '1', 'tabs': <Object>[], 'pages': <Object>[]}
        : {
            'slug': 'home',
            'title': 'Home',
            'updated_at': '2026-10-15T08:00:00Z',
            'blocks': <Object>[],
          };
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
  // 30 A site's default pages are built for the app asking, so a Store app on
  // a Tutor LMS site gets store tabs and lists, not courses it can't open.
  group('pages are asked for with the app type', () {
    late _Server server;

    HttpYallappApi api(AppType? type) => HttpYallappApi(
      dio: createHttpClient(
        baseUrl: 'https://x.test/wp-json/yallapp/v1',
        tokens: TokenManager(
          store: MemoryTokenStore(null),
          refresh: (_) async => throw UnimplementedError(),
        ),
        adapter: server,
      ),
      refreshDio: Dio(),
      platform: DevicePlatform.android,
      appVersion: '1.0.0',
      appType: type,
    );

    setUp(() => server = _Server());

    test('the navigation and each page', () async {
      final store = api(AppType.store);
      await store.getPages();
      await store.getPage('home');
      expect(server.requests.map((r) => r.queryParameters['app_type']), [
        'store',
        'store',
      ]);
      expect(server.requests.first.queryParameters['platform'], 'android');
    });

    test('real estate uses the build config spelling', () async {
      await api(AppType.realEstate).getPages();
      expect(server.requests.single.queryParameters['app_type'], 'real_estate');
    });

    test('without a type nothing is added', () async {
      await api(null).getPages();
      expect(
        server.requests.single.queryParameters.containsKey('app_type'),
        isFalse,
      );
    });
  });

  group('lists keep what this app type can open', () {
    PageItem item(ItemSource source, {PageAction? action}) => PageItem(
      source: source,
      id: '14',
      title: 'UI Design Fundamentals',
      action: action,
    );
    const course = PageAction(type: PageActionType.course, courseId: 14);

    test('a course opens in an Academy app only', () {
      expect(canFollowAction(course, AppType.lms), isTrue);
      expect(canFollowAction(course, AppType.store), isFalse);
    });

    test('entries this app can\'t open are left out', () {
      final items = [
        item(ItemSource.courses, action: course),
        item(ItemSource.products),
        const PageItem(source: null, id: 'note', title: 'Opening hours'),
      ];
      expect(followableItems(items, AppType.store).map((i) => i.source), [
        ItemSource.products,
        null,
      ]);
      expect(followableItems(items, AppType.lms).map((i) => i.source), [
        ItemSource.courses,
        null,
      ]);
    });

    test('links and pages always open', () {
      for (final action in const [
        PageAction(type: PageActionType.url, url: 'https://x.test'),
        PageAction(type: PageActionType.page, pageSlug: 'about'),
      ]) {
        expect(canFollowAction(action, AppType.news), isTrue);
      }
    });
  });

  group('course about', () {
    test('reads the lists and the student count', () {
      final course = CourseDetail.fromJson({
        ...courseDetailJson(),
        'student_count': 42,
        'about': {
          'learn': ['Plan a treatment'],
          'requirements': ['A laptop'],
          'audience': <String>[],
          'includes': ['12 hours of video'],
        },
      });
      expect(course.studentCount, 42);
      expect(course.about.learn, ['Plan a treatment']);
      expect(course.about.requirements, ['A laptop']);
      expect(course.about.audience, isEmpty);
      expect(course.about.includes, ['12 hours of video']);
      expect(course.about.isEmpty, isFalse);
    });

    test('older plugins send neither', () {
      final course = CourseDetail.fromJson(courseDetailJson());
      expect(course.studentCount, isNull);
      expect(course.about.isEmpty, isTrue);
    });
  });
}
