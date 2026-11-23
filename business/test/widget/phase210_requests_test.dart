import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/api_exception.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/services/push.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 210 The shop's custom-order requests: the Orders screen's card, the
/// list, one request with its answers and customer, the answer saved (and
/// its field errors), and the push that opens one.
void main() {
  test('a request reads defensively', () {
    final r = StoreRequest.fromJson({
      'id': 7,
      'title': 'Custom order',
      'status': 'whatever',
      'answers': [
        {'label': 'Size', 'value': '90 × 110 cm'},
        'junk',
        {'label': '', 'value': ''},
      ],
      'customer': {'name': null, 'phone': '+20 100', 'email': null},
      'quote_cents': 45050,
      'currency': 'EGP',
      'created_at': '2026-11-20T10:00:00.000Z',
      'quote': {
        'amount_cents': 45050,
        'currency': 'EGP',
        'formatted': 'E£450.50',
      },
    });
    expect(r.id, '7');
    expect(r.status, RequestStatus.fresh);
    expect(r.answers.single.value, '90 × 110 cm');
    expect(r.customer.phone, '+20 100');
    expect(r.quote!.formatted, 'E£450.50');
    expect(r.quoteText, '450.50');
    expect(r.reply, isNull);
  });

  test('the push of a new request opens it', () {
    expect(
      pushTarget({'kind': 'new_order', 'app_id': 'a', 'store_request_id': '31'})
          .location,
      '/requests/31',
    );
    // A new order without a request still opens Orders.
    expect(pushTarget({'kind': 'new_order'}).location, '/orders');
  });

  testWidgets('the Orders card opens the list, a request, and answers it', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.restaurantId);
    await app.pump(tester);
    await go(tester, app, '/orders');
    expect(find.text('Custom orders'), findsOneWidget);
    expect(find.text('1 new request'), findsOneWidget);

    await tapOn(tester, find.byKey(const ValueKey('requests-card')));
    // Open: the new blanket first, then the quoted sofa; not the done one.
    expect(find.text('Nadia Samir'), findsOneWidget);
    expect(find.text('A crochet baby blanket'), findsOneWidget);
    expect(find.text('Mert Aydın'), findsOneWidget);
    expect(find.textContaining('₺45,000.00'), findsOneWidget);
    expect(find.text('Elif'), findsNothing);
    await tapOn(tester, find.text('All'));
    expect(find.text('Elif'), findsOneWidget);
    await tapOn(tester, find.text('Open'));

    await tapOn(tester, find.text('A crochet baby blanket'));
    expect(find.text('Size'), findsOneWidget);
    expect(find.text('90 × 110 cm'), findsOneWidget);
    expect(find.text('Sage green with a cream border'), findsOneWidget);
    expect(find.text('nadia@example.com'), findsOneWidget);
    expect(find.text('WhatsApp'), findsOneWidget);
    await tapOn(tester, find.text('Call'));
    expect(app.opened.last, 'tel:+201005550142');

    // A price that isn't one: the field says why.
    await tester.enterText(find.byKey(const ValueKey('request-quote')), 'x');
    await tapOn(tester, find.byKey(const ValueKey('request-save')));
    expect(find.text('Enter a price, like 450 or 450.50.'), findsOneWidget);

    // Quoted (chosen for a new one) with the price, typed in Arabic digits.
    await tester.enterText(
      find.byKey(const ValueKey('request-quote')),
      '٤٥٠٫٥٠',
    );
    await tester.enterText(
      find.byKey(const ValueKey('request-reply')),
      'Ready in ten days.',
    );
    await tapOn(tester, find.byKey(const ValueKey('request-save')));
    expect(app.api.calls, contains('answerRequest:quoted'));
    expect(find.text('Saved the answer.'), findsOneWidget);
    expect(find.textContaining('₺450.50'), findsOneWidget);
    expect(find.textContaining('· Ready in ten days.'), findsOneWidget);
    final saved = await app.api.request(FakeOwnerApi.restaurantId, '31');
    expect(saved.status, RequestStatus.quoted);
    expect(saved.quoteCents, 45050);
    expect(saved.reply, 'Ready in ten days.');

    // Accepted next.
    await tapOn(tester, find.byKey(const ValueKey('request-status-accepted')));
    await tapOn(tester, find.byKey(const ValueKey('request-save')));
    expect(app.api.calls, contains('answerRequest:accepted'));
    expect(find.text('Accepted'), findsWidgets);

    // Back on the list: nothing is new anymore.
    await tester.pageBack();
    await settle(tester);
    expect(find.text('Nadia Samir'), findsOneWidget);
    await tapOn(tester, find.text('New'));
    expect(find.text('No requests waiting for you'), findsOneWidget);
  });

  testWidgets('a failed save keeps the form and says why', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.restaurantId);
    await app.pump(tester);
    await push(tester, app, '/requests/30');
    expect(find.text('A three-seat sofa made to measure'), findsOneWidget);
    // The sofa's price and reply are in the form.
    expect(find.text('45000'), findsOneWidget);
    app.api.failOn['answerRequest'] = const ApiException(
      code: 'server_error',
      message: 'Something went wrong.',
      statusCode: 500,
    );
    await tapOn(tester, find.byKey(const ValueKey('request-save')));
    expect(find.text('Something went wrong.'), findsOneWidget);
    expect(find.text('45000'), findsOneWidget);
  });

  testWidgets('Arabic, dark: the list and a request', (tester) async {
    final app = TestApp(
      appId: FakeOwnerApi.restaurantId,
      language: 'ar',
      brightness: Brightness.dark,
    );
    await app.pump(tester);
    await push(tester, app, '/requests');
    expect(find.text('الطلبات الخاصة'), findsOneWidget);
    expect(find.text('Nadia Samir'), findsOneWidget);
    await tapOn(tester, find.text('Nadia Samir'));
    expect(find.text('حفظ الرد'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
