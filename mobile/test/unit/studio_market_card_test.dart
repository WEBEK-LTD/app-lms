import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/page_models.dart';

void main() {
  group('Editor audit 3.4: a market section\'s card', () {
    test('reads its corners and the facts it leaves out', () {
      final market = StudioMarket.tryParse({
        'section': 'vendors',
        'card': {
          'radius': 40,
          'hide': ['rating', 'min_order', 'unknown'],
        },
      })!;
      expect(market.card.radius, 32);
      expect(market.card.shows(StudioMarketFact.rating), isFalse);
      expect(market.card.shows(StudioMarketFact.minOrder), isFalse);
      expect(market.card.shows(StudioMarketFact.time), isTrue);
    });

    test('without a card, the usual card with every fact', () {
      final market = StudioMarket.tryParse({'section': 'vendors'})!;
      expect(market.card.radius, isNull);
      expect(market.card.hide, isEmpty);
      expect(market.card, const StudioMarketCard());
    });
  });
}
