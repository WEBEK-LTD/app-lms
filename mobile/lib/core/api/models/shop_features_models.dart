import 'catalog_models.dart';
import 'community_models.dart';
import 'json.dart';
import 'store_models.dart';

/// 212 A store's wishlist, reviews with photos, "notify me when it's back"
/// and its listing filters (`docs/api/openapi.yaml`). Older servers send
/// none of it: the app keeps hearts on the phone, lists reviews as before
/// and shows its own sort only.

/// `StoreConfig.review_photos`: how many photos a review takes, how big.
class ReviewPhotoRules {
  const ReviewPhotoRules({
    required this.max,
    required this.maxBytes,
    required this.types,
  });

  static ReviewPhotoRules? tryParse(Object? raw) {
    if (raw is! Map) return null;
    final json = raw.cast<String, dynamic>();
    final max = intOr(json, 'max', 0);
    if (max <= 0) return null;
    return ReviewPhotoRules(
      max: max,
      maxBytes: intOr(json, 'max_bytes', 8 * 1024 * 1024),
      types: stringList(json, 'types'),
    );
  }

  final int max;
  final int maxBytes;
  final List<String> types;
}

/// `ProductDetail.reviews_preview`: the summary with its bars, the first
/// reviews, the photos row, the customer's own and whether they may write.
class ReviewsPreview {
  const ReviewsPreview({
    required this.summary,
    required this.items,
    required this.photos,
    required this.photoCount,
    required this.canReview,
    this.mine,
  });

  static ReviewsPreview? tryParse(Object? raw) {
    if (raw is! Map) return null;
    final json = raw.cast<String, dynamic>();
    final summary = json['summary'];
    if (summary is! Map) return null;
    return ReviewsPreview(
      summary: RatingSummary.fromJson(summary.cast<String, dynamic>()),
      items: listOf(json, 'items', Review.fromJson),
      photos: listOf(json, 'photos', ReviewPhoto.fromJson),
      photoCount: intOr(json, 'photo_count', 0),
      mine: optObject(json, 'mine', Review.fromJson),
      canReview: boolOr(json, 'can_review', false),
    );
  }

  final RatingSummary summary;
  final List<Review> items;
  final List<ReviewPhoto> photos;
  final int photoCount;
  final Review? mine;
  final bool canReview;
}

class ReviewPhoto {
  const ReviewPhoto({required this.url, this.reviewId});

  factory ReviewPhoto.fromJson(Json json) => ReviewPhoto(
    url: reqString(json, 'url'),
    reviewId: optInt(json, 'review_id'),
  );

  final String url;
  final int? reviewId;
}

/// `ProductDetail.back_in_stock`: what the signed-in customer waits for.
class BackInStock {
  const BackInStock({required this.waiting, required this.variations});

  static BackInStock? tryParse(Object? raw) {
    if (raw is! Map) return null;
    final json = raw.cast<String, dynamic>();
    final list = json['variations'];
    return BackInStock(
      waiting: boolOr(json, 'waiting', false),
      variations: {
        if (list is List)
          for (final v in list)
            if (v is num) v.toInt(),
      },
    );
  }

  final bool waiting;
  final Set<int> variations;

  /// Whether they wait for this choice (null: the product itself).
  bool waitsFor(int? variationId) =>
      variationId == null ? waiting : variations.contains(variationId);
}

/// `GET /store/wishlist`.
class WishlistPage {
  const WishlistPage({required this.ids, required this.page});

  factory WishlistPage.fromJson(Json json) => WishlistPage(
    ids: [
      for (final v in (json['ids'] as List? ?? const []))
        if (v is num) v.toInt(),
    ],
    page: Paged.fromJson(json, ProductSummary.fromJson),
  );

  final List<int> ids;
  final Paged<ProductSummary> page;
}

enum FilterKind { size, colour, choice }

class FilterValue {
  const FilterValue({
    required this.value,
    required this.label,
    required this.count,
    this.swatch,
  });

  factory FilterValue.fromJson(Json json) => FilterValue(
    value: reqString(json, 'value'),
    label: optString(json, 'label') ?? reqString(json, 'value'),
    count: intOr(json, 'count', 0),
    swatch: optString(json, 'swatch'),
  );

  final String value;
  final String label;
  final int count;

  /// A colour's swatch, `#rrggbb`; null when it isn't a common colour.
  final String? swatch;
}

class FilterChoice {
  const FilterChoice({
    required this.key,
    required this.name,
    required this.kind,
    required this.values,
  });

  factory FilterChoice.fromJson(Json json) => FilterChoice(
    key: reqString(json, 'key'),
    name: optString(json, 'name') ?? reqString(json, 'key'),
    kind: enumFrom(FilterKind.values, json['kind'], FilterKind.choice),
    values: listOf(json, 'values', FilterValue.fromJson),
  );

  final String key;
  final String name;
  final FilterKind kind;
  final List<FilterValue> values;

  /// The query parameter it is sent as (`size`, `colour`, `f.<key>`).
  String get param => key == 'size' || key == 'colour' ? key : 'f.$key';
}

class PriceRange {
  const PriceRange({
    required this.min,
    required this.max,
    required this.currency,
    this.minFormatted,
    this.maxFormatted,
  });

  static PriceRange? tryParse(Object? raw) {
    if (raw is! Map) return null;
    final json = raw.cast<String, dynamic>();
    final min = double.tryParse('${json['min']}');
    final max = double.tryParse('${json['max']}');
    if (min == null || max == null || max <= min) return null;
    return PriceRange(
      min: min,
      max: max,
      currency: optString(json, 'currency') ?? '',
      minFormatted: optString(json, 'min_formatted'),
      maxFormatted: optString(json, 'max_formatted'),
    );
  }

  final double min;
  final double max;
  final String currency;
  final String? minFormatted;
  final String? maxFormatted;
}

/// `GET /store/filters`: what a listing can be filtered by.
class ShopFilters {
  const ShopFilters({required this.choices, required this.brands, this.price});

  factory ShopFilters.fromJson(Json json) => ShopFilters(
    choices: listOf(json, 'choices', FilterChoice.fromJson),
    price: PriceRange.tryParse(json['price']),
    brands: [
      for (final b in listOf(json, 'brands', (j) => optString(j, 'value')))
        if (b != null && b.isNotEmpty) b,
    ],
  );

  static const none = ShopFilters(choices: [], brands: []);

  final List<FilterChoice> choices;
  final PriceRange? price;
  final List<String> brands;

  /// Anything to filter by beyond the sort.
  bool get any => choices.isNotEmpty || price != null || brands.isNotEmpty;
}
