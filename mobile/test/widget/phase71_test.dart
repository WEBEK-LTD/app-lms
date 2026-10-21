import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/external_links.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'donations_test.dart' show charityApi, charityApp;
import 'events_test.dart' show usePhone;

/// 71 Receipts as PDF: an order paid through the platform and a donation
/// offer "Download receipt", which opens the PDF in the app's language;
/// older servers and WordPress sites send no link, and nothing is shown.

const _orderReceipt =
    'https://yallapp.com.tr/receipts/orders/0f8e2c1a-1111-4222-8333-944455556666.42.sig';
const _donationReceipt = 'https://yallapp.com.tr/receipts/abcdef0123456789/pdf';

TestApp _shop(FakeApi api, List<String> opened, [String? language]) => TestApp(
  signedIn: true,
  appType: AppType.store,
  api: api,
  preferences: {'settings.language': ?language},
  overrides: [
    openExternalProvider.overrideWithValue((url) async {
      opened.add(url);
      return true;
    }),
  ],
);

void main() {
  test('the models read the receipt links, and older servers mean none', () {
    expect(
      Order.fromJson({...orderJson(), 'receipt_url': _orderReceipt}).receiptUrl,
      _orderReceipt,
    );
    expect(Order.fromJson(orderJson()).receiptUrl, isNull);
    expect(
      Order.fromJson({...orderJson(), 'receipt_url': null}).receiptUrl,
      isNull,
    );
    expect(
      Donation.fromJson({
        ...donationJson(),
        'receipt_pdf_url': _donationReceipt,
      }).receiptPdfUrl,
      _donationReceipt,
    );
    expect(Donation.fromJson(donationJson()).receiptPdfUrl, isNull);
  });

  test('a receipt link asks for the app language, keeping its own query', () {
    expect(receiptInLanguage(_orderReceipt, 'ar'), '$_orderReceipt?lang=ar');
    expect(
      receiptInLanguage('https://x.test/r/pdf?lang=en&a=1', 'tr'),
      'https://x.test/r/pdf?lang=tr&a=1',
    );
  });

  testWidgets('My orders offers the receipt of an order that has one', (
    tester,
  ) async {
    usePhone(tester);
    final opened = <String>[];
    final api = FakeApi(config: configJson(lms: null, orders: true))
      ..orders = [
        {...orderJson(), 'status': 'completed', 'receipt_url': _orderReceipt},
        {...orderJson(), 'id': 1043, 'number': '1043'},
      ];
    final app = _shop(api, opened);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.orders);
    await TestApp.settle(tester);
    expect(find.text('Download receipt'), findsOneWidget);
    await tester.tap(find.text('Download receipt'));
    await TestApp.settle(tester);
    expect(opened, ['$_orderReceipt?lang=en']);
    expect(tester.takeException(), isNull);
  });

  testWidgets('in Arabic, the button and the receipt are in Arabic', (
    tester,
  ) async {
    usePhone(tester);
    final opened = <String>[];
    final api =
        FakeApi(
            config: configJson(
              lms: null,
              orders: true,
              languages: languagesJson(available: const ['en', 'ar', 'tr']),
            ),
          )
          ..orders = [
            {...orderJson(), 'receipt_url': _orderReceipt},
          ];
    final app = _shop(api, opened, 'ar');
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.orders);
    await TestApp.settle(tester);
    await tester.tap(find.text('تنزيل الإيصال'));
    await TestApp.settle(tester);
    expect(opened, ['$_orderReceipt?lang=ar']);
  });

  testWidgets('a restaurant order being followed offers its receipt too', (
    tester,
  ) async {
    usePhone(tester);
    final opened = <String>[];
    final api = FakeApi(config: restaurantConfigJson())
      ..order = {
        ...restaurantOrderJson(status: 'preparing'),
        'receipt_url': _orderReceipt,
      };
    final app = _shop(api, opened);
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/account/orders/7');
    await TestApp.settle(tester);
    await tester.tap(find.text('Download receipt'));
    await TestApp.settle(tester);
    expect(opened, ['$_orderReceipt?lang=en']);
  });

  testWidgets('My donations offers the receipt page and its PDF', (
    tester,
  ) async {
    usePhone(tester);
    final opened = <String>[];
    final api = charityApi()
      ..donations = [
        {...donationJson(), 'receipt_pdf_url': _donationReceipt},
      ];
    final app = charityApp(api, signedIn: true, opened: opened);
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel('My donations').last);
    await TestApp.settle(tester);
    expect(find.text('Receipt'), findsOneWidget);
    await tester.tap(find.text('Download receipt'));
    await TestApp.settle(tester);
    expect(opened, ['$_donationReceipt?lang=en']);
  });

  testWidgets('without a PDF link, My donations keeps only the receipt page', (
    tester,
  ) async {
    usePhone(tester);
    final api = charityApi()..donations = [donationJson()];
    final app = charityApp(api, signedIn: true, opened: <String>[]);
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel('My donations').last);
    await TestApp.settle(tester);
    expect(find.text('Receipt'), findsOneWidget);
    expect(find.text('Download receipt'), findsNothing);
  });
}
