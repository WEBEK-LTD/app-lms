import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/auth/auth_controller.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 123 The premium academy's sign-in code (`looks` `code: premium`): the
/// time left as a gold ring, the title, where the code went and how many
/// digits, a box per digit, sending again in gold once the time is up, and
/// the button in ink.
void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized().platformDispatcher.views.first
      ..physicalSize = const Size(1170, 2532)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  FakeApi api({bool premium = true}) {
    final config = configJson();
    config['screens'] = {
      if (premium) 'looks': {'code': 'premium'},
    };
    return FakeApi(config: config);
  }

  Future<TestApp> toCode(WidgetTester tester, FakeApi api) async {
    final app = TestApp(api: api);
    await app.pump(tester);
    await tester.enterText(find.byType(TextField), '5321234567');
    await tester.pump();
    await tester.tap(find.text('Send code'));
    await TestApp.settle(tester);
    return app;
  }

  testWidgets('the ring, the digits, sending again and signing in', (
    tester,
  ) async {
    final app = await toCode(tester, api());
    expect(find.text('Verification code'), findsOneWidget);
    expect(find.byKey(const ValueKey('code-ring')), findsOneWidget);
    expect(find.textContaining('6-digit code to'), findsOneWidget);
    expect(find.textContaining('+90 532 123 45 67'), findsOneWidget);
    expect(find.text("Didn't get it?"), findsOneWidget);
    expect(find.textContaining('Resend'), findsOneWidget);
    expect(find.text('Confirm and sign in'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '481902');
    await TestApp.settle(tester);
    expect(app.api.lastCode, '481902');
    expect(app.container.read(authControllerProvider).isSignedIn, isTrue);
  });

  testWidgets('without the look, the code screen is as it was', (tester) async {
    await toCode(tester, api(premium: false));
    expect(find.text('Enter verification code'), findsOneWidget);
    expect(find.byKey(const ValueKey('code-ring')), findsNothing);
  });
}
