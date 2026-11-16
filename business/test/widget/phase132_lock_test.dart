import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/providers.dart';
import 'package:yallapp_business/core/services/biometrics.dart';
import 'package:yallapp_business/core/session.dart';
import 'package:local_auth/local_auth.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 132 The app lock, as the owner asked ("it feels fake"): a real lock on
/// launch and after the time away chosen in Settings; the app's mark and
/// the business's name; Face ID, fingerprint or the phone's PIN; clear words
/// for a phone with no face or fingerprint set up, locked out after too many
/// tries, or with no screen lock any more; nothing reachable behind it (back,
/// links, pushes); hidden in the app switcher; turned on and off only after
/// the phone says it's them. Light, dark, Arabic and Turkish.
///
/// `YB_SHOTS_DIR=<dir> flutter test test/widget/phase132_lock_test.dart`
/// writes 2x pictures of the lock screen.

final _shots = Platform.environment['YB_SHOTS_DIR'] ?? '';
const _frame = ValueKey('lock-shot');

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
    final file = File('$_shots/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
  });
}

/// A phone signed in before, with the lock on, opening the app.
Future<TestApp> _locked(
  WidgetTester tester, {
  FakeBiometrics? bio,
  String language = 'en',
  Brightness? brightness,
  FakePush? push,
  Map<String, Object> preferences = const {},
}) async {
  final app = TestApp(
    api: FakeOwnerApi()..language = language,
    biometrics: bio ?? FakeBiometrics(),
    biometricLock: true,
    language: language,
    brightness: brightness,
    push: push,
    preferences: {'yb.business_name': 'Bab Al Sham', ...preferences},
  );
  await app.pump(
    tester,
    size: const Size(400, 860),
    pixelRatio: 2,
    wrap: (root) => RepaintBoundary(key: _frame, child: root),
  );
  return app;
}

void main() {
  setUpAll(() async {
    if (_shots.isNotEmpty) await _loadFonts();
  });

  testWidgets(
    'locks on launch with the mark and the business; unlocks with the fingerprint',
    (tester) async {
      final bio = FakeBiometrics(succeed: false);
      final app = await _locked(tester, bio: bio);
      expect(find.text('Yallapp Business is locked'), findsOneWidget);
      expect(find.text('Bab Al Sham'), findsOneWidget);
      expect(find.bySemanticsLabel('Yallapp Business'), findsWidgets);
      // Asked as it opens; it didn't match.
      expect(bio.prompts, 1);
      expect(
        find.text(
          "That didn't work. Try again, or sign out and use your password.",
        ),
        findsOneWidget,
      );
      expect(app.api.calls, isNot(contains('today')));
      bio.succeed = true;
      await tapOn(tester, find.text('Unlock with fingerprint'));
      expect(find.text('Needs you now'), findsOneWidget);
    },
  );

  testWidgets('Use phone PIN is offered beside the face or fingerprint', (
    tester,
  ) async {
    final bio = FakeBiometrics(result: UnlockResult.cancelled);
    await _locked(tester, bio: bio);
    // Cancelled: nothing to say, both ways to unlock.
    expect(
      find.text('Unlock with your fingerprint, face or phone lock.'),
      findsOneWidget,
    );
    bio.result = null;
    await tapOn(tester, find.text('Use phone PIN'));
    expect(bio.pinOnly.last, isTrue);
    expect(find.text('Needs you now'), findsOneWidget);
  });

  testWidgets('locked out after too many tries: the phone PIN comes first', (
    tester,
  ) async {
    final bio = FakeBiometrics(result: UnlockResult.lockedOut);
    await _locked(tester, bio: bio);
    expect(
      find.text(
        "Too many tries. Use your phone's PIN, or wait a little and try again.",
      ),
      findsOneWidget,
    );
    expect(find.widgetWithText(FilledButton, 'Use phone PIN'), findsOneWidget);
    expect(find.text('Unlock with fingerprint'), findsNothing);
    bio.result = UnlockResult.lockedOutUntilPin;
    await tapOn(tester, find.text('Use phone PIN'));
    expect(
      find.text(
        "Face and fingerprint are blocked for now. Use your phone's PIN.",
      ),
      findsOneWidget,
    );
    bio.result = UnlockResult.success;
    await tapOn(tester, find.text('Use phone PIN'));
    expect(find.text('Needs you now'), findsOneWidget);
  });

  testWidgets('no face or fingerprint set up: the phone PIN unlocks', (
    tester,
  ) async {
    final bio = FakeBiometrics(
      supportOf: LockSupport.deviceCredential,
      succeed: false,
    );
    await _locked(tester, bio: bio);
    expect(find.text("Unlock with the phone's PIN"), findsOneWidget);
    expect(find.text('Use phone PIN'), findsNothing);
    bio.result = UnlockResult.notEnrolled;
    await tapOn(tester, find.text("Unlock with the phone's PIN"));
    expect(
      find.textContaining('No face or fingerprint is set up on this phone.'),
      findsOneWidget,
    );
  });

  testWidgets(
    'a phone whose screen lock was removed stays locked; signing out is the way',
    (tester) async {
      final bio = FakeBiometrics(supportOf: LockSupport.noCredentials);
      final app = await _locked(tester, bio: bio);
      expect(find.text('Yallapp Business is locked'), findsOneWidget);
      expect(
        find.textContaining('This phone has no screen lock.'),
        findsOneWidget,
      );
      expect(bio.prompts, 0);
      expect(find.byType(FilledButton), findsNothing);
      expect(app.api.calls, isNot(contains('today')));
      await tapOn(tester, find.text('Sign out and use my password'));
      expect(find.text('Sign in'), findsWidgets);
    },
  );

  testWidgets('Face ID on an iPhone', (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    try {
      final bio = FakeBiometrics(
        kindOf: BiometricKind.face,
        result: UnlockResult.cancelled,
      );
      await _locked(tester, bio: bio);
      expect(find.text('Unlock with Face ID'), findsOneWidget);
    } finally {
      debugDefaultTargetPlatformOverride = null;
    }
  });

  testWidgets(
    'back and links can\'t get past it; a push waits for the unlock',
    (tester) async {
      final push = FakePush();
      final bio = FakeBiometrics(result: UnlockResult.cancelled);
      final app = await _locked(tester, bio: bio, push: push);
      await tester.binding.handlePopRoute();
      await settle(tester);
      expect(find.text('Yallapp Business is locked'), findsOneWidget);
      await go(tester, app, '/orders/1042');
      expect(find.text('Yallapp Business is locked'), findsOneWidget);
      expect(find.text('#1042'), findsNothing);
      push.openedController.add({
        'type': 'owner',
        'kind': 'new_order',
        'app_id': FakeOwnerApi.restaurantId,
        'order_id': '1041',
      });
      await settle(tester);
      expect(find.text('Yallapp Business is locked'), findsOneWidget);
      expect(app.api.calls, isNot(contains('order')));
      bio.result = UnlockResult.success;
      await tapOn(tester, find.text('Unlock with fingerprint'));
      expect(find.text('#1041'), findsOneWidget);
    },
  );

  testWidgets(
    'locks again on coming back, after the time chosen; hidden in the app switcher',
    (tester) async {
      final bio = FakeBiometrics();
      final app = TestApp(
        biometrics: bio,
        biometricLock: true,
        preferences: const {'yb.lock_after_minutes': 0},
      );
      await app.pump(tester);
      // The phone said it's them as the lock opened.
      expect(find.text('Needs you now'), findsOneWidget);
      expect(app.privacy.secure, isTrue);
      // Leaving: the cover hides the business at once.
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      await settle(tester, 2);
      expect(find.byKey(const ValueKey('privacy-cover')), findsOneWidget);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await settle(tester, 2);
      // Back: locked again, and the phone asked (cancelled this time).
      bio.result = UnlockResult.cancelled;
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await settle(tester);
      expect(find.byKey(const ValueKey('privacy-cover')), findsNothing);
      expect(find.text('Yallapp Business is locked'), findsOneWidget);
      expect(bio.prompts, 2);
    },
  );

  testWidgets('15 minutes chosen: a quick look away doesn\'t lock', (
    tester,
  ) async {
    final app = TestApp(
      biometrics: FakeBiometrics(),
      biometricLock: true,
      preferences: const {'yb.lock_after_minutes': 15},
    );
    await app.pump(tester);
    // The phone said it's them as the lock opened.
    for (final state in [
      AppLifecycleState.inactive,
      AppLifecycleState.hidden,
      AppLifecycleState.paused,
      AppLifecycleState.hidden,
      AppLifecycleState.inactive,
      AppLifecycleState.resumed,
    ]) {
      tester.binding.handleAppLifecycleStateChanged(state);
    }
    await settle(tester);
    expect(find.text('Needs you now'), findsOneWidget);
  });

  testWidgets('without the lock, nothing is covered', (tester) async {
    final app = TestApp(biometricLock: false);
    await app.pump(tester);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    await settle(tester, 2);
    expect(find.byKey(const ValueKey('privacy-cover')), findsNothing);
    expect(app.privacy.secure, isFalse);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await settle(tester, 2);
  });

  testWidgets(
    'Settings: on and off each ask the phone first; when to lock again',
    (tester) async {
      final bio = FakeBiometrics(succeed: false);
      final app = TestApp(biometrics: bio, biometricLock: false);
      await app.pump(tester);
      await go(tester, app, '/more');
      final tile = find.widgetWithText(
        SwitchListTile,
        'Unlock with fingerprint or face',
      );
      await tester.scrollUntilVisible(tile, 200);
      // It didn't match: still off.
      await tapOn(tester, tile);
      expect(bio.prompts, 1);
      expect(tester.widget<SwitchListTile>(tile).value, isFalse);
      expect(
        find.text("That didn't match, so the app lock wasn't changed."),
        findsOneWidget,
      );
      bio.succeed = true;
      await tapOn(tester, tile);
      expect(tester.widget<SwitchListTile>(tile).value, isTrue);
      expect(app.container.read(settingsProvider).biometricLock, isTrue);
      expect(app.privacy.secure, isTrue);
      // When it asks again.
      await tapOn(tester, find.text('Lock again'));
      await tapOn(tester, find.text('After 5 minutes away'));
      expect(app.container.read(settingsProvider).lockAfterMinutes, 5);
      expect(find.text('After 5 minutes away'), findsOneWidget);
      // Off asks too.
      bio.succeed = false;
      await tapOn(tester, tile);
      expect(tester.widget<SwitchListTile>(tile).value, isTrue);
      bio.succeed = true;
      await tapOn(tester, tile);
      expect(tester.widget<SwitchListTile>(tile).value, isFalse);
      expect(app.privacy.secure, isFalse);
      expect(bio.prompts, 4);
    },
  );

  testWidgets('a phone with no screen lock can\'t turn it on, and says why', (
    tester,
  ) async {
    final app = TestApp(
      biometrics: FakeBiometrics(supportOf: LockSupport.noCredentials),
      biometricLock: false,
    );
    await app.pump(tester);
    await go(tester, app, '/more');
    final tile = find.widgetWithText(
      SwitchListTile,
      'Unlock with fingerprint or face',
    );
    await tester.scrollUntilVisible(tile, 200);
    expect(tester.widget<SwitchListTile>(tile).onChanged, isNull);
    expect(
      find.textContaining('This phone has no screen lock.'),
      findsOneWidget,
    );
  });

  testWidgets('the first sign-in asks the phone before turning the lock on', (
    tester,
  ) async {
    final bio = FakeBiometrics(result: UnlockResult.cancelled);
    final app = TestApp(signedIn: false, biometrics: bio);
    await app.pump(tester);
    await tester.enterText(
      find.byType(TextFormField).at(0),
      FakeOwnerApi.demoEmail,
    );
    await tester.enterText(
      find.byType(TextFormField).at(1),
      FakeOwnerApi.demoPassword,
    );
    await tapOn(tester, find.widgetWithText(FilledButton, 'Sign in'));
    expect(bio.prompts, 1);
    expect(app.container.read(settingsProvider).biometricLock, isFalse);
    expect(app.container.read(sessionProvider), isA<SignedIn>());
  });

  testWidgets('in Arabic, right to left; in Turkish; in dark', (tester) async {
    await _locked(
      tester,
      bio: FakeBiometrics(result: UnlockResult.cancelled),
      language: 'ar',
      brightness: Brightness.dark,
    );
    expect(find.text('فتح القفل ببصمة الإصبع'), findsOneWidget);
    expect(find.text('استخدام رمز الهاتف'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('استخدام رمز الهاتف'))),
      TextDirection.rtl,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('in Turkish', (tester) async {
    await _locked(
      tester,
      bio: FakeBiometrics(result: UnlockResult.cancelled),
      language: 'tr',
    );
    expect(find.text('Parmak izi ile kilidi aç'), findsOneWidget);
    expect(find.text('Telefon PIN kodunu kullan'), findsOneWidget);
  });

  test('the system\'s refusals mean what the lock screen says', () {
    expect(
      LocalBiometrics.resultOf(LocalAuthExceptionCode.userCanceled),
      UnlockResult.cancelled,
    );
    expect(
      LocalBiometrics.resultOf(LocalAuthExceptionCode.temporaryLockout),
      UnlockResult.lockedOut,
    );
    expect(
      LocalBiometrics.resultOf(LocalAuthExceptionCode.biometricLockout),
      UnlockResult.lockedOutUntilPin,
    );
    expect(
      LocalBiometrics.resultOf(LocalAuthExceptionCode.noBiometricsEnrolled),
      UnlockResult.notEnrolled,
    );
    expect(
      LocalBiometrics.resultOf(LocalAuthExceptionCode.noCredentialsSet),
      UnlockResult.noCredentials,
    );
    expect(
      LocalBiometrics.resultOf(LocalAuthExceptionCode.noBiometricHardware),
      UnlockResult.unavailable,
    );
    expect(
      LocalBiometrics.resultOf(LocalAuthExceptionCode.deviceError),
      UnlockResult.failed,
    );
  });

  for (final (lang, dark, kind) in [
    ('en', false, BiometricKind.fingerprint),
    ('en', true, BiometricKind.face),
    ('ar', false, BiometricKind.fingerprint),
    ('ar', true, BiometricKind.fingerprint),
  ]) {
    testWidgets('2x picture: lock, $lang, ${dark ? 'dark' : 'light'}', (
      tester,
    ) async {
      await _locked(
        tester,
        bio: FakeBiometrics(kindOf: kind, result: UnlockResult.cancelled),
        language: lang,
        brightness: dark ? Brightness.dark : Brightness.light,
      );
      await _shot(tester, 'lock-$lang-${dark ? 'dark' : 'light'}');
      expect(tester.takeException(), isNull);
    });
  }
}
