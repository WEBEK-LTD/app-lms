import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';

import 'fixtures.dart';

/// An in-memory [YallappApi] that answers with contract-shaped fixtures and
/// records every call.
class FakeApi implements YallappApi {
  FakeApi({
    Map<String, dynamic>? config,
    Map<String, dynamic>? course,
    Map<String, dynamic>? lesson,
    this.verifyResult,
  }) : config = config ?? configJson(),
       course = course ?? courseDetailJson(),
       lesson = lesson ?? textLessonJson();

  Map<String, dynamic> config;
  Map<String, dynamic> course;
  Map<String, dynamic> lesson;
  Map<String, dynamic>? verifyResult;

  final calls = <String>[];

  /// Thrown by the next call with this name, then cleared.
  final failures = <String, ApiException>{};

  Future<T> _answer<T>(String name, T Function() value) async {
    calls.add(name);
    final failure = failures.remove(name);
    if (failure != null) throw failure;
    return value();
  }

  int count(String name) => calls.where((c) => c == name).length;

  @override
  Future<AppConfig> getConfig() =>
      _answer('getConfig', () => AppConfig.fromJson(config));

  @override
  Future<List<HomeSection>> getHome() => _answer(
    'getHome',
    () => [
      for (final s in homeJson()['sections'] as List)
        HomeSection.fromJson(s as Map<String, dynamic>),
    ],
  );

  @override
  Future<OtpRequestResult> requestOtp({
    required String countryCode,
    required String phone,
  }) => _answer(
    'requestOtp',
    () => OtpRequestResult.fromJson({
      'request_id': 'req-1',
      'code_length': 6,
      'resend_after_seconds': 45,
      'expires_in_seconds': 300,
    }),
  );

  String? lastPhone;
  String? lastCode;

  @override
  Future<VerifyResult> verifyOtp({
    required String requestId,
    required String code,
    required DeviceInput device,
  }) {
    lastCode = code;
    return _answer(
      'verifyOtp',
      () => VerifyResult.fromJson(verifyResult ?? sessionJson()),
    );
  }

  RegisterInput? lastRegister;

  @override
  Future<Session> register(RegisterInput input) {
    lastRegister = input;
    return _answer('register', () => Session.fromJson(sessionJson()));
  }

  @override
  Future<Tokens> refreshTokens(String refreshToken) => _answer(
    'refreshTokens',
    () => Tokens.fromJson({
      'access_token': 'access-2',
      'refresh_token': 'refresh-2',
      'expires_in': 900,
    }),
  );

  @override
  Future<void> logout() => _answer('logout', () {});

  @override
  Future<CheckoutLink> createCheckoutLink(int courseId) => _answer(
    'createCheckoutLink',
    () => CheckoutLink.fromJson({
      'url': 'https://your-academy.com/checkout?token=once',
      'expires_at': '2026-10-12T09:05:00Z',
      'open_in': 'in_app',
    }),
  );

  @override
  Future<User> getMe() => _answer('getMe', () => User.fromJson(userJson()));

  @override
  Future<User> updateMe({String? name, String? email, String? city}) =>
      _answer('updateMe', () => User.fromJson({...userJson(), 'name': ?name}));

  @override
  Future<void> deleteMe() => _answer('deleteMe', () {});

  @override
  Future<DeviceList> listDevices() => _answer(
    'listDevices',
    () => DeviceList.fromJson({
      'items': [
        {
          'id': 'dev-1',
          'platform': 'android',
          'name': 'Pixel 8',
          'last_seen_at': '2026-10-12T08:00:00Z',
          'current': true,
        },
      ],
      'limit': 2,
    }),
  );

  @override
  Future<void> removeDevice(String deviceId) => _answer('removeDevice', () {});

  @override
  Future<void> setPushToken(
    String token,
    NotificationPreferences preferences,
  ) => _answer('setPushToken', () {});

  @override
  Future<List<Category>> listCategories() => _answer(
    'listCategories',
    () => [
      Category.fromJson({'id': 4, 'name': 'Design', 'count': 12}),
    ],
  );

  @override
  Future<Paged<CourseSummary>> listCourses(CourseQuery query) => _answer(
    'listCourses',
    () =>
        Paged.fromJson(pageJson([courseSummaryJson()]), CourseSummary.fromJson),
  );

  @override
  Future<CourseDetail> getCourse(int courseId) =>
      _answer('getCourse', () => CourseDetail.fromJson(course));

  @override
  Future<List<Topic>> getCurriculum(int courseId) => _answer(
    'getCurriculum',
    () => [
      for (final t in curriculumJson()['topics'] as List)
        Topic.fromJson(t as Map<String, dynamic>),
    ],
  );

  @override
  Future<Enrollment> enrollFree(int courseId) => _answer(
    'enrollFree',
    () => Enrollment.fromJson({
      'course_id': courseId,
      'enrolled_at': '2026-10-12T09:00:00Z',
    }),
  );

  @override
  Future<Paged<MyCourse>> listMyCourses({
    MyCoursesStatus status = MyCoursesStatus.inProgress,
    int page = 1,
  }) => _answer(
    'listMyCourses',
    () => Paged.fromJson(pageJson([myCourseJson()]), MyCourse.fromJson),
  );

  @override
  Future<List<CourseSummary>> listWishlist() =>
      _answer('listWishlist', () => <CourseSummary>[]);

  @override
  Future<void> addToWishlist(int courseId) => _answer('addToWishlist', () {});

  @override
  Future<void> removeFromWishlist(int courseId) =>
      _answer('removeFromWishlist', () {});

  @override
  Future<Lesson> getLesson(int lessonId) =>
      _answer('getLesson', () => Lesson.fromJson(lesson));

  @override
  Future<void> saveLessonProgress(
    int lessonId, {
    required int positionSeconds,
    required double watchedPercent,
  }) => _answer('saveLessonProgress', () {});

  @override
  Future<Progress> completeLesson(int lessonId) => _answer(
    'completeLesson',
    () => Progress.fromJson({
      'course_id': 1,
      'completed_items': 13,
      'total_items': 20,
      'percent': 65,
      'course_completed': false,
    }),
  );

  @override
  Future<Quiz> getQuiz(int quizId) =>
      _answer('getQuiz', () => Quiz.fromJson(quizJson()));

  @override
  Future<Attempt> startAttempt(int quizId) =>
      _answer('startAttempt', () => Attempt.fromJson(attemptJson()));

  @override
  Future<AttemptResult> submitAttempt(
    int quizId,
    int attemptId,
    List<AnswerInput> answers,
  ) => _answer(
    'submitAttempt',
    () => AttemptResult.fromJson({
      'attempt_id': attemptId,
      'quiz_id': quizId,
      'quiz_title': 'Module 2 quiz',
      'status': 'passed',
      'score_percent': 100,
      'finished_at': '2026-10-12T09:05:00Z',
    }),
  );

  @override
  Future<Paged<AttemptResult>> listMyAttempts({int page = 1}) => _answer(
    'listMyAttempts',
    () => Paged.fromJson(pageJson([]), AttemptResult.fromJson),
  );

  @override
  Future<List<Certificate>> listCertificates() =>
      _answer('listCertificates', () => <Certificate>[]);
}
