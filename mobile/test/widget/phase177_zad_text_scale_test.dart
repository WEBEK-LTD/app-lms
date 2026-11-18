import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/app_environment.dart';
import 'package:yallapp/core/providers.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/modules/shared/pages/studio_page.dart';

import '../support/market_fixtures.dart';
import '../support/test_app.dart' show testBuild;

/// 177 Zad's look A home at a larger text size (docs/qa/2026-11-18-market-
/// store): the offer posters' big number ("15%", 72 points, one line) was
/// cut to "1…" at 1.3 on a 360-wide phone. One word on one line at a
/// display size shrinks to its room instead.
void main() {
  final project = jsonDecode(
    File('test/support/signatures/multi-vendor_a.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  final home = ((project['layout'] as Map)['pages'] as List)
      .cast<Map>()
      .firstWhere((p) => p['slug'] == 'home');

  for (final (lang, scale) in [('en', 1.3), ('ar', 1.3), ('en', 1.5)]) {
    testWidgets('$lang at $scale: the posters\' numbers are whole', (
      tester,
    ) async {
      tester.view
        ..physicalSize = const Size(360, 2400) * 2
        ..devicePixelRatio = 2;
      tester.platformDispatcher.textScaleFactorTestValue = scale;
      addTearDown(tester.view.reset);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      // The offers' slider, as the template makes it, alone on a page.
      Map? slider;
      void walk(Object? n) {
        if (n is Map) {
          if (n['type'] == 'slider' && slider == null) slider = n;
          n.values.forEach(walk);
        } else if (n is List) {
          n.forEach(walk);
        }
      }

      walk(home['studio']);
      final studio = (home['studio'] as Map).cast<String, dynamic>();
      final page = StudioPage.tryParse({
        ...studio,
        'body': {
          'id': 'body',
          'type': 'column',
          'children': [slider],
        },
      })!;
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            ...marketSampleOverrides,
            appEnvironmentProvider.overrideWithValue(
              AppEnvironment(
                build: testBuild.copyWith(appType: AppType.food),
                platform: DevicePlatform.android,
                appVersion: '1.0.0',
                deviceId: 'device-1',
                deviceName: 'Test phone',
              ),
            ),
          ],
          child: MaterialApp(
            theme: buildAppTheme(
              primary: const Color(0xFF134A36),
              secondary: const Color(0xFFF2B33D),
              brightness: Brightness.light,
              template: AppTemplate.bold,
              fontFamily: 'Plus Jakarta Sans',
            ),
            locale: Locale(lang),
            supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            home: Scaffold(
              body: StudioPageView(page: page, pageSlug: 'home'),
            ),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 400));
      final big = tester
          .renderObjectList<RenderParagraph>(find.byType(RichText))
          .where(
            (r) =>
                RegExp(r'^[%٪]?\d+[%٪]?$')
                    .hasMatch(r.text.toPlainText().trim()),
          )
          .toList();
      expect(big, isNotEmpty);
      for (final r in big) {
        expect(
          r.didExceedMaxLines,
          isFalse,
          reason: '"${r.text.toPlainText()}" is cut',
        );
      }
      tester.takeException();
    });
  }
}
