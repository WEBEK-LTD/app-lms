import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/services/push.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 212 A store's product reviews with photos in the Inbox (reply once, hide
/// an abusive one), and who waits for what to be back in stock.
void main() {
  group('212 product reviews', () {
    testWidgets('lists them with their product and photos, replies and hides', (
      tester,
    ) async {
      final app = TestApp(appId: FakeOwnerApi.restaurantId);
      await app.pump(tester);
      await go(tester, app, '/inbox?tab=product_reviews');
      expect(find.text('Ahmed K.'), findsOneWidget);
      expect(find.text('on Chicken shawarma plate'), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (w) =>
              w is Semantics && w.properties.label == 'Photos with the review',
        ),
        findsOneWidget,
      );

      await tapOn(tester, find.text('Reply').first);
      await tester.enterText(find.byType(TextField), 'Thank you, Ahmed!');
      await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
      expect(app.api.calls, contains('replyProductReview'));
      expect(find.text('Thank you, Ahmed!'), findsOneWidget);

      await tapOn(tester, find.text('Hide').first);
      expect(app.api.calls, contains('setProductReviewHidden'));

      await tapOn(tester, find.text('With photos'));
      expect(find.text('Mona H.'), findsNothing);
    });

    testWidgets('Waiting & saved: the counts', (tester) async {
      final app = TestApp(appId: FakeOwnerApi.restaurantId);
      await app.pump(tester);
      await go(tester, app, '/inbox?tab=product_reviews');
      await tapOn(tester, find.text('Waiting & saved'));
      expect(app.api.calls, contains('shopWishes'));
      expect(find.text('Kunafa tray'), findsOneWidget);
      expect(find.text('4 wait'), findsOneWidget);
      expect(find.text('Choice #12'), findsOneWidget);
      expect(find.text('Saved by 9'), findsOneWidget);
    });

    test('a push of a product review opens the product reviews', () {
      expect(
        pushTarget({
          'kind': 'new_review',
          'product_review_id': '501',
          'product_id': '1',
        }).location,
        '/inbox?tab=product_reviews',
      );
    });

    test('reads a product review and the feature', () {
      final r = Review.fromProductJson({
        'id': 1,
        'product_id': 7,
        'product_name': 'Coat',
        'product_image_url': null,
        'person': 'Sara Y.',
        'rating': 4,
        'text': 'Warm',
        'photos': [
          {'url': 'https://yallapp.test/m/a'},
        ],
        'hidden': false,
        'reply': null,
        'created_at': '2026-11-20T10:00:00Z',
        'updated_at': '2026-11-20T10:00:00Z',
      });
      expect(r.isProduct, isTrue);
      expect(r.photos, ['https://yallapp.test/m/a']);
      expect(r.courseTitle, 'Coat');
      expect(
        AppFeatures.fromJson({'product_reviews': true}).productReviews,
        isTrue,
      );
      expect(const AppFeatures().productReviews, isFalse);
    });
  });
}
