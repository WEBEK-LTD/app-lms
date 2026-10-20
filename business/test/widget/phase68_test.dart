import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/api_exception.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 68 An ended plan stops the app everywhere: the composer says nothing is
/// sent while the plan has ended, its buttons wait, and the Owner API's
/// `plan_not_active` is what the fake answers too.
void main() {
  for (final language in ['en', 'ar', 'tr']) {
    testWidgets(
      'the composer of an ended app says nothing is sent ($language)',
      (tester) async {
        final app = TestApp(appId: FakeOwnerApi.newsId, language: language);
        await app.pump(tester);
        await go(tester, app, '/notify');
        expect(tester.takeException(), isNull);
        final strings = {
          'en': "Nothing is sent while the plan has ended, to the app's inbox or to phones. Notifications can go out again once it's renewed.",
          'ar': 'لا يُرسل شيء ما دامت الباقة منتهية، لا إلى صندوق التطبيق ولا إلى الهواتف. يمكن إرسال الإشعارات مرة أخرى بعد تجديدها.',
          'tr': 'Paket sona erdiği sürece uygulamanın gelen kutusuna da telefonlara da hiçbir şey gönderilmez. Paket yenilendiğinde bildirimler yeniden gönderilebilir.',
        };
        expect(find.text(strings[language]!), findsOneWidget);

        await tester.enterText(find.byType(TextField).at(0), 'Breaking');
        await tester.enterText(find.byType(TextField).at(1), 'News of the day');
        await tester.pump();
        // Send now and Schedule both wait for a renewed plan.
        expect(find.byType(FilledButton), findsWidgets);
        expect(
          tester
              .widgetList<FilledButton>(find.byType(FilledButton))
              .where((b) => b.onPressed != null),
          isEmpty,
        );
      },
    );
  }

  testWidgets('an app whose plan runs sends as before', (tester) async {
    final app = TestApp();
    await app.pump(tester);
    await go(tester, app, '/notify');
    expect(
      find.textContaining("Nothing is sent while the plan has ended"),
      findsNothing,
    );
  });

  test('the fake answers like the Owner API once the plan ended', () async {
    final api = FakeOwnerApi();
    await expectLater(
      api.sendNotification(FakeOwnerApi.newsId, title: 'Hi', body: 'There'),
      throwsA(
        isA<ApiException>().having(
          (e) => e.code,
          'code',
          ApiException.planNotActive,
        ),
      ),
    );
    await expectLater(
      api.scheduleNotification(
        FakeOwnerApi.newsId,
        title: 'Hi',
        body: 'There',
        date: '2099-01-01',
        time: '09:00',
      ),
      throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 403)),
    );
    expect((await api.sentNotifications(FakeOwnerApi.newsId)).push, isFalse);
  });
}
