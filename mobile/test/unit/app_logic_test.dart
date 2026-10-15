import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/app_environment.dart';
import 'package:yallapp/core/auth/auth_controller.dart';
import 'package:yallapp/core/gate/app_gate.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/modules/shared/auth/country_codes.dart';
import 'package:yallapp/modules/lms/lesson/lesson_screen.dart';
import 'package:yallapp/modules/lms/lesson/video/lesson_video_player.dart';
import 'package:yallapp/modules/lms/lesson/video/watermark.dart';
import 'package:yallapp/modules/lms/quiz/quiz_screen.dart';

import '../support/fixtures.dart';

void main() {
  group('routing', () {
    const out = SignedOut();
    const inn = SignedIn();

    test('signed-out students start at sign-in unless browsing as guests', () {
      expect(
        redirectFor(location: '/home', auth: out, guestMode: false),
        '/sign-in',
      );
      expect(
        redirectFor(location: '/home', auth: out, guestMode: true),
        isNull,
      );
      expect(
        redirectFor(location: '/courses', auth: out, guestMode: false),
        isNull,
      );
      expect(
        redirectFor(location: '/course/4', auth: out, guestMode: false),
        isNull,
      );
    });

    test('account pages ask for sign-in and come back afterwards', () {
      expect(
        redirectFor(
          location: '/my-courses?tab=wishlist',
          auth: out,
          guestMode: true,
        ),
        '/sign-in?from=%2Fmy-courses%3Ftab%3Dwishlist',
      );
      expect(
        redirectFor(
          location: '/sign-in/code?from=%2Fquiz%2F3',
          auth: inn,
          guestMode: false,
        ),
        '/quiz/3',
      );
      expect(
        redirectFor(location: '/sign-in', auth: inn, guestMode: false),
        '/home',
      );
      expect(
        redirectFor(location: '/account', auth: inn, guestMode: false),
        isNull,
      );
    });

    test('waits while the session is being checked', () {
      expect(
        redirectFor(
          location: '/account',
          auth: const AuthChecking(),
          guestMode: false,
        ),
        isNull,
      );
    });
  });

  group('gate', () {
    test('config flags', () {
      expect(
        gateStateForConfig(AppConfig.fromJson(configJson())),
        isA<GateReady>(),
      );
      expect(
        gateStateForConfig(
          AppConfig.fromJson(configJson(updateRequired: true)),
        ),
        isA<GateUpdateRequired>(),
      );
      final m = gateStateForConfig(
        AppConfig.fromJson(configJson(maintenance: true)),
      );
      expect((m as GateMaintenance).message, 'Back at 10:00.');
    });

    test('error codes', () {
      ApiException err(String code) =>
          ApiException(code: code, message: 'm', statusCode: 503);
      expect(gateStateForError(err('maintenance')), isA<GateMaintenance>());
      expect(gateStateForError(err('license_inactive')), isA<GatePaused>());
      final suspended = gateStateForError(err('account_suspended'));
      expect(suspended, isA<GatePaused>());
      expect((suspended as GatePaused).suspended, isTrue);
      // A user limit only matters on sign-up: never a stop for the whole app.
      expect(gateStateForError(err('app_user_limit')), isNull);
      expect(
        gateStateForError(err('update_required')),
        isA<GateUpdateRequired>(),
      );
      expect(gateStateForError(err('not_enrolled')), isNull);
    });
  });

  test('push taps open the right screen', () {
    expect(
      pushTargetLocation({
        'type': 'new_lesson',
        'course_id': '1',
        'lesson_id': '55',
      }),
      '/lesson/55',
    );
    expect(
      pushTargetLocation({'type': 'enrolled', 'course_id': '9'}),
      '/course/9',
    );
    // 26 A restaurant's order moved on: its tracking screen.
    expect(
      pushTargetLocation({
        'type': 'announcement',
        'notification_id': '3',
        'order_id': '7',
      }),
      '/account/orders/7',
    );
    expect(
      pushTargetLocation({'type': 'announcement', 'course_id': '9'}),
      '/course/9',
    );
    expect(
      pushTargetLocation({
        'type': 'qna_answer',
        'course_id': '9',
        'question_id': '31',
      }),
      '/question/31',
    );
    expect(
      pushTargetLocation({'type': 'qna_answer', 'course_id': '9'}),
      '/course/9',
    );
    expect(pushTargetLocation({'type': 'announcement'}), '/home');
    expect(pushTargetLocation({'type': 'mystery'}), '/home');
    expect(pushTargetLocation({}), '/home');
  });

  test('watermark text follows the site setting', () {
    final user = User.fromJson(userJson());
    expect(watermarkText(WatermarkMode.off, user), isNull);
    // 38 The number kept left to right (an Arabic app showed "…532 90+").
    expect(
      watermarkText(WatermarkMode.phone, user),
      '\u2066+905321234567\u2069',
    );
    expect(watermarkText(WatermarkMode.name, user), 'Sara Yilmaz');
    expect(
      watermarkText(WatermarkMode.nameAndPhone, user),
      'Sara Yilmaz · \u2066+905321234567\u2069',
    );
    expect(watermarkText(WatermarkMode.phone, null), isNull);
  });

  test('watched percent counts distinct seconds only', () {
    final t = WatchTracker(durationSeconds: 100);
    for (var s = 0; s < 10; s++) {
      t
        ..record(Duration(seconds: s))
        ..record(Duration(seconds: s, milliseconds: 500));
    }
    t.record(const Duration(seconds: 90));
    expect(t.percent, 11);
    expect(WatchTracker().percent, 0);
  });

  test('phone numbers', () {
    expect(normalizeDialCode('90'), '+90');
    expect(normalizeDialCode('+1'), '+1');
    expect(normalizeDialCode('abc'), isNull);
    expect(nationalNumber('0532 123 45 67', '+90'), '5321234567');
    expect(nationalNumber('06 1234 5678', '+39'), '0612345678');
  });

  test('device IDs are random v4 UUIDs', () {
    final id = AppEnvironment.generateDeviceId(Random(1));
    expect(
      id,
      matches(
        RegExp(
          r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
        ),
      ),
    );
    expect(
      AppEnvironment.generateDeviceId(),
      isNot(AppEnvironment.generateDeviceId()),
    );
  });

  test('quiz answers include only native questions', () {
    final attempt = Attempt.fromJson(attemptJson());
    final answers = buildAnswers(attempt.questions, {
      1: {'b'},
    });
    expect(answers.map((a) => a.toJson()), [
      {
        'question_id': 1,
        'option_ids': ['b'],
      },
    ]);
    final tf = Question.fromJson({
      'id': 3,
      'type': 'true_false',
      'title': 'Q',
      'render_mode': 'native',
    });
    expect(optionsFor(tf).map((o) => o.label), ['True', 'False']);
  });

  test('lesson position comes from the curriculum', () {
    final topics = [
      for (final t in curriculumJson()['topics'] as List)
        Topic.fromJson(t as Map<String, dynamic>),
    ];
    final lesson = Lesson.fromJson({...textLessonJson(), 'id': 102});
    final pos = LessonPosition.of(lesson, topics);
    expect(pos.index, 2);
    expect(pos.total, 2);
    expect(pos.previous!.id, 101);
    expect(pos.next!.type, CurriculumItemType.quiz);
    expect(pos.topic!.title, 'Module 1: Introduction');

    final fallback = LessonPosition.of(
      Lesson.fromJson(textLessonJson()),
      topics,
    );
    expect(fallback.previous!.id, 107);
    expect(fallback.next!.id, 109);
    expect(fallback.index, isNull);
  });

  test('retry policy retries only network failures, twice', () {
    const offline = ApiException(code: ApiException.networkError, message: 'm');
    const denied = ApiException(
      code: 'forbidden',
      message: 'm',
      statusCode: 403,
    );
    expect(retryPolicy(0, offline), isNotNull);
    expect(retryPolicy(1, offline), isNotNull);
    expect(retryPolicy(2, offline), isNull);
    expect(retryPolicy(0, denied), isNull);
  });
}
