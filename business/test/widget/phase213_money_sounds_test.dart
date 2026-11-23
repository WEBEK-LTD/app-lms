import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/providers.dart';
import 'package:yallapp_business/core/routing/paths.dart';
import 'package:yallapp_business/core/services/ringtones.dart';
import 'package:yallapp_business/features/more/ringtones_screen.dart';
import 'package:yallapp_business/l10n/app_localizations.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 213 The money sounds: seven more order sounds (a cash register, coins,
/// the till, a sale made) beside the 17 of 1.0.4, bundled for the app,
/// Android and iOS, named in every language, in their own section of the
/// picker, and sent to the server like the others.
void main() {
  const money = [
    'cha_ching',
    'coin_drop',
    'till_bell',
    'coin_chime',
    'sale_jingle',
    'piggy_bank',
    'receipt_printer',
  ];

  test('the 17 of 1.0.4 stay, the seven join them, each bundled', () {
    expect(ringtoneIds, hasLength(24));
    expect(ringtoneIds.take(17).last, 'knock');
    expect(moneyRingtoneIds, money);
    for (final id in money) {
      expect(ringtoneIds, contains(id));
      expect(File('assets/sounds/ring_$id.m4a').existsSync(), isTrue);
      expect(
        File('android/app/src/main/res/raw/yb_ring_$id.ogg').existsSync(),
        isTrue,
      );
      expect(File('ios/Runner/Sounds/yb_ring_$id.caf').existsSync(), isTrue);
      expect(
        File('ios/Runner/Sounds/yb_ring_${id}_long.caf').existsSync(),
        isTrue,
      );
    }
    // Android shows them on their own channels, iOS plays them from the bundle.
    final kotlin = File(
      'android/app/src/main/kotlin/tr/com/yallapp/business/Ringing.kt',
    ).readAsStringSync();
    final xcode = File('ios/Runner.xcodeproj/project.pbxproj')
        .readAsStringSync();
    for (final id in ringtoneIds) {
      expect(kotlin, contains('"$id"'), reason: id);
      expect(xcode, contains('yb_ring_$id.caf in Resources'), reason: id);
      expect(
        xcode,
        contains('yb_ring_${id}_long.caf in Resources'),
        reason: id,
      );
    }
  });

  test('every sound has its own name in English, Arabic and Turkish', () {
    for (final locale in const [Locale('en'), Locale('ar'), Locale('tr')]) {
      final l10n = lookupAppLocalizations(locale);
      final names = {for (final id in ringtoneIds) soundName(l10n, id)};
      expect(names, hasLength(ringtoneIds.length), reason: '$locale');
      expect(names, isNot(contains(l10n.soundDefault)), reason: '$locale');
    }
    final en = lookupAppLocalizations(const Locale('en'));
    expect(
      [for (final id in money) soundName(en, id)],
      [
        'Cha-ching',
        'Coins dropping',
        'Till and bell',
        'Coin chime',
        'Sale made',
        'Piggy bank',
        'Receipt printer',
      ],
    );
  });

  testWidgets('the picker has them under Money and sales; one is chosen', (
    tester,
  ) async {
    final app = TestApp(push: FakePush());
    await app.pump(tester);
    await push(tester, app, Paths.ringtones);
    await tester.tap(find.byKey(const ValueKey('ring-group-orders')));
    await settle(tester);
    final section = find.text('Money and sales');
    await tester.scrollUntilVisible(
      section,
      300,
      scrollable: find.byType(Scrollable).last,
    );
    expect(section, findsOneWidget);
    final chaChing = find.byKey(const ValueKey('ringtone-cha_ching'));
    await tester.scrollUntilVisible(
      chaChing,
      200,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(find.byKey(const ValueKey('ringtone-play-cha_ching')));
    await settle(tester);
    expect(app.ringer.played.last, 'cha_ching');
    await tester.tap(chaChing);
    await settle(tester);
    expect(
      app.container.read(ringSettingsProvider).soundOf(SoundGroup.orders),
      'cha_ching',
    );
    expect(app.api.pushSounds!['sounds']['orders'], 'cha_ching');
    // A new order rings with it while the app is open.
    expect(
      RingSettings.fromJson(app.api.pushSounds!).soundOf(SoundGroup.orders),
      'cha_ching',
    );
  });
}
