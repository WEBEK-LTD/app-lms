import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../screenshots/support/shot.dart' show loadAppFonts;
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/market_order_fixtures.dart';
import '../support/test_app.dart';

/// 115.54 The complaint screens in their approved design
/// (docs/design/2026-11-18-marketplace, 06a–06c): opening a complaint, the
/// conversation with support, and the decision four ways, in English and
/// Arabic, light and dark, with the text at 130%. Each must draw without an
/// overflow or an error and say what the design says.
///
/// With `--dart-define=YALLAPP_SHOTS_OUT=<folder>` (and
/// `--dart-define=YALLAPP_SCALE=1`) it also writes each screen's picture,
/// with the app's fonts, for docs/qa.
const _out = String.fromEnvironment('YALLAPP_SHOTS_OUT');
const _scale = String.fromEnvironment('YALLAPP_SCALE', defaultValue: '1.3');

Map<String, dynamic> _money(String amount) => {
  'amount': amount,
  'formatted': 'EGP $amount',
};

Map<String, dynamic> _line(
  int id,
  String name,
  String total,
  num qty,
  String unit,
) => {
  ...marketOrderLineJson(productId: id, name: name, quantity: qty, unit: unit),
  'id': id,
  'total': _money(total),
};

/// Zad Market's order of the designs: the cheese and the bananas weighed, the eggs counted.
Map<String, dynamic> _order(bool ar) {
  final now = DateTime.now().toUtc();
  return {
    ...marketOrderJson(id: 3821, status: 'delivered'),
    'reference': '#4821',
    'vendor': {
      ...marketVendorSummaryJson(kind: 'grocery'),
      'name': ar ? 'زاد ماركت' : 'Zad Market',
    },
    'lines': [
      _line(
        1,
        ar ? 'جبنة بيضاء، شرائح' : 'White cheese, sliced',
        '120.00',
        0.78,
        'kg',
      ),
      _line(2, ar ? 'موز' : 'Bananas', '33.25', 0.95, 'kg'),
      _line(3, ar ? 'بيض، 15 بيضة' : 'Eggs, 15', '160.00', 2, 'item'),
    ],
    'total': _money('389.25'),
    'payment': {'method': 'card', 'status': 'paid', 'wallet_used': null},
    'complaint_until': now
        .add(const Duration(hours: 47, minutes: 20))
        .toIso8601String(),
    'timeline': [
      {
        'status': 'placed',
        'at': now.subtract(const Duration(minutes: 50)).toIso8601String(),
      },
      {
        'status': 'delivered',
        'at': now.subtract(const Duration(minutes: 6)).toIso8601String(),
      },
    ],
  };
}

Map<String, dynamic> _complaint(
  bool ar, {
  String status = 'in_review',
  Map<String, dynamic>? decision,
}) {
  final now = DateTime.now().toUtc();
  String at(int minutesAgo) =>
      now.subtract(Duration(minutes: minutesAgo)).toIso8601String();
  final nour = ar ? 'نور' : 'Nour';
  return {
    ...marketComplaintJson(
      id: 993,
      orderId: 3821,
      reason: 'quality',
      status: status,
      text: ar ? 'الموز مكدوم وطري، والجبنة طعمها حامض كأنها قديمة.' : 'The bananas are bruised and soft, and the cheese tastes sour, as if it were old.',
      lineIds: const [1, 2],
      decision: decision,
      messages: [
        {
          'id': 1,
          'from': 'support',
          'kind': 'taken',
          'text': '',
          'agent': nour,
          'at': at(36),
        },
        {
          'id': 2,
          'from': 'support',
          'kind': 'message',
          'text': ar
              ? 'نأسف لذلك. هل كانت الجبنة في عبوة مغلقة، وهل ترى تاريخها عليها؟'
              : "I'm sorry about this. Was the cheese in a sealed pack, and do you see its date on it?",
          'agent': nour,
          'at': at(35),
        },
        {
          'id': 3,
          'from': 'customer',
          'kind': 'message',
          'text': ar
              ? 'نعم، مغلقة. التاريخ 16 نوفمبر.'
              : 'Sealed, yes. It says 16 November.',
          'agent': null,
          'at': at(33),
        },
        {
          'id': 4,
          'from': 'support',
          'kind': 'message',
          'text': ar
              ? 'شكرًا لك، هذا يساعدنا. أراجع الأمر مع المتجر الآن، وسترى القرار هنا خلال دقائق.'
              : "Thank you, that helps. I'm checking with the store now; you'll see the decision here in a few minutes.",
          'agent': nour,
          'at': at(31),
        },
        if (decision != null)
          {
            'id': 5,
            'from': 'support',
            'kind': 'message',
            'text': decision['reason'] ?? '…',
            'agent': nour,
            'at': at(6),
          },
      ],
    ),
    'reference': 'C-1093',
    'created_at': at(42),
    'support_agent': nour,
    'can_open_another': decision != null,
    'window_ends_at': now.add(const Duration(hours: 47)).toIso8601String(),
  };
}

Map<String, dynamic> _decision(String way, bool ar) {
  final at = DateTime.now()
      .toUtc()
      .subtract(const Duration(minutes: 6))
      .toIso8601String();
  return switch (way) {
    'card' => {
      'outcome': 'partial_refund',
      'amount': _money('153.25'),
      'to': 'payment',
      'coupon_code': null,
      'reason': null,
      'agent': ar ? 'نور' : 'Nour',
      'at': at,
    },
    'wallet' => {
      'outcome': 'partial_refund',
      'amount': _money('153.25'),
      'to': 'wallet',
      'coupon_code': null,
      'reason': null,
      'agent': ar ? 'نور' : 'Nour',
      'at': at,
    },
    'coupon' => {
      'outcome': 'partial_refund',
      'amount': _money('175.00'),
      'to': 'coupon',
      'coupon_code': 'SORRY-4821',
      'coupon_ends_at': DateTime.now()
          .toUtc()
          .add(const Duration(days: 30))
          .toIso8601String(),
      'reason': null,
      'agent': ar ? 'نور' : 'Nour',
      'at': at,
    },
    _ => {
      'outcome': 'no_refund',
      'amount': null,
      'to': null,
      'coupon_code': null,
      'reason': ar
          ? 'راجع زاد ماركت الأمر: 16 نوفمبر هو تاريخ تعبئة الجبنة، وهي صالحة حتى 30 نوفمبر، ويبدو الموز في الصور ناضجًا لا تالفًا. أبلغنا المتجر بملاحظتك عن الطعم ليفحص هذه الدفعة.'
          : 'Zad Market checked: 16 November is the day the cheese was packed, and it is good until 30 November. In the photos the bananas look ripe rather than damaged. We\'ve passed your note about the taste on, so the store checks that batch.',
      'agent': ar ? 'نور' : 'Nour',
      'at': at,
    },
  };
}

FakeApi _api(bool ar) {
  final base = configJson(lms: null, languages: languagesJson());
  final api = FakeApi(
    config: {
      ...base,
      'site': {
        ...(base['site'] as Map<String, dynamic>),
        'name': ar ? 'زاد' : 'Zad',
      },
      'branding': {
        'logo_url': null,
        'primary_color': '#1B644C',
        'secondary_color': '#F2A93B',
      },
      'market': {
        'currency': 'EGP',
        'kinds': ['restaurant', 'grocery'],
        'payment': {'cash': true},
      },
    },
  );
  api.me = userJson();
  api.marketOrders[3821] = _order(ar);
  api.marketWallet = {...api.marketWallet, 'balance': _money('203.25')};
  return api;
}

const _boundary = ValueKey('complaint-shot');

void main() {
  setUpAll(() async {
    if (_out.isNotEmpty) await loadAppFonts();
  });

  for (final lang in ['en', 'ar']) {
    for (final dark in [false, true]) {
      final ar = lang == 'ar';
      final name = '$lang-${dark ? 'dark' : 'light'}';

      Future<TestApp> open(
        WidgetTester tester,
        String path, {
        FakeApi? api,
      }) async {
        tester.view
          ..physicalSize = const Size(390, 844) * 2
          ..devicePixelRatio = 2;
        tester.platformDispatcher.textScaleFactorTestValue = double.parse(
          _scale,
        );
        addTearDown(tester.view.reset);
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        final app = TestApp(
          api: api ?? _api(ar),
          appType: AppType.food,
          signedIn: true,
          preferences: {
            'settings.theme_mode': dark ? 'dark' : 'light',
            'settings.language': lang,
          },
          wrap: (child) => RepaintBoundary(key: _boundary, child: child),
        );
        await app.pump(tester);
        app.container.read(appRouterProvider).push(path);
        await TestApp.settle(tester, 20);
        final e = tester.takeException();
        if (e is FlutterError) debugPrint(e.toStringDeep());
        expect(e, isNull, reason: "$path $name");
        return app;
      }

      Future<void> shot(WidgetTester tester, String screen) async {
        if (_out.isEmpty) return;
        final boundary =
            tester.renderObject(find.byKey(_boundary)) as RenderRepaintBoundary;
        await tester.runAsync(() async {
          final image = await boundary.toImage(pixelRatio: 2);
          final data = await image.toByteData(format: ui.ImageByteFormat.png);
          Directory(_out).createSync(recursive: true);
          File('$_out/$screen-$name.png')
              .writeAsBytesSync(data!.buffer.asUint8List());
        });
      }

      testWidgets('06a opening a complaint, $name', (tester) async {
        await open(tester, Paths.marketComplain(3821));
        expect(
          find.text(ar ? 'الإبلاغ عن مشكلة' : 'Report a problem'),
          findsOneWidget,
        );
        expect(
          find.text(ar ? 'ما المشكلة؟' : 'What went wrong?'),
          findsOneWidget,
        );
        expect(find.text(ar ? 'متبقٍ 47 ساعة' : '47 h left'), findsOneWidget);
        // The design's state: Quality, the cheese and the bananas, and the words.
        await tester.tap(find.text(ar ? 'الجودة' : 'Quality'));
        final list = find.byType(Scrollable).first;
        Future<void> reach(Finder f) =>
            tester.scrollUntilVisible(f, 120, scrollable: list);
        final whole = find.text(ar ? 'أو الطلب كله' : 'Or the whole order');
        await reach(whole);
        expect(whole, findsOneWidget);
        for (final item
            in ar
                ? ['جبنة بيضاء، شرائح', 'موز']
                : ['White cheese, sliced', 'Bananas']) {
          await reach(find.text(item));
          await tester.tap(find.text(item));
        }
        await tester.pump();
        await reach(find.byType(TextField));
        await tester.enterText(
          find.byType(TextField),
          ar ? 'الموز مكدوم وطري، والجبنة طعمها حامض كأنها قديمة.' : 'The bananas are bruised and soft, and the cheese tastes sour, as if it were old.',
        );
        expect(
          find.text(ar ? 'أرسل إلى الدعم' : 'Send to support'),
          findsOneWidget,
        );
        expect(
          find.textContaining(
            ar ? 'يرد عليك دعم زاد' : 'Zad support answers here',
          ),
          findsOneWidget,
        );
        await tester.pump();
        expect(find.textContaining(ar ? '/ 2,000' : '/ 2,000'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.drag(find.byType(Scrollable).first, const Offset(0, 3000));
        await tester.pumpAndSettle();
        await shot(tester, '06a-complaint-open');
      });

      testWidgets('06b the conversation with support, $name', (tester) async {
        final api = _api(ar);
        api.marketComplaints[993] = _complaint(ar);
        await open(tester, Paths.marketComplaint(993), api: api);
        expect(find.text(ar ? 'دعم زاد' : 'Zad support'), findsOneWidget);
        expect(
          find.textContaining(ar ? 'الرد من نور' : 'Nour is answering'),
          findsOneWidget,
        );
        expect(find.textContaining('C-1093'), findsOneWidget);
        expect(find.text(ar ? 'قيد المراجعة' : 'In review'), findsOneWidget);
        final took = find.text(
          ar
              ? 'شكواك الآن لدى نور من دعم زاد'
              : 'Nour from Zad support took your complaint',
        );
        await tester.scrollUntilVisible(
          took,
          200,
          scrollable: find.byType(Scrollable).first,
        );
        expect(took, findsOneWidget);
        expect(
          find.text(
            ar ? 'نور · دعم زاد' : 'Nour · Zad support',
            skipOffstage: false,
          ),
          findsWidgets,
        );
        // A quick reply goes into the box; it isn't sent by itself.
        await tester.tap(find.text(ar ? 'شكرًا لك' : 'Thank you'));
        await tester.pump();
        expect(
          tester.widget<TextField>(find.byType(TextField)).controller!.text,
          ar ? 'شكرًا لك' : 'Thank you',
        );
        expect((api.marketComplaints[993]!['messages'] as List).length, 4);
        await tester.enterText(find.byType(TextField), '');
        await tester.pump();
        await shot(tester, '06b-support-chat');
      });

      for (final way in ['card', 'wallet', 'coupon', 'declined']) {
        testWidgets('06c the decision ($way), $name', (tester) async {
          final api = _api(ar);
          api.marketComplaints[993] = _complaint(
            ar,
            status: way == 'declined' ? 'rejected' : 'resolved',
            decision: _decision(way, ar),
          );
          await open(tester, Paths.marketComplaint(993), api: api);
          final texts = switch (way) {
            'card' =>
              ar
                  ? ['سنردّ المبلغ إلى بطاقتك', 'تم', 'إجمالي الطلب الآن']
                  : ['We’re refunding your card', 'Done', 'Order total now'],
            'wallet' =>
              ar
                  ? ['أُضيف المبلغ إلى محفظتك', 'فتح المحفظة', 'رصيد المحفظة']
                  : ['It’s in your wallet', 'Open wallet', 'Wallet balance'],
            'coupon' =>
              ar
                  ? ['قسيمة لطلبك القادم', 'تسوّق الآن', 'مرة واحدة']
                  : ['A coupon for your next order', 'Shop now', 'Once'],
            _ =>
              ar
                  ? [
                      'تعذّر علينا ردّ المبلغ هذه المرة',
                      'الرد على الدعم',
                      'السبب',
                    ]
                  : ['We couldn’t refund this one', 'Reply to support', 'Why'],
          };
          for (final t in texts) {
            expect(find.text(t), findsOneWidget, reason: '$way $name: $t');
          }
          expect(
            find.text(
              ar
                  ? (way == 'declined' ? 'مغلقة' : 'تمت معالجتها')
                  : (way == 'declined' ? 'Closed' : 'Resolved'),
            ),
            findsOneWidget,
          );
          expect(
            find.textContaining(
              ar
                  ? 'يمكنك فتح شكوى جديدة واحدة'
                  : 'You can open one new complaint',
            ),
            findsOneWidget,
          );
          final also = switch (way) {
            'card' => [
              ar ? '5 إلى 10 أيام عمل' : '5 to 10 working days',
              '236.00',
            ],
            'coupon' => ['SORRY-4821'],
            'wallet' => ['203.25'],
            _ => <String>[],
          };
          for (final t in also) {
            expect(find.textContaining(t), findsOneWidget, reason: t);
          }
          await shot(tester, '06c-decision-$way');
          // Reply: the conversation, open without reopening the decision.
          await tester.tap(
            find.text(
              way == 'declined'
                  ? (ar ? 'الرد على الدعم' : 'Reply to support')
                  : (ar ? 'رد' : 'Reply'),
            ),
          );
          await TestApp.settle(tester);
          expect(tester.takeException(), isNull);
          expect(find.byType(TextField), findsOneWidget);
        });
      }
    }
  }
}
