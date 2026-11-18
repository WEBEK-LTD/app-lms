import 'dart:math';

import '../../../core/api/models/models.dart';
import '../../../core/format/money.dart';
import 'cart_controller.dart';

/// 162 Build your bouquet's four steps: the flowers, the wrap, the card and
/// the summary before the cart.
enum BouquetStep { flowers, wrap, card, summary }

/// 162 What the customer has chosen so far in Build your bouquet: the
/// stems of each flower, the wrap (or none, when the shop allows it), the
/// card (or none) and its words, with the rules of the shop and the live
/// price. The cart gets it as one bouquet ([cartLines]); the server prices
/// every line again, as for any cart.
class BouquetDraft {
  BouquetDraft(this.data);

  final BouquetBuilderData data;

  BouquetRules get rules => data.rules;

  /// Stems by product.
  final Map<int, int> stems = {};
  int? wrapId;
  bool noWrap = false;
  int? cardId;
  bool noCard = false;
  String message = '';

  /// The flowers that can be chosen by the stem: in stock, and without
  /// sizes to choose first (a product with variations is bought as one).
  List<ProductSummary> get flowers => [
    for (final f in data.flowers)
      if (f.type != ProductType.variable && !f.addon) f,
  ];

  int get stemCount => stems.values.fold(0, (sum, q) => sum + q);

  int stemsOf(int productId) => stems[productId] ?? 0;

  bool canAddStem(ProductSummary flower) =>
      flower.purchasable &&
      flower.stockStatus != StockStatus.outOfStock &&
      stemCount < rules.maxStems;

  /// Sets [flower]'s stems, kept within the bouquet's most.
  void setStems(ProductSummary flower, int quantity) {
    final others = stemCount - stemsOf(flower.id);
    final q = quantity.clamp(0, max(0, rules.maxStems - others)).toInt();
    if (q == 0) {
      stems.remove(flower.id);
    } else {
      stems[flower.id] = q;
    }
  }

  bool get flowersDone =>
      stemCount >= rules.minStems && stemCount <= rules.maxStems;

  ProductSummary? get wrap =>
      data.wraps.where((w) => w.id == wrapId).firstOrNull;

  void chooseWrap(int? id) {
    wrapId = id;
    noWrap = id == null && rules.wrapOptional;
  }

  /// A wrap chosen, or "No wrap" where the shop allows it (or has none).
  bool get wrapDone =>
      wrap != null ||
      (noWrap && rules.wrapOptional) ||
      (data.wraps.isEmpty && rules.wrapOptional);

  /// The shop has cards to choose from.
  bool get hasCards => rules.cards && data.cards.isNotEmpty;

  ProductSummary? get card =>
      data.cards.where((c) => c.id == cardId).firstOrNull;

  void chooseCard(int? id) {
    cardId = id;
    noCard = id == null && rules.cardOptional;
  }

  /// The card skipped where the shop allows it, a card chosen, or (a shop
  /// with no cards to choose) the message written.
  bool get cardDone {
    if (noCard && rules.cardOptional) return true;
    if (hasCards) return card != null;
    return message.trim().isNotEmpty || rules.cardOptional;
  }

  /// The words written on the card; none when it is skipped.
  String? get cardMessage {
    if (noCard) return null;
    if (hasCards && card == null) return null;
    final text = message.trim();
    return text.isEmpty ? null : text;
  }

  bool done(BouquetStep step) => switch (step) {
    BouquetStep.flowers => flowersDone,
    BouquetStep.wrap => wrapDone,
    BouquetStep.card => cardDone,
    BouquetStep.summary => flowersDone && wrapDone && cardDone,
  };

  /// The flowers chosen, in the shop's order, with their stems.
  List<(ProductSummary, int)> get chosenFlowers => [
    for (final f in flowers)
      if (stemsOf(f.id) > 0) (f, stemsOf(f.id)),
  ];

  List<(ProductSummary, int)> get _lines => [
    ...chosenFlowers,
    if (wrap case final w?) (w, 1),
    if (!noCard && card != null) (card!, 1),
  ];

  /// The bouquet so far in the shop's currency (the server prices it again
  /// in the cart).
  int get totalCents =>
      _lines.fold(0, (sum, l) => sum + centsOf(l.$1.price.amount) * l.$2);

  String get currency =>
      data.flowers.firstOrNull?.price.currency ??
      data.wraps.firstOrNull?.price.currency ??
      '';

  /// "E£1,230.00", as the shop writes its prices.
  String get totalFormatted => formatMoney(totalCents, currency);

  /// 135.5 The total in the customer's currency, from each line's own
  /// converted price (the server's `display`); null when a line has none.
  String? get displayTotal {
    final lines = _lines;
    if (lines.isEmpty) return null;
    String? code;
    var cents = 0;
    for (final (p, q) in lines) {
      final d = p.price.display;
      final amount = d?.values['amount'];
      if (d == null || amount == null) return null;
      if (code != null && code != d.currency) return null;
      code = d.currency;
      cents += centsOf(amount) * q;
    }
    return formatMoney(cents, code!);
  }

  /// The bouquet's lines for the cart, all with the same [id]: its flowers,
  /// then its wrap and its card (a gift add-on linked to the first flower,
  /// as the cart links add-ons); the card's words on the card's line, or on
  /// the first flower's when the shop has no cards to choose.
  List<CartItem> cartLines(String id) {
    final flowers = chosenFlowers;
    if (flowers.isEmpty) return const [];
    final first = flowers.first.$1.id;
    final words = cardMessage;
    final onCard = card != null && !noCard;
    CartItem line(
      ProductSummary p,
      int quantity,
      BouquetPartKind part, {
      String? message,
    }) => CartItem(
      productId: p.id,
      quantity: quantity,
      name: p.name,
      imageUrl: p.imageUrl,
      price: p.sale?.nowFormatted ?? p.price.formatted,
      addonOf: part != BouquetPartKind.flower && p.addon ? first : null,
      bouquet: BouquetPart(id: id, part: part, message: message),
    );
    return [
      for (final (i, (p, q)) in flowers.indexed)
        line(
          p,
          q,
          BouquetPartKind.flower,
          message: i == 0 && !onCard ? words : null,
        ),
      if (wrap case final w?) line(w, 1, BouquetPartKind.wrap),
      if (onCard) line(card!, 1, BouquetPartKind.card, message: words),
    ];
  }
}

/// 162 A new bouquet's id: unique enough on this phone ("b-m3k9x2-4f2a").
String newBouquetId([Random? random]) {
  final r = random ?? Random();
  final stamp = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
  final tail = r.nextInt(0xFFFF).toRadixString(16).padLeft(4, '0');
  return 'b-$stamp-$tail';
}
