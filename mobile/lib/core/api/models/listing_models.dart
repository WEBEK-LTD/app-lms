import 'json.dart';

enum AreaUnit { m2, ft2 }

/// `Config.listings`: the office's settings, for Real estate apps.
class ListingsConfig {
  const ListingsConfig({
    required this.currency,
    required this.areaUnit,
    required this.contact,
    required this.messages,
  });

  factory ListingsConfig.fromJson(Json json) => ListingsConfig(
    currency: reqString(json, 'currency'),
    areaUnit: enumFrom(AreaUnit.values, json['area_unit'], AreaUnit.m2),
    contact: OfficeContact.fromJson(asJson(json['contact'], 'contact')),
    messages: reqBool(json, 'messages'),
  );

  final String currency;
  final AreaUnit areaUnit;
  final OfficeContact contact;

  /// Whether users can message the office in the app.
  final bool messages;
}

class OfficeContact {
  const OfficeContact({
    required this.name,
    this.phone,
    this.whatsapp,
    this.email,
  });

  factory OfficeContact.fromJson(Json json) => OfficeContact(
    name: reqString(json, 'name'),
    phone: _blankToNull(optString(json, 'phone')),
    whatsapp: _blankToNull(optString(json, 'whatsapp')),
    email: _blankToNull(optString(json, 'email')),
  );

  final String name;
  final String? phone;
  final String? whatsapp;
  final String? email;

  bool get hasAny => phone != null || whatsapp != null || email != null;
}

String? _blankToNull(String? value) =>
    (value == null || value.trim().isEmpty) ? null : value.trim();

enum ListingPurpose { sale, rent }

class ListingTypeOption {
  const ListingTypeOption({
    required this.key,
    required this.label,
    required this.count,
  });

  factory ListingTypeOption.fromJson(Json json) => ListingTypeOption(
    key: reqString(json, 'key'),
    label: reqString(json, 'label'),
    count: intOr(json, 'count', 0),
  );

  final String key;
  final String label;
  final int count;
}

class ListingCity {
  const ListingCity({
    required this.name,
    required this.count,
    this.districts = const [],
  });

  factory ListingCity.fromJson(Json json) => ListingCity(
    name: reqString(json, 'name'),
    count: intOr(json, 'count', 0),
    districts: stringList(json, 'districts'),
  );

  final String name;
  final int count;
  final List<String> districts;
}

class NumberRange {
  const NumberRange({required this.min, required this.max});

  factory NumberRange.fromJson(Json json) => NumberRange(
    min: optDouble(json, 'min') ?? 0,
    max: optDouble(json, 'max') ?? 0,
  );

  final double min;
  final double max;
}

/// `GET /listings/filters`: what the search screen can filter by.
class ListingFilters {
  const ListingFilters({
    required this.purposes,
    required this.types,
    required this.cities,
    required this.price,
    required this.area,
    required this.bedroomsMax,
  });

  factory ListingFilters.fromJson(Json json) => ListingFilters(
    purposes: [
      for (final wire in stringList(json, 'purposes'))
        ?enumOrNull(ListingPurpose.values, wire),
    ],
    types: reqListOf(json, 'types', ListingTypeOption.fromJson),
    cities: reqListOf(json, 'cities', ListingCity.fromJson),
    price: NumberRange.fromJson(asJson(json['price'], 'price')),
    area: NumberRange.fromJson(asJson(json['area'], 'area')),
    bedroomsMax: intOr(json, 'bedrooms_max', 0),
  );

  final List<ListingPurpose> purposes;
  final List<ListingTypeOption> types;
  final List<ListingCity> cities;
  final NumberRange price;
  final NumberRange area;
  final int bedroomsMax;
}

enum RentPeriod { month, year }

class ListingPrice {
  const ListingPrice({
    required this.amount,
    required this.currency,
    required this.formatted,
    this.period,
    this.negotiable = false,
  });

  factory ListingPrice.fromJson(Json json) => ListingPrice(
    amount: reqString(json, 'amount'),
    currency: reqString(json, 'currency'),
    formatted: reqString(json, 'formatted'),
    period: enumOrNull(RentPeriod.values, json['period']),
    negotiable: boolOr(json, 'negotiable', false),
  );

  final String amount;
  final String currency;
  final String formatted;

  /// For rent: per month or year.
  final RentPeriod? period;
  final bool negotiable;
}

/// A listing in search results, favorites and "similar".
class ListingSummary {
  const ListingSummary({
    required this.id,
    required this.title,
    required this.purpose,
    required this.type,
    required this.price,
    required this.city,
    this.reference,
    this.typeLabel,
    this.imageUrl,
    this.district,
    this.area,
    this.bedrooms,
    this.bathrooms,
    this.featured = false,
    this.favorited = false,
  });

  factory ListingSummary.fromJson(Json json) => ListingSummary(
    id: reqInt(json, 'id'),
    reference: optString(json, 'reference'),
    title: reqString(json, 'title'),
    purpose: enumFrom(
      ListingPurpose.values,
      json['purpose'],
      ListingPurpose.sale,
    ),
    type: reqString(json, 'type'),
    typeLabel: optString(json, 'type_label'),
    price: ListingPrice.fromJson(asJson(json['price'], 'price')),
    imageUrl: optString(json, 'image_url'),
    city: reqString(json, 'city'),
    district: optString(json, 'district'),
    area: optDouble(json, 'area'),
    bedrooms: optInt(json, 'bedrooms'),
    bathrooms: optInt(json, 'bathrooms'),
    featured: boolOr(json, 'featured', false),
    favorited: boolOr(json, 'favorited', false),
  );

  final int id;
  final String? reference;
  final String title;
  final ListingPurpose purpose;
  final String type;
  final String? typeLabel;
  final ListingPrice price;
  final String? imageUrl;
  final String city;
  final String? district;

  /// In `ListingsConfig.area_unit`.
  final double? area;
  final int? bedrooms;
  final int? bathrooms;
  final bool featured;
  final bool favorited;

  /// "Maadi, Cairo" or "Cairo".
  String get place =>
      (district == null || district!.isEmpty) ? city : '$district, $city';
}

class ListingImage {
  const ListingImage({required this.url, this.alt});

  factory ListingImage.fromJson(Json json) =>
      ListingImage(url: reqString(json, 'url'), alt: optString(json, 'alt'));

  final String url;
  final String? alt;
}

class ListingLocation {
  const ListingLocation({this.address, this.latitude, this.longitude});

  factory ListingLocation.fromJson(Json json) => ListingLocation(
    address: optString(json, 'address'),
    latitude: optDouble(json, 'latitude'),
    longitude: optDouble(json, 'longitude'),
  );

  final String? address;
  final double? latitude;
  final double? longitude;

  bool get hasCoordinates => latitude != null && longitude != null;
}

/// `GET /listings/{id}`.
class ListingDetail {
  const ListingDetail({
    required this.summary,
    required this.descriptionHtml,
    required this.images,
    required this.features,
    required this.location,
    required this.createdAt,
    this.videoUrl,
    this.floor,
    this.yearBuilt,
    this.furnished,
    this.similar = const [],
  });

  factory ListingDetail.fromJson(Json json) => ListingDetail(
    summary: ListingSummary.fromJson(json),
    descriptionHtml: reqString(json, 'description_html'),
    images: reqListOf(json, 'images', ListingImage.fromJson),
    videoUrl: optString(json, 'video_url'),
    features: stringList(json, 'features'),
    floor: optInt(json, 'floor'),
    yearBuilt: optInt(json, 'year_built'),
    furnished: json['furnished'] is bool ? json['furnished'] as bool : null,
    location: ListingLocation.fromJson(asJson(json['location'], 'location')),
    similar: listOf(json, 'similar', ListingSummary.fromJson),
    createdAt: reqDate(json, 'created_at'),
  );

  final ListingSummary summary;
  final String descriptionHtml;
  final List<ListingImage> images;
  final String? videoUrl;

  /// Amenities, for example "Elevator" or "Garden".
  final List<String> features;
  final int? floor;
  final int? yearBuilt;
  final bool? furnished;
  final ListingLocation location;
  final List<ListingSummary> similar;
  final DateTime createdAt;

  int get id => summary.id;
  String get title => summary.title;
}

enum InquiryStatus { open, closed }

enum MessageSender { user, office }

class InquiryMessage {
  const InquiryMessage({
    required this.id,
    required this.from,
    required this.text,
    required this.createdAt,
  });

  factory InquiryMessage.fromJson(Json json) => InquiryMessage(
    id: reqInt(json, 'id'),
    from: enumFrom(MessageSender.values, json['from'], MessageSender.office),
    text: reqString(json, 'text'),
    createdAt: reqDate(json, 'created_at'),
  );

  final int id;
  final MessageSender from;
  final String text;
  final DateTime createdAt;
}

class InquiryListing {
  const InquiryListing({required this.id, required this.title, this.imageUrl});

  factory InquiryListing.fromJson(Json json) => InquiryListing(
    id: reqInt(json, 'id'),
    title: reqString(json, 'title'),
    imageUrl: optString(json, 'image_url'),
  );

  final int id;
  final String title;
  final String? imageUrl;
}

/// A conversation with the office about one listing.
class Inquiry {
  const Inquiry({
    required this.id,
    required this.listing,
    required this.status,
    required this.unread,
    required this.updatedAt,
    required this.messages,
  });

  factory Inquiry.fromJson(Json json) => Inquiry(
    id: reqInt(json, 'id'),
    listing: InquiryListing.fromJson(asJson(json['listing'], 'listing')),
    status: enumFrom(InquiryStatus.values, json['status'], InquiryStatus.open),
    unread: intOr(json, 'unread', 0),
    updatedAt: reqDate(json, 'updated_at'),
    messages: reqListOf(json, 'messages', InquiryMessage.fromJson),
  );

  final int id;
  final InquiryListing listing;
  final InquiryStatus status;

  /// Messages from the office the user hasn't seen.
  final int unread;
  final DateTime updatedAt;

  /// Oldest first. Lists carry only the latest message.
  final List<InquiryMessage> messages;

  InquiryMessage? get latest => messages.isEmpty ? null : messages.last;
}
