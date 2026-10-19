import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/services/crash_reporter.dart';

/// 46 Crash reports: caught by Flutter's handlers, scrubbed, grouped by a
/// fingerprint that survives new versions, sent once per run each with the
/// runs counted, and kept on the phone until they can go.

const _stack = '''
#0      CourseScreen._load (package:yallapp/modules/lms/courses/course_detail_screen.dart:120:7)
#1      _rootRun (dart:async/zone.dart:1525:13)
#2      CourseApi.get (package:yallapp/core/api/yallapp_api.dart:88:3)
''';

void main() {
  test('scrubs anything personal or secret', () {
    final text = scrubCrashText(
      'Failed for ada@academy.test +90 532 123 45 67 at '
      'https://user:pw@academy.test/wp-json/yallapp/v1/me?token=abc#x '
      'with Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI3In0.c2lnbmF0dXJl '
      'code=123456 refresh 3f2a9c0d1e2b3c4d5e6f7a8b9c0d1e2f',
    );
    for (final secret in [
      'ada@academy.test',
      '532 123',
      'token=abc',
      'user:pw',
      'eyJhbGci',
      '123456',
      '3f2a9c0d1e2b',
    ]) {
      expect(text, isNot(contains(secret)), reason: secret);
    }
    expect(text, contains('https://academy.test/wp-json/yallapp/v1/me'));
    expect(screenPattern('/course/12?tab=1'), '/course/:id');
    expect(screenPattern('/course/:courseId'), '/course/:courseId');
  });

  test('the fingerprint is the error and our frames, not line numbers', () {
    final a = crashFingerprint('RangeError', _stack);
    final moved = _stack
        .replaceAll(':120:7', ':131:9')
        .replaceAll(':88:3', ':90:1');
    expect(crashFingerprint('RangeError', moved), a);
    expect(crashFingerprint('StateError', _stack), isNot(a));
    expect(a, matches(RegExp(r'^[0-9a-f]{32}$')));
    expect(appFrames(_stack), [
      'CourseScreen._load package:yallapp/modules/lms/courses/course_detail_screen.dart',
      'CourseApi.get package:yallapp/core/api/yallapp_api.dart',
    ]);
  });

  group('the reporter', () {
    late SharedPreferences prefs;
    late List<Map<String, dynamic>> sent;
    var status = 204;

    CrashReporter reporter() => CrashReporter(
      preferences: prefs,
      endpoint: 'https://yallapp.com.tr/api/app/x/crashes',
      platform: DevicePlatform.android,
      appVersion: '1.4.0',
      buildNumber: 14,
      osVersion: '14',
      device: 'phone',
      post: (url, body) async {
        sent.add(body);
        return status;
      },
      clock: () => DateTime.utc(2026, 10, 19, 12),
    )..screen = () => '/course/42';

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      prefs = await SharedPreferences.getInstance();
      sent = [];
      status = 204;
    });

    test("Flutter's error handler sends a scrubbed report, once per run", () async {
      final previous = FlutterError.onError;
      final previousPlatform = PlatformDispatcher.instance.onError;
      addTearDown(() {
        FlutterError.onError = previous;
        PlatformDispatcher.instance.onError = previousPlatform;
      });
      final r = reporter()
        ..allowed = (() => true)
        ..startSession();
      // Flutter still presents the error; the test only listens.
      FlutterError.onError = (_) {};
      r.install();
      final error = StateError('No course for ada@academy.test');
      for (var i = 0; i < 2; i++) {
        FlutterError.reportError(
          FlutterErrorDetails(
            exception: error,
            stack: StackTrace.fromString(_stack),
            library: 'widgets library',
          ),
        );
      }
      expect(r.queued, hasLength(1));
      await r.flush();
      expect(sent, hasLength(1));
      final body = sent.single;
      expect(body['sessions'], 1);
      expect(body['crashed_sessions'], 1);
      final report = (body['reports'] as List).single as Map<String, dynamic>;
      expect(report['error'], 'StateError: Bad state: No course for <email>');
      expect(report['fatal'], isFalse);
      expect(report['library'], 'widgets library');
      expect(report['app_version'], '1.4.0');
      expect(report['build_number'], 14);
      expect(report['platform'], 'android');
      expect(report['os_version'], '14');
      expect(report['device'], 'phone');
      expect(report['screen'], '/course/:id');
      expect(report['at'], '2026-10-19T12:00:00.000Z');
      expect(report['fingerprint'], matches(RegExp(r'^[0-9a-f]{32}$')));
      expect(
        report['stack'],
        contains(
          'package:yallapp/modules/lms/courses/course_detail_screen.dart:120:7',
        ),
      );
      expect(report.keys, isNot(contains('device_name')));
      // Sent: nothing waits any more.
      expect(r.queued, isEmpty);
      await r.flush();
      expect(sent, hasLength(1));
    });

    test('an error outside any handler is fatal', () {
      final previous = PlatformDispatcher.instance.onError;
      final previousFlutter = FlutterError.onError;
      addTearDown(() {
        PlatformDispatcher.instance.onError = previous;
        FlutterError.onError = previousFlutter;
      });
      final r = reporter()..install();
      expect(
        PlatformDispatcher.instance.onError!(
          ArgumentError('bad'),
          StackTrace.fromString(_stack),
        ),
        isTrue,
      );
      expect(r.queued.single.fatal, isTrue);
    });

    test('waits on the phone until allowed, and keeps reports a failed send '
        'left', () async {
      final r = reporter()
        ..record(StateError('x'), StackTrace.fromString(_stack), fatal: false);
      await r.flush();
      expect(sent, isEmpty, reason: 'not allowed yet');
      r.allowed = () => true;
      status = 429;
      await r.flush();
      expect(sent, hasLength(1));
      expect(r.queued, hasLength(1), reason: 'kept for later');
      status = 204;
      // A new run of the app sends it.
      final next = reporter()..allowed = () => true;
      await next.flush();
      expect(next.queued, isEmpty);
    });

    test('keeps at most 10 reports', () {
      final r = reporter();
      for (var i = 0; i < 14; i++) {
        r.record(
          StateError('x'),
          StackTrace.fromString('#0 f$i (package:yallapp/a$i.dart:1:1)'),
          fatal: false,
        );
      }
      expect(r.queued, hasLength(CrashReporter.maxQueued));
    });
  });
}
