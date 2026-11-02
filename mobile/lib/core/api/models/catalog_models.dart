import 'json.dart';
import 'learning_models.dart' show Progress;
import '../../l10n/l10n.dart';

class PageMeta {
  const PageMeta({
    required this.page,
    required this.perPage,
    required this.total,
    required this.totalPages,
  });

  factory PageMeta.fromJson(Json json) => PageMeta(
    page: reqInt(json, 'page'),
    perPage: reqInt(json, 'per_page'),
    total: reqInt(json, 'total'),
    totalPages: reqInt(json, 'total_pages'),
  );

  final int page;
  final int perPage;
  final int total;
  final int totalPages;

  bool get hasMore => page < totalPages;
}

/// A paginated list (`Page` + `items`).
class Paged<T> {
  const Paged({required this.items, required this.meta});

  factory Paged.fromJson(Json json, T Function(Json item) parse) => Paged(
    items: reqListOf(json, 'items', parse),
    meta: PageMeta.fromJson(json),
  );

  final List<T> items;
  final PageMeta meta;
}

class Category {
  const Category({
    required this.id,
    required this.name,
    required this.count,
    this.imageUrl,
  });

  factory Category.fromJson(Json json) => Category(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    count: reqInt(json, 'count'),
    imageUrl: optString(json, 'image_url'),
  );

  final int id;
  final String name;
  final int count;

  /// 112.4 Its picture, when it has one (a store's categories).
  final String? imageUrl;
}

class Instructor {
  const Instructor({
    required this.id,
    required this.name,
    this.avatarUrl,
    this.bio,
  });

  factory Instructor.fromJson(Json json) => Instructor(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    avatarUrl: optString(json, 'avatar_url'),
    bio: optString(json, 'bio'),
  );

  final int id;
  final String name;
  final String? avatarUrl;
  final String? bio;
}

class Price {
  const Price({
    required this.isFree,
    this.amount,
    this.saleAmount,
    this.currency,
    this.formatted,
  });

  factory Price.fromJson(Json json) => Price(
    isFree: reqBool(json, 'is_free'),
    amount: optString(json, 'amount'),
    saleAmount: optString(json, 'sale_amount'),
    currency: optString(json, 'currency'),
    formatted: optString(json, 'formatted'),
  );

  final bool isFree;
  final String? amount;
  final String? saleAmount;
  final String? currency;
  final String? formatted;

  /// The text shown for the price: "Free", the site's formatted price, or the
  /// amount with its currency.
  String get label {
    if (isFree) return currentL10n.free;
    if (formatted != null && formatted!.isNotEmpty) return formatted!;
    final value = saleAmount ?? amount;
    if (value == null) return '';
    return currency == null ? value : '$value $currency';
  }
}

class CourseSummary {
  const CourseSummary({
    required this.id,
    required this.title,
    required this.price,
    required this.lessonCount,
    required this.enrolled,
    this.imageUrl,
    this.instructor,
    this.rating,
    this.ratingCount = 0,
    this.wishlisted = false,
  });

  factory CourseSummary.fromJson(Json json) => CourseSummary(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    imageUrl: optString(json, 'image_url'),
    instructor: optObject(json, 'instructor', Instructor.fromJson),
    price: Price.fromJson(asJson(json['price'], 'price')),
    lessonCount: reqInt(json, 'lesson_count'),
    rating: optDouble(json, 'rating'),
    ratingCount: intOr(json, 'rating_count', 0),
    enrolled: reqBool(json, 'enrolled'),
    wishlisted: boolOr(json, 'wishlisted', false),
  );

  final int id;
  final String title;
  final String? imageUrl;
  final Instructor? instructor;
  final Price price;
  final int lessonCount;
  final double? rating;
  final int ratingCount;
  final bool enrolled;
  final bool wishlisted;
}

/// What the course page's main button does on this platform. 100 `store`:
/// buy it through Google Play or the App Store (`storeProductId`).
enum PurchaseAction { continueLearning, enrollFree, checkout, store, none }

PurchaseAction purchaseActionFromWire(Object? wire) => switch (wire) {
  'continue' => PurchaseAction.continueLearning,
  'enroll_free' => PurchaseAction.enrollFree,
  'checkout' => PurchaseAction.checkout,
  'store' => PurchaseAction.store,
  _ => PurchaseAction.none,
};

class CourseDetail extends CourseSummary {
  const CourseDetail({
    required super.id,
    required super.title,
    required super.price,
    required super.lessonCount,
    required super.enrolled,
    required this.descriptionHtml,
    required this.purchaseAction,
    super.imageUrl,
    super.instructor,
    super.rating,
    super.ratingCount,
    super.wishlisted,
    this.introVideo,
    this.durationMinutes,
    this.level,
    this.hasCertificate = false,
    this.categories = const [],
    this.qna,
    this.studentCount,
    this.about = CourseAbout.empty,
    this.progress,
    this.certificateUrl,
    this.passwordProtected = false,
    this.websiteUrl,
    this.canRestart = false,
    this.membership,
    this.storeProductId,
    this.cohort,
    this.takesCoupons = false,
    this.bundles = const [],
  });

  factory CourseDetail.fromJson(Json json) {
    final summary = CourseSummary.fromJson(json);
    final purchase = asJson(json['purchase'], 'purchase');
    return CourseDetail(
      id: summary.id,
      title: summary.title,
      imageUrl: summary.imageUrl,
      instructor: summary.instructor,
      price: summary.price,
      lessonCount: summary.lessonCount,
      rating: summary.rating,
      ratingCount: summary.ratingCount,
      enrolled: summary.enrolled,
      wishlisted: summary.wishlisted,
      descriptionHtml: reqString(json, 'description_html'),
      introVideo: optObject(json, 'intro_video', Video.fromJson),
      durationMinutes: optInt(json, 'duration_minutes'),
      level: optString(json, 'level'),
      hasCertificate: boolOr(json, 'has_certificate', false),
      categories: listOf(json, 'categories', Category.fromJson),
      qna: json['qna'] is bool ? json['qna'] as bool : null,
      purchaseAction: purchaseActionFromWire(purchase['action']),
      studentCount: optInt(json, 'student_count'),
      about: json['about'] is Map
          ? CourseAbout.fromJson(asJson(json['about']))
          : CourseAbout.empty,
      progress: optObject(json, 'progress', Progress.fromJson),
      certificateUrl: optString(json, 'certificate_url'),
      cohort: optObject(json, 'cohort', CourseCohort.fromJson),
      passwordProtected: boolOr(json, 'password_protected', false),
      websiteUrl: optString(json, 'website_url'),
      canRestart: boolOr(json, 'can_restart', false),
      membership: optObject(json, 'membership', CourseMembership.fromJson),
      storeProductId: _nonEmpty(optString(purchase, 'store_product_id')),
      takesCoupons: boolOr(purchase, 'coupons', false),
      bundles: listOf(json, 'bundles', Bundle.fromJson),
    );
  }

  final String descriptionHtml;
  final Video? introVideo;
  final int? durationMinutes;
  final String? level;
  final bool hasCertificate;
  final List<Category> categories;
  final PurchaseAction purchaseAction;

  /// Whether the course has Q&A on. Null from older plugins, which only
  /// report the site-wide `features.qna`.
  final bool? qna;

  /// Students enrolled; null when the LMS (or an older plugin) doesn't say.
  final int? studentCount;

  /// 30 The lists the LMS keeps beside the description.
  final CourseAbout about;

  /// 45 The signed-in student's progress, when enrolled; null for visitors
  /// and from older servers.
  final Progress? progress;

  /// 45 The student's certificate for this course, once earned.
  final String? certificateUrl;

  /// 112.5 The cohort the enrolled student learns with.
  final CourseCohort? cohort;

  /// 112.5 The academy takes coupons at its checkout.
  final bool takesCoupons;

  /// 113.1 The bundles this course is in.
  final List<Bundle> bundles;

  /// 62 The website asks for a password to open the course. The app never
  /// does: unless the student is in it, the course page says so and opens
  /// [websiteUrl] for the password step.
  final bool passwordProtected;

  /// 62 The course's page on the website; null when it has none.
  final String? websiteUrl;

  /// 73 A student who finished it can start it again
  /// (`POST /courses/{id}/restart`). False from older servers.
  final bool canRestart;

  /// 90.3 The website's memberships that open the course; null when it needs
  /// none.
  final CourseMembership? membership;

  /// 100 With [PurchaseAction.store], the store product the main button buys.
  final String? storeProductId;

  static String? _nonEmpty(String? value) =>
      value == null || value.isEmpty ? null : value;
}

/// 90.3 The plans on the website that open a course, and whether the student
/// has one. Without one the course can't be joined from the app.
class CourseMembership {
  const CourseMembership({
    required this.hasAccess,
    required this.plans,
    this.storeProductIds = const [],
  });

  factory CourseMembership.fromJson(Json json) => CourseMembership(
    hasAccess: reqBool(json, 'has_access'),
    plans: [
      for (final plan in (json['plans'] as List? ?? const []))
        if (plan is String && plan.isNotEmpty) plan,
    ],
    storeProductIds: [
      for (final id in stringList(json, 'store_product_ids'))
        if (id.isNotEmpty) id,
    ],
  );

  final bool hasAccess;
  final List<String> plans;

  /// 100 The store subscriptions of the plans that open the course, sold in
  /// the app, to offer while [hasAccess] is false.
  final List<String> storeProductIds;
}

/// 30 What students learn, the requirements, who the course is for and what
/// it includes (`CourseDetail.about`). Each list is empty when the course
/// has none.
class CourseAbout {
  const CourseAbout({
    this.learn = const [],
    this.requirements = const [],
    this.audience = const [],
    this.includes = const [],
  });

  factory CourseAbout.fromJson(Json json) => CourseAbout(
    learn: stringList(json, 'learn'),
    requirements: stringList(json, 'requirements'),
    audience: stringList(json, 'audience'),
    includes: stringList(json, 'includes'),
  );

  static const empty = CourseAbout();

  final List<String> learn;
  final List<String> requirements;
  final List<String> audience;
  final List<String> includes;

  bool get isEmpty =>
      learn.isEmpty &&
      requirements.isEmpty &&
      audience.isEmpty &&
      includes.isEmpty;
}

enum VideoSource { upload, youtube, vimeo, external, embed }

class Video {
  const Video({
    required this.source,
    this.url,
    this.expiresAt,
    this.embedHtml,
    this.durationSeconds,
    this.posterUrl,
  });

  factory Video.fromJson(Json json) => Video(
    source: enumFrom(VideoSource.values, json['source'], VideoSource.external),
    url: optString(json, 'url'),
    expiresAt: optDate(json, 'expires_at'),
    embedHtml: optString(json, 'embed_html'),
    durationSeconds: optInt(json, 'duration_seconds'),
    posterUrl: optString(json, 'poster_url'),
  );

  final VideoSource source;
  final String? url;
  final DateTime? expiresAt;
  final String? embedHtml;
  final int? durationSeconds;
  final String? posterUrl;

  /// Uploaded and external files play natively; the rest use a web view.
  bool get playsNatively =>
      (source == VideoSource.upload || source == VideoSource.external) &&
      url != null;

  bool isExpired(DateTime now) =>
      expiresAt != null && !now.isBefore(expiresAt!);
}

/// 112.5 A course's cohort: students who start together on its first day.
class CourseCohort {
  const CourseCohort({
    required this.id,
    required this.name,
    required this.startsAt,
  });

  factory CourseCohort.fromJson(Json json) => CourseCohort(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    startsAt: reqDate(json, 'starts_at'),
  );

  final int id;
  final String name;
  final DateTime startsAt;
}

/// 112.5 What a coupon takes off a paid course (`POST /courses/{id}/coupon`).
class CouponCheck {
  const CouponCheck({
    required this.code,
    required this.applied,
    required this.total,
    this.message,
    this.discount,
    this.free = false,
  });

  factory CouponCheck.fromJson(Json json) => CouponCheck(
    code: reqString(json, 'code'),
    applied: json['status'] == 'applied',
    message: optString(json, 'message'),
    discount: optString(json, 'discount'),
    total: reqString(json, 'total'),
    free: boolOr(json, 'free', false),
  );

  final String code;
  final bool applied;
  final String? message;
  final String? discount;
  final String total;

  /// 113.1 The coupon takes the whole price: checking out with it enrols at
  /// once, with no payment.
  final bool free;
}

/// 113.1 What a bundle's page's main button does on this platform.
enum BundleAction { owned, checkout, store, none }

/// 113.1 Several courses sold together at one price the academy sets
/// (`GET /bundles`).
class Bundle {
  const Bundle({
    required this.id,
    required this.title,
    required this.courseCount,
    required this.price,
    this.imageUrl,
    this.compareAt,
    this.ownedCount = 0,
    this.owned = false,
  });

  factory Bundle.fromJson(Json json) => Bundle(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    imageUrl: optString(json, 'image_url'),
    courseCount: reqInt(json, 'course_count'),
    price: Price.fromJson(asJson(json['price'], 'price')),
    compareAt: optObject(json, 'compare_at', Price.fromJson),
    ownedCount: intOr(json, 'owned_count', 0),
    owned: boolOr(json, 'owned', false),
  );

  final int id;
  final String title;
  final String? imageUrl;
  final int courseCount;
  final Price price;

  /// What its courses cost on their own, when more than [price].
  final Price? compareAt;

  /// Its courses the student is in already; [owned]: all of them.
  final int ownedCount;
  final bool owned;
}

/// 113.1 A bundle's page (`GET /bundles/{id}`).
class BundleDetail extends Bundle {
  const BundleDetail({
    required super.id,
    required super.title,
    required super.courseCount,
    required super.price,
    required this.descriptionHtml,
    required this.courses,
    required this.action,
    super.imageUrl,
    super.compareAt,
    super.ownedCount,
    super.owned,
    this.storeProductId,
    this.takesCoupons = false,
  });

  factory BundleDetail.fromJson(Json json) {
    final bundle = Bundle.fromJson(json);
    final purchase = asJson(json['purchase'], 'purchase');
    final productId = optString(purchase, 'store_product_id');
    return BundleDetail(
      id: bundle.id,
      title: bundle.title,
      imageUrl: bundle.imageUrl,
      courseCount: bundle.courseCount,
      price: bundle.price,
      compareAt: bundle.compareAt,
      ownedCount: bundle.ownedCount,
      owned: bundle.owned,
      descriptionHtml: reqString(json, 'description_html'),
      courses: listOf(json, 'courses', CourseSummary.fromJson),
      action: enumFrom(
        BundleAction.values,
        purchase['action'],
        BundleAction.none,
      ),
      storeProductId: productId == null || productId.isEmpty ? null : productId,
      takesCoupons: boolOr(purchase, 'coupons', false),
    );
  }

  final String descriptionHtml;
  final List<CourseSummary> courses;
  final BundleAction action;

  /// With [BundleAction.store], the store product the button buys.
  final String? storeProductId;

  /// The academy takes coupons at its checkout.
  final bool takesCoupons;
}
