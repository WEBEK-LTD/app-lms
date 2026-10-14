import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show immutable, kIsWeb;

import 'api_exception.dart';
import 'http_client.dart';
import 'models/json.dart';
import 'models/models.dart';
import '../l10n/l10n.dart';

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

enum AppointmentsFilter { upcoming, past }

enum ProductOrder { newest, popular, rating, priceAsc, priceDesc, title }

class ProductQuery {
  const ProductQuery({
    this.page = 1,
    this.perPage = 20,
    this.search,
    this.category,
    this.onSale = false,
    this.featured = false,
    this.orderBy = ProductOrder.newest,
  });

  final int page;
  final int perPage;
  final String? search;
  final int? category;
  final bool onSale;
  final bool featured;
  final ProductOrder orderBy;

  ProductQuery copyWith({
    int? page,
    String? search,
    int? category,
    bool clearCategory = false,
    bool? onSale,
    ProductOrder? orderBy,
  }) => ProductQuery(
    page: page ?? this.page,
    perPage: perPage,
    search: search ?? this.search,
    category: clearCategory ? null : (category ?? this.category),
    onSale: onSale ?? this.onSale,
    featured: featured,
    orderBy: orderBy ?? this.orderBy,
  );

  Map<String, dynamic> toQuery() => {
    'page': page,
    'per_page': perPage,
    if (search != null && search!.trim().isNotEmpty) 'search': search!.trim(),
    if (category != null) 'category': category,
    if (onSale) 'on_sale': true,
    if (featured) 'featured': true,
    'orderby': switch (orderBy) {
      ProductOrder.priceAsc => 'price_asc',
      ProductOrder.priceDesc => 'price_desc',
      _ => orderBy.name,
    },
  };

  @override
  bool operator ==(Object other) =>
      other is ProductQuery &&
      other.page == page &&
      other.perPage == perPage &&
      other.search == search &&
      other.category == category &&
      other.onSale == onSale &&
      other.featured == featured &&
      other.orderBy == orderBy;

  @override
  int get hashCode =>
      Object.hash(page, perPage, search, category, onSale, featured, orderBy);
}

enum ListingSort { newest, priceAsc, priceDesc, areaDesc }

/// A listings search (`GET /listings`). Null filters are left out.
class ListingQuery {
  const ListingQuery({
    this.page = 1,
    this.perPage = 20,
    this.search,
    this.purpose,
    this.type,
    this.city,
    this.district,
    this.minPrice,
    this.maxPrice,
    this.minArea,
    this.maxArea,
    this.bedrooms,
    this.bathrooms,
    this.featured = false,
    this.sort = ListingSort.newest,
  });

  final int page;
  final int perPage;
  final String? search;
  final ListingPurpose? purpose;
  final String? type;
  final String? city;
  final String? district;
  final double? minPrice;
  final double? maxPrice;
  final double? minArea;
  final double? maxArea;

  /// At least this many.
  final int? bedrooms;
  final int? bathrooms;
  final bool featured;
  final ListingSort sort;

  /// Filters set in the filter sheet (not the search words, purpose or
  /// order), for the badge on the filter button.
  int get filterCount => [
    type,
    city,
    district,
    minPrice ?? maxPrice,
    minArea ?? maxArea,
    bedrooms,
    bathrooms,
  ].where((v) => v != null).length;

  ListingQuery copyWith({
    int? page,
    String? search,
    ListingSort? sort,
    ListingPurpose? purpose,
    bool clearPurpose = false,
  }) => ListingQuery(
    page: page ?? this.page,
    perPage: perPage,
    search: search ?? this.search,
    purpose: clearPurpose ? null : (purpose ?? this.purpose),
    type: type,
    city: city,
    district: district,
    minPrice: minPrice,
    maxPrice: maxPrice,
    minArea: minArea,
    maxArea: maxArea,
    bedrooms: bedrooms,
    bathrooms: bathrooms,
    featured: featured,
    sort: sort ?? this.sort,
  );

  /// The same search with the filter sheet's values replaced.
  ListingQuery withFilters({
    String? type,
    String? city,
    String? district,
    double? minPrice,
    double? maxPrice,
    double? minArea,
    double? maxArea,
    int? bedrooms,
    int? bathrooms,
  }) => ListingQuery(
    page: 1,
    perPage: perPage,
    search: search,
    purpose: purpose,
    type: type,
    city: city,
    district: city == null ? null : district,
    minPrice: minPrice,
    maxPrice: maxPrice,
    minArea: minArea,
    maxArea: maxArea,
    bedrooms: bedrooms,
    bathrooms: bathrooms,
    featured: featured,
    sort: sort,
  );

  static String _number(double value) => value == value.roundToDouble()
      ? value.toStringAsFixed(0)
      : value.toString();

  Map<String, dynamic> toQuery() => {
    'page': page,
    'per_page': perPage,
    if (search != null && search!.trim().isNotEmpty) 'search': search!.trim(),
    if (purpose != null) 'purpose': purpose!.name,
    'type': ?type,
    'city': ?city,
    'district': ?district,
    if (minPrice != null) 'min_price': _number(minPrice!),
    if (maxPrice != null) 'max_price': _number(maxPrice!),
    if (minArea != null) 'min_area': _number(minArea!),
    if (maxArea != null) 'max_area': _number(maxArea!),
    'bedrooms': ?bedrooms,
    'bathrooms': ?bathrooms,
    if (featured) 'featured': true,
    'sort': snake(sort),
  };

  @override
  bool operator ==(Object other) =>
      other is ListingQuery &&
      other.page == page &&
      other.perPage == perPage &&
      other.search == search &&
      other.purpose == purpose &&
      other.type == type &&
      other.city == city &&
      other.district == district &&
      other.minPrice == minPrice &&
      other.maxPrice == maxPrice &&
      other.minArea == minArea &&
      other.maxArea == maxArea &&
      other.bedrooms == bedrooms &&
      other.bathrooms == bathrooms &&
      other.featured == featured &&
      other.sort == sort;

  @override
  int get hashCode => Object.hash(
    page,
    perPage,
    search,
    purpose,
    type,
    city,
    district,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    bedrooms,
    bathrooms,
    featured,
    sort,
  );
}

/// An articles list (`GET /news/articles`), for News & blog apps (23).
@immutable
class ArticleQuery {
  const ArticleQuery({
    this.page = 1,
    this.perPage = 20,
    this.search = '',
    this.category,
    this.featured = false,
  });

  final int page;
  final int perPage;
  final String search;

  /// A `NewsCategory.id`.
  final String? category;
  final bool featured;

  ArticleQuery copyWith({int? page}) => ArticleQuery(
    page: page ?? this.page,
    perPage: perPage,
    search: search,
    category: category,
    featured: featured,
  );

  Map<String, dynamic> toQuery() => {
    'page': page,
    'per_page': perPage,
    if (search.trim().isNotEmpty) 'search': search.trim(),
    'category': ?category,
    if (featured) 'featured': true,
  };

  @override
  bool operator ==(Object other) =>
      other is ArticleQuery &&
      other.page == page &&
      other.perPage == perPage &&
      other.search == search &&
      other.category == category &&
      other.featured == featured;

  @override
  int get hashCode => Object.hash(page, perPage, search, category, featured);
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

/// Every call the app makes to the Yallapp API (`docs/api/openapi.yaml`),
/// served by the WordPress plugin or by a custom or hosted API.
///
/// Implementations throw [ApiException] on failure.
abstract class YallappApi {
  Future<AppConfig> getConfig();
  Future<List<HomeSection>> getHome();

  /// The published tabs and pages, or `null` when the site has none (404),
  /// or its plugin doesn't serve `/pages` yet (404 or 501): the app then
  /// keeps its built-in tabs and `/home`.
  Future<Navigation?> getPages();
  Future<AppPage> getPage(String slug);

  Future<OtpRequestResult> requestOtp({
    required String countryCode,
    required String phone,
  });
  Future<VerifyResult> verifyOtp({
    required String requestId,
    required String code,
    required DeviceInput device,
  });

  /// 18 A code by email (`Config.auth.email_sign_in: code`).
  Future<OtpRequestResult> requestEmailCode({required String email});

  /// 18 Email and password of an existing account (`email_sign_in: password`).
  Future<Session> signInWithPassword({
    required String email,
    required String password,
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

  Future<NotificationPage> listNotifications({int page = 1, int perPage = 20});
  Future<void> markNotificationsRead();
  Future<Paged<Order>> listOrders({int page = 1});

  /// 26 One of the customer's orders, for following it.
  Future<Order> getOrder(int orderId);

  Future<ReviewPage> listReviews(int courseId, {int page = 1});
  Future<Review> saveMyReview(int courseId, {required int rating, String text});
  Future<Paged<CourseQuestion>> listQuestions(int courseId, {int page = 1});
  Future<CourseQuestion> askQuestion(int courseId, String text);
  Future<QuestionThread> getQuestion(int questionId);
  Future<QuestionAnswer> answerQuestion(int questionId, String text);

  Future<List<StoreHomeSection>> getStoreHome();
  Future<List<ProductCategory>> listProductCategories();
  Future<Paged<ProductSummary>> listProducts(ProductQuery query);
  Future<ProductDetail> getProduct(int productId);
  Future<ReviewPage> listProductReviews(int productId, {int page = 1});

  /// Prices the app's cart as the shop sees it now.
  Future<CartQuote> quoteCart(List<CartLineInput> lines);

  /// A one-time link that fills the shop's cart and opens its checkout.
  /// Signed-in customers are signed in on the site; guests only when the
  /// shop allows guest checkout.
  Future<CheckoutLink> createStoreCheckoutLink(
    List<CartLineInput> lines, {
    String? deliveryDate,
    String? giftMessage,
    FulfilmentType? fulfilment,
    DeliveryAddress? deliveryAddress,
    DateTime? scheduledFor,
  });

  /// 26 Whether a restaurant's kitchen is open and when an order can be for.
  Future<OrderTimes> getOrderTimes();

  Future<List<BookingsHomeSection>> getBookingsHome();
  Future<List<ServiceCategory>> listServiceCategories();
  Future<Paged<ServiceSummary>> listServices({
    int page = 1,
    String? search,
    int? category,
  });
  Future<ServiceDetail> getService(int serviceId);

  /// Free times from [from] (the business's local date) for [days] days.
  Future<Availability> getAvailability(
    int serviceId, {
    required String from,
    int? staffId,
    int days = 7,
  });

  /// Books a `start` from [getAvailability]. Throws `slot_taken` (409) when
  /// someone else got it first.
  /// [answers]: the intake form's answers by question ID, when it has questions.
  Future<Appointment> bookAppointment({
    required int serviceId,
    required DateTime start,
    int? staffId,
    String? notes,
    Map<String, String>? answers,
  });
  Future<Paged<Appointment>> listMyAppointments({
    AppointmentsFilter filter = AppointmentsFilter.upcoming,
    int page = 1,
  });
  Future<Appointment> getMyAppointment(int appointmentId);
  Future<Appointment> cancelMyAppointment(int appointmentId);

  /// 27 Classes on the timetable from [from] to [to] (the business's local
  /// dates, both included).
  Future<ClassList> listClasses({required String from, String? to});

  /// Books a spot. Throws `class_full` (409), `membership_required` or
  /// `no_credits` (403) and `too_late` (409).
  Future<ClassSession> bookClass(int classId);

  /// Gives the spot back (and its credit). Throws `too_late` (409).
  Future<ClassSession> cancelClass(int classId);
  Future<List<MembershipPlan>> listMembershipPlans();
  Future<List<Membership>> listMyMemberships();

  /// The payment page for a plan. On iOS too: a membership is a service
  /// used in person (App Store Review Guideline 3.1.3(e)).
  Future<CheckoutLink> createMembershipCheckoutLink(int planId);

  Future<ListingFilters> getListingFilters();
  Future<Paged<ListingSummary>> searchListings(ListingQuery query);
  Future<ListingDetail> getListing(int listingId);

  /// Starts a conversation with the office, or adds to the open one.
  Future<Inquiry> sendInquiry(int listingId, String message);
  Future<Paged<ListingSummary>> listFavorites({int page = 1});
  Future<void> addFavorite(int listingId);
  Future<void> removeFavorite(int listingId);
  Future<Paged<Inquiry>> listInquiries({int page = 1});

  /// Also marks the office's messages as read.
  Future<Inquiry> getInquiry(int inquiryId);
  Future<Inquiry> replyToInquiry(int inquiryId, String message);

  // 23 News & blog apps.
  Future<NewsHome> getNewsHome();
  Future<List<NewsCategory>> listNewsCategories();
  Future<Paged<ArticleSummary>> listArticles(ArticleQuery query);
  Future<Article> getArticle(String articleId);
}

/// [YallappApi] over HTTP.
class HttpYallappApi implements YallappApi {
  HttpYallappApi({
    required this._dio,
    required this._refreshDio,
    required this.platform,
    required this.appVersion,
    String Function()? language,
    this.preview = false,
  }) : _language = language ?? (() => 'en');

  /// 17 The app preview on the web: sign-in asks for the store review number
  /// only (`preview: true`) and checkout never opens.
  final bool preview;

  final Dio _dio;

  /// The language sent as `Accept-Language`; cached pages are per language.
  final String Function() _language;

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
        message: currentL10n.errorInvalidResponse,
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

  Navigation? _pages;
  String? _pagesTag;
  String? _pagesLanguage;

  static bool _pagesStatus(int? status) =>
      status != null && ((status >= 200 && status < 300) || status == 304);

  @override
  Future<Navigation?> getPages() async {
    final language = _language();
    final cached = _pagesLanguage == language ? _pages : null;
    final Response<dynamic> response;
    try {
      response = await _dio.get<dynamic>(
        '/pages',
        queryParameters: {'platform': platform.name},
        options: authOptions(
          _optional,
          Options(
            headers: {
              // In a browser (the app preview) the browser's own cache
              // revalidates; this header would need the site's permission.
              if (cached != null && !kIsWeb)
                'If-None-Match': _pagesTag ?? cached.version,
            },
            validateStatus: _pagesStatus,
          ),
        ),
      );
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 404 || status == 501) {
        _pages = null;
        return null;
      }
      throw ApiException.fromDio(e);
    }
    if (response.statusCode == 304) {
      if (cached != null) return cached;
      // Nothing cached to reuse: ask again for the full answer.
      _pagesTag = null;
      _pages = null;
      return getPages();
    }
    final navigation = await _call(
      () async => response,
      (data) => Navigation.fromJson(asJson(data)),
    );
    _pages = navigation;
    _pagesTag = response.headers.value('etag') ?? navigation.version;
    _pagesLanguage = language;
    return navigation;
  }

  @override
  Future<AppPage> getPage(String slug) => _get(
    '/pages/${Uri.encodeComponent(slug)}',
    _optional,
    AppPage.fromJson,
    query: {'platform': platform.name},
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
    body: {
      'country_code': countryCode,
      'phone': phone,
      if (preview) 'preview': true,
    },
  );

  /// 17 What the preview shows instead of opening a checkout.
  Future<CheckoutLink> _noCheckoutInPreview() => Future.error(
    ApiException(
      code: ApiException.previewUnavailable,
      message: currentL10n.previewCheckoutNote,
    ),
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
  Future<OtpRequestResult> requestEmailCode({required String email}) => _send(
    'POST',
    '/auth/email/request',
    _public,
    (data) => OtpRequestResult.fromJson(asJson(data)),
    body: {'email': email, if (preview) 'preview': true},
  );

  @override
  Future<Session> signInWithPassword({
    required String email,
    required String password,
    required DeviceInput device,
  }) => _send(
    'POST',
    '/auth/password',
    _public,
    (data) => Session.fromJson(asJson(data)),
    body: {
      'email': email,
      'password': password,
      'device': device.toJson(),
      if (preview) 'preview': true,
    },
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
      return Future.error(
        ApiException(
          code: ApiException.purchaseNotAllowed,
          message: currentL10n.errorPurchaseNotAllowed,
        ),
      );
    }
    if (preview) return _noCheckoutInPreview();
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

  @override
  Future<NotificationPage> listNotifications({
    int page = 1,
    int perPage = 20,
  }) => _get(
    '/me/notifications',
    _required,
    NotificationPage.fromJson,
    query: {'page': page, 'per_page': perPage},
  );

  @override
  Future<void> markNotificationsRead() =>
      _send('POST', '/me/notifications/read', _required, _ignore);

  @override
  Future<Paged<Order>> listOrders({int page = 1}) => _get(
    '/me/orders',
    _required,
    (json) => Paged.fromJson(json, Order.fromJson),
    query: {'page': page, 'per_page': 20},
  );

  @override
  Future<Order> getOrder(int orderId) =>
      _get('/me/orders/$orderId', _required, Order.fromJson);

  @override
  Future<ReviewPage> listReviews(int courseId, {int page = 1}) => _get(
    '/courses/$courseId/reviews',
    _optional,
    ReviewPage.fromJson,
    query: {'page': page, 'per_page': 20},
  );

  @override
  Future<Review> saveMyReview(
    int courseId, {
    required int rating,
    String text = '',
  }) => _send(
    'PUT',
    '/courses/$courseId/reviews/mine',
    _required,
    (data) => Review.fromJson(asJson(data)),
    body: {'rating': rating.clamp(1, 5), 'text': text.trim()},
  );

  @override
  Future<Paged<CourseQuestion>> listQuestions(int courseId, {int page = 1}) =>
      _get(
        '/courses/$courseId/questions',
        _required,
        (json) => Paged.fromJson(json, CourseQuestion.fromJson),
        query: {'page': page, 'per_page': 20},
      );

  @override
  Future<CourseQuestion> askQuestion(int courseId, String text) => _send(
    'POST',
    '/courses/$courseId/questions',
    _required,
    (data) => CourseQuestion.fromJson(asJson(data)),
    body: {'text': text.trim()},
  );

  @override
  Future<QuestionThread> getQuestion(int questionId) =>
      _get('/questions/$questionId', _required, QuestionThread.fromJson);

  @override
  Future<QuestionAnswer> answerQuestion(int questionId, String text) => _send(
    'POST',
    '/questions/$questionId/answers',
    _required,
    (data) => QuestionAnswer.fromJson(asJson(data)),
    body: {'text': text.trim()},
  );

  @override
  Future<List<StoreHomeSection>> getStoreHome() => _get(
    '/store/home',
    _public,
    (json) => reqListOf(json, 'sections', StoreHomeSection.fromJson),
  );

  @override
  Future<List<ProductCategory>> listProductCategories() => _get(
    '/store/categories',
    _public,
    (json) => reqListOf(json, 'items', ProductCategory.fromJson),
  );

  @override
  Future<Paged<ProductSummary>> listProducts(ProductQuery query) => _get(
    '/store/products',
    _public,
    (json) => Paged.fromJson(json, ProductSummary.fromJson),
    query: query.toQuery(),
  );

  @override
  Future<ProductDetail> getProduct(int productId) =>
      _get('/store/products/$productId', _public, ProductDetail.fromJson);

  @override
  Future<ReviewPage> listProductReviews(int productId, {int page = 1}) => _get(
    '/store/products/$productId/reviews',
    _optional,
    ReviewPage.fromJson,
    query: {'page': page, 'per_page': 20},
  );

  @override
  Future<CartQuote> quoteCart(List<CartLineInput> lines) => _send(
    'POST',
    '/store/cart',
    _optional,
    (data) => CartQuote.fromJson(asJson(data)),
    body: {
      'lines': [for (final l in lines) l.toJson()],
    },
    query: {'platform': platform.name},
  );

  @override
  Future<CheckoutLink> createStoreCheckoutLink(
    List<CartLineInput> lines, {
    String? deliveryDate,
    String? giftMessage,
    FulfilmentType? fulfilment,
    DeliveryAddress? deliveryAddress,
    DateTime? scheduledFor,
  }) => preview
      ? _noCheckoutInPreview()
      : _send(
          'POST',
          '/store/checkout-link',
          _optional,
          (data) => CheckoutLink.fromJson(asJson(data)),
          body: {
            'lines': [for (final l in lines) l.toJson()],
            'delivery_date': ?deliveryDate,
            if (giftMessage != null && giftMessage.trim().isNotEmpty)
              'gift_message': giftMessage.trim(),
            if (fulfilment != null) 'fulfilment': fulfilment.name,
            if (fulfilment == FulfilmentType.delivery &&
                deliveryAddress != null)
              'delivery_address': deliveryAddress.toJson(),
            if (scheduledFor != null)
              'scheduled_for': scheduledFor.toUtc().toIso8601String(),
          },
          query: {'platform': platform.name},
        );

  @override
  Future<OrderTimes> getOrderTimes() =>
      _get('/store/order-times', _public, OrderTimes.fromJson);

  @override
  Future<List<BookingsHomeSection>> getBookingsHome() => _get(
    '/bookings/home',
    _optional,
    (json) => reqListOf(json, 'sections', BookingsHomeSection.fromJson),
  );

  @override
  Future<List<ServiceCategory>> listServiceCategories() => _get(
    '/bookings/categories',
    _public,
    (json) => reqListOf(json, 'items', ServiceCategory.fromJson),
  );

  @override
  Future<Paged<ServiceSummary>> listServices({
    int page = 1,
    String? search,
    int? category,
  }) => _get(
    '/bookings/services',
    _public,
    (json) => Paged.fromJson(json, ServiceSummary.fromJson),
    query: {
      'page': page,
      'per_page': 50,
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      'category': ?category,
    },
  );

  @override
  Future<ServiceDetail> getService(int serviceId) =>
      _get('/bookings/services/$serviceId', _public, ServiceDetail.fromJson);

  @override
  Future<Availability> getAvailability(
    int serviceId, {
    required String from,
    int? staffId,
    int days = 7,
  }) => _get(
    '/bookings/availability',
    _optional,
    Availability.fromJson,
    query: {
      'service': serviceId,
      'staff': ?staffId,
      'from': from,
      'days': days,
    },
  );

  @override
  Future<Appointment> bookAppointment({
    required int serviceId,
    required DateTime start,
    int? staffId,
    String? notes,
    Map<String, String>? answers,
  }) => _send(
    'POST',
    '/bookings/appointments',
    _required,
    (data) => Appointment.fromJson(asJson(data)),
    body: {
      'service_id': serviceId,
      'staff_id': staffId,
      'start': start.toUtc().toIso8601String(),
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
      if (answers != null && answers.isNotEmpty) 'answers': answers,
    },
    query: {'platform': platform.name},
  );

  @override
  Future<Paged<Appointment>> listMyAppointments({
    AppointmentsFilter filter = AppointmentsFilter.upcoming,
    int page = 1,
  }) => _get(
    '/me/appointments',
    _required,
    (json) => Paged.fromJson(json, Appointment.fromJson),
    query: {'status': filter.name, 'page': page, 'per_page': 20},
  );

  @override
  Future<Appointment> getMyAppointment(int appointmentId) =>
      _get('/me/appointments/$appointmentId', _required, Appointment.fromJson);

  @override
  Future<Appointment> cancelMyAppointment(int appointmentId) => _send(
    'POST',
    '/me/appointments/$appointmentId/cancel',
    _required,
    (data) => Appointment.fromJson(asJson(data)),
  );

  @override
  Future<ClassList> listClasses({required String from, String? to}) => _get(
    '/bookings/classes',
    _optional,
    ClassList.fromJson,
    query: {'from': from, 'to': ?to},
  );

  @override
  Future<ClassSession> bookClass(int classId) => _send(
    'POST',
    '/bookings/classes/$classId/book',
    _required,
    (data) => ClassSession.fromJson(asJson(data)),
  );

  @override
  Future<ClassSession> cancelClass(int classId) => _send(
    'POST',
    '/bookings/classes/$classId/cancel',
    _required,
    (data) => ClassSession.fromJson(asJson(data)),
  );

  @override
  Future<List<MembershipPlan>> listMembershipPlans() => _get(
    '/memberships/plans',
    _optional,
    (json) => reqListOf(json, 'items', MembershipPlan.fromJson),
  );

  @override
  Future<List<Membership>> listMyMemberships() => _get(
    '/me/memberships',
    _required,
    (json) => reqListOf(json, 'items', Membership.fromJson),
  );

  @override
  Future<CheckoutLink> createMembershipCheckoutLink(int planId) => preview
      ? _noCheckoutInPreview()
      : _send(
          'POST',
          '/memberships/checkout-link',
          _required,
          (data) => CheckoutLink.fromJson(asJson(data)),
          body: {'plan_id': planId},
          query: {'platform': platform.name},
        );

  @override
  Future<ListingFilters> getListingFilters() =>
      _get('/listings/filters', _optional, ListingFilters.fromJson);

  @override
  Future<Paged<ListingSummary>> searchListings(ListingQuery query) => _get(
    '/listings',
    _optional,
    (json) => Paged.fromJson(json, ListingSummary.fromJson),
    query: query.toQuery(),
  );

  @override
  Future<ListingDetail> getListing(int listingId) =>
      _get('/listings/$listingId', _optional, ListingDetail.fromJson);

  @override
  Future<Inquiry> sendInquiry(int listingId, String message) => _send(
    'POST',
    '/listings/$listingId/inquiries',
    _required,
    (data) => Inquiry.fromJson(asJson(data)),
    body: {'message': message.trim()},
  );

  @override
  Future<Paged<ListingSummary>> listFavorites({int page = 1}) => _get(
    '/me/favorites',
    _required,
    (json) => Paged.fromJson(json, ListingSummary.fromJson),
    query: {'page': page, 'per_page': 20},
  );

  @override
  Future<void> addFavorite(int listingId) =>
      _send('PUT', '/me/favorites/$listingId', _required, _ignore);

  @override
  Future<void> removeFavorite(int listingId) =>
      _send('DELETE', '/me/favorites/$listingId', _required, _ignore);

  @override
  Future<Paged<Inquiry>> listInquiries({int page = 1}) => _get(
    '/me/inquiries',
    _required,
    (json) => Paged.fromJson(json, Inquiry.fromJson),
    query: {'page': page, 'per_page': 20},
  );

  @override
  Future<Inquiry> getInquiry(int inquiryId) =>
      _get('/me/inquiries/$inquiryId', _required, Inquiry.fromJson);

  @override
  Future<Inquiry> replyToInquiry(int inquiryId, String message) => _send(
    'POST',
    '/me/inquiries/$inquiryId/messages',
    _required,
    (data) => Inquiry.fromJson(asJson(data)),
    body: {'message': message.trim()},
  );

  @override
  Future<NewsHome> getNewsHome() =>
      _get('/news/home', _optional, NewsHome.fromJson);

  @override
  Future<List<NewsCategory>> listNewsCategories() => _get(
    '/news/categories',
    _optional,
    (json) => reqListOf(json, 'items', NewsCategory.fromJson),
  );

  @override
  Future<Paged<ArticleSummary>> listArticles(ArticleQuery query) => _get(
    '/news/articles',
    _optional,
    (json) => Paged.fromJson(json, ArticleSummary.fromJson),
    query: query.toQuery(),
  );

  @override
  Future<Article> getArticle(String articleId) => _get(
    '/news/articles/${Uri.encodeComponent(articleId)}',
    _optional,
    Article.fromJson,
  );
}
