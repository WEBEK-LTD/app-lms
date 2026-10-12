import 'package:dio/dio.dart';

import 'api_exception.dart';
import 'http_client.dart';
import 'models/json.dart';
import 'models/models.dart';

enum PriceFilter { all, free, paid }

enum CourseOrder { newest, popular, title }

enum MyCoursesStatus { inProgress, completed }

class CourseQuery {
  const CourseQuery({
    this.page = 1,
    this.perPage = 20,
    this.search,
    this.category,
    this.price = PriceFilter.all,
    this.orderBy = CourseOrder.newest,
  });

  final int page;
  final int perPage;
  final String? search;
  final int? category;
  final PriceFilter price;
  final CourseOrder orderBy;

  CourseQuery copyWith({
    int? page,
    String? search,
    int? category,
    bool clearCategory = false,
    PriceFilter? price,
    CourseOrder? orderBy,
  }) => CourseQuery(
    page: page ?? this.page,
    perPage: perPage,
    search: search ?? this.search,
    category: clearCategory ? null : (category ?? this.category),
    price: price ?? this.price,
    orderBy: orderBy ?? this.orderBy,
  );

  Map<String, dynamic> toQuery() => {
    'page': page,
    'per_page': perPage,
    if (search != null && search!.trim().isNotEmpty) 'search': search!.trim(),
    if (category != null) 'category': category,
    'price': price.name,
    'orderby': orderBy.name,
  };

  @override
  bool operator ==(Object other) =>
      other is CourseQuery &&
      other.page == page &&
      other.perPage == perPage &&
      other.search == search &&
      other.category == category &&
      other.price == price &&
      other.orderBy == orderBy;

  @override
  int get hashCode =>
      Object.hash(page, perPage, search, category, price, orderBy);
}

class RegisterInput {
  const RegisterInput({
    required this.signupToken,
    required this.name,
    required this.device,
    this.email,
    this.city,
  });

  final String signupToken;
  final String name;
  final String? email;
  final String? city;
  final DeviceInput device;

  Json toJson() => {
    'signup_token': signupToken,
    'name': name,
    if (email != null && email!.isNotEmpty) 'email': email,
    if (city != null && city!.isNotEmpty) 'city': city,
    'device': device.toJson(),
  };
}

/// Every call the app makes to `<site_url>/wp-json/yallapp/v1`.
///
/// Implementations throw [ApiException] on failure.
abstract class YallappApi {
  Future<AppConfig> getConfig();
  Future<List<HomeSection>> getHome();

  Future<OtpRequestResult> requestOtp({
    required String countryCode,
    required String phone,
  });
  Future<VerifyResult> verifyOtp({
    required String requestId,
    required String code,
    required DeviceInput device,
  });
  Future<Session> register(RegisterInput input);
  Future<Tokens> refreshTokens(String refreshToken);
  Future<void> logout();

  /// Android only. Callers must check the platform first.
  Future<CheckoutLink> createCheckoutLink(int courseId);

  Future<User> getMe();
  Future<User> updateMe({String? name, String? email, String? city});
  Future<void> deleteMe();
  Future<DeviceList> listDevices();
  Future<void> removeDevice(String deviceId);
  Future<void> setPushToken(String token, NotificationPreferences preferences);

  Future<List<Category>> listCategories();
  Future<Paged<CourseSummary>> listCourses(CourseQuery query);
  Future<CourseDetail> getCourse(int courseId);
  Future<List<Topic>> getCurriculum(int courseId);
  Future<Enrollment> enrollFree(int courseId);

  Future<Paged<MyCourse>> listMyCourses({
    MyCoursesStatus status = MyCoursesStatus.inProgress,
    int page = 1,
  });
  Future<List<CourseSummary>> listWishlist();
  Future<void> addToWishlist(int courseId);
  Future<void> removeFromWishlist(int courseId);

  Future<Lesson> getLesson(int lessonId);
  Future<void> saveLessonProgress(
    int lessonId, {
    required int positionSeconds,
    required double watchedPercent,
  });
  Future<Progress> completeLesson(int lessonId);

  Future<Quiz> getQuiz(int quizId);
  Future<Attempt> startAttempt(int quizId);
  Future<AttemptResult> submitAttempt(
    int quizId,
    int attemptId,
    List<AnswerInput> answers,
  );
  Future<Paged<AttemptResult>> listMyAttempts({int page = 1});
  Future<List<Certificate>> listCertificates();
}

/// [YallappApi] over HTTP.
class HttpYallappApi implements YallappApi {
  HttpYallappApi({
    required this._dio,
    required this._refreshDio,
    required this.platform,
    required this.appVersion,
  });

  final Dio _dio;

  /// Used only for `POST /auth/refresh`, without the auth interceptor.
  final Dio _refreshDio;
  final DevicePlatform platform;
  final String appVersion;

  static const _public = AuthMode.none;
  static const _optional = AuthMode.optional;
  static const _required = AuthMode.required;

  Future<T> _call<T>(
    Future<Response<dynamic>> Function() send,
    T Function(dynamic data) parse,
  ) async {
    final Response<dynamic> response;
    try {
      response = await send();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
    try {
      return parse(response.data);
    } on FormatException catch (e) {
      throw ApiException(
        code: ApiException.invalidResponse,
        message: "The academy sent a response the app couldn't read.",
        statusCode: response.statusCode,
        details: {'reason': e.message},
      );
    }
  }

  Future<T> _get<T>(
    String path,
    AuthMode auth,
    T Function(Json json) parse, {
    Map<String, dynamic>? query,
  }) => _call(
    () => _dio.get<dynamic>(
      path,
      queryParameters: query,
      options: authOptions(auth),
    ),
    (data) => parse(asJson(data)),
  );

  Future<T> _send<T>(
    String method,
    String path,
    AuthMode auth,
    T Function(dynamic data) parse, {
    Object? body,
    Map<String, dynamic>? query,
  }) => _call(
    () => _dio.request<dynamic>(
      path,
      data: body,
      queryParameters: query,
      options: authOptions(auth, Options(method: method)),
    ),
    parse,
  );

  static void _ignore(dynamic _) {}

  @override
  Future<AppConfig> getConfig() => _get(
    '/config',
    _public,
    AppConfig.fromJson,
    query: {'platform': platform.name, 'app_version': appVersion},
  );

  @override
  Future<List<HomeSection>> getHome() => _get(
    '/home',
    _optional,
    (json) => reqListOf(json, 'sections', HomeSection.fromJson),
  );

  @override
  Future<OtpRequestResult> requestOtp({
    required String countryCode,
    required String phone,
  }) => _send(
    'POST',
    '/auth/otp/request',
    _public,
    (data) => OtpRequestResult.fromJson(asJson(data)),
    body: {'country_code': countryCode, 'phone': phone},
  );

  @override
  Future<VerifyResult> verifyOtp({
    required String requestId,
    required String code,
    required DeviceInput device,
  }) => _send(
    'POST',
    '/auth/otp/verify',
    _public,
    (data) => VerifyResult.fromJson(asJson(data)),
    body: {'request_id': requestId, 'code': code, 'device': device.toJson()},
  );

  @override
  Future<Session> register(RegisterInput input) => _send(
    'POST',
    '/auth/register',
    _public,
    (data) => Session.fromJson(asJson(data)),
    body: input.toJson(),
  );

  @override
  Future<Tokens> refreshTokens(String refreshToken) => _call(
    () => _refreshDio.post<dynamic>(
      '/auth/refresh',
      data: {'refresh_token': refreshToken},
    ),
    (data) => Tokens.fromJson(asJson(data)),
  );

  @override
  Future<void> logout() => _send('POST', '/auth/logout', _required, _ignore);

  @override
  Future<CheckoutLink> createCheckoutLink(int courseId) {
    if (platform != DevicePlatform.android) {
      // iOS never shows or opens a purchase flow (Apple's digital goods rule).
      throw const ApiException(
        code: ApiException.purchaseNotAllowed,
        message: "This course isn't available on your account yet.",
      );
    }
    return _send(
      'POST',
      '/auth/checkout-link',
      _required,
      (data) => CheckoutLink.fromJson(asJson(data)),
      body: {'course_id': courseId},
      query: {'platform': platform.name},
    );
  }

  @override
  Future<User> getMe() => _get('/me', _required, User.fromJson);

  @override
  Future<User> updateMe({String? name, String? email, String? city}) => _send(
    'PATCH',
    '/me',
    _required,
    (data) => User.fromJson(asJson(data)),
    body: {'name': ?name, 'email': ?email, 'city': ?city},
  );

  @override
  Future<void> deleteMe() => _send('DELETE', '/me', _required, _ignore);

  @override
  Future<DeviceList> listDevices() =>
      _get('/me/devices', _required, DeviceList.fromJson);

  @override
  Future<void> removeDevice(String deviceId) => _send(
    'DELETE',
    '/me/devices/${Uri.encodeComponent(deviceId)}',
    _required,
    _ignore,
  );

  @override
  Future<void> setPushToken(
    String token,
    NotificationPreferences preferences,
  ) => _send(
    'PUT',
    '/me/push-token',
    _required,
    _ignore,
    body: {'token': token, 'preferences': preferences.toJson()},
  );

  @override
  Future<List<Category>> listCategories() => _get(
    '/categories',
    _public,
    (json) => reqListOf(json, 'items', Category.fromJson),
  );

  @override
  Future<Paged<CourseSummary>> listCourses(CourseQuery query) => _get(
    '/courses',
    _optional,
    (json) => Paged.fromJson(json, CourseSummary.fromJson),
    query: query.toQuery(),
  );

  @override
  Future<CourseDetail> getCourse(int courseId) => _get(
    '/courses/$courseId',
    _optional,
    CourseDetail.fromJson,
    query: {'platform': platform.name},
  );

  @override
  Future<List<Topic>> getCurriculum(int courseId) => _get(
    '/courses/$courseId/curriculum',
    _optional,
    (json) => reqListOf(json, 'topics', Topic.fromJson),
  );

  @override
  Future<Enrollment> enrollFree(int courseId) => _send(
    'POST',
    '/courses/$courseId/enroll',
    _required,
    (data) => Enrollment.fromJson(asJson(data)),
  );

  @override
  Future<Paged<MyCourse>> listMyCourses({
    MyCoursesStatus status = MyCoursesStatus.inProgress,
    int page = 1,
  }) => _get(
    '/me/courses',
    _required,
    (json) => Paged.fromJson(json, MyCourse.fromJson),
    query: {
      'status': status == MyCoursesStatus.inProgress
          ? 'in_progress'
          : 'completed',
      'page': page,
      'per_page': 20,
    },
  );

  @override
  Future<List<CourseSummary>> listWishlist() => _get(
    '/me/wishlist',
    _required,
    (json) => reqListOf(json, 'items', CourseSummary.fromJson),
  );

  @override
  Future<void> addToWishlist(int courseId) =>
      _send('PUT', '/me/wishlist/$courseId', _required, _ignore);

  @override
  Future<void> removeFromWishlist(int courseId) =>
      _send('DELETE', '/me/wishlist/$courseId', _required, _ignore);

  @override
  Future<Lesson> getLesson(int lessonId) =>
      _get('/lessons/$lessonId', _optional, Lesson.fromJson);

  @override
  Future<void> saveLessonProgress(
    int lessonId, {
    required int positionSeconds,
    required double watchedPercent,
  }) => _send(
    'PUT',
    '/lessons/$lessonId/progress',
    _required,
    _ignore,
    body: {
      'position_seconds': positionSeconds < 0 ? 0 : positionSeconds,
      'watched_percent': double.parse(
        watchedPercent.clamp(0, 100).toStringAsFixed(1),
      ),
    },
  );

  @override
  Future<Progress> completeLesson(int lessonId) => _send(
    'POST',
    '/lessons/$lessonId/complete',
    _required,
    (data) => Progress.fromJson(asJson(data)),
  );

  @override
  Future<Quiz> getQuiz(int quizId) =>
      _get('/quizzes/$quizId', _required, Quiz.fromJson);

  @override
  Future<Attempt> startAttempt(int quizId) => _send(
    'POST',
    '/quizzes/$quizId/attempts',
    _required,
    (data) => Attempt.fromJson(asJson(data)),
  );

  @override
  Future<AttemptResult> submitAttempt(
    int quizId,
    int attemptId,
    List<AnswerInput> answers,
  ) => _send(
    'POST',
    '/quizzes/$quizId/attempts/$attemptId/submit',
    _required,
    (data) => AttemptResult.fromJson(asJson(data)),
    body: {
      'answers': [for (final a in answers) a.toJson()],
    },
  );

  @override
  Future<Paged<AttemptResult>> listMyAttempts({int page = 1}) => _get(
    '/me/quiz-attempts',
    _required,
    (json) => Paged.fromJson(json, AttemptResult.fromJson),
    query: {'page': page, 'per_page': 20},
  );

  @override
  Future<List<Certificate>> listCertificates() => _get(
    '/me/certificates',
    _required,
    (json) => reqListOf(json, 'items', Certificate.fromJson),
  );
}
