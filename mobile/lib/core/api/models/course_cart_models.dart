import 'json.dart';

/// 123 The app's course cart (`POST /courses/cart`): the courses priced as
/// the site sells them now, with a coupon of the site's, and the cards the
/// student saved with the site's payment gateway (`GET /me/cards`).

class CourseCartLine {
  const CourseCartLine({
    required this.courseId,
    required this.title,
    required this.price,
    required this.available,
    this.imageUrl,
    this.problem,
  });

  factory CourseCartLine.fromJson(Json json) => CourseCartLine(
    courseId: reqInt(json, 'course_id'),
    title: reqString(json, 'title'),
    imageUrl: optString(json, 'image_url'),
    price: reqString(json, 'price'),
    available: boolOr(json, 'available', false),
    problem: optString(json, 'problem'),
  );

  final int courseId;
  final String title;
  final String? imageUrl;
  final String price;
  final bool available;

  /// Why it can't be bought (they have it, it's free, it isn't sold).
  final String? problem;
}

enum CourseCouponStatus { applied, invalid, atCheckout }

class CourseCartCoupon {
  const CourseCartCoupon({
    required this.code,
    required this.status,
    this.label,
    this.message,
  });

  factory CourseCartCoupon.fromJson(Json json) => CourseCartCoupon(
    code: reqString(json, 'code'),
    status: switch (json['status']) {
      'applied' => CourseCouponStatus.applied,
      'at_checkout' => CourseCouponStatus.atCheckout,
      _ => CourseCouponStatus.invalid,
    },
    label: optString(json, 'label'),
    message: optString(json, 'message'),
  );

  final String code;
  final CourseCouponStatus status;

  /// What it takes off (`20%`, `EGP 50`).
  final String? label;
  final String? message;
}

class CourseCart {
  const CourseCart({
    required this.lines,
    required this.subtotal,
    required this.total,
    required this.currency,
    this.discount,
    this.coupon,
  });

  factory CourseCart.fromJson(Json json) => CourseCart(
    lines: listOf(json, 'lines', CourseCartLine.fromJson),
    subtotal: reqString(json, 'subtotal'),
    discount: optString(json, 'discount'),
    total: reqString(json, 'total'),
    currency: reqString(json, 'currency'),
    coupon: json['coupon'] is Map<String, dynamic>
        ? CourseCartCoupon.fromJson(json['coupon'] as Json)
        : null,
  );

  final List<CourseCartLine> lines;
  final String subtotal;
  final String? discount;
  final String total;
  final String currency;
  final CourseCartCoupon? coupon;

  List<CourseCartLine> get available => [
    for (final l in lines)
      if (l.available) l,
  ];
}

class SavedCard {
  const SavedCard({
    required this.id,
    required this.brand,
    required this.last4,
    required this.expMonth,
    required this.expYear,
    this.isDefault = false,
  });

  factory SavedCard.fromJson(Json json) => SavedCard(
    id: reqString(json, 'id'),
    brand: reqString(json, 'brand'),
    last4: reqString(json, 'last4'),
    expMonth: reqInt(json, 'exp_month'),
    expYear: reqInt(json, 'exp_year'),
    isDefault: boolOr(json, 'default', false),
  );

  final String id;
  final String brand;
  final String last4;
  final int expMonth;
  final int expYear;
  final bool isDefault;

  /// `08/28`.
  String get expiry =>
      '${expMonth.toString().padLeft(2, '0')}/${(expYear % 100).toString().padLeft(2, '0')}';
}
