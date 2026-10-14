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
  Future<void> markNotificationsRead() => _answer('markNotificationsRead', () {
    notifications = [
      for (final n in notifications) {...n, 'read': true},
    ];
  });

  @override
  Future<Paged<Order>> listOrders({int page = 1}) => _answer(
    'listOrders',
    () => Paged.fromJson(pageJson([orderJson()]), Order.fromJson),
  );

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

  @override
  Future<QuestionThread> getQuestion(int questionId) => _answer(
    'getQuestion',
    () => QuestionThread.fromJson(questionThreadJson()),
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

  @override
  Future<CartQuote> quoteCart(List<CartLineInput> lines) {
    lastCartLines = lines;
    return _answer('quoteCart', () => CartQuote.fromJson(cartQuote));
  }

  ({String? deliveryDate, String? giftMessage})? lastStoreCheckout;

  @override
  Future<CheckoutLink> createStoreCheckoutLink(
    List<CartLineInput> lines, {
    String? deliveryDate,
    String? giftMessage,
  }) {
    lastStoreCheckout = (deliveryDate: deliveryDate, giftMessage: giftMessage);
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
}
