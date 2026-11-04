import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/chat/data/chat_api.dart';
import 'package:yallapp/modules/chat/data/chat_media.dart';
import 'package:yallapp/modules/market/screens/market_complaint_screens.dart';

import '../support/fake_api.dart';
import '../support/fake_chat_api.dart';
import '../support/fixtures.dart';
import '../support/market_order_fixtures.dart';
import '../support/test_app.dart';

/// Sends chunks nowhere: the gate has whatever arrives.
class _Uploads implements ChunkedUploads {
  _Uploads(this.api);

  final FakeApi api;
  final sent = <int>[];

  @override
  Future<ChatUpload> startUpload({
    required String name,
    required int size,
    required String type,
    int? durationSeconds,
  }) => api.startMarketUpload(name: name, size: size, type: type);

  @override
  Future<ChatUpload> resumeUpload(String uploadId) =>
      api.resumeMarketUpload(uploadId);

  @override
  Future<void> completeUpload(String uploadId) =>
      api.completeMarketUpload(uploadId);

  @override
  Future<int> uploadOffset(String uploadUrl) async => sent.length;

  @override
  Future<int> sendChunk(String uploadUrl, int offset, List<int> bytes) async {
    sent.addAll(bytes);
    return offset + bytes.length;
  }
}

/// 115.9 A complaint on an order: the reason, the items, the words and a
/// photo, then the thread with support and its decision.
void main() {
  FakeApi marketApi() {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'market': {
          'currency': 'EGP',
          'kinds': ['restaurant'],
          'payment': {'cash': true},
        },
      },
    );
    api.me = userJson();
    api.marketOrders[901] = marketOrderJson(status: 'delivered');
    return api;
  }

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(390, 1600) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  testWidgets('a complaint with an item and a photo goes to support', (
    tester,
  ) async {
    phone(tester);
    final api = marketApi();
    final picker = FakeChatPicker()
      ..next = ChatPicked(
        MemoryChatFile('juice.jpg', 'image/jpeg', List.filled(2048, 7)),
      );
    final app = TestApp(
      api: api,
      appType: AppType.food,
      signedIn: true,
      overrides: [
        chatPickerProvider.overrideWithValue(picker),
        marketUploadsProvider.overrideWithValue(_Uploads(api)),
      ],
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.marketOrder(901));
    await TestApp.settle(tester, 20);

    final report = find.text('Report a problem');
    await tester.scrollUntilVisible(
      report,
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(report);
    await TestApp.settle(tester, 20);

    await tester.tap(find.text('Items were missing'));
    await tester.tap(find.text('Mixed grill'));
    await tester.enterText(find.byType(TextField), 'The grill was missing.');
    await tester.tap(find.text('Add a photo'));
    await TestApp.settle(tester);
    expect(find.text('juice.jpg'), findsOneWidget);
    final send = find.text('Send to support');
    await tester.ensureVisible(send);
    await tester.tap(send);
    await TestApp.settle(tester, 20);

    final complaint = api.marketComplaints.values.single;
    expect(complaint['reason'], 'missing_items');
    expect(complaint['line_ids'], [10]);
    expect(api.complaintPhotos.single.complaint, complaint['id']);
    expect(find.text('Complaint C-${complaint['id']}'), findsOneWidget);
    expect(find.text('Sent'), findsOneWidget);
  });

  testWidgets('support\'s decision and writing back', (tester) async {
    phone(tester);
    final api = marketApi();
    api.marketComplaints[310] = marketComplaintJson(
      id: 310,
      status: 'resolved',
      decision: {
        'outcome': 'partial_refund',
        'amount': {'amount': '55.00', 'formatted': 'EGP 55.00'},
        'to': 'wallet',
        'coupon_code': null,
        'reason': 'Sorry about the missing juice.',
        'at': '2026-11-04T11:00:00Z',
      },
      messages: [
        {
          'id': 1,
          'from': 'support',
          'text': 'We refunded the juice.',
          'at': '2026-11-04T11:00:00Z',
        },
      ],
    );
    api.marketComplaints[311] = marketComplaintJson(id: 311);
    final app = TestApp(api: api, appType: AppType.food, signedIn: true);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.marketComplaint(310));
    await TestApp.settle(tester, 20);

    expect(find.text('Partly refunded: EGP 55.00'), findsOneWidget);
    expect(find.text('Added to your wallet'), findsOneWidget);
    expect(find.text('We refunded the juice.'), findsOneWidget);
    expect(find.text('This complaint is closed.'), findsOneWidget);

    app.container.read(appRouterProvider).push(Paths.marketComplaint(311));
    await TestApp.settle(tester, 20);
    await tester.enterText(find.byType(TextField), 'Thanks, any news?');
    await tester.tap(find.byTooltip('Send to support'));
    await TestApp.settle(tester, 20);
    expect(find.text('Thanks, any news?'), findsOneWidget);
  });
}
