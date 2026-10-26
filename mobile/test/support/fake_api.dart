import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/json.dart' show snake;
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

  /// `DeviceList.limit` (0: no limit).
  int deviceLimit = 2;

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

  String? lastEmail;
  String? lastPassword;

  @override
  Future<OtpRequestResult> requestEmailCode({required String email}) {
    lastEmail = email;
    return _answer(
      'requestEmailCode',
      () => OtpRequestResult.fromJson({
        'request_id': 'req-email-1',
        'code_length': 6,
        'resend_after_seconds': 45,
        'expires_in_seconds': 300,
      }),
    );
  }

  @override
  Future<Session> signInWithPassword({
    required String email,
    required String password,
    required DeviceInput device,
  }) {
    lastEmail = email;
    lastPassword = password;
    return _answer('signInWithPassword', () => Session.fromJson(sessionJson()));
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

  /// 48 What `GET /links/resolve` answers, by address (none: kind null).
  final resolvedLinks = <String, Map<String, dynamic>>{};
  final resolvedUrls = <String>[];

  @override
  Future<LinkResolution> resolveLink(String url) => _answer('resolveLink', () {
    resolvedUrls.add(url);
    return LinkResolution.fromJson(
      resolvedLinks[url] ?? {'kind': null, 'id': null},
    );
  });

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
      'limit': deviceLimit,
    }),
  );

  @override
  Future<void> removeDevice(String deviceId) => _answer('removeDevice', () {});

  @override
  Future<void> setPushToken(
    String token,
    NotificationPreferences preferences, {
    PushProvider provider = PushProvider.fcm,
    String? language,
  }) => _answer('setPushToken', () {
    pushTokens.add((token: token, provider: provider));
    pushLanguages.add(language);
  });

  /// 36 The push tokens the app registered, with their provider.
  final pushTokens = <({String token, PushProvider provider})>[];

  /// 85.1 The language sent with each of them.
  final pushLanguages = <String?>[];

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
    () => Paged.fromJson(
      pageJson([courseSummaryJson(enrolled: catalogEnrolled)]),
      CourseSummary.fromJson,
    ),
  );

  /// 45 Whether the catalog's course says the student is enrolled.
  bool catalogEnrolled = false;

  @override
  Future<CourseDetail> getCourse(int courseId) =>
      _answer('getCourse', () => CourseDetail.fromJson(course));

  /// 45 The curriculum `getCurriculum` answers; [curriculumJson] by default.
  Map<String, dynamic>? curriculum;

  @override
  Future<List<Topic>> getCurriculum(int courseId) => _answer(
    'getCurriculum',
    () => [
      for (final t in (curriculum ?? curriculumJson())['topics'] as List)
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

  /// 73 Every course started again.
  final restarted = <int>[];

  @override
  Future<Progress> restartCourse(int courseId) => _answer('restartCourse', () {
    restarted.add(courseId);
    return Progress.fromJson({
      'course_id': courseId,
      'completed_items': 0,
      'total_items': 20,
      'percent': 0,
      'course_completed': false,
      'completed_at': null,
    });
  });

  @override
  Future<Paged<MyCourse>> listMyCourses({
    MyCoursesStatus status = MyCoursesStatus.inProgress,
    int page = 1,
  }) => _answer(
    'listMyCourses',
    () => Paged.fromJson(
      pageJson(
        status == MyCoursesStatus.completed
            ? completedCourses
            : [myCourseJson()],
      ),
      MyCourse.fromJson,
    ),
  );

  /// 45 What My courses › Completed lists.
  List<Map<String, dynamic>> completedCourses = [];

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
      _answer('getLesson', () => Lesson.fromJson(lessons[lessonId] ?? lesson));

  /// 45 Lessons by ID; [lesson] for the others.
  final lessons = <int, Map<String, dynamic>>{};

  @override
  Future<void> saveLessonProgress(
    int lessonId, {
    required int positionSeconds,
    required double watchedPercent,
  }) => _answer(
    'saveLessonProgress',
    () => savedProgress.add((positionSeconds, watchedPercent)),
  );

  /// 40 Every progress report: position in seconds and watched percent.
  final savedProgress = <(int, double)>[];

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

  /// 45 What `downloadLesson` answers, per lesson; a video file by default.
  final downloads = <int, Map<String, dynamic>>{};

  @override
  Future<LessonDownload> downloadLesson(int lessonId) => _answer(
    'downloadLesson',
    () => LessonDownload.fromJson(
      downloads[lessonId] ??
          {
            'lesson_id': lessonId,
            'course_id': 1,
            'files': [
              {
                'kind': 'video',
                'url': 'https://academy.test/wp-json/yallapp/v1/media/9?dl=1',
              },
            ],
            'expires_at': DateTime.now()
                .add(const Duration(minutes: 15))
                .toUtc()
                .toIso8601String(),
            'keep_days': 30,
          },
    ),
  );

  /// 45 Lessons `checkDownloads` refuses, and whether downloads are on.
  final refusedDownloads = <int>{};
  bool downloadsOn = true;

  @override
  Future<DownloadCheck> checkDownloads(List<int> lessonIds) => _answer(
    'checkDownloads',
    () => DownloadCheck(
      allowed: [
        for (final id in lessonIds)
          if (downloadsOn && !refusedDownloads.contains(id)) id,
      ],
      refused: [
        for (final id in lessonIds)
          if (!downloadsOn || refusedDownloads.contains(id)) id,
      ],
      downloads: downloadsOn,
    ),
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

  @override
  Future<List<SiteSubscription>> listSubscriptions() => _answer(
    'listSubscriptions',
    () => [for (final s in subscriptions) SiteSubscription.fromJson(s)],
  );

  /// 90.3 `GET /me/subscriptions` items.
  List<Map<String, dynamic>> subscriptions = [];

  List<Map<String, dynamic>> notifications = [
    notificationJson(),
    notificationJson(id: 2, type: 'qna_answer', courseId: 42, questionId: 3),
  ];

  @override
  Future<NotificationPage> listNotifications({
    int page = 1,
    int perPage = 20,
  }) => _answer(
    'listNotifications',
    () => NotificationPage.fromJson({
      ...pageJson(notifications),
      'unread_count': notifications.where((n) => n['read'] != true).length,
    }),
  );

  @override
  Future<ChatSession> startChatSession() => _answer(
    'startChatSession',
    () => ChatSession(
      token: 'chat-token-${count('startChatSession')}',
      expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
      baseUrl: 'https://yallapp.example/api/app/app-1',
    ),
  );

  /// 85.3 The item counts the app reported for its cart.
  final carts = <int>[];

  @override
  Future<void> setCart(int items) => _answer('setCart', () => carts.add(items));

  @override
  Future<void> markNotificationsRead() => _answer('markNotificationsRead', () {
    notifications = [
      for (final n in notifications) {...n, 'read': true},
    ];
  });

  /// 71 What `GET /me/orders` answers.
  List<Map<String, dynamic>> orders = [orderJson()];

  @override
  Future<Paged<Order>> listOrders({int page = 1}) => _answer(
    'listOrders',
    () => Paged.fromJson(pageJson(orders), Order.fromJson),
  );

  Map<String, dynamic> order = orderJson();

  @override
  Future<Order> getOrder(int orderId) =>
      _answer('getOrder', () => Order.fromJson(order));

  /// 91.3 What the last return request said.
  ({ReturnReason reason, String? note})? lastReturn;

  @override
  Future<Order> requestReturn(
    int orderId, {
    required ReturnReason reason,
    String? note,
  }) => _answer('requestReturn', () {
    lastReturn = (reason: reason, note: note);
    order = {
      ...order,
      'can_return': false,
      'return_request': {
        'status': 'requested',
        'reason': snake(reason),
        'note': note,
        'requested_at': '2026-10-26T12:00:00Z',
        'decided_at': null,
        'reply': null,
      },
    };
    return Order.fromJson(order);
  });

  Map<String, dynamic> orderTimes = orderTimesJson();

  @override
  Future<OrderTimes> getOrderTimes() =>
      _answer('getOrderTimes', () => OrderTimes.fromJson(orderTimes));

  Map<String, dynamic> reviews = reviewPageJson();

  @override
  Future<ReviewPage> listReviews(int courseId, {int page = 1}) =>
      _answer('listReviews', () => ReviewPage.fromJson(reviews));

  ({int rating, String text})? savedReview;

  @override
  Future<Review> saveMyReview(
    int courseId, {
    required int rating,
    String text = '',
  }) => _answer('saveMyReview', () {
    savedReview = (rating: rating, text: text);
    final review = reviewJson(id: 9, rating: rating, mine: true);
    reviews = {...reviews, 'mine': review};
    return Review.fromJson(review);
  });

  List<Map<String, dynamic>> questions = [questionJson()];

  @override
  Future<Paged<CourseQuestion>> listQuestions(int courseId, {int page = 1}) =>
      _answer(
        'listQuestions',
        () => Paged.fromJson(pageJson(questions), CourseQuestion.fromJson),
      );

  String? lastQuestion;

  @override
  Future<CourseQuestion> askQuestion(int courseId, String text) =>
      _answer('askQuestion', () {
        lastQuestion = text;
        final question = {...questionJson(id: 5, answers: 0), 'text': text};
        questions = [question, ...questions];
        return CourseQuestion.fromJson(question);
      });

  /// 64 The thread `getQuestion` answers; the fixture's when null.
  Map<String, dynamic>? thread;

  @override
  Future<QuestionThread> getQuestion(int questionId) => _answer(
    'getQuestion',
    () => QuestionThread.fromJson(thread ?? questionThreadJson()),
  );

  String? lastAnswer;

  @override
  Future<QuestionAnswer> answerQuestion(int questionId, String text) =>
      _answer('answerQuestion', () {
        lastAnswer = text;
        return QuestionAnswer.fromJson({
          'id': 6,
          'text': text,
          'author': personJson(),
          'created_at': '2026-10-03T12:00:00Z',
          'mine': true,
        });
      });

  @override
  Future<List<StoreHomeSection>> getStoreHome() => _answer(
    'getStoreHome',
    () => [
      for (final s in storeHomeJson()['sections'] as List)
        StoreHomeSection.fromJson(s as Map<String, dynamic>),
    ],
  );

  @override
  Future<List<ProductCategory>> listProductCategories() => _answer(
    'listProductCategories',
    () => [
      ProductCategory.fromJson(productCategoryJson()),
      ProductCategory.fromJson(productCategoryJson(id: 6, name: 'Gifts')),
    ],
  );

  ProductQuery? lastProductQuery;

  @override
  Future<Paged<ProductSummary>> listProducts(ProductQuery query) {
    lastProductQuery = query;
    return _answer(
      'listProducts',
      () => Paged.fromJson(
        pageJson([
          productSummaryJson(),
          productSummaryJson(id: 22, name: 'Chocolate Box'),
        ]),
        ProductSummary.fromJson,
      ),
    );
  }

  Map<String, dynamic> product = productDetailJson();

  @override
  Future<ProductDetail> getProduct(int productId) =>
      _answer('getProduct', () => ProductDetail.fromJson(product));

  @override
  Future<ReviewPage> listProductReviews(int productId, {int page = 1}) =>
      _answer('listProductReviews', () => ReviewPage.fromJson(reviews));

  Map<String, dynamic> cartQuote = cartQuoteJson();
  List<CartLineInput>? lastCartLines;

  /// 91.1 The coupon of the last quote or checkout.
  String? lastCoupon;

  @override
  Future<CartQuote> quoteCart(List<CartLineInput> lines, {String? coupon}) {
    lastCartLines = lines;
    lastCoupon = coupon;
    return _answer('quoteCart', () => CartQuote.fromJson(cartQuote));
  }

  ({String? deliveryDate, String? giftMessage})? lastStoreCheckout;

  /// 26 How the last restaurant checkout wanted the order.
  ({
    FulfilmentType? fulfilment,
    DeliveryAddress? address,
    DateTime? scheduledFor,
  })?
  lastFulfilment;

  @override
  Future<CheckoutLink> createStoreCheckoutLink(
    List<CartLineInput> lines, {
    String? deliveryDate,
    String? giftMessage,
    FulfilmentType? fulfilment,
    DeliveryAddress? deliveryAddress,
    DateTime? scheduledFor,
    String? coupon,
  }) {
    lastCartLines = lines;
    lastCoupon = coupon;
    lastStoreCheckout = (deliveryDate: deliveryDate, giftMessage: giftMessage);
    lastFulfilment = (
      fulfilment: fulfilment,
      address: deliveryAddress,
      scheduledFor: scheduledFor,
    );
    return _answer(
      'createStoreCheckoutLink',
      () => CheckoutLink.fromJson({
        'url': 'https://your-shop.com/?yallapp_link=abc',
        'expires_at': '2030-01-01T00:00:00Z',
        'open_in': 'in_app',
      }),
    );
  }

  @override
  Future<List<BookingsHomeSection>> getBookingsHome() => _answer(
    'getBookingsHome',
    () => [
      for (final s in bookingsHomeJson()['sections'] as List)
        BookingsHomeSection.fromJson(s as Map<String, dynamic>),
    ],
  );

  @override
  Future<List<ServiceCategory>> listServiceCategories() => _answer(
    'listServiceCategories',
    () => [
      ServiceCategory.fromJson({'id': 1, 'name': 'Hair', 'count': 2}),
      ServiceCategory.fromJson({'id': 2, 'name': 'Spa', 'count': 1}),
    ],
  );

  ({String? search, int? category})? lastServicesQuery;

  @override
  Future<Paged<ServiceSummary>> listServices({
    int page = 1,
    String? search,
    int? category,
  }) {
    lastServicesQuery = (search: search, category: category);
    return _answer(
      'listServices',
      () => Paged.fromJson(
        pageJson([
          serviceSummaryJson(),
          serviceSummaryJson(
            id: 3,
            name: 'Massage',
            minutes: 60,
            price: '600.00',
          ),
        ]),
        ServiceSummary.fromJson,
      ),
    );
  }

  Map<String, dynamic> service = serviceDetailJson();

  @override
  Future<ServiceDetail> getService(int serviceId) =>
      _answer('getService', () => ServiceDetail.fromJson(service));

  bool noFreeTimes = false;
  ({int service, int? staff, String from})? lastAvailability;

  @override
  Future<Availability> getAvailability(
    int serviceId, {
    required String from,
    int? staffId,
    int days = 7,
  }) {
    lastAvailability = (service: serviceId, staff: staffId, from: from);
    return _answer(
      'getAvailability',
      () => Availability.fromJson(availabilityJson(from, empty: noFreeTimes)),
    );
  }

  ({
    int service,
    DateTime start,
    int? staff,
    String? notes,
    Map<String, String>? answers,
  })?
  lastBooking;

  @override
  Future<Appointment> bookAppointment({
    required int serviceId,
    required DateTime start,
    int? staffId,
    String? notes,
    Map<String, String>? answers,
  }) {
    lastBooking = (
      service: serviceId,
      start: start,
      staff: staffId,
      notes: notes,
      answers: answers,
    );
    return _answer(
      'bookAppointment',
      () => Appointment.fromJson(appointmentJson()),
    );
  }

  List<Map<String, dynamic>> upcoming = [appointmentJson()];

  @override
  Future<Paged<Appointment>> listMyAppointments({
    AppointmentsFilter filter = AppointmentsFilter.upcoming,
    int page = 1,
  }) => _answer(
    'listMyAppointments',
    () => Paged.fromJson(
      pageJson(
        filter == AppointmentsFilter.upcoming
            ? upcoming
            : [appointmentJson(id: 5, status: 'cancelled', canCancel: false)],
      ),
      Appointment.fromJson,
    ),
  );

  Map<String, dynamic> appointment = appointmentJson();

  @override
  Future<Appointment> getMyAppointment(int appointmentId) =>
      _answer('getMyAppointment', () => Appointment.fromJson(appointment));

  @override
  Future<Appointment> cancelMyAppointment(int appointmentId) =>
      _answer('cancelMyAppointment', () {
        appointment = appointmentJson(status: 'cancelled', canCancel: false);
        upcoming = [];
        return Appointment.fromJson(appointment);
      });

  // 27 A gym's classes and memberships.

  /// The timetable `GET /bookings/classes` answers with (every day).
  List<Map<String, dynamic>> classes = [];
  List<Map<String, dynamic>> plans = [];
  List<Map<String, dynamic>> memberships = [];
  ({String from, String? to})? lastClassesQuery;
  int? lastPlanBought;

  @override
  Future<ClassList> listClasses({required String from, String? to}) {
    lastClassesQuery = (from: from, to: to);
    return _answer(
      'listClasses',
      () =>
          ClassList.fromJson({'timezone': 'Europe/Istanbul', 'items': classes}),
    );
  }

  /// Books like the server: the spot is the member's and one fewer is left.
  @override
  Future<ClassSession> bookClass(int classId) => _answer('bookClass', () {
    final i = classes.indexWhere((c) => c['id'] == classId);
    final booked = {
      ...classes[i],
      'booked': true,
      'can_cancel': true,
      'spots_left': (classes[i]['spots_left'] as int) - 1,
    };
    classes = [...classes]..[i] = booked;
    return ClassSession.fromJson(booked);
  });

  @override
  Future<ClassSession> cancelClass(int classId) => _answer('cancelClass', () {
    final i = classes.indexWhere((c) => c['id'] == classId);
    final freed = {
      ...classes[i],
      'booked': false,
      'can_cancel': false,
      'spots_left': (classes[i]['spots_left'] as int) + 1,
    };
    classes = [...classes]..[i] = freed;
    return ClassSession.fromJson(freed);
  });

  @override
  Future<List<MembershipPlan>> listMembershipPlans() => _answer(
    'listMembershipPlans',
    () => [for (final p in plans) MembershipPlan.fromJson(p)],
  );

  @override
  Future<List<Membership>> listMyMemberships() => _answer(
    'listMyMemberships',
    () => [for (final m in memberships) Membership.fromJson(m)],
  );

  @override
  Future<CheckoutLink> createMembershipCheckoutLink(int planId) {
    lastPlanBought = planId;
    return _answer(
      'createMembershipCheckoutLink',
      () => CheckoutLink.fromJson({
        'url': 'https://yallapp.com.tr/pay/token-1',
        'expires_at': '2026-10-12T11:00:00Z',
        'open_in': 'in_app',
      }),
    );
  }

  /// `GET /pages`: null answers like a site without pages (404).
  Map<String, dynamic>? navigation;

  /// `GET /pages/{slug}` by slug; other slugs answer 404.
  Map<String, Map<String, dynamic>> pages = {};

  @override
  Future<Navigation?> getPages() => _answer(
    'getPages',
    () => navigation == null ? null : Navigation.fromJson(navigation!),
  );

  @override
  Future<AppPage> getPage(String slug) => _answer('getPage', () {
    final page = pages[slug];
    if (page == null) {
      throw const ApiException(
        code: 'not_found',
        message: "We couldn't find what you were looking for.",
        statusCode: 404,
      );
    }
    return AppPage.fromJson(page);
  });

  List<Map<String, dynamic>> listings = [
    listingSummaryJson(),
    listingSummaryJson(id: 43, title: 'Garden duplex', purpose: 'rent'),
  ];
  Map<String, dynamic> listing = listingDetailJson();
  List<Map<String, dynamic>> favorites = [listingSummaryJson(favorited: true)];
  List<Map<String, dynamic>> inquiries = [inquiryJson()];
  Map<String, dynamic> inquiry = inquiryJson();
  ListingQuery? lastListingQuery;
  String? lastInquiry;
  String? lastReply;

  @override
  Future<ListingFilters> getListingFilters() => _answer(
    'getListingFilters',
    () => ListingFilters.fromJson(listingFiltersJson()),
  );

  @override
  Future<Paged<ListingSummary>> searchListings(ListingQuery query) {
    lastListingQuery = query;
    return _answer(
      'searchListings',
      () => Paged.fromJson(pageJson(listings), ListingSummary.fromJson),
    );
  }

  @override
  Future<ListingDetail> getListing(int listingId) =>
      _answer('getListing', () => ListingDetail.fromJson(listing));

  @override
  Future<Inquiry> sendInquiry(int listingId, String message) {
    lastInquiry = message;
    return _answer('sendInquiry', () => Inquiry.fromJson(inquiry));
  }

  @override
  Future<Paged<ListingSummary>> listFavorites({int page = 1}) => _answer(
    'listFavorites',
    () => Paged.fromJson(pageJson(favorites), ListingSummary.fromJson),
  );

  @override
  Future<void> addFavorite(int listingId) => _answer('addFavorite', () {});

  @override
  Future<void> removeFavorite(int listingId) =>
      _answer('removeFavorite', () {});

  @override
  Future<Paged<Inquiry>> listInquiries({int page = 1}) => _answer(
    'listInquiries',
    () => Paged.fromJson(pageJson(inquiries), Inquiry.fromJson),
  );

  @override
  Future<Inquiry> getInquiry(int inquiryId) =>
      _answer('getInquiry', () => Inquiry.fromJson(inquiry));

  @override
  Future<Inquiry> replyToInquiry(int inquiryId, String message) {
    lastReply = message;
    return _answer('replyToInquiry', () {
      final messages = [
        ...(inquiry['messages'] as List).cast<Map<String, dynamic>>(),
        {
          'id': 99,
          'from': 'user',
          'text': message,
          'created_at': '2026-10-12T11:00:00Z',
        },
      ];
      inquiry = {...inquiry, 'messages': messages, 'unread': 0};
      return Inquiry.fromJson(inquiry);
    });
  }

  // News & blog (23).

  Map<String, dynamic> newsHome = newsHomeJson();
  List<Map<String, dynamic>> newsCategories = [
    newsCategoryJson(),
    newsCategoryJson(id: '8', name: 'Sport', count: 1),
  ];
  List<Map<String, dynamic>> articles = [
    articleSummaryJson(featured: true),
    articleSummaryJson(id: '1043', title: 'A late goal wins the derby'),
  ];
  Map<String, dynamic> article = articleJson();
  final articleQueries = <ArticleQuery>[];
  String? lastArticleId;

  @override
  Future<NewsHome> getNewsHome() =>
      _answer('getNewsHome', () => NewsHome.fromJson(newsHome));

  @override
  Future<List<NewsCategory>> listNewsCategories() => _answer(
    'listNewsCategories',
    () => [for (final c in newsCategories) NewsCategory.fromJson(c)],
  );

  @override
  Future<Paged<ArticleSummary>> listArticles(ArticleQuery query) {
    articleQueries.add(query);
    return _answer(
      'listArticles',
      () => Paged.fromJson(pageJson(articles), ArticleSummary.fromJson),
    );
  }

  @override
  Future<Article> getArticle(String articleId) {
    lastArticleId = articleId;
    return _answer('getArticle', () => Article.fromJson(article));
  }

  // Events & tickets (28).

  Map<String, dynamic> eventFilters = {
    'categories': [
      {'id': 'concerts', 'name': 'Concerts', 'count': 2},
      {'id': 'film', 'name': 'Film', 'count': 1},
    ],
    'first_date': null,
    'last_date': null,
  };
  List<Map<String, dynamic>> events = [
    eventSummaryJson(),
    eventSummaryJson(
      id: 8,
      title: 'Saturday Film Club',
      daysAhead: 3,
      priceLabel: 'Free',
      category: 'Film',
    ),
    eventSummaryJson(
      id: 9,
      title: 'Online masterclass',
      daysAhead: 9,
      venue: false,
      online: true,
      priceLabel: '₺150.00',
      spotsLeft: null,
      category: null,
    ),
  ];
  Map<String, dynamic> event = eventDetailJson();
  List<Map<String, dynamic>> tickets = [ticketJson()];
  final eventQueries = <EventQuery>[];
  int? lastEventId;
  ({int eventId, int ticketTypeId, int quantity, List<String> names})?
  lastTicketOrder;
  String? lastCancelledTicket;

  @override
  Future<EventFilters> getEventFilters() =>
      _answer('getEventFilters', () => EventFilters.fromJson(eventFilters));

  @override
  Future<Paged<EventSummary>> listEvents(EventQuery query) {
    eventQueries.add(query);
    return _answer(
      'listEvents',
      () => Paged.fromJson(pageJson(events), EventSummary.fromJson),
    );
  }

  @override
  Future<EventDetail> getEvent(int eventId) {
    lastEventId = eventId;
    return _answer('getEvent', () => EventDetail.fromJson(event));
  }

  @override
  Future<List<Ticket>> registerForEvent(
    int eventId, {
    required int ticketTypeId,
    required int quantity,
    List<String> attendeeNames = const [],
  }) {
    lastTicketOrder = (
      eventId: eventId,
      ticketTypeId: ticketTypeId,
      quantity: quantity,
      names: attendeeNames,
    );
    return _answer('registerForEvent', () {
      final issued = [
        for (var i = 0; i < quantity; i++)
          ticketJson(
            code: 'NEWT${i}KT2HD9W'.substring(0, 12),
            holder: i < attendeeNames.length && attendeeNames[i].isNotEmpty
                ? attendeeNames[i]
                : 'Mona Aziz',
          ),
      ];
      tickets = [...tickets, ...issued];
      return [for (final t in issued) Ticket.fromJson(t)];
    });
  }

  @override
  Future<CheckoutLink> createEventCheckoutLink(
    int eventId, {
    required int ticketTypeId,
    required int quantity,
    List<String> attendeeNames = const [],
  }) {
    lastTicketOrder = (
      eventId: eventId,
      ticketTypeId: ticketTypeId,
      quantity: quantity,
      names: attendeeNames,
    );
    return _answer(
      'createEventCheckoutLink',
      () => CheckoutLink.fromJson({
        'url': 'https://yallapp.com.tr/pay/abc',
        'expires_at': '2030-01-01T00:00:00Z',
        'open_in': 'in_app',
      }),
    );
  }

  // Charity & donations (29).

  List<Map<String, dynamic>> campaigns = [
    campaignSummaryJson(),
    campaignSummaryJson(
      id: 2,
      title: 'School lunches for 200 children',
      goal: '120000.00',
      raised: '37800.00',
      donorCount: 96,
      featured: false,
    ),
    campaignSummaryJson(
      id: 3,
      title: 'Flood relief',
      goal: null,
      raised: '9100.00',
      donorCount: 31,
      status: 'closed',
      featured: false,
      endsAt: null,
    ),
  ];
  Map<String, dynamic> campaign = campaignJson();
  List<Map<String, dynamic>> donations = [donationJson()];

  /// What [createDonationLink] answers: the server decides `open_in`.
  String donationOpenIn = 'in_app';
  final donationRequests = <DonationRequest>[];

  @override
  Future<Paged<CampaignSummary>> listCampaigns({int page = 1}) => _answer(
    'listCampaigns',
    () => Paged.fromJson(pageJson(campaigns), CampaignSummary.fromJson),
  );

  @override
  Future<Campaign> getCampaign(int campaignId) =>
      _answer('getCampaign', () => Campaign.fromJson(campaign));

  @override
  Future<CheckoutLink> createDonationLink(DonationRequest request) {
    donationRequests.add(request);
    return _answer(
      'createDonationLink',
      () => CheckoutLink.fromJson({
        'url': 'https://yallapp.com.tr/give/token-1',
        'expires_at': '2026-10-12T11:00:00.000Z',
        'open_in': donationOpenIn,
      }),
    );
  }

  @override
  Future<List<Ticket>> listMyTickets() => _answer(
    'listMyTickets',
    () => [for (final t in tickets) Ticket.fromJson(t)],
  );

  @override
  Future<Ticket> cancelMyTicket(String code) {
    lastCancelledTicket = code;
    return _answer('cancelMyTicket', () {
      tickets = [
        for (final t in tickets)
          t['code'] == code
              ? {...t, 'status': 'cancelled', 'can_cancel': false}
              : t,
      ];
      return Ticket.fromJson(tickets.firstWhere((t) => t['code'] == code));
    });
  }

  @override
  Future<Paged<Donation>> listMyDonations({int page = 1}) => _answer(
    'listMyDonations',
    () => Paged.fromJson(pageJson(donations), Donation.fromJson),
  );
}
