import 'json.dart';
import 'store_models.dart';

/// 162 Build your bouquet's rules (`StoreConfig.bouquet`): set up by the
/// owner, an action with `flow: bouquet` (Leqaa's Start) opens it; null:
/// the action's own screen, the shop.
class BouquetRules {
  const BouquetRules({
    required this.flowersCategoryId,
    this.wrapsFromCategory = false,
    this.wrapOptional = false,
    this.cardOptional = false,
    this.cards = false,
    this.minStems = 1,
    this.maxStems = 99,
    this.maxMessage = 500,
  });

  factory BouquetRules.fromJson(Json json) {
    final min = intOr(json, 'min_stems', 1).clamp(1, 99);
    return BouquetRules(
      flowersCategoryId: reqInt(json, 'flowers_category_id'),
      wrapsFromCategory: json['wraps_from'] == 'category',
      wrapOptional: boolOr(json, 'wrap_optional', false),
      cardOptional: boolOr(json, 'card_optional', false),
      cards: boolOr(json, 'has_cards', false),
      minStems: min,
      maxStems: intOr(json, 'max_stems', 99).clamp(min, 99),
      maxMessage: intOr(json, 'max_message', 500).clamp(1, 500),
    );
  }

  /// Null for anything that isn't one (missing, null, an older server).
  static BouquetRules? tryParse(Object? raw) {
    if (raw is! Map) return null;
    try {
      return BouquetRules.fromJson(asJson(raw));
    } on Object {
      return null;
    }
  }

  final int flowersCategoryId;
  final bool wrapsFromCategory;

  /// "No wrap" is offered.
  final bool wrapOptional;

  /// The card (and its message) may be skipped.
  final bool cardOptional;

  /// The shop has cards to choose from; false: the card is its message.
  final bool cards;
  final int minStems;
  final int maxStems;
  final int maxMessage;
}

/// 162 `GET /store/bouquet`: the rules and what to choose from, each a
/// product of the shop with its photo and price.
class BouquetBuilderData {
  const BouquetBuilderData({
    required this.rules,
    this.flowers = const [],
    this.wraps = const [],
    this.cards = const [],
  });

  factory BouquetBuilderData.fromJson(Json json) => BouquetBuilderData(
    rules: BouquetRules.fromJson(json),
    flowers: listOf(json, 'flowers', ProductSummary.fromJson),
    wraps: listOf(json, 'wraps', ProductSummary.fromJson),
    cards: listOf(json, 'cards', ProductSummary.fromJson),
  );

  final BouquetRules rules;
  final List<ProductSummary> flowers;
  final List<ProductSummary> wraps;
  final List<ProductSummary> cards;
}

/// 162 Which part of a bouquet a line is.
enum BouquetPartKind { flower, wrap, card }

/// 162 A line of a bouquet the customer built: every line of one bouquet
/// has the same [id]; the card's [message] rides on one of them.
class BouquetPart {
  const BouquetPart({required this.id, required this.part, this.message});

  static BouquetPart? tryParse(Object? raw) {
    if (raw is! Map) return null;
    final json = asJson(raw);
    final id = optString(json, 'id');
    final part = switch (json['part']) {
      'flower' => BouquetPartKind.flower,
      'wrap' => BouquetPartKind.wrap,
      'card' => BouquetPartKind.card,
      _ => null,
    };
    if (id == null || id.isEmpty || part == null) return null;
    final message = optString(json, 'message')?.trim();
    return BouquetPart(
      id: id,
      part: part,
      message: message == null || message.isEmpty ? null : message,
    );
  }

  final String id;
  final BouquetPartKind part;
  final String? message;

  Json toJson() => {
    'id': id,
    'part': part.name,
    if (message != null && message!.isNotEmpty) 'message': message,
  };

  @override
  bool operator ==(Object other) =>
      other is BouquetPart &&
      other.id == id &&
      other.part == part &&
      other.message == message;

  @override
  int get hashCode => Object.hash(id, part, message);
}

/// 162 A list's lines as shown: each bouquet once, where its first line
/// was, with its flowers, then its wrap, then its card; the rest as they
/// are. [partOf] reads a line's bouquet.
List<BouquetGroup<T>> bouquetGroups<T>(
  List<T> lines,
  BouquetPart? Function(T line) partOf,
) {
  final out = <BouquetGroup<T>>[];
  final open = <String, BouquetGroup<T>>{};
  for (var i = 0; i < lines.length; i++) {
    final part = partOf(lines[i]);
    if (part == null) {
      out.add(BouquetGroup<T>._(null, [i]));
      continue;
    }
    final group = open[part.id];
    if (group == null) {
      final made = BouquetGroup<T>._(part.id, [i]);
      open[part.id] = made;
      out.add(made);
    } else {
      group.indexes.add(i);
    }
  }
  for (final g in open.values) {
    g.indexes.sort((a, b) {
      final pa = partOf(lines[a])!.part.index;
      final pb = partOf(lines[b])!.part.index;
      return pa != pb ? pa - pb : a - b;
    });
  }
  return out;
}

/// 162 One line, or one bouquet's lines ([bouquetId] set), by index.
class BouquetGroup<T> {
  BouquetGroup._(this.bouquetId, this.indexes);

  final String? bouquetId;
  final List<int> indexes;

  bool get isBouquet => bouquetId != null;
}
