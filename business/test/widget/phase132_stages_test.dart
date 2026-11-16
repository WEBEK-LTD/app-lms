import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/api_exception.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/widgets/l10n.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 132 A store order's delivery in stages in Yallapp Business: Mark as
/// shipped (the courier, a tracking link), Postpone (why, the new day and
/// time), Delivery failed (why, what's next), Mark delivered (asked first:
/// it completes the order); every change on the order's page with who,
/// when, why and the team's note; the stage's chip in the list. Light,
/// dark, right to left.
///
/// `YB_SHOTS_DIR=<dir> flutter test test/widget/phase132_stages_test.dart`
/// also writes 2x pictures: the order with its stage buttons, the
/// Postpone and Delivery failed sheets, and the history.

final _shots = Platform.environment['YB_SHOTS_DIR'] ?? '';
const _frame = ValueKey('phase132-stages-shot');

Future<void> _loadFonts() async {
  final manifest =
      json.decode(await rootBundle.loadString('FontManifest.json')) as List;
  for (final entry in manifest.cast<Map<String, dynamic>>()) {
    final loader = FontLoader(entry['family'] as String);
    for (final font in (entry['fonts'] as List).cast<Map<String, dynamic>>()) {
      loader.addFont(rootBundle.load(font['asset'] as String));
    }
    await loader.load();
  }
}

Future<void> _shot(WidgetTester tester, String name) async {
  if (_shots.isEmpty) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(_frame),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = File('$_shots/stages/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
  });
}

Future<TestApp> _open(
  WidgetTester tester,
  String location, {
  String language = 'en',
  Brightness? brightness,
  double height = 1400,
}) async {
  final app = TestApp(
    api: FakeOwnerApi()..language = language,
    appId: FakeOwnerApi.flowersId,
    language: language,
    brightness: brightness,
  );
  await app.pump(
    tester,
    size: Size(400, height),
    pixelRatio: 2,
    wrap: (root) => RepaintBoundary(key: _frame, child: root),
  );
  await go(tester, app, location);
  return app;
}

void main() {
  setUpAll(() async {
    if (_shots.isNotEmpty) await _loadFonts();
  });

  testWidgets('an order not on its way yet: Mark as shipped with the courier', (
    tester,
  ) async {
    final app = await _open(tester, '/orders/2051');
    expect(find.text('Delivery'), findsOneWidget);
    expect(
      find.text(
        'Not on its way yet. Mark it as shipped when it leaves: the customer is told.',
      ),
      findsOneWidget,
    );
    expect(
      find.widgetWithText(FilledButton, 'Mark as shipped'),
      findsOneWidget,
    );
    for (final other in ['Preparing', 'Postpone', 'Mark delivered']) {
      expect(find.widgetWithText(OutlinedButton, other), findsOneWidget);
    }
    expect(find.widgetWithText(TextButton, 'Cancel order'), findsOneWidget);
    // Mark as completed gives way to the stages.
    expect(find.text('Mark as completed'), findsNothing);

    await tapOn(tester, find.widgetWithText(FilledButton, 'Mark as shipped'));
    expect(find.text('Mark #2051 as shipped'), findsOneWidget);
    await tester.enterText(
      find.widgetWithText(TextField, "Courier's name (optional)"),
      'Mostafa',
    );
    await tester.enterText(
      find.widgetWithText(TextField, "Courier's phone (optional)"),
      '+20 100 555 1234',
    );
    await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
    expect(app.api.calls, contains('setOrderStage:shipped'));
    expect(
      find.text('#2051: Out for delivery. The customer was told.'),
      findsOneWidget,
    );
    // Out now: Mark delivered first, then Postpone and Delivery failed.
    expect(find.widgetWithText(FilledButton, 'Mark delivered'), findsOneWidget);
    expect(
      find.widgetWithText(OutlinedButton, 'Delivery failed'),
      findsOneWidget,
    );
    expect(
      find.text(
        'Courier: ${isolate('Mostafa')} · ${isolate('+20 100 555 1234')}',
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('Postpone asks why and the new day, then the time', (
    tester,
  ) async {
    final app = await _open(tester, '/orders/2051');
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Postpone'));
    expect(find.text('Postpone #2051'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
    expect(find.text('Choose why.'), findsOneWidget);
    expect(find.text('Choose the new day.'), findsOneWidget);
    expect(app.api.calls, isNot(contains('setOrderStage:postponed')));

    await tapOn(tester, find.widgetWithText(ChoiceChip, 'Other'));
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    final day =
        '${tomorrow.year}-${tomorrow.month.toString().padLeft(2, '0')}-${tomorrow.day.toString().padLeft(2, '0')}';
    final element = tester.element(find.text('Postpone #2051'));
    await tapOn(tester, find.widgetWithText(ChoiceChip, element.day(day)));
    expect(app.api.calls, contains('stageSlots'));
    // A full time can't be chosen.
    final full = tester.widget<ChoiceChip>(
      find.widgetWithText(ChoiceChip, '${isolate('16:00–19:00')} · full'),
    );
    expect(full.onSelected, isNull);
    await tapOn(
      tester,
      find.widgetWithText(ChoiceChip, isolate('10:00–13:00')),
    );
    // "Other" needs the note.
    await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
    expect(find.text('Write the reason in the note.'), findsOneWidget);
    await tester.enterText(
      find.widgetWithText(TextField, 'Note for your team'),
      'The building is closed for a wedding',
    );
    await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
    expect(app.api.calls, contains('setOrderStage:postponed'));
    expect(find.text('Postponed · Other'), findsOneWidget);
    expect(
      find.text(isolate('The building is closed for a wedding')),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    "Delivery failed: why and what's next; cancelling refunds the customer now",
    (tester) async {
      final app = await _open(tester, '/orders/2051');
      await tapOn(tester, find.widgetWithText(FilledButton, 'Mark as shipped'));
      await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
      await tester.pump(const Duration(seconds: 5));
      await settle(tester);
      await tapOn(
        tester,
        find.widgetWithText(OutlinedButton, 'Delivery failed'),
      );
      expect(find.text('Delivery of #2051 failed'), findsOneWidget);
      await tapOn(tester, find.widgetWithText(ChoiceChip, 'Recipient refused'));
      await tapOn(tester, find.widgetWithText(ChoiceChip, 'Cancel the order'));
      expect(
        find.text('Cancelling refunds E£2,035.50 to the customer now.'),
        findsOneWidget,
      );
      // Trying again asks for the day.
      await tapOn(
        tester,
        find.widgetWithText(ChoiceChip, 'Try again on another day'),
      );
      expect(find.text('New day'), findsOneWidget);
      await tapOn(tester, find.widgetWithText(ChoiceChip, 'Cancel the order'));
      await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
      expect(app.api.calls, contains('setOrderStage:failed'));
      // Cancelled: nothing more at the foot.
      expect(find.widgetWithText(FilledButton, 'Mark delivered'), findsNothing);
      expect(find.text('Delivery failed · Recipient refused'), findsOneWidget);
      expect(find.text('Next: Cancel the order'), findsOneWidget);
      // 132 The money went back at once.
      await tester.scrollUntilVisible(
        find.text(
          'E£2,035.50 went back to the customer when the order was cancelled.',
        ),
        200,
        scrollable: find
            .byWidgetPredicate(
              (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
            )
            .first,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'a payment that can\'t go back by itself: Needs a refund, then I refunded it',
    (tester) async {
      final app = TestApp(
        api: FakeOwnerApi()..refundsByApi = false,
        appId: FakeOwnerApi.flowersId,
      );
      await app.pump(tester, size: const Size(400, 2400));
      await go(tester, app, '/orders/2050');
      await tapOn(tester, find.widgetWithText(FilledButton, 'Mark as shipped'));
      await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
      await tester.pump(const Duration(seconds: 5));
      await settle(tester);
      await tapOn(
        tester,
        find.widgetWithText(OutlinedButton, 'Delivery failed'),
      );
      await tapOn(tester, find.widgetWithText(ChoiceChip, 'Recipient refused'));
      await tapOn(tester, find.widgetWithText(ChoiceChip, 'Cancel the order'));
      expect(
        find.text(
          'Cancelling marks the order Needs a refund: pay back E£1,030.00 yourself, then mark it refunded.',
        ),
        findsOneWidget,
      );
      await tapOn(tester, find.widgetWithText(FilledButton, 'Save'));
      await tester.pump(const Duration(seconds: 5));
      await settle(tester);
      expect(find.text('Needs a refund'), findsOneWidget);
      expect(
        find.text(
          'Pay back E£1,030.00 to the customer, then mark it refunded.',
        ),
        findsOneWidget,
      );
      await tapOn(tester, find.widgetWithText(OutlinedButton, 'I refunded it'));
      expect(find.text('Mark #2050 refunded?'), findsOneWidget);
      await tapOn(tester, find.widgetWithText(FilledButton, 'I refunded it'));
      expect(app.api.calls, contains('markRefunded'));
      expect(
        find.text('#2050: marked refunded. The customer was told.'),
        findsOneWidget,
      );
      expect(find.text('Needs a refund'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('the list shows a chip for an order that needs a refund', (
    tester,
  ) async {
    final api = FakeOwnerApi()..refundsByApi = false;
    await api.setOrderStage(
      FakeOwnerApi.flowersId,
      2051,
      const StageRequest('shipped'),
    );
    await api.setOrderStage(
      FakeOwnerApi.flowersId,
      2051,
      const StageRequest('failed', reason: 'refused', nextStep: 'cancel'),
    );
    final app = TestApp(api: api, appId: FakeOwnerApi.flowersId);
    await app.pump(tester, size: const Size(400, 1600));
    await go(tester, app, '/orders');
    await tapOn(tester, find.text('Cancelled'));
    expect(find.text('Needs a refund'), findsOneWidget);
  });

  testWidgets('the history: who, when, why, the new day and the team note', (
    tester,
  ) async {
    await _open(tester, '/orders/2050', height: 2000);
    expect(find.text('Postponed · Recipient not available'), findsOneWidget);
    expect(
      find.text(
        isolate('Hana is at the hospital until tomorrow; call her sister.'),
      ),
      findsOneWidget,
    );
    expect(find.text('Out for delivery'), findsOneWidget);
    expect(find.textContaining('New day: '), findsOneWidget);
    expect(find.textContaining(isolate('Leyla')), findsNWidgets(2));
    // Postponed: shipped again is first; Mark delivered asks before completing.
    expect(
      find.widgetWithText(FilledButton, 'Mark as shipped'),
      findsOneWidget,
    );
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Mark delivered'));
    expect(find.text('Mark #2050 delivered?'), findsOneWidget);
    expect(
      find.text('It completes the order and tells the customer.'),
      findsOneWidget,
    );
    await tapOn(
      tester,
      find.widgetWithText(FilledButton, 'Mark delivered').last,
    );
    expect(find.text('Completed'), findsWidgets);
    expect(find.widgetWithText(FilledButton, 'Mark as shipped'), findsNothing);
  });

  testWidgets('the list shows each order\'s stage in its colour', (
    tester,
  ) async {
    await _open(tester, '/orders', height: 1600);
    expect(find.text('Postponed'), findsOneWidget);
    expect(
      find.widgetWithText(FilledButton, 'Mark as shipped'),
      findsNWidgets(2),
    );
  });

  test('a stage the order can\'t move to is refused', () async {
    final api = FakeOwnerApi();
    await api.setOrderStage(
      FakeOwnerApi.flowersId,
      2051,
      const StageRequest('delivered'),
    );
    expect(
      () => api.setOrderStage(
        FakeOwnerApi.flowersId,
        2051,
        const StageRequest('shipped'),
      ),
      throwsA(
        isA<ApiException>().having((e) => e.code, 'code', 'invalid_stage'),
      ),
    );
  });

  testWidgets('in Arabic, dark, right to left, in Modern Standard Arabic', (
    tester,
  ) async {
    await _open(
      tester,
      '/orders/2050',
      language: 'ar',
      brightness: Brightness.dark,
      height: 2000,
    );
    expect(find.text('التوصيل'), findsWidgets);
    expect(find.text('مؤجَّل · المستلم غير متاح'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'حدِّده كمشحون'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('مؤجَّل · المستلم غير متاح'))),
      TextDirection.rtl,
    );
    expect(
      Theme.of(tester.element(find.text('التوصيل').first)).brightness,
      Brightness.dark,
    );
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'تأجيل'));
    expect(find.text('تأجيل توصيل #2050'), findsOneWidget);
    expect(find.widgetWithText(ChoiceChip, 'الطقس'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  // 2x pictures for the report.
  for (final lang in ['en', 'ar']) {
    testWidgets('2x picture: the order with its stage buttons, $lang', (
      tester,
    ) async {
      await _open(tester, '/orders/2051', language: lang, height: 900);
      await _shot(tester, 'order-buttons-$lang');
    });
    testWidgets('2x picture: the history, $lang', (tester) async {
      await _open(tester, '/orders/2050', language: lang, height: 1000);
      await tester.scrollUntilVisible(
        find.text(lang == 'ar' ? 'التوصيل' : 'Delivery'),
        200,
        scrollable: find
            .byWidgetPredicate(
              (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
            )
            .first,
      );
      // The Delivery section at the top.
      final title = find.text(lang == 'ar' ? 'التوصيل' : 'Delivery');
      Scrollable.ensureVisible(tester.element(title));
      await settle(tester);
      await _shot(tester, 'history-$lang');
    });
    testWidgets('2x picture: the Postpone sheet, $lang', (tester) async {
      await _open(tester, '/orders/2051', language: lang, height: 1000);
      await tapOn(
        tester,
        find.widgetWithText(
          OutlinedButton,
          lang == 'ar' ? 'تأجيل' : 'Postpone',
        ),
      );
      await tapOn(
        tester,
        find.widgetWithText(
          ChoiceChip,
          lang == 'ar' ? 'المستلم غير متاح' : 'Recipient not available',
        ),
      );
      await tapOn(tester, find.byType(ChoiceChip).at(6));
      await tapOn(
        tester,
        find.widgetWithText(ChoiceChip, isolate('10:00–13:00')),
      );
      await _shot(tester, 'postpone-sheet-$lang');
    });
    testWidgets('2x picture: cancelling after a failed delivery, $lang', (
      tester,
    ) async {
      final app = TestApp(
        api: FakeOwnerApi()
          ..language = lang
          ..refundsByApi = false,
        appId: FakeOwnerApi.flowersId,
        language: lang,
      );
      await app.pump(
        tester,
        size: const Size(400, 1000),
        pixelRatio: 2,
        wrap: (root) => RepaintBoundary(key: _frame, child: root),
      );
      await app.api.setOrderStage(
        FakeOwnerApi.flowersId,
        2050,
        const StageRequest('shipped', courierName: 'Mostafa'),
      );
      await go(tester, app, '/orders/2050');
      await tapOn(
        tester,
        find.widgetWithText(
          OutlinedButton,
          lang == 'ar' ? 'تعذّر التوصيل' : 'Delivery failed',
        ),
      );
      await tapOn(
        tester,
        find.widgetWithText(
          ChoiceChip,
          lang == 'ar' ? 'رفض المستلم الاستلام' : 'Recipient refused',
        ),
      );
      await tapOn(
        tester,
        find.widgetWithText(
          ChoiceChip,
          lang == 'ar' ? 'إلغاء الطلب' : 'Cancel the order',
        ),
      );
      await _shot(tester, 'failed-sheet-cancel-$lang');
    });
    testWidgets('2x picture: Needs a refund, $lang', (tester) async {
      final api = FakeOwnerApi()
        ..language = lang
        ..refundsByApi = false;
      await api.setOrderStage(
        FakeOwnerApi.flowersId,
        2050,
        const StageRequest('shipped', courierName: 'Mostafa'),
      );
      await api.setOrderStage(
        FakeOwnerApi.flowersId,
        2050,
        const StageRequest('failed', reason: 'refused', nextStep: 'cancel'),
      );
      final app = TestApp(
        api: api,
        appId: FakeOwnerApi.flowersId,
        language: lang,
      );
      await app.pump(
        tester,
        size: const Size(400, 1000),
        pixelRatio: 2,
        wrap: (root) => RepaintBoundary(key: _frame, child: root),
      );
      await go(tester, app, '/orders/2050');
      final panel = find.byKey(const ValueKey('refund-due'));
      await tester.scrollUntilVisible(
        panel,
        200,
        scrollable: find
            .byWidgetPredicate(
              (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
            )
            .first,
      );
      Scrollable.ensureVisible(tester.element(panel), alignment: 0.4);
      await settle(tester);
      await _shot(tester, 'needs-refund-$lang');
    });
    testWidgets('2x picture: the list with Needs a refund, $lang', (
      tester,
    ) async {
      final api = FakeOwnerApi()
        ..language = lang
        ..refundsByApi = false;
      await api.setOrderStage(
        FakeOwnerApi.flowersId,
        2051,
        const StageRequest('shipped'),
      );
      await api.setOrderStage(
        FakeOwnerApi.flowersId,
        2051,
        const StageRequest('failed', reason: 'refused', nextStep: 'cancel'),
      );
      final app = TestApp(
        api: api,
        appId: FakeOwnerApi.flowersId,
        language: lang,
      );
      await app.pump(
        tester,
        size: const Size(400, 900),
        pixelRatio: 2,
        wrap: (root) => RepaintBoundary(key: _frame, child: root),
      );
      await go(tester, app, '/orders');
      await tapOn(tester, find.text(lang == 'ar' ? 'ملغى' : 'Cancelled'));
      await _shot(tester, 'list-needs-refund-$lang');
    });
    testWidgets('2x picture: the Delivery failed sheet, $lang', (tester) async {
      final app = await _open(
        tester,
        '/orders/2050',
        language: lang,
        height: 1000,
      );
      await app.api.setOrderStage(
        FakeOwnerApi.flowersId,
        2050,
        const StageRequest('shipped', courierName: 'Mostafa'),
      );
      await go(tester, app, '/orders');
      await go(tester, app, '/orders/2050');
      await tapOn(
        tester,
        find.widgetWithText(
          OutlinedButton,
          lang == 'ar' ? 'تعذّر التوصيل' : 'Delivery failed',
        ),
      );
      await tapOn(
        tester,
        find.widgetWithText(
          ChoiceChip,
          lang == 'ar' ? 'تعذّر الوصول بالهاتف' : "Couldn't reach by phone",
        ),
      );
      await tapOn(
        tester,
        find.widgetWithText(
          ChoiceChip,
          lang == 'ar'
              ? 'المحاولة مجددًا في يوم آخر'
              : 'Try again on another day',
        ),
      );
      await _shot(tester, 'failed-sheet-$lang');
    });
  }
}
