import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/auth/auth_controller.dart';
import 'package:yallapp/core/gate/owner_contact.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

const _rose = OwnerContact(name: 'Rose Shop', whatsapp: '+905321112233');

ApiException _paused(String code, {OwnerContact? contact}) => ApiException(
  code: code,
  message: 'Rose Shop is paused right now.',
  statusCode: 503,
  contact: contact,
);

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

  testWidgets(
    'a paused app says its owner can bring it back, with Contact and Try again',
    (tester) async {
      final api = FakeApi();
      api.failures['getConfig'] = _paused('license_inactive', contact: _rose);
      final app = TestApp(api: api);
      await app.pump(tester);

      expect(find.text('Rose Shop is paused'), findsOneWidget);
      expect(
        find.textContaining('The owner of Rose Shop can bring it back'),
        findsOneWidget,
      );
      expect(find.text('Contact Rose Shop'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
      expect(find.textContaining('academy'), findsNothing);

      // Back on: Try again opens the app.
      await tester.tap(find.text('Try again'));
      await TestApp.settle(tester);
      expect(find.text('Rose Shop is paused'), findsNothing);
      expect(find.text('Welcome'), findsOneWidget);
    },
  );

  testWidgets(
    '68 someone signed in deletes their account on the paused screen',
    (tester) async {
      final api = FakeApi();
      api.failures['getConfig'] = _paused('license_inactive', contact: _rose);
      final app = TestApp(api: api, signedIn: true);
      await app.pump(tester);
      expect(find.text('Rose Shop is paused'), findsOneWidget);
      expect(find.text('Delete account'), findsOneWidget);

      await tester.tap(find.text('Delete account'));
      await TestApp.settle(tester);
      expect(find.text('Delete your account?'), findsOneWidget);
      // Cancel keeps it; asking again and confirming deletes it.
      await tester.tap(find.text('Cancel'));
      await TestApp.settle(tester);
      expect(find.text('Delete your account?'), findsNothing);
      expect(api.count('deleteMe'), 0);
      await tester.tap(find.text('Delete account'));
      await TestApp.settle(tester);
      await tester.tap(find.text('Delete account').last);
      await TestApp.settle(tester);
      expect(api.count('deleteMe'), 1);
      expect(find.text('Your account was deleted.'), findsOneWidget);
      // Signed out: the paused screen no longer offers it.
      expect(find.text('Delete account'), findsNothing);
      expect(find.text('Rose Shop is paused'), findsOneWidget);
    },
  );

  testWidgets('68 nobody signed in: no Delete account on the paused screen', (
    tester,
  ) async {
    final api = FakeApi();
    api.failures['getConfig'] = _paused('license_inactive', contact: _rose);
    await TestApp(api: api).pump(tester);
    expect(find.text('Rose Shop is paused'), findsOneWidget);
    expect(find.text('Delete account'), findsNothing);
  });

  testWidgets('a suspended account shows the same paused screen', (
    tester,
  ) async {
    final api = FakeApi();
    api.failures['getConfig'] = _paused('account_suspended', contact: _rose);
    await TestApp(api: api).pump(tester);
    expect(find.text('Rose Shop is paused'), findsOneWidget);
    expect(find.text('Contact Rose Shop'), findsOneWidget);
  });

  testWidgets(
    'without a contact in the error, the one from the last config is offered',
    (tester) async {
      final api = FakeApi();
      api.failures['getConfig'] = _paused('license_inactive');
      final app = TestApp(
        api: api,
        preferences: {
          OwnerContactStore.key: jsonEncode(
            const OwnerContact(
              name: 'Rose Shop',
              email: 'help@rose.test',
            ).toJson(),
          ),
        },
      );
      await app.pump(tester);
      expect(find.text('Rose Shop is paused'), findsOneWidget);
      expect(find.text('Contact Rose Shop'), findsOneWidget);
    },
  );

  testWidgets('with no way to reach the owner, only Try again shows', (
    tester,
  ) async {
    final api = FakeApi();
    api.failures['getConfig'] = _paused('license_inactive');
    await TestApp(api: api).pump(tester);
    expect(find.text('Your Academy is paused'), findsOneWidget);
    expect(find.text('Contact Your Academy'), findsNothing);
    expect(find.text('Try again'), findsOneWidget);
  });

  testWidgets('the config that loads is kept for later', (tester) async {
    final api = FakeApi(
      config: configJson()
        ..['site'] = {
          ...(configJson()['site'] as Map<String, dynamic>),
          'support_whatsapp': '+905321112233',
          'support_email': 'help@academy.test',
        },
    );
    final app = TestApp(api: api);
    await app.pump(tester);
    expect(find.text('Welcome'), findsOneWidget);
    final prefs = await SharedPreferences.getInstance();
    final kept = jsonDecode(
      prefs.getString(OwnerContactStore.key)!,
    ) as Map<String, dynamic>;
    expect(kept['whatsapp'], '+905321112233');
    expect(kept['email'], 'help@academy.test');
  });

  testWidgets(
    'a new number while the app takes no new members gets a screen with the owner\'s contact',
    (tester) async {
      final api = FakeApi();
      api.failures['verifyOtp'] = const ApiException(
        code: ApiException.appUserLimit,
        message: "Rose Shop isn't taking new members right now.",
        statusCode: 403,
        contact: _rose,
      );
      final app = TestApp(api: api);
      await app.pump(tester);

      await tester.enterText(find.byType(TextField), '5321234567');
      await tester.pump();
      await tester.tap(find.text('Send code'));
      await TestApp.settle(tester);
      await tester.enterText(find.byType(TextField), '123456');
      await TestApp.settle(tester);

      expect(
        find.text("Rose Shop isn't taking new members right now"),
        findsOneWidget,
      );
      expect(
        find.textContaining('If you already have an account'),
        findsOneWidget,
      );
      expect(find.text('Contact Rose Shop'), findsOneWidget);
      expect(app.container.read(authControllerProvider).isSignedIn, isFalse);

      await tester.tap(find.text('Back'));
      await TestApp.settle(tester);
      expect(find.text('Enter verification code'), findsOneWidget);
    },
  );

  testWidgets('the same screen when the limit is reached during sign-up', (
    tester,
  ) async {
    final api = FakeApi(
      verifyResult: {
        'signup_required': true,
        'signup_token': 'signup-1',
        'fields': ['name'],
      },
    );
    api.failures['register'] = const ApiException(
      code: ApiException.appUserLimit,
      message: 'Full.',
      statusCode: 403,
      contact: _rose,
    );
    final app = TestApp(api: api);
    await app.pump(tester);
    await tester.enterText(find.byType(TextField), '5321234567');
    await tester.pump();
    await tester.tap(find.text('Send code'));
    await TestApp.settle(tester);
    await tester.enterText(find.byType(TextField), '123456');
    await TestApp.settle(tester);
    await tester.enterText(find.byType(TextFormField).first, 'Sara');
    await tester.tap(find.text('Create account'));
    await TestApp.settle(tester);

    expect(
      find.text("Rose Shop isn't taking new members right now"),
      findsOneWidget,
    );
    expect(app.container.read(authControllerProvider).isSignedIn, isFalse);
  });
}
