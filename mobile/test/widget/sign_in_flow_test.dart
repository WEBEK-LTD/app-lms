import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/auth/auth_controller.dart';

import '../support/fake_api.dart';
import '../support/test_app.dart';

void main() {
  setUp(() {
    final binding = TestWidgetsFlutterBinding.ensureInitialized();
    binding.platformDispatcher.views.first
      ..physicalSize = const Size(1170, 2532)
      ..devicePixelRatio = 3;
  });

  tearDown(() {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first
      ..resetPhysicalSize()
      ..resetDevicePixelRatio();
  });

  testWidgets('signs in with a code and lands on Home', (tester) async {
    final app = TestApp();
    await app.pump(tester);

    expect(find.text('Welcome'), findsOneWidget);
    expect(
      find.text('+90'),
      findsOneWidget,
      reason: 'default country code from /config',
    );

    await tester.enterText(find.byType(TextField), '0532 123 45 67');
    await tester.pump();
    await tester.tap(find.text('Send code'));
    await TestApp.settle(tester);

    expect(app.api.calls, contains('requestOtp'));
    expect(find.text('Enter verification code'), findsOneWidget);
    expect(find.textContaining('+90 532 123 45 67'), findsOneWidget);
    expect(
      find.textContaining('You can request a new code in'),
      findsOneWidget,
    );

    // Six boxes, filled through the single code field; verifies on the last digit.
    await tester.enterText(find.byType(TextField), '481902');
    await TestApp.settle(tester);

    expect(app.api.lastCode, '481902');
    expect(app.tokens.writes, 1);
    expect(app.container.read(authControllerProvider).isSignedIn, isTrue);
    expect(find.text('Continue learning'), findsOneWidget);
    expect(find.text('Enter verification code'), findsNothing);
  });

  testWidgets('a new number goes through the sign-up details', (tester) async {
    final app = TestApp(
      api: FakeApi(
        verifyResult: {
          'signup_required': true,
          'signup_token': 'signup-1',
          'fields': ['name', 'email'],
        },
      ),
    );
    await app.pump(tester);

    await tester.enterText(find.byType(TextField), '5321234567');
    await tester.pump();
    await tester.tap(find.text('Send code'));
    await TestApp.settle(tester);
    await tester.enterText(find.byType(TextField), '123456');
    await TestApp.settle(tester);

    expect(find.text('Create your account'), findsOneWidget);
    final fields = find.byType(TextFormField);
    expect(fields, findsNWidgets(2), reason: 'name plus the required email');

    await tester.tap(find.text('Create account'));
    await TestApp.settle(tester);
    expect(find.text('Enter your name.'), findsOneWidget);
    expect(app.api.calls, isNot(contains('register')));

    await tester.enterText(fields.at(0), 'Sara Yilmaz');
    await tester.enterText(fields.at(1), 'sara@example.com');
    await tester.tap(find.text('Create account'));
    await TestApp.settle(tester);

    expect(app.api.lastRegister?.name, 'Sara Yilmaz');
    expect(app.api.lastRegister?.email, 'sara@example.com');
    expect(app.api.lastRegister?.signupToken, 'signup-1');
    expect(app.container.read(authControllerProvider).isSignedIn, isTrue);
    expect(find.text('Create your account'), findsNothing);
  });

  testWidgets('"Not now" browses as a guest', (tester) async {
    final app = TestApp();
    await app.pump(tester);
    await tester.tap(find.text('Not now'));
    await TestApp.settle(tester);
    expect(find.text('Search for a course'), findsOneWidget);
    expect(app.container.read(authControllerProvider).isSignedIn, isFalse);
  });
}
