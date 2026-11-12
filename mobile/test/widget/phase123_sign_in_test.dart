import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 123 The premium academy's sign-in (`Config.screens.sign_in` `style:
/// premium`): the owner's words large over the photo, the form on a card at
/// the foot with the button in gold, the other way in and a new account
/// side by side.
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

  FakeApi api({List<String> methods = const ['phone', 'email']}) {
    final config = configJson();
    config['auth'] = {
      ...(config['auth'] as Map<String, dynamic>),
      'methods': methods,
    };
    config['screens'] = {
      'sign_in': {
        'style': 'premium',
        'image_url': null,
        'title': {'en': 'Learn what changes your path.'},
        'subtitle': {'en': 'Courses with the best teachers.'},
        'show_logo': true,
      },
    };
    return FakeApi(config: config);
  }

  test('a premium look keeps going without its photo', () {
    final look = SignInLook.fromJson({'style': 'premium'});
    expect(look.style, SignInLookStyle.premium);
    expect(look.imageUrl, isNull);
  });

  testWidgets('the words, the card, the gold button and a code sent', (
    tester,
  ) async {
    final fake = api();
    final app = TestApp(api: fake);
    await app.pump(tester);
    expect(find.text('Learn what changes your path.'), findsOneWidget);
    expect(find.text('Courses with the best teachers.'), findsOneWidget);
    expect(find.byKey(const ValueKey('sign-in-premium-card')), findsOneWidget);
    expect(find.text('Sign in with your phone'), findsOneWidget);
    expect(
      find.text('We send you a code to sign in, no password.'),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('gold-button')), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('phone-field')),
      '5321234567',
    );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('sign-in-continue')));
    await TestApp.settle(tester, 10);
    expect(fake.count('requestOtp'), 1);
  });

  testWidgets('email instead, and a new account', (tester) async {
    final app = TestApp(api: api());
    await app.pump(tester);
    await tester.tap(find.byKey(const ValueKey('sign-in-other')));
    await tester.pump();
    expect(find.text('Sign in with your email'), findsOneWidget);
    expect(find.text('Phone'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('sign-in-account')));
    await tester.pump();
    expect(find.text('Create an account'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('one way in: only a new account beside the button', (
    tester,
  ) async {
    final app = TestApp(api: api(methods: const ['phone']));
    await app.pump(tester);
    expect(find.byKey(const ValueKey('sign-in-other')), findsNothing);
    expect(find.byKey(const ValueKey('sign-in-account')), findsOneWidget);
  });
}
