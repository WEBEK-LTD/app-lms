import 'json.dart';

/// 131 Words the owner wrote in each of the app's languages (code → text).
Map<String, String> langTextOf(Object? value) => {
  if (value is Map)
    for (final e in value.entries)
      if (e.value is String && (e.value as String).trim().isNotEmpty)
        '${e.key}': (e.value as String).trim(),
};

/// 131 The titles the owner words for the store's sections, per language:
/// the add-ons ("Add a little more"), the card message and the delivery
/// picker. A missing language: the app's own words.
class SectionTitles {
  const SectionTitles({
    this.addons = const {},
    this.giftCard = const {},
    this.delivery = const {},
  });

  /// `StoreConfig.titles`.
  factory SectionTitles.fromStore(Object? value) {
    if (value is! Map) return const SectionTitles();
    final json = asJson(value);
    return SectionTitles(
      addons: langTextOf(json['addons']),
      giftCard: langTextOf(json['gift_card']),
      delivery: langTextOf(json['delivery']),
    );
  }

  /// A checkout look's own (`screens.checkout`): `addons_title`,
  /// `card_title` and `delivery_title`.
  factory SectionTitles.fromLook(Json json) => SectionTitles(
    addons: langTextOf(json['addons_title']),
    giftCard: langTextOf(json['card_title']),
    delivery: langTextOf(json['delivery_title']),
  );

  final Map<String, String> addons;
  final Map<String, String> giftCard;
  final Map<String, String> delivery;
}

enum SectionTitle { addons, giftCard, delivery }

/// The title of a section in [lang]: the checkout look's, else the store's,
/// else [fallback] (the app's words).
String sectionTitle(
  SectionTitle which,
  String lang,
  String fallback, {
  SectionTitles? look,
  SectionTitles? store,
}) {
  Map<String, String> of(SectionTitles? t) => switch (which) {
    SectionTitle.addons => t?.addons ?? const {},
    SectionTitle.giftCard => t?.giftCard ?? const {},
    SectionTitle.delivery => t?.delivery ?? const {},
  };
  return of(look)[lang] ?? of(store)[lang] ?? fallback;
}
