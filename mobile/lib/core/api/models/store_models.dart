import 'config_models.dart';
import 'json.dart';
import 'restaurant_models.dart';

/// `Config.store`: the shop's settings for Store apps.
class StoreConfig {
  const StoreConfig({
    required this.currency,
    required this.guestCheckout,
    required this.checkoutOpensIn,
    required this.reviews,
    required this.deliveryDate,
    required this.giftMessage,
    this.fulfilment,
  });

  factory StoreConfig.fromJson(Json json) => StoreConfig(
    currency: reqString(json, 'currency'),
    guestCheckout: reqBool(json, 'guest_checkout'),
    checkoutOpensIn: enumFromSnake(
      CheckoutOpensIn.values,
      json['checkout_opens_in'],
      CheckoutOpensIn.inApp,
    ),
    reviews: boolOr(json, 'reviews', false),
    deliveryDate: DeliveryDateRules.fromJson(
      asJson(json['delivery_date'], 'delivery_date'),
    ),
    giftMessage: GiftMessageRules.fromJson(
      asJson(json['gift_message'], 'gift_message'),
    ),
    fulfilment: optObject(json, 'fulfilment', FulfilmentConfig.fromJson),
  );

  final String currency;
  final bool guestCheckout;
  final CheckoutOpensIn checkoutOpensIn;
  final bool reviews;
  final DeliveryDateRules deliveryDate;
  final GiftMessageRules giftMessage;

  /// 26 Pickup and delivery of a restaurant or café; null for other shops.
  final FulfilmentConfig? fulfilment;
}

/// The delivery date the customer picks in the cart.
class DeliveryDateRules {
  const DeliveryDateRules({
    required this.enabled,
    required this.required,
    required this.minDays,
    required this.maxDays,
    this.closedWeekdays = const [],
  });

  factory DeliveryDateRules.fromJson(Json json) => DeliveryDateRules(
    enabled: reqBool(json, 'enabled'),
    required: reqBool(json, 'required'),
    minDays: reqInt(json, 'min_days'),
    maxDays: reqInt(json, 'max_days'),
    closedWeekdays: [
      for (final day in (json['closed_weekdays'] as List? ?? const []))
        if (day is num) day.toInt(),
    ],
  );

  final bool enabled;
  final bool required;
  final int minDays;
  final int maxDays;

  /// 0 = Sunday, as the plugin sends them.
  final List<int> closedWeekdays;

  /// Whether the shop delivers on [day] (a calendar date, time ignored),
  /// counting days from [today].
  bool allows(DateTime day, DateTime today) {
    final d = DateTime(day.year, day.month, day.day);
    final t = DateTime(today.year, today.month, today.day);
    final days = d.difference(t).inDays;
    return days >= minDays &&
        days <= maxDays &&
        !closedWeekdays.contains(d.weekday % 7);
  }

  /// The first day the shop delivers, or null when none is open.
  DateTime? firstDay(DateTime today) {
    final t = DateTime(today.year, today.month, today.day);
    for (var i = minDays; i <= maxDays; i++) {
      final day = DateTime(t.year, t.month, t.day + i);
      if (allows(day, t)) return day;
    }
    return null;
  }
}

class GiftMessageRules {
  const GiftMessageRules({required this.enabled, required this.maxLength});

  factory GiftMessageRules.fromJson(Json json) => GiftMessageRules(
    enabled: reqBool(json, 'enabled'),
    maxLength: intOr(json, 'max_length', 200),
  );

  final bool enabled;
  final int maxLength;
}

class ProductCategory {
  const ProductCategory({
    required this.id,
    required this.name,
    required this.count,
    this.parentId,
    this.imageUrl,
  });

  factory ProductCategory.fromJson(Json json) => ProductCategory(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    count: reqInt(json, 'count'),
    parentId: optInt(json, 'parent_id'),
    imageUrl: optString(json, 'image_url'),
  );

  final int id;
  final String name;
  final int count;
  final int? parentId;
  final String? imageUrl;
}

class ProductPrice {
  const ProductPrice({
    required this.amount,
    required this.currency,
    required this.formatted,
    required this.onSale,
    required this.range,
    this.regularAmount,
    this.regularFormatted,
  });

  factory ProductPrice.fromJson(Json json) => ProductPrice(
    amount: reqString(json, 'amount'),
    regularAmount: optString(json, 'regular_amount'),
    regularFormatted: optString(json, 'regular_formatted'),
    currency: reqString(json, 'currency'),
    formatted: reqString(json, 'formatted'),
    onSale: boolOr(json, 'on_sale', false),
    range: boolOr(json, 'range', false),
  );

  final String amount;
  final String? regularAmount;
  final String? regularFormatted;
  final String currency;
  final String formatted;
  final bool onSale;
  final bool range;
}

enum ProductType { simple, variable, grouped, external, other }

enum StockStatus { inStock, outOfStock, onBackorder }

class ProductSummary {
  const ProductSummary({
    required this.id,
    required this.name,
    required this.type,
    required this.price,
    required this.stockStatus,
    required this.purchasable,
    required this.digital,
    this.imageUrl,
    this.rating,
    this.ratingCount = 0,
  });

  factory ProductSummary.fromJson(Json json) => ProductSummary(
    id: reqInt(json, 'id'),
    name: reqString(json, 'name'),
    type: enumFrom(ProductType.values, json['type'], ProductType.other),
    imageUrl: optString(json, 'image_url'),
    price: ProductPrice.fromJson(asJson(json['price'], 'price')),
    rating: optDouble(json, 'rating'),
    ratingCount: intOr(json, 'rating_count', 0),
    stockStatus: enumFromSnake(
      StockStatus.values,
      json['stock_status'],
      StockStatus.inStock,
    ),
    purchasable: reqBool(json, 'purchasable'),
    digital: boolOr(json, 'digital', false),
  );

  final int id;
  final String name;
  final ProductType type;
  final String? imageUrl;
  final ProductPrice price;
  final double? rating;
  final int ratingCount;
  final StockStatus stockStatus;

  /// Whether it can go in the app's cart.
  final bool purchasable;

  /// Virtual or downloadable: never sold in the iOS app.
  final bool digital;
}

class ProductImage {
  const ProductImage({required this.url, this.alt});

  factory ProductImage.fromJson(Json json) =>
      ProductImage(url: reqString(json, 'url'), alt: optString(json, 'alt'));

  final String url;
  final String? alt;
}

class AttributeOption {
  const AttributeOption({required this.value, required this.label});

  factory AttributeOption.fromJson(Json json) => AttributeOption(
    value: reqString(json, 'value'),
    label: reqString(json, 'label'),
  );

  final String value;
  final String label;
}

class ProductAttribute {
  const ProductAttribute({
    required this.slug,
    required this.name,
    required this.variation,
    required this.options,
  });

  factory ProductAttribute.fromJson(Json json) => ProductAttribute(
    slug: reqString(json, 'slug'),
    name: reqString(json, 'name'),
    variation: boolOr(json, 'variation', false),
    options: listOf(json, 'options', AttributeOption.fromJson),
  );

  final String slug;
  final String name;

  /// Chosen before a variable product goes in the cart.
  final bool variation;
  final List<AttributeOption> options;

  String labelOf(String value) =>
      options.where((o) => o.value == value).firstOrNull?.label ?? value;
}

class ProductVariation {
  const ProductVariation({
    required this.id,
    required this.attributes,
    required this.price,
    required this.stockStatus,
    required this.purchasable,
    this.imageUrl,
    this.maxQuantity,
  });

  factory ProductVariation.fromJson(Json json) {
    final raw = json['attributes'];
    return ProductVariation(
      id: reqInt(json, 'id'),
      attributes: {
        if (raw is Map)
          for (final entry in raw.entries) '${entry.key}': '${entry.value}',
      },
      price: ProductPrice.fromJson(asJson(json['price'], 'price')),
      imageUrl: optString(json, 'image_url'),
      stockStatus: enumFromSnake(
        StockStatus.values,
        json['stock_status'],
        StockStatus.inStock,
      ),
      maxQuantity: optInt(json, 'max_quantity'),
      purchasable: boolOr(json, 'purchasable', false),
    );
  }

  final int id;

  /// Attribute slug to option value; an empty value means any option.
  final Map<String, String> attributes;
  final ProductPrice price;
  final String? imageUrl;
  final StockStatus stockStatus;
  final int? maxQuantity;
  final bool purchasable;

  /// Whether this variation fits the chosen options (empty values match any).
  bool matches(Map<String, String> chosen) => attributes.entries.every(
    (a) => a.value.isEmpty || chosen[a.key] == a.value,
  );
}

class ProductDetail {
  const ProductDetail({
    required this.summary,
    required this.descriptionHtml,
    required this.images,
    required this.attributes,
    required this.variations,
    required this.categories,
    required this.related,
    required this.permalink,
    this.shortDescriptionHtml,
    this.sku,
    this.maxQuantity,
    this.externalUrl,
    this.optionGroups = const [],
  });

  factory ProductDetail.fromJson(Json json) => ProductDetail(
    summary: ProductSummary.fromJson(json),
    descriptionHtml: optString(json, 'description_html') ?? '',
    shortDescriptionHtml: optString(json, 'short_description_html'),
    images: listOf(json, 'images', ProductImage.fromJson),
    sku: optString(json, 'sku'),
    maxQuantity: optInt(json, 'max_quantity'),
    attributes: listOf(json, 'attributes', ProductAttribute.fromJson),
    variations: listOf(json, 'variations', ProductVariation.fromJson),
    categories: listOf(json, 'categories', ProductCategory.fromJson),
    related: listOf(json, 'related', ProductSummary.fromJson),
    externalUrl: optString(json, 'external_url'),
    permalink: reqString(json, 'permalink'),
    optionGroups: listOf(json, 'option_groups', OptionGroup.fromJson),
  );

  final ProductSummary summary;
  final String descriptionHtml;
  final String? shortDescriptionHtml;
  final List<ProductImage> images;
  final String? sku;
  final int? maxQuantity;
  final List<ProductAttribute> attributes;
  final List<ProductVariation> variations;
  final List<ProductCategory> categories;
  final List<ProductSummary> related;
  final String? externalUrl;
  final String permalink;

  /// 26 Choices made before adding it to the cart (a dish's size or extras).
  final List<OptionGroup> optionGroups;

  int get id => summary.id;
  String get name => summary.name;

  /// Attributes the customer chooses before adding to the cart.
  List<ProductAttribute> get choices => [
    for (final a in attributes)
      if (a.variation) a,
  ];
}

enum StoreSectionType {
  banner,
  categories,
  featuredProducts,
  saleProducts,
  newProducts,
  bestSellers,
  unknown,
}

class StoreBanner {
  const StoreBanner({
    required this.imageUrl,
    this.linkProductId,
    this.linkCategoryId,
  });

  factory StoreBanner.fromJson(Json json) => StoreBanner(
    imageUrl: reqString(json, 'image_url'),
    linkProductId: optInt(json, 'link_product_id'),
    linkCategoryId: optInt(json, 'link_category_id'),
  );

  final String imageUrl;
  final int? linkProductId;
  final int? linkCategoryId;
}

class StoreHomeSection {
  const StoreHomeSection({
    required this.type,
    this.title,
    this.banner,
    this.categories = const [],
    this.products = const [],
  });

  factory StoreHomeSection.fromJson(Json json) => StoreHomeSection(
    type: enumFromSnake(
      StoreSectionType.values,
      json['type'],
      StoreSectionType.unknown,
    ),
    title: optString(json, 'title'),
    banner: optObject(json, 'banner', StoreBanner.fromJson),
    categories: listOf(json, 'categories', ProductCategory.fromJson),
    products: listOf(json, 'products', ProductSummary.fromJson),
  );

  final StoreSectionType type;
  final String? title;
  final StoreBanner? banner;
  final List<ProductCategory> categories;
  final List<ProductSummary> products;
}

/// One line of the cart the app keeps, as sent to the plugin.
class CartLineInput {
  const CartLineInput({
    required this.productId,
    required this.quantity,
    this.variationId,
    this.attributes = const {},
    this.options = const [],
  });

  final int productId;
  final int? variationId;
  final int quantity;
  final Map<String, String> attributes;

  /// 26 The IDs of the chosen options.
  final List<String> options;

  Json toJson() => {
    'product_id': productId,
    if (variationId != null) 'variation_id': variationId,
    'quantity': quantity,
    if (attributes.isNotEmpty) 'attributes': attributes,
    if (options.isNotEmpty) 'options': options,
  };
}

/// `POST /store/cart`: the app's cart as the shop prices it now.
class CartQuote {
  const CartQuote({
    required this.lines,
    required this.itemCount,
    required this.subtotal,
    required this.subtotalAmount,
    required this.currency,
  });

  factory CartQuote.fromJson(Json json) => CartQuote(
    lines: reqListOf(json, 'lines', CartQuoteLine.fromJson),
    itemCount: reqInt(json, 'item_count'),
    subtotal: reqString(json, 'subtotal'),
    subtotalAmount: reqString(json, 'subtotal_amount'),
    currency: reqString(json, 'currency'),
  );

  final List<CartQuoteLine> lines;
  final int itemCount;
  final String subtotal;
  final String subtotalAmount;
  final String currency;
}

class CartQuoteLine {
  const CartQuoteLine({
    required this.productId,
    required this.quantity,
    required this.name,
    required this.unitPrice,
    required this.lineTotal,
    required this.available,
    this.variationId,
    this.imageUrl,
    this.problem,
    this.maxQuantity,
    this.digital = false,
    this.options = const [],
  });

  factory CartQuoteLine.fromJson(Json json) => CartQuoteLine(
    productId: reqInt(json, 'product_id'),
    variationId: optInt(json, 'variation_id'),
    quantity: reqInt(json, 'quantity'),
    name: reqString(json, 'name'),
    imageUrl: optString(json, 'image_url'),
    unitPrice: reqString(json, 'unit_price'),
    lineTotal: reqString(json, 'line_total'),
    available: reqBool(json, 'available'),
    problem: optString(json, 'problem'),
    maxQuantity: optInt(json, 'max_quantity'),
    digital: boolOr(json, 'digital', false),
    options: listOf(json, 'options', CartLineOption.fromJson),
  );

  final int productId;
  final int? variationId;
  final int quantity;
  final String name;
  final String? imageUrl;
  final String unitPrice;
  final String lineTotal;
  final bool available;
  final String? problem;
  final int? maxQuantity;
  final bool digital;

  /// 26 The chosen options, as priced.
  final List<CartLineOption> options;
}
