import 'chat_models.dart';
import 'json.dart';

/// 100 Courses and memberships bought in the app through Google Play Billing
/// and the App Store (`Config.store_billing`, the Store billing tag of
/// docs/api/openapi.yaml). Missing: no buying in the app for digital content.
class StoreBillingConfig {
  const StoreBillingConfig({
    required this.baseUrl,
    required this.session,
    this.termsUrl,
  });

  factory StoreBillingConfig.fromJson(Json json) => StoreBillingConfig(
    baseUrl: reqString(json, 'base_url'),
    session:
        ChatSessionKind.fromWire(json['session']) ??
        ChatSessionKind.accessToken,
    termsUrl: optString(json, 'terms_url'),
  );

  /// Where the Store billing endpoints are (Yallapp's hosted API for the app).
  final String baseUrl;

  /// As the chat's: the app's own access token, or a token from the
  /// WordPress site (`POST /billing/session`).
  final ChatSessionKind session;

  /// The terms shown with a subscription (else `Config.site.terms_url`).
  final String? termsUrl;
}

enum StoreProductType { oneTime, subscription }

enum StoreProductKind { course, membership }

enum StorePeriod { month, year }

/// One of the app's products in the stores (`GET /billing/products`). Its
/// price comes from the store, in the person's currency.
class StoreProduct {
  const StoreProduct({
    required this.productId,
    required this.type,
    required this.kind,
    required this.title,
    this.courseId,
    this.planId,
    this.period,
    this.courseIds = const [],
  });

  factory StoreProduct.fromJson(Json json) => StoreProduct(
    productId: reqString(json, 'product_id'),
    type: enumFromSnake(
      StoreProductType.values,
      json['type'],
      StoreProductType.oneTime,
    ),
    kind: enumFrom(
      StoreProductKind.values,
      json['kind'],
      StoreProductKind.course,
    ),
    title: reqString(json, 'title'),
    courseId: optInt(json, 'course_id'),
    planId: optString(json, 'plan_id'),
    period: enumOrNull(StorePeriod.values, json['period']),
    courseIds: [
      for (final id
          in (json['course_ids'] is List
              ? json['course_ids'] as List
              : const []))
        if (id is int) id,
    ],
  );

  final String productId;
  final StoreProductType type;
  final StoreProductKind kind;
  final String title;
  final int? courseId;
  final String? planId;
  final StorePeriod? period;

  /// For a membership, the courses it opens when the source says.
  final List<int> courseIds;

  bool get isSubscription => type == StoreProductType.subscription;
}

enum StoreGrantStatus { active, pending, expired, revoked }

/// The access a store purchase gives (`POST /billing/purchases`).
class StoreGrant {
  const StoreGrant({
    required this.productId,
    required this.kind,
    required this.status,
    this.courseId,
    this.planId,
    this.expiresAt,
  });

  factory StoreGrant.fromJson(Json json) => StoreGrant(
    productId: reqString(json, 'product_id'),
    kind: enumFrom(
      StoreProductKind.values,
      json['kind'],
      StoreProductKind.course,
    ),
    // An unknown status gives nothing.
    status: enumFrom(
      StoreGrantStatus.values,
      json['status'],
      StoreGrantStatus.revoked,
    ),
    courseId: optInt(json, 'course_id'),
    planId: optString(json, 'plan_id'),
    expiresAt: optDate(json, 'expires_at'),
  );

  final String productId;
  final StoreProductKind kind;
  final StoreGrantStatus status;
  final int? courseId;
  final String? planId;

  /// Memberships: until when.
  final DateTime? expiresAt;

  bool get isActive => status == StoreGrantStatus.active;
}
