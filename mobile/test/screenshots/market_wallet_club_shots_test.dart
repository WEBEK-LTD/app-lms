/// 115.60–115.62 Pictures of the wallet (07a) and the delivery club (07b)
/// as the app draws them on Zad's demo, in English and Arabic, light and
/// dark, at the approved designs' 390 × 844 and twice the pixels, for the
/// QA folder next to the designs. Skipped unless run with a folder:
///
///   flutter test test/screenshots/market_wallet_club_shots_test.dart \
///     --dart-define=YALLAPP_SHOTS_OUT=../docs/qa/2026-11-18-market-wallet
@Tags(['screenshots'])
library;

import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import 'support/demo_api.dart';
import 'support/screens.dart';
import 'support/studio_demo.dart';
import 'support/zad.dart';

const _out = String.fromEnvironment('YALLAPP_SHOTS_OUT');

Map<String, dynamic> _egp(String a) => {'amount': a, 'formatted': 'EGP $a'};

/// Zad's demo with the wallet and a club member, as the designs show them.
DemoApi _zadWalletClub() {
  final api = zadStudioApi();
  final market = Map<String, dynamic>.from(api.config['market'] as Map)
    ..['club'] = true
    ..['wallet'] = true
    ..['payment'] = {'cash': true, 'card': true, 'wallet': true};
  api.config = {...api.config, 'market': market};
  final now = DateTime.now().toUtc();
  final today = DateTime.utc(now.year, now.month, now.day, 18, 41);
  Map<String, dynamic> plan(int id, String period, String price) => {
    'id': id,
    'name': period == 'year' ? 'Yearly' : 'Monthly',
    'period': period,
    'price': _egp(price),
    'benefits': ['Free delivery on orders over EGP 150.00'],
    'free_delivery_over': _egp('150.00'),
    'delivery_percent_off': null,
    'perks': [],
  };
  api.marketWallet = {
    'balance': _egp('203.25'),
    'entries': [
      {
        'id': 4,
        'kind': 'refund',
        'amount': _egp('153.25'),
        'label': 'Refund',
        'order_id': 4821,
        'order_reference': 'M-4821',
        'vendor_name': 'Zad Market',
        'complaint_reference': 'C-1093',
        'rest_paid_by': null,
        'at': today.toIso8601String(),
      },
      {
        'id': 3,
        'kind': 'payment',
        'amount': _egp('-120.00'),
        'label': 'Order',
        'order_id': 4790,
        'order_reference': 'M-4790',
        'vendor_name': 'Bab El Sharq Grill',
        'complaint_reference': null,
        'rest_paid_by': 'card',
        'at': '2026-11-14T12:00:00Z',
      },
      {
        'id': 2,
        'kind': 'credit',
        'amount': _egp('50.00'),
        'label': 'Welcome to Zad Club',
        'order_id': null,
        'order_reference': null,
        'vendor_name': null,
        'complaint_reference': null,
        'rest_paid_by': null,
        'at': '2026-11-02T12:00:00Z',
      },
      {
        'id': 1,
        'kind': 'refund',
        'amount': _egp('120.00'),
        'label': 'Order cancelled',
        'order_id': 4655,
        'order_reference': 'M-4655',
        'vendor_name': 'Nile Pizza Co.',
        'complaint_reference': null,
        'rest_paid_by': null,
        'at': '2026-10-28T12:00:00Z',
      },
    ],
    'page': 1,
    'total_pages': 1,
  };
  api.marketClub = {
    'name': 'Club',
    'description': null,
    'plans': [plan(1, 'month', '49.00'), plan(2, 'year', '490.00')],
  };
  final end = DateTime.utc(2026, 12, 2, 10);
  api.myClub = {
    'plan': {
      ...plan(1, 'month', '49.00'),
      'perks': ["Members' offers first"],
    },
    'status': 'active',
    'renews': true,
    'current_period_end': end.toIso8601String(),
    'saved': _egp('512.00'),
    'started_at': '2026-09-02T10:00:00Z',
    'remind_at': end.subtract(const Duration(days: 2)).toIso8601String(),
    'savings': {
      'total': _egp('512.00'),
      'this_month': _egp('186.00'),
      'delivery': _egp('400.00'),
      'offers': _egp('112.00'),
      'free_deliveries': 16,
      'deliveries': 19,
      'paid': _egp('147.00'),
    },
  };
  // The plans' cards show the members' offers perk too.
  (api.marketClub!['plans'] as List).first['perks'] = ["Members' offers first"];
  return api;
}

void main() {
  final enabled = _out.isNotEmpty;

  setUpAll(() async {
    if (enabled) await loadAppFonts();
  });

  for (final (screen, location) in [
    ('07a-wallet', '/market-wallet'),
    ('07b-club', '/market-club'),
  ]) {
    for (final language in ['en', 'ar']) {
      for (final dark in [false, true]) {
        final name = '$screen-$language-${dark ? 'dark' : 'light'}';
        testWidgets(name, skip: !enabled, (tester) async {
          debugDisableShadows = false;
          final shot = Shot(
            name,
            api: () => _zadWalletClub(),
            appName: 'Zad',
            appType: AppType.food,
            template: AppTemplate.bold,
            overrides: Zad.overrides,
            designPictures: true,
            prepare: StudioDemo.zad.prepare,
            language: language,
            dark: dark,
            size: const Size(390, 844),
            // Not awaited: a push completes when its page closes.
            after: (tester, router) async {
              router.push<void>(location);
            },
          );
          await shot.render(tester);
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(shotKey),
          );
          await tester.runAsync(() async {
            final image = await boundary.toImage(pixelRatio: 2);
            final data = await image.toByteData(format: ui.ImageByteFormat.png);
            image.dispose();
            Directory(_out).createSync(recursive: true);
            File('$_out/$name.png')
                .writeAsBytesSync(Uint8List.view(data!.buffer));
          });
          debugDisableShadows = true;
        });
      }
    }
  }
}
