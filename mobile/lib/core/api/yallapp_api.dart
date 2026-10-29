import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show immutable, kIsWeb;

import 'api_exception.dart';
import 'http_client.dart';
import 'models/json.dart';
import 'models/models.dart';
import '../config/build_config_data.dart';
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

/// An events list (`GET /events`), for Events & tickets apps (28).
@immutable
class EventQuery {
  const EventQuery({
    this.page = 1,
    this.perPage = 20,
    this.search = '',
    this.category,
    this.from,
    this.to,
  });

  final int page;
  final int perPage;
  final String search;

  /// An `EventFilters.categories` id.
  final String? category;

  /// `yyyy-MM-dd` days on the organiser's calendar, both included.
  final String? from;
  final String? to;

  EventQuery copyWith({int? page}) => EventQuery(
    page: page ?? this.page,
    perPage: perPage,
    search: search,
    category: category,
    from: from,
    to: to,
  );

  Map<String, dynamic> toQuery() => {
    'page': page,
    'per_page': perPage,
    if (search.trim().isNotEmpty) 'search': search.trim(),
    'category': ?category,
    'from': ?from,
    'to': ?to,
  };

  @override
  bool operator ==(Object other) =>
      other is EventQuery &&
      other.page == page &&
      other.perPage == perPage &&
      other.search == search &&
      other.category == category &&
      other.from == from &&
      other.to == to;

  @override
  int get hashCode => Object.hash(page, perPage, search, category, from, to);
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

  /// 99.4 Sends [answers] (field id, then the answer) to a form block whose
  /// answers go by email. `invalid_answers` carries a message for each field
  /// that needs a change (`details.fields`).
  Future<void> sendFormAnswers(
    String slug,
    String blockId,
    Map<String, String> answers,
  );

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

  /// 48 What an address on the site is: the app opened one of the site's
  /// own pages (its permalink). Plugin only; 404 elsewhere.
  Future<LinkResolution> resolveLink(String url);

  Future<User> getMe();
  Future<User> updateMe({String? name, String? email, String? city});
  Future<void> deleteMe();
  Future<DeviceList> listDevices();
  Future<void> removeDevice(String deviceId);
  Future<void> setPushToken(
    String token,
    NotificationPreferences preferences, {
    PushProvider provider = PushProvider.fcm,
    String? language,
  });

  /// 85.3 How many items the cart holds, for "You left something in your
  /// cart" (`PUT /me/cart`); a 404 means the server doesn't keep it.
  Future<void> setCart(int items);

  Future<List<Category>> listCategories();
  Future<Paged<CourseSummary>> listCourses(CourseQuery query);
  Future<CourseDetail> getCourse(int courseId);
  Future<List<Topic>> getCurriculum(int courseId);
  Future<Enrollment> enrollFree(int courseId);

  /// 73 Clears the student's progress in a finished course, to take it again.
  Future<Progress> restartCourse(int courseId);

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

  /// 45 Short-lived links to a lesson's files, to save it for offline viewing.
  Future<LessonDownload> downloadLesson(int lessonId);

  /// 45 Which saved lessons the student may keep.
  Future<DownloadCheck> checkDownloads(List<int> lessonIds);

  Future<Quiz> getQuiz(int quizId);
  Future<Attempt> startAttempt(int quizId);
  Future<AttemptResult> submitAttempt(
    int quizId,
    int attemptId,
    List<AnswerInput> answers,
  );
  Future<Paged<AttemptResult>> listMyAttempts({int page = 1});
  Future<List<Certificate>> listCertificates();

  /// 90.3 The student's memberships, subscriptions and groups on the website.
  Future<List<SiteSubscription>> listSubscriptions();

  Future<NotificationPage> listNotifications({int page = 1, int perPage = 20});
  Future<void> markNotificationsRead();

  /// 77 A chat token for the signed-in person from the WordPress site
  /// (`POST /chat/session`), when `Config.chat.session` is `site`.
  Future<ChatSession> startChatSession();

  /// 100 A store billing token for the signed-in person from the WordPress
  /// site (`POST /billing/session`), when `Config.store_billing.session` is
  /// `site`. Same shape as the chat's.
  Future<ChatSession> startBillingSession();
  Future<Paged<Order>> listOrders({int page = 1});

  /// 26 One of the customer's orders, for following it.
  Future<Order> getOrder(int orderId);

  /// 91.3 Asks the shop to take a completed order back; answers with the order.
  Future<Order> requestReturn(
    int orderId, {
    required ReturnReason reason,
    String? note,
  });

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

  /// Prices the app's cart as the shop sees it now, with the coupon the
  /// customer typed (91.1).
  Future<CartQuote> quoteCart(
    List<CartLineInput> lines, {
    String? coupon,
    bool usePoints = false,
  });

  /// 91.4 The customer's loyalty points and their latest changes.
  Future<PointsAccount> getMyPoints();

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
    String? coupon,
    bool usePoints = false,
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

  // 28 Events & tickets apps.
  Future<EventFilters> getEventFilters();
  Future<Paged<EventSummary>> listEvents(EventQuery query);
  Future<EventDetail> getEvent(int eventId);

  /// Free tickets: one per name (the user's own name for the rest).
  Future<List<Ticket>> registerForEvent(
    int eventId, {
    required int ticketTypeId,
    required int quantity,
    List<String> attendeeNames,
  });

  /// Paid tickets: the payment page, where paying issues the tickets.
  Future<CheckoutLink> createEventCheckoutLink(
    int eventId, {
    required int ticketTypeId,
    required int quantity,
    List<String> attendeeNames,
  });
  Future<List<Ticket>> listMyTickets();
  Future<Ticket> cancelMyTicket(String code);

  // 29 Charity & donations apps.
  Future<Paged<CampaignSummary>> listCampaigns({int page = 1});
  Future<Campaign> getCampaign(int campaignId);

  /// The donation page. On iOS its `openIn` is always browser (App Store
  /// guideline 3.2.2): the app never opens it in a web view there.
  Future<CheckoutLink> createDonationLink(DonationRequest request);
  Future<Paged<Donation>> listMyDonations({int page = 1});

  // 104 Delivery and courier companies.
  Future<List<DeliveryService>> listDeliveryServices();
  Future<Quote> quoteShipment(ShipmentRequest request);

  /// The coordinates of a Google Maps or Apple Maps link.
  Future<({double lat, double lng})> locateMapLink(String url);

  /// The shipment and, paid by card, its payment page.
  Future<({Shipment shipment, String? payUrl})> createShipment(
    ShipmentRequest request,
  );
  Future<Paged<Shipment>> listMyShipments({int page = 1, bool active = false});
  Future<Shipment> getMyShipment(int id);
  Future<Shipment> cancelMyShipment(int id);
  Future<String> payMyShipment(int id);
  Future<CourierProfile> getCourier();
  Future<CourierProfile> setCourierDuty(bool onDuty);
  Future<Paged<CourierJob>> listCourierJobs(JobScope scope, {int page = 1});
  Future<CourierJob> getCourierJob(int id);
  Future<CourierJob> acceptCourierJob(int id);
  Future<CourierJob> moveCourierJob(int id, JobStep step, {String? note});
  Future<void> sendCourierLocation(double lat, double lng, {double? accuracy});

  // 105.1 Food delivery from many restaurants.
  Future<Paged<RestaurantSummary>> listRestaurants({
    int page = 1,
    String? query,
    String? cuisine,
    double? lat,
    double? lng,
  });
  Future<Restaurant> getRestaurant(int id, {double? lat, double? lng});
  Future<FoodQuote> quoteFoodOrder(FoodOrderRequest request);

  /// The order and, paid by card, its payment page.
  Future<({FoodOrder order, String? payUrl})> placeFoodOrder(
    FoodOrderRequest request,
  );
  Future<Paged<FoodOrder>> listMyFoodOrders({
    int page = 1,
    bool active = false,
  });
  Future<FoodOrder> getMyFoodOrder(int id);
  Future<FoodOrder> cancelMyFoodOrder(int id);
  Future<String> payMyFoodOrder(int id);
  Future<FoodOrder> rateMyFoodOrder(
    int id, {
    required int restaurant,
    int? courier,
    String? comment,
  });
  Future<RestaurantDesk> getRestaurantDesk();

  /// 0 opens again; 15 to 240 stops new orders for that long.
  Future<RestaurantDesk> setRestaurantBusy(int minutes);
  Future<Paged<RestaurantOrder>> listRestaurantOrders(
    RestaurantScope scope, {
    int page = 1,
  });
  Future<RestaurantOrder> getRestaurantOrder(int id);
  Future<RestaurantOrder> acceptRestaurantOrder(int id, int prepMinutes);
  Future<RestaurantOrder> rejectRestaurantOrder(
    int id,
    FoodRejection reason, {
    String? note,
  });
  Future<RestaurantOrder> readyRestaurantOrder(int id);

  // 105.2 Ride hailing.
  Future<RideEstimate> estimateRide(RideRequest request);
  Future<Ride> requestRide(RideRequest request);
  Future<Paged<Ride>> listMyRides({int page = 1, bool active = false});
  Future<Ride> getMyRide(int id);
  Future<Ride> cancelMyRide(int id, {RiderCancelReason? reason});
  Future<String> payMyRide(int id);
  Future<Ride> rateMyRide(int id, {required int driver, String? comment});
  Future<DriverProfile> getDriver();
  Future<DriverProfile> setDriverOnline(bool online);
  Future<void> sendDriverLocation(
    double lat,
    double lng, {
    double? accuracy,
    double? heading,
  });
  Future<List<DriverRide>> listDriverOffers();
  Future<Paged<DriverRide>> listDriverRides(
    DriverRideScope scope, {
    int page = 1,
  });
  Future<DriverRide> getDriverRide(int id);
  Future<DriverRide> acceptDriverRide(int id);
  Future<void> declineDriverRide(int id);
  Future<DriverRide> moveDriverRide(
    int id,
    DriverStep step, {
    String? pin,
    DriverCancelReason? reason,
    String? note,
  });
  Future<DriverEarnings> getDriverEarnings(EarningsPeriod period);

  // 105.9 Live taxi on the map.
  Future<TaxiLiveToken> getTaxiLiveToken();
  Future<List<NearbyTaxi>> listNearbyTaxis(double lat, double lng);
  Future<List<TaxiPlace>> searchTaxiPlaces(
    String query, {
    double? lat,
    double? lng,
    String? session,
  });
  Future<TaxiPlace> getTaxiPlace(String id, {String? session});
  Future<TaxiRoute> getTaxiRoute(
    ({double lat, double lng}) from,
    ({double lat, double lng}) to,
  );

  // 105.3 Academies with many teachers.
  Future<TeacherPage> listTeachers({
    String? search,
    String? subject,
    int page = 1,
  });
  Future<TeacherDetail> getTeacher(int id);
  Future<void> followTeacher(int id, {required bool follow});
  Future<Paged<TeacherReview>> listTeacherReviews(int id, {int page = 1});
  Future<TeacherReview> rateTeacher(
    int id, {
    required int rating,
    String? text,
  });

  /// Null when the person never applied.
  Future<TeacherApplication?> getTeacherApplication();
  Future<TeacherApplication> applyToTeach({
    required String name,
    required String bio,
    required List<String> subjects,
  });
  Future<TeacherProfile> getTeacherMe();
  Future<TeacherProfile> updateTeacherMe({String? bio, List<String>? subjects});
  Future<TeacherCourses> listTeacherCourses();
  Future<TeacherCourse> getTeacherCourse(int id);
  Future<TeacherCourse> createTeacherCourse(TeacherCourseInput input);
  Future<TeacherCourse> updateTeacherCourse(int id, TeacherCourseInput input);
  Future<TeacherCourse> submitTeacherCourse(int id);
  Future<TeacherCourse> addTeacherSection(int courseId, String title);
  Future<TeacherCourse> addTeacherLesson(
    int courseId,
    TeacherLessonInput input,
  );
  Future<TeacherCourse> deleteTeacherLesson(int courseId, int lessonId);
  Future<ChatUpload> startTeacherUpload({
    required String name,
    required int size,
    required String type,
  });
  Future<ChatUpload> resumeTeacherUpload(String uploadId);
  Future<void> completeTeacherUpload(String uploadId);
  Future<Paged<TeacherQuestion>> listTeacherQuestions({int page = 1});
  Future<TeacherEarnings> getTeacherEarnings(TeacherPeriod period);

  // 105.4 Schools: a student and their parents.
  Future<SchoolMe> getSchoolMe();
  Future<SchoolTimetable> getStudentTimetable(int studentId);
  Future<StudentAttendance> getStudentAttendance(
    int studentId, {
    String? from,
    String? to,
  });
  Future<Paged<Homework>> listStudentHomework(
    int studentId, {
    HomeworkStatus status = HomeworkStatus.due,
    int page = 1,
  });
  Future<Homework> submitHomework(
    int studentId,
    int homeworkId, {
    String text = '',
    String? uploadId,
  });
  Future<StudentGrades> getStudentGrades(int studentId);
  Future<StudentFees> getStudentFees(int studentId);

  /// The school's payment page for the fee.
  Future<String> payStudentFee(int studentId, int feeId);
  Future<Paged<SchoolAnnouncement>> listSchoolAnnouncements({int page = 1});
  Future<ChatUpload> startSchoolUpload({
    required String name,
    required int size,
    required String type,
  });
  Future<ChatUpload> resumeSchoolUpload(String uploadId);
  Future<void> completeSchoolUpload(String uploadId);

  // 105.4 Schools: the school's teachers (the Classroom tab).
  Future<ClassroomMe> getClassroomMe();
  Future<SchoolTimetable> getClassroomTimetable();
  Future<ClassAttendance> getClassAttendance(int classId, {String? date});
  Future<ClassAttendance> saveClassAttendance(
    int classId,
    String date,
    List<({int studentId, AttendanceStatus status, String? note})> items,
  );
  Future<Paged<ClassroomHomework>> listClassroomHomework({
    int? classId,
    int page = 1,
  });
  Future<ClassroomHomework> giveHomework(HomeworkInput input);
  Future<ClassroomHomeworkDetail> getClassroomHomework(int id);
  Future<ClassroomHomeworkDetail> markHomework(
    int homeworkId,
    int studentId, {
    required String mark,
    String? feedback,
  });
  Future<Paged<SchoolAssessment>> listClassroomAssessments({
    int? classId,
    int page = 1,
  });
  Future<SchoolAssessment> createAssessment(AssessmentInput input);
  Future<AssessmentScores> getAssessmentScores(int id);
  Future<AssessmentScores> saveAssessmentScores(
    int id,
    List<({int studentId, double? score})> items,
  );
  Future<SchoolAnnouncement> postClassAnnouncement(
    int classId, {
    required String title,
    required String body,
  });
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
    this.appType,
    Dio? authDio,
    this.authBaseUrl,
  }) : _language = language ?? (() => 'en'),
       _authDio = authDio,
       _yallappAuth = authDio != null && authBaseUrl != null;

  /// 34 The build's `auth_base_url`: Yallapp signs people in to this app on
  /// its own API. Null when the API signs people in (or on Yallapp's hosted
  /// API, which does both).
  final String? authBaseUrl;

  /// 34 Sends sign-in, the account and its devices: to Yallapp when it signs
  /// people in (`Config.auth.provider: yallapp`), else to the same API as the
  /// content. Null in tests that need only one API.
  final Dio? _authDio;

  /// 34 Whether sign-in and the account go to Yallapp now, as the last
  /// `/config` said (the build's `auth_base_url` until then).
  bool _yallappAuth;

  /// 34 Whether Yallapp signs people in (after `getConfig`).
  bool get yallappSignsIn => _yallappAuth;

  Dio get _accountDio => _authDio ?? _dio;

  /// 30 Sent with `/pages`, so a site's default pages are built for this
  /// app's type (not for whatever plugins the site has).
  final AppType? appType;

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

  /// [account]: sign-in, the account and its devices (34: Yallapp's when it
  /// signs people in).
  Future<T> _get<T>(
    String path,
    AuthMode auth,
    T Function(Json json) parse, {
    Map<String, dynamic>? query,
    bool account = false,
  }) => _call(
    () => (account ? _accountDio : _dio).get<dynamic>(
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
    bool account = false,
  }) => _call(
    () => (account ? _accountDio : _dio).request<dynamic>(
      path,
      data: body,
      queryParameters: query,
      options: authOptions(auth, Options(method: method)),
    ),
    parse,
  );

  static void _ignore(dynamic _) {}

  @override
  Future<AppConfig> getConfig() async {
    final query = {'platform': platform.name, 'app_version': appVersion};
    final json = await _get('/config', _public, (json) => json, query: query);
    final authDio = _authDio;
    final authBase = _yallappAuthBase(json);
    if (authDio == null || authBase == null) {
      _routeAuth(null);
      return _parseConfig(json);
    }
    // 34 Yallapp signs people in: its /config has the sign-in rules.
    final Json yallapp;
    try {
      yallapp = await _call(
        () => authDio.get<dynamic>(
          '${_trimSlash(authBase)}/config',
          queryParameters: query,
          options: authOptions(_public),
        ),
        asJson,
      );
    } on ApiException catch (e) {
      // The owner went back to their own API's sign-in.
      if (e.statusCode == 404) {
        _routeAuth(null);
        return _parseConfig(json);
      }
      rethrow;
    }
    final auth = yallapp['auth'];
    if (auth is Map && auth['provider'] == 'yallapp') {
      _routeAuth(authBase);
      return _parseConfig({...json, 'auth': auth});
    }
    _routeAuth(null);
    return _parseConfig(json);
  }

  /// 34 Where Yallapp signs people in to this app: the build's
  /// `auth_base_url`, else what the API's own `/config` says (for apps built
  /// before the owner chose it). Null when the API signs people in.
  String? _yallappAuthBase(Json config) {
    final fromBuild = authBaseUrl?.trim() ?? '';
    if (fromBuild.isNotEmpty) return fromBuild;
    final auth = config['auth'];
    if (auth is! Map || auth['provider'] != 'yallapp') return null;
    final base = auth['base_url'];
    return base is String && base.startsWith('https://') ? base : null;
  }

  /// 34 Sends sign-in, the account and token refreshes to [base] (Yallapp),
  /// or with null to the same API as the content.
  void _routeAuth(String? base) {
    final authDio = _authDio;
    if (authDio == null) return;
    final target = base == null ? _dio.options.baseUrl : _trimSlash(base);
    authDio.options.baseUrl = target;
    _refreshDio.options.baseUrl = target;
    _yallappAuth = base != null;
  }

  static String _trimSlash(String url) => url.replaceFirst(RegExp(r'/+$'), '');

  AppConfig _parseConfig(Json json) {
    try {
      return AppConfig.fromJson(json);
    } on FormatException catch (e) {
      throw ApiException(
        code: ApiException.invalidResponse,
        message: currentL10n.errorInvalidResponse,
        statusCode: 200,
        details: {'reason': e.message},
      );
    }
  }

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
        queryParameters: _pagesQuery,
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
    query: _pagesQuery,
  );

  @override
  Future<void> sendFormAnswers(
    String slug,
    String blockId,
    Map<String, String> answers,
  ) => _send(
    'POST',
    '/forms/${Uri.encodeComponent(slug)}/${Uri.encodeComponent(blockId)}',
    _optional,
    _ignore,
    body: {'answers': answers},
  );

  Map<String, String> get _pagesQuery => {
    'platform': platform.name,
    if (appType != null) 'app_type': appType!.wire,
  };

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
    account: true,
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
    account: true,
  );

  @override
  Future<OtpRequestResult> requestEmailCode({required String email}) => _send(
    'POST',
    '/auth/email/request',
    _public,
    (data) => OtpRequestResult.fromJson(asJson(data)),
    body: {'email': email, if (preview) 'preview': true},
    account: true,
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
    account: true,
  );

  @override
  Future<Session> register(RegisterInput input) => _send(
    'POST',
    '/auth/register',
    _public,
    (data) => Session.fromJson(asJson(data)),
    body: input.toJson(),
    account: true,
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
  Future<void> logout() =>
      _send('POST', '/auth/logout', _required, _ignore, account: true);

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
  Future<LinkResolution> resolveLink(String url) => _get(
    '/links/resolve',
    _public,
    LinkResolution.fromJson,
    query: {'url': url},
  );

  @override
  Future<User> getMe() => _get('/me', _required, User.fromJson, account: true);

  @override
  Future<User> updateMe({String? name, String? email, String? city}) => _send(
    'PATCH',
    '/me',
    _required,
    (data) => User.fromJson(asJson(data)),
    body: {'name': ?name, 'email': ?email, 'city': ?city},
    account: true,
  );

  @override
  Future<void> deleteMe() async {
    // 34 Yallapp signs people in: the client's API deletes its own data
    // first (404 or 405 when it keeps none), then Yallapp the account.
    // 49 Whatever the client's API answers (an error, no answer), Yallapp
    // still deletes the account and sends the client's API a signed notice,
    // retried until it's received: a person is never stuck with an account
    // they asked to delete.
    if (_yallappAuth && _authDio != null) {
      try {
        await _send('DELETE', '/me', _required, _ignore);
      } on ApiException {
        // Yallapp's notice tells the client's API.
      }
    }
    await _send('DELETE', '/me', _required, _ignore, account: true);
  }

  @override
  Future<DeviceList> listDevices() =>
      _get('/me/devices', _required, DeviceList.fromJson, account: true);

  @override
  Future<void> removeDevice(String deviceId) => _send(
    'DELETE',
    '/me/devices/${Uri.encodeComponent(deviceId)}',
    _required,
    _ignore,
    account: true,
  );

  @override
  Future<void> setPushToken(
    String token,
    NotificationPreferences preferences, {
    PushProvider provider = PushProvider.fcm,
    String? language,
  }) => _send(
    'PUT',
    '/me/push-token',
    _required,
    _ignore,
    body: {
      'token': token,
      // 36 fcm or hms: the site sends each token through its own service.
      'provider': provider.name,
      'preferences': preferences.toJson(),
      // 85.1 The language the app shows, for campaigns to the people who read it.
      'language': ?language,
    },
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
  Future<Progress> restartCourse(int courseId) => _send(
    'POST',
    '/courses/$courseId/restart',
    _required,
    (data) => Progress.fromJson(asJson(data)),
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
  Future<LessonDownload> downloadLesson(int lessonId) => _send(
    'POST',
    '/lessons/$lessonId/download',
    _required,
    (data) => LessonDownload.fromJson(asJson(data)),
  );

  @override
  Future<DownloadCheck> checkDownloads(List<int> lessonIds) => _send(
    'POST',
    '/me/downloads/check',
    _required,
    (data) => DownloadCheck.fromJson(asJson(data)),
    body: {'lesson_ids': lessonIds},
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
  Future<List<SiteSubscription>> listSubscriptions() => _get(
    '/me/subscriptions',
    _required,
    (json) => reqListOf(json, 'items', SiteSubscription.fromJson),
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
  Future<void> setCart(int items) =>
      _send('PUT', '/me/cart', _required, _ignore, body: {'items': items});

  @override
  Future<ChatSession> startChatSession() => _send(
    'POST',
    '/chat/session',
    _required,
    (data) => ChatSession.fromJson(asJson(data)),
  );

  @override
  Future<ChatSession> startBillingSession() => _send(
    'POST',
    '/billing/session',
    _required,
    (data) => ChatSession.fromJson(asJson(data)),
  );

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
  Future<Order> requestReturn(
    int orderId, {
    required ReturnReason reason,
    String? note,
  }) => _send(
    'POST',
    '/me/orders/$orderId/return',
    _required,
    (data) => Order.fromJson(asJson(data)),
    body: {
      'reason': snake(reason),
      if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
    },
  );

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
  Future<CartQuote> quoteCart(
    List<CartLineInput> lines, {
    String? coupon,
    bool usePoints = false,
  }) => _send(
    'POST',
    '/store/cart',
    _optional,
    (data) => CartQuote.fromJson(asJson(data)),
    body: {
      'lines': [for (final l in lines) l.toJson()],
      'coupon': ?coupon,
      if (usePoints) 'use_points': true,
    },
    query: {'platform': platform.name},
  );

  @override
  Future<PointsAccount> getMyPoints() =>
      _get('/me/points', _required, PointsAccount.fromJson);

  @override
  Future<CheckoutLink> createStoreCheckoutLink(
    List<CartLineInput> lines, {
    String? deliveryDate,
    String? giftMessage,
    FulfilmentType? fulfilment,
    DeliveryAddress? deliveryAddress,
    DateTime? scheduledFor,
    String? coupon,
    bool usePoints = false,
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
            'coupon': ?coupon,
            if (usePoints) 'use_points': true,
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

  @override
  Future<EventFilters> getEventFilters() =>
      _get('/events/filters', _optional, EventFilters.fromJson);

  @override
  Future<Paged<EventSummary>> listEvents(EventQuery query) => _get(
    '/events',
    _optional,
    (json) => Paged.fromJson(json, EventSummary.fromJson),
    query: query.toQuery(),
  );

  @override
  Future<EventDetail> getEvent(int eventId) => _get(
    '/events/$eventId',
    _optional,
    EventDetail.fromJson,
    query: {'platform': platform.name},
  );

  @override
  Future<List<Ticket>> registerForEvent(
    int eventId, {
    required int ticketTypeId,
    required int quantity,
    List<String> attendeeNames = const [],
  }) => _send(
    'POST',
    '/events/$eventId/register',
    _required,
    (data) => reqListOf(asJson(data), 'tickets', Ticket.fromJson),
    body: {
      'ticket_type_id': ticketTypeId,
      'quantity': quantity,
      'attendee_names': [for (final n in attendeeNames) n.trim()],
    },
  );

  @override
  Future<CheckoutLink> createEventCheckoutLink(
    int eventId, {
    required int ticketTypeId,
    required int quantity,
    List<String> attendeeNames = const [],
  }) => preview
      ? _noCheckoutInPreview()
      : _send(
          'POST',
          '/events/checkout-link',
          _required,
          (data) => CheckoutLink.fromJson(asJson(data)),
          body: {
            'event_id': eventId,
            'ticket_type_id': ticketTypeId,
            'quantity': quantity,
            'attendee_names': [for (final n in attendeeNames) n.trim()],
          },
          query: {'platform': platform.name},
        );

  @override
  Future<Paged<CampaignSummary>> listCampaigns({int page = 1}) => _get(
    '/donations/campaigns',
    _optional,
    (json) => Paged.fromJson(json, CampaignSummary.fromJson),
    query: {'page': page, 'per_page': 20},
  );

  @override
  Future<Campaign> getCampaign(int campaignId) =>
      _get('/donations/campaigns/$campaignId', _optional, Campaign.fromJson);

  @override
  Future<CheckoutLink> createDonationLink(DonationRequest request) => preview
      ? _noCheckoutInPreview()
      : _send(
          'POST',
          '/donations/checkout-link',
          _optional,
          (data) => CheckoutLink.fromJson(asJson(data)),
          body: request.toJson(),
          query: {'platform': platform.name},
        );

  @override
  Future<List<Ticket>> listMyTickets() => _get(
    '/me/tickets',
    _required,
    (json) => reqListOf(json, 'items', Ticket.fromJson),
  );

  @override
  Future<Ticket> cancelMyTicket(String code) => _send(
    'POST',
    '/me/tickets/${Uri.encodeComponent(code)}/cancel',
    _required,
    (data) => Ticket.fromJson(asJson(data)),
  );

  @override
  Future<Paged<Donation>> listMyDonations({int page = 1}) => _get(
    '/me/donations',
    _required,
    (json) => Paged.fromJson(json, Donation.fromJson),
    query: {'page': page, 'per_page': 20},
  );

  // 104 Delivery and courier companies.

  @override
  Future<List<DeliveryService>> listDeliveryServices() => _get(
    '/delivery/services',
    _optional,
    (json) => reqListOf(json, 'items', DeliveryService.fromJson),
  );

  @override
  Future<Quote> quoteShipment(ShipmentRequest request) => _send(
    'POST',
    '/delivery/quote',
    _optional,
    (data) => Quote.fromJson(asJson(data)),
    body: request.quoteJson(),
  );

  @override
  Future<({double lat, double lng})> locateMapLink(String url) =>
      _send('POST', '/delivery/locate', _required, (data) {
        final json = asJson(data);
        return (
          lat: optDouble(json, 'lat') ?? 0,
          lng: optDouble(json, 'lng') ?? 0,
        );
      }, body: {'url': url.trim()});

  @override
  Future<({Shipment shipment, String? payUrl})> createShipment(
    ShipmentRequest request,
  ) => _send(
    'POST',
    '/delivery/shipments',
    _required,
    (data) {
      final json = asJson(data);
      return (
        shipment: Shipment.fromJson(asJson(json['shipment'], 'shipment')),
        payUrl: optString(json, 'pay_url'),
      );
    },
    body: request.toJson(),
    query: {'platform': platform.name},
  );

  @override
  Future<Paged<Shipment>> listMyShipments({
    int page = 1,
    bool active = false,
  }) => _get(
    '/me/shipments',
    _required,
    (json) => Paged.fromJson(json, Shipment.fromJson),
    query: {'page': page, 'per_page': 20, if (active) 'active': 'true'},
  );

  @override
  Future<Shipment> getMyShipment(int id) =>
      _get('/me/shipments/$id', _required, Shipment.fromJson);

  @override
  Future<Shipment> cancelMyShipment(int id) => _send(
    'POST',
    '/me/shipments/$id/cancel',
    _required,
    (data) => Shipment.fromJson(asJson(data)),
  );

  @override
  Future<String> payMyShipment(int id) => _send(
    'POST',
    '/me/shipments/$id/pay',
    _required,
    (data) => reqString(asJson(data), 'url'),
  );

  @override
  Future<CourierProfile> getCourier() =>
      _get('/courier/me', _required, CourierProfile.fromJson);

  @override
  Future<CourierProfile> setCourierDuty(bool onDuty) => _send(
    'PATCH',
    '/courier/me',
    _required,
    (data) => CourierProfile.fromJson(asJson(data)),
    body: {'on_duty': onDuty},
  );

  @override
  Future<Paged<CourierJob>> listCourierJobs(JobScope scope, {int page = 1}) =>
      _get(
        '/courier/jobs',
        _required,
        (json) => Paged.fromJson(json, CourierJob.fromJson),
        query: {'scope': scope.name, 'page': page, 'per_page': 20},
      );

  @override
  Future<CourierJob> getCourierJob(int id) =>
      _get('/courier/jobs/$id', _required, CourierJob.fromJson);

  @override
  Future<CourierJob> acceptCourierJob(int id) => _send(
    'POST',
    '/courier/jobs/$id/accept',
    _required,
    (data) => CourierJob.fromJson(asJson(data)),
  );

  @override
  Future<CourierJob> moveCourierJob(int id, JobStep step, {String? note}) =>
      _send(
        'POST',
        '/courier/jobs/$id/status',
        _required,
        (data) => CourierJob.fromJson(asJson(data)),
        body: {'status': snake(step), 'note': ?note},
      );

  @override
  Future<void> sendCourierLocation(
    double lat,
    double lng, {
    double? accuracy,
  }) => _send(
    'PUT',
    '/courier/location',
    _required,
    _ignore,
    body: {'lat': lat, 'lng': lng, 'accuracy': ?accuracy},
  );

  // 105.1 Food delivery from many restaurants.

  @override
  Future<Paged<RestaurantSummary>> listRestaurants({
    int page = 1,
    String? query,
    String? cuisine,
    double? lat,
    double? lng,
  }) => _get(
    '/food/restaurants',
    _optional,
    (json) => Paged.fromJson(json, RestaurantSummary.fromJson),
    query: {
      'page': page,
      'per_page': 20,
      if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
      'cuisine': ?cuisine,
      'lat': ?lat,
      'lng': ?lng,
    },
  );

  @override
  Future<Restaurant> getRestaurant(int id, {double? lat, double? lng}) => _get(
    '/food/restaurants/$id',
    _optional,
    Restaurant.fromJson,
    query: {'lat': ?lat, 'lng': ?lng},
  );

  @override
  Future<FoodQuote> quoteFoodOrder(FoodOrderRequest request) => _send(
    'POST',
    '/food/quote',
    _optional,
    (data) => FoodQuote.fromJson(asJson(data)),
    body: request.cartJson(),
  );

  @override
  Future<({FoodOrder order, String? payUrl})> placeFoodOrder(
    FoodOrderRequest request,
  ) => _send(
    'POST',
    '/food/orders',
    _required,
    (data) {
      final json = asJson(data);
      return (
        order: FoodOrder.fromJson(asJson(json['order'], 'order')),
        payUrl: optString(json, 'pay_url'),
      );
    },
    body: request.toJson(),
    query: {'platform': platform.name},
  );

  @override
  Future<Paged<FoodOrder>> listMyFoodOrders({
    int page = 1,
    bool active = false,
  }) => _get(
    '/me/food-orders',
    _required,
    (json) => Paged.fromJson(json, FoodOrder.fromJson),
    query: {'page': page, 'per_page': 20, if (active) 'active': 'true'},
  );

  @override
  Future<FoodOrder> getMyFoodOrder(int id) =>
      _get('/me/food-orders/$id', _required, FoodOrder.fromJson);

  @override
  Future<FoodOrder> cancelMyFoodOrder(int id) => _send(
    'POST',
    '/me/food-orders/$id/cancel',
    _required,
    (data) => FoodOrder.fromJson(asJson(data)),
  );

  @override
  Future<String> payMyFoodOrder(int id) => _send(
    'POST',
    '/me/food-orders/$id/pay',
    _required,
    (data) => reqString(asJson(data), 'url'),
  );

  @override
  Future<FoodOrder> rateMyFoodOrder(
    int id, {
    required int restaurant,
    int? courier,
    String? comment,
  }) => _send(
    'PUT',
    '/me/food-orders/$id/rating',
    _required,
    (data) => FoodOrder.fromJson(asJson(data)),
    body: {
      'restaurant': restaurant,
      'courier': courier,
      'comment': (comment?.trim().isEmpty ?? true) ? null : comment!.trim(),
    },
  );

  @override
  Future<RestaurantDesk> getRestaurantDesk() =>
      _get('/restaurant/me', _required, RestaurantDesk.fromJson);

  @override
  Future<RestaurantDesk> setRestaurantBusy(int minutes) => _send(
    'PATCH',
    '/restaurant/me',
    _required,
    (data) => RestaurantDesk.fromJson(asJson(data)),
    body: {'busy_minutes': minutes},
  );

  @override
  Future<Paged<RestaurantOrder>> listRestaurantOrders(
    RestaurantScope scope, {
    int page = 1,
  }) => _get(
    '/restaurant/orders',
    _required,
    (json) => Paged.fromJson(json, RestaurantOrder.fromJson),
    query: {'scope': scope.wire, 'page': page, 'per_page': 20},
  );

  @override
  Future<RestaurantOrder> getRestaurantOrder(int id) =>
      _get('/restaurant/orders/$id', _required, RestaurantOrder.fromJson);

  @override
  Future<RestaurantOrder> acceptRestaurantOrder(int id, int prepMinutes) =>
      _send(
        'POST',
        '/restaurant/orders/$id/accept',
        _required,
        (data) => RestaurantOrder.fromJson(asJson(data)),
        body: {'prep_minutes': prepMinutes},
      );

  @override
  Future<RestaurantOrder> rejectRestaurantOrder(
    int id,
    FoodRejection reason, {
    String? note,
  }) => _send(
    'POST',
    '/restaurant/orders/$id/reject',
    _required,
    (data) => RestaurantOrder.fromJson(asJson(data)),
    body: {'reason': snake(reason), 'note': ?note},
  );

  @override
  Future<RestaurantOrder> readyRestaurantOrder(int id) => _send(
    'POST',
    '/restaurant/orders/$id/ready',
    _required,
    (data) => RestaurantOrder.fromJson(asJson(data)),
  );

  // 105.2 Ride hailing.

  @override
  Future<RideEstimate> estimateRide(RideRequest request) => _send(
    'POST',
    '/rides/estimate',
    _required,
    (data) => RideEstimate.fromJson(asJson(data)),
    body: request.estimateJson(),
    query: {'platform': platform.name},
  );

  @override
  Future<Ride> requestRide(RideRequest request) => _send(
    'POST',
    '/rides',
    _required,
    (data) => Ride.fromJson(asJson(data)),
    body: request.toJson(),
    query: {'platform': platform.name},
  );

  @override
  Future<Paged<Ride>> listMyRides({int page = 1, bool active = false}) => _get(
    '/me/rides',
    _required,
    (json) => Paged.fromJson(json, Ride.fromJson),
    query: {'page': page, 'per_page': 20, if (active) 'active': 'true'},
  );

  @override
  Future<Ride> getMyRide(int id) =>
      _get('/me/rides/$id', _required, Ride.fromJson);

  @override
  Future<Ride> cancelMyRide(int id, {RiderCancelReason? reason}) => _send(
    'POST',
    '/me/rides/$id/cancel',
    _required,
    (data) => Ride.fromJson(asJson(data)),
    body: {'reason': reason == null ? null : snake(reason)},
  );

  @override
  Future<String> payMyRide(int id) => _send(
    'POST',
    '/me/rides/$id/pay',
    _required,
    (data) => reqString(asJson(data), 'url'),
  );

  @override
  Future<Ride> rateMyRide(int id, {required int driver, String? comment}) =>
      _send(
        'POST',
        '/me/rides/$id/rating',
        _required,
        (data) => Ride.fromJson(asJson(data)),
        body: {
          'driver': driver,
          'comment': (comment?.trim().isEmpty ?? true) ? null : comment!.trim(),
        },
      );

  @override
  Future<DriverProfile> getDriver() =>
      _get('/driver/me', _required, DriverProfile.fromJson);

  @override
  Future<DriverProfile> setDriverOnline(bool online) => _send(
    'PATCH',
    '/driver/me',
    _required,
    (data) => DriverProfile.fromJson(asJson(data)),
    body: {'online': online},
  );

  @override
  Future<void> sendDriverLocation(
    double lat,
    double lng, {
    double? accuracy,
    double? heading,
  }) => _send(
    'PUT',
    '/driver/location',
    _required,
    _ignore,
    body: {'lat': lat, 'lng': lng, 'accuracy': ?accuracy, 'heading': ?heading},
  );

  @override
  Future<List<DriverRide>> listDriverOffers() => _get(
    '/driver/offers',
    _required,
    (json) => reqListOf(json, 'items', DriverRide.fromJson),
  );

  @override
  Future<Paged<DriverRide>> listDriverRides(
    DriverRideScope scope, {
    int page = 1,
  }) => _get(
    '/driver/rides',
    _required,
    (json) => Paged.fromJson(json, DriverRide.fromJson),
    query: {'scope': scope.name, 'page': page, 'per_page': 20},
  );

  @override
  Future<DriverRide> getDriverRide(int id) =>
      _get('/driver/rides/$id', _required, DriverRide.fromJson);

  @override
  Future<DriverRide> acceptDriverRide(int id) => _send(
    'POST',
    '/driver/rides/$id/accept',
    _required,
    (data) => DriverRide.fromJson(asJson(data)),
  );

  @override
  Future<void> declineDriverRide(int id) =>
      _send('POST', '/driver/rides/$id/decline', _required, _ignore);

  @override
  Future<DriverRide> moveDriverRide(
    int id,
    DriverStep step, {
    String? pin,
    DriverCancelReason? reason,
    String? note,
  }) => _send(
    'POST',
    '/driver/rides/$id/status',
    _required,
    (data) => DriverRide.fromJson(asJson(data)),
    body: {
      'status': snake(step),
      'pin': ?pin,
      if (reason != null) 'reason': snake(reason),
      'note': ?note,
    },
  );

  @override
  Future<DriverEarnings> getDriverEarnings(EarningsPeriod period) => _get(
    '/driver/earnings',
    _required,
    DriverEarnings.fromJson,
    query: {'period': period.name},
  );

  // 105.9 Live taxi on the map.

  @override
  Future<TaxiLiveToken> getTaxiLiveToken() => _send(
    'POST',
    '/taxi/live-token',
    _required,
    (data) => TaxiLiveToken.fromJson(asJson(data)),
  );

  @override
  Future<List<NearbyTaxi>> listNearbyTaxis(double lat, double lng) => _get(
    '/taxi/nearby',
    _optional,
    (json) => listOf(json, 'items', NearbyTaxi.fromJson),
    query: {'lat': lat, 'lng': lng},
  );

  @override
  Future<List<TaxiPlace>> searchTaxiPlaces(
    String query, {
    double? lat,
    double? lng,
    String? session,
  }) => _get(
    '/taxi/places',
    _optional,
    (json) => listOf(json, 'items', TaxiPlace.fromJson),
    query: {'q': query, 'lat': ?lat, 'lng': ?lng, 'session': ?session},
  );

  @override
  Future<TaxiPlace> getTaxiPlace(String id, {String? session}) => _get(
    '/taxi/places/${Uri.encodeComponent(id)}',
    _optional,
    TaxiPlace.fromJson,
    query: {'session': ?session},
  );

  @override
  Future<TaxiRoute> getTaxiRoute(
    ({double lat, double lng}) from,
    ({double lat, double lng}) to,
  ) => _send(
    'POST',
    '/taxi/route',
    _optional,
    (data) => TaxiRoute.fromJson(asJson(data)),
    body: {
      'from': {'lat': from.lat, 'lng': from.lng},
      'to': {'lat': to.lat, 'lng': to.lng},
    },
  );

  @override
  Future<TeacherPage> listTeachers({
    String? search,
    String? subject,
    int page = 1,
  }) => _get(
    '/teachers',
    _optional,
    TeacherPage.fromJson,
    query: {
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      'subject': ?subject,
      'page': page,
      'per_page': 20,
    },
  );

  @override
  Future<TeacherDetail> getTeacher(int id) =>
      _get('/teachers/$id', _optional, TeacherDetail.fromJson);

  @override
  Future<void> followTeacher(int id, {required bool follow}) => _send(
    follow ? 'PUT' : 'DELETE',
    '/teachers/$id/follow',
    _required,
    _ignore,
  );

  @override
  Future<Paged<TeacherReview>> listTeacherReviews(int id, {int page = 1}) =>
      _get(
        '/teachers/$id/reviews',
        _optional,
        (json) => Paged.fromJson(json, TeacherReview.fromJson),
        query: {'page': page, 'per_page': 10},
      );

  @override
  Future<TeacherReview> rateTeacher(
    int id, {
    required int rating,
    String? text,
  }) => _send(
    'PUT',
    '/teachers/$id/reviews/mine',
    _required,
    (data) => TeacherReview.fromJson(asJson(data)),
    body: {'rating': rating, 'text': text?.trim() ?? ''},
  );

  @override
  Future<TeacherApplication?> getTeacherApplication() async {
    try {
      return await _get(
        '/teachers/application',
        _required,
        TeacherApplication.fromJson,
      );
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }

  @override
  Future<TeacherApplication> applyToTeach({
    required String name,
    required String bio,
    required List<String> subjects,
  }) => _send(
    'POST',
    '/teachers/application',
    _required,
    (data) => TeacherApplication.fromJson(asJson(data)),
    body: {'name': name.trim(), 'bio': bio.trim(), 'subjects': subjects},
  );

  @override
  Future<TeacherProfile> getTeacherMe() =>
      _get('/teacher/me', _required, TeacherProfile.fromJson);

  @override
  Future<TeacherProfile> updateTeacherMe({
    String? bio,
    List<String>? subjects,
  }) => _send(
    'PATCH',
    '/teacher/me',
    _required,
    (data) => TeacherProfile.fromJson(asJson(data)),
    body: {'bio': ?bio, 'subjects': ?subjects},
  );

  @override
  Future<TeacherCourses> listTeacherCourses() =>
      _get('/teacher/courses', _required, TeacherCourses.fromJson);

  @override
  Future<TeacherCourse> getTeacherCourse(int id) =>
      _get('/teacher/courses/$id', _required, TeacherCourse.fromJson);

  @override
  Future<TeacherCourse> createTeacherCourse(TeacherCourseInput input) => _send(
    'POST',
    '/teacher/courses',
    _required,
    (data) => TeacherCourse.fromJson(asJson(data)),
    body: input.toJson(),
  );

  @override
  Future<TeacherCourse> updateTeacherCourse(int id, TeacherCourseInput input) =>
      _send(
        'PATCH',
        '/teacher/courses/$id',
        _required,
        (data) => TeacherCourse.fromJson(asJson(data)),
        body: input.toJson(),
      );

  @override
  Future<TeacherCourse> submitTeacherCourse(int id) => _send(
    'POST',
    '/teacher/courses/$id/submit',
    _required,
    (data) => TeacherCourse.fromJson(asJson(data)),
  );

  @override
  Future<TeacherCourse> addTeacherSection(int courseId, String title) => _send(
    'POST',
    '/teacher/courses/$courseId/sections',
    _required,
    (data) => TeacherCourse.fromJson(asJson(data)),
    body: {'title': title.trim()},
  );

  @override
  Future<TeacherCourse> addTeacherLesson(
    int courseId,
    TeacherLessonInput input,
  ) => _send(
    'POST',
    '/teacher/courses/$courseId/lessons',
    _required,
    (data) => TeacherCourse.fromJson(asJson(data)),
    body: input.toJson(),
  );

  @override
  Future<TeacherCourse> deleteTeacherLesson(int courseId, int lessonId) =>
      _send(
        'DELETE',
        '/teacher/courses/$courseId/lessons/$lessonId',
        _required,
        (data) => TeacherCourse.fromJson(asJson(data)),
      );

  @override
  Future<ChatUpload> startTeacherUpload({
    required String name,
    required int size,
    required String type,
  }) => _send(
    'POST',
    '/teacher/uploads',
    _required,
    (data) => ChatUpload.fromJson(asJson(data)),
    body: {'name': name, 'size': size, 'type': type},
  );

  @override
  Future<ChatUpload> resumeTeacherUpload(String uploadId) => _send(
    'POST',
    '/teacher/uploads/${Uri.encodeComponent(uploadId)}/resume',
    _required,
    (data) => ChatUpload.fromJson(asJson(data)),
  );

  @override
  Future<void> completeTeacherUpload(String uploadId) => _send(
    'POST',
    '/teacher/uploads/${Uri.encodeComponent(uploadId)}/complete',
    _required,
    _ignore,
  );

  @override
  Future<Paged<TeacherQuestion>> listTeacherQuestions({int page = 1}) => _get(
    '/teacher/questions',
    _required,
    (json) => Paged.fromJson(json, TeacherQuestion.fromJson),
    query: {'page': page, 'per_page': 20},
  );

  @override
  Future<TeacherEarnings> getTeacherEarnings(TeacherPeriod period) => _get(
    '/teacher/earnings',
    _required,
    TeacherEarnings.fromJson,
    query: {'period': snake(period)},
  );

  // 105.4 Schools: a student and their parents.

  @override
  Future<SchoolMe> getSchoolMe() =>
      _get('/school/me', _required, SchoolMe.fromJson);

  @override
  Future<SchoolTimetable> getStudentTimetable(int studentId) => _get(
    '/school/students/$studentId/timetable',
    _required,
    SchoolTimetable.fromJson,
  );

  @override
  Future<StudentAttendance> getStudentAttendance(
    int studentId, {
    String? from,
    String? to,
  }) => _get(
    '/school/students/$studentId/attendance',
    _required,
    StudentAttendance.fromJson,
    query: {'from': ?from, 'to': ?to},
  );

  @override
  Future<Paged<Homework>> listStudentHomework(
    int studentId, {
    HomeworkStatus status = HomeworkStatus.due,
    int page = 1,
  }) => _get(
    '/school/students/$studentId/homework',
    _required,
    (json) => Paged.fromJson(json, Homework.fromJson),
    query: {'status': status.name, 'page': page, 'per_page': 20},
  );

  @override
  Future<Homework> submitHomework(
    int studentId,
    int homeworkId, {
    String text = '',
    String? uploadId,
  }) => _send(
    'PUT',
    '/school/students/$studentId/homework/$homeworkId/submission',
    _required,
    (data) => Homework.fromJson(asJson(data)),
    body: {'text': text, 'upload_id': ?uploadId},
  );

  @override
  Future<StudentGrades> getStudentGrades(int studentId) => _get(
    '/school/students/$studentId/grades',
    _required,
    StudentGrades.fromJson,
  );

  @override
  Future<StudentFees> getStudentFees(int studentId) =>
      _get('/school/students/$studentId/fees', _required, StudentFees.fromJson);

  @override
  Future<String> payStudentFee(int studentId, int feeId) => _send(
    'POST',
    '/school/students/$studentId/fees/$feeId/pay',
    _required,
    (data) => reqString(asJson(data), 'payment_url'),
  );

  @override
  Future<Paged<SchoolAnnouncement>> listSchoolAnnouncements({int page = 1}) =>
      _get(
        '/school/announcements',
        _required,
        (json) => Paged.fromJson(json, SchoolAnnouncement.fromJson),
        query: {'page': page, 'per_page': 20},
      );

  @override
  Future<ChatUpload> startSchoolUpload({
    required String name,
    required int size,
    required String type,
  }) => _send(
    'POST',
    '/school/uploads',
    _required,
    (data) => ChatUpload.fromJson(asJson(data)),
    body: {'name': name, 'size': size, 'type': type},
  );

  @override
  Future<ChatUpload> resumeSchoolUpload(String uploadId) => _send(
    'POST',
    '/school/uploads/${Uri.encodeComponent(uploadId)}/resume',
    _required,
    (data) => ChatUpload.fromJson(asJson(data)),
  );

  @override
  Future<void> completeSchoolUpload(String uploadId) => _send(
    'POST',
    '/school/uploads/${Uri.encodeComponent(uploadId)}/complete',
    _required,
    _ignore,
  );

  // 105.4 Schools: the Classroom.

  @override
  Future<ClassroomMe> getClassroomMe() =>
      _get('/classroom/me', _required, ClassroomMe.fromJson);

  @override
  Future<SchoolTimetable> getClassroomTimetable() =>
      _get('/classroom/timetable', _required, SchoolTimetable.fromJson);

  @override
  Future<ClassAttendance> getClassAttendance(int classId, {String? date}) =>
      _get(
        '/classroom/classes/$classId/attendance',
        _required,
        ClassAttendance.fromJson,
        query: {'date': ?date},
      );

  @override
  Future<ClassAttendance> saveClassAttendance(
    int classId,
    String date,
    List<({int studentId, AttendanceStatus status, String? note})> items,
  ) => _send(
    'PUT',
    '/classroom/classes/$classId/attendance',
    _required,
    (data) => ClassAttendance.fromJson(asJson(data)),
    body: {
      'date': date,
      'items': [
        for (final item in items)
          {
            'student_id': item.studentId,
            'status': item.status.name,
            'note': ?item.note,
          },
      ],
    },
  );

  @override
  Future<Paged<ClassroomHomework>> listClassroomHomework({
    int? classId,
    int page = 1,
  }) => _get(
    '/classroom/homework',
    _required,
    (json) => Paged.fromJson(json, ClassroomHomework.fromJson),
    query: {'class_id': ?classId, 'page': page, 'per_page': 20},
  );

  @override
  Future<ClassroomHomework> giveHomework(HomeworkInput input) => _send(
    'POST',
    '/classroom/homework',
    _required,
    (data) => ClassroomHomework.fromJson(asJson(data)),
    body: input.toJson(),
  );

  @override
  Future<ClassroomHomeworkDetail> getClassroomHomework(int id) => _get(
    '/classroom/homework/$id',
    _required,
    ClassroomHomeworkDetail.fromJson,
  );

  @override
  Future<ClassroomHomeworkDetail> markHomework(
    int homeworkId,
    int studentId, {
    required String mark,
    String? feedback,
  }) => _send(
    'PUT',
    '/classroom/homework/$homeworkId/submissions/$studentId',
    _required,
    (data) => ClassroomHomeworkDetail.fromJson(asJson(data)),
    body: {'mark': mark, 'feedback': ?feedback},
  );

  @override
  Future<Paged<SchoolAssessment>> listClassroomAssessments({
    int? classId,
    int page = 1,
  }) => _get(
    '/classroom/assessments',
    _required,
    (json) => Paged.fromJson(json, SchoolAssessment.fromJson),
    query: {'class_id': ?classId, 'page': page, 'per_page': 20},
  );

  @override
  Future<SchoolAssessment> createAssessment(AssessmentInput input) => _send(
    'POST',
    '/classroom/assessments',
    _required,
    (data) => SchoolAssessment.fromJson(asJson(data)),
    body: input.toJson(),
  );

  @override
  Future<AssessmentScores> getAssessmentScores(int id) => _get(
    '/classroom/assessments/$id/scores',
    _required,
    AssessmentScores.fromJson,
  );

  @override
  Future<AssessmentScores> saveAssessmentScores(
    int id,
    List<({int studentId, double? score})> items,
  ) => _send(
    'PUT',
    '/classroom/assessments/$id/scores',
    _required,
    (data) => AssessmentScores.fromJson(asJson(data)),
    body: {
      'items': [
        for (final item in items)
          {'student_id': item.studentId, 'score': item.score},
      ],
    },
  );

  @override
  Future<SchoolAnnouncement> postClassAnnouncement(
    int classId, {
    required String title,
    required String body,
  }) => _send(
    'POST',
    '/classroom/announcements',
    _required,
    (data) => SchoolAnnouncement.fromJson(asJson(data)),
    body: {'class_id': classId, 'title': title, 'body': body},
  );
}
