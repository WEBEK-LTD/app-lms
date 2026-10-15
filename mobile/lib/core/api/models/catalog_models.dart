import 'json.dart';
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
  const Category({required this.id, required this.name, required this.count});

  factory Category.fromJson(Json json) => Category(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    count: reqInt(json, 'count'),
  );

  final int id;
  final String name;
  final int count;
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

/// What the course page's main button does on this platform.
enum PurchaseAction { continueLearning, enrollFree, checkout, none }

PurchaseAction purchaseActionFromWire(Object? wire) => switch (wire) {
  'continue' => PurchaseAction.continueLearning,
  'enroll_free' => PurchaseAction.enrollFree,
  'checkout' => PurchaseAction.checkout,
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
