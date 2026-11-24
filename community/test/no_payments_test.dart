import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// The brief's hard rule: no prices, no buy buttons and no payment links in
/// the mobile app, ever. And every tutorial is free (the owner, 24 November
/// 2026): nothing is locked or unlocked.
void main() {
  // Words and marks a price, a buy button or a payment link would carry, in
  // the app's three languages.
  final banned = RegExp(
    [
      r'[$€£₺]\s?\d', r'\d\s?(?:[$€£₺]|usd|eur|try|tl)\b', // a price
      r'\bprices?\b',
      r'\bpricing\b',
      r'\bbuy\b',
      r'\bpurchase',
      r'\bcheckout\b',
      r'\bsubscribe\b', r'\bsubscription', r'\bpay(?:ment|wall|pal)?\b',
      r'\bbilling\b', r'\bcart\b', r'\bupgrade\b',
      // Every tutorial is free: nothing is unlocked (the owner, 24 November
      // 2026).
      r'\bunlock',
      r'fiyat', r'satın al', r'ödeme', r'abonelik', r'sepet', // Turkish
      r'سعر',
      r'أسعار',
      r'اشتر',
      r'شراء',
      r'الدفع',
      r'اشتراك',
      r'السلة', // Arabic
      r'/(?:pricing|checkout|billing|pay|cart|subscribe)\b', // a payment link
    ].join('|'),
    caseSensitive: false,
  );

  /// The string literals of a Dart file, its comments left out (they may
  /// explain this very rule).
  Iterable<String> literals(String source) sync* {
    final code = source.replaceAll(RegExp(r'//[^\n]*'), '');
    for (final m in RegExp(
      r"'((?:[^'\\\n]|\\.)*)'|"
      r'"((?:[^"\\\n]|\\.)*)"',
    ).allMatches(code)) {
      yield m.group(1) ?? m.group(2)!;
    }
  }

  test('no app string shows a price, a buy button or a payment link', () {
    final hits = <String>[];
    final dart = Directory('lib')
        .listSync(recursive: true)
        .whereType<File>()
        .where(
          (f) =>
              f.path.endsWith('.dart') &&
              !f.path.contains('/l10n/app_localizations'),
        );
    for (final f in dart) {
      for (final s in literals(f.readAsStringSync())) {
        if (s.startsWith('package:') ||
            s.startsWith('../') ||
            s.endsWith('.dart')) {
          continue;
        }
        if (banned.hasMatch(s)) hits.add('${f.path}: $s');
      }
    }
    for (final f in Directory(
      'lib/l10n',
    ).listSync().whereType<File>().where((f) => f.path.endsWith('.arb'))) {
      final arb = jsonDecode(f.readAsStringSync()) as Map<String, dynamic>;
      arb.forEach((key, value) {
        if (key.startsWith('@')) return;
        if (banned.hasMatch('$value')) hits.add('${f.path}: $key = $value');
      });
    }
    expect(
      hits,
      isEmpty,
      reason: 'No prices, buy buttons or payment links in the app.',
    );
  });

  test('the guard catches what it guards against', () {
    for (final s in [
      'Buy now',
      r'$9.99',
      '49 TL',
      'See pricing',
      'Satın al',
      'اشترِ الآن',
      'https://yallapp.com.tr/checkout',
    ]) {
      expect(banned.hasMatch(s), isTrue, reason: s);
    }
    for (final s in ['Showcase your app', 'Start tutorial']) {
      expect(banned.hasMatch(s), isFalse, reason: s);
    }
  });

  test('no payment or in-app purchase package, and no billing permission', () {
    final pubspec = File('pubspec.yaml').readAsStringSync();
    expect(
      RegExp(
        r'in_app_purchase|purchases_flutter|stripe|iyzico|paytr|pay:|billing|revenuecat|qonversion|adapty',
        caseSensitive: false,
      ).hasMatch(pubspec),
      isFalse,
    );
    final manifest = File('android/app/src/main/AndroidManifest.xml')
        .readAsStringSync();
    expect(manifest.contains('com.android.vending.BILLING'), isFalse);
    final plist = File('ios/Runner/Info.plist').readAsStringSync();
    expect(plist.toLowerCase().contains('storekit'), isFalse);
  });
}
