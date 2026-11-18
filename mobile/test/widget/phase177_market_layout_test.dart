import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/app_environment.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/providers.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/modules/shared/pages/studio_page.dart';

import '../screenshots/support/shot.dart' show loadAppFonts;
import '../support/market_fixtures.dart';
import '../support/test_app.dart' show testBuild;

/// 177 What the template guard (166) found in the marketplace's and the
/// store's templates, checked here too: "Order again" ran 12 points past
/// its cards at text 1.3, a slider's Arabic words 22 points past it, and the
/// kinds' and offers' pictures, cut by their tile's edge, took taps (now
/// decoration: the tile is the tap).
void main() {
  // The app's own fonts, as on a phone (the test font is wider).
  setUpAll(loadAppFonts);

  Future<void> draw(
    WidgetTester tester,
    Map<String, dynamic> body, {
    String lang = 'ar',
    double scale = 1.3,
  }) async {
    tester.view
      ..physicalSize = const Size(360, 2400) * 2
      ..devicePixelRatio = 2;
    tester.platformDispatcher.textScaleFactorTestValue = scale;
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final page = StudioPage.tryParse({'body': body})!;
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
  }

  Map<String, dynamic> market(String id, Map<String, dynamic> m) => {
    'id': id,
    'type': 'market',
    'title': 'Section',
    'market': m,
  };

  for (final (lang, scale) in [('ar', 1.3), ('en', 1.3), ('ar', 1.0)]) {
    testWidgets('$lang at $scale: Order again, the kinds and the offers fit', (
      tester,
    ) async {
      await draw(
        tester,
        {
          'id': 'b',
          'type': 'column',
          'children': [
            market('k', {'section': 'kinds'}),
            market('o', {'section': 'offers', 'style': 'spotlight'}),
            market('r', {'section': 'reorder'}),
          ],
        },
        lang: lang,
        scale: scale,
      );
      expect(tester.takeException(), isNull);
      // The pictures cut by their tile's edge are decoration.
      final rotated = find.byWidgetPredicate(
        (w) => w is Transform && w.child is! Transform,
      );
      for (final e in rotated.evaluate()) {
        final positioned = e.findAncestorWidgetOfExactType<Positioned>();
        if (positioned == null) continue;
        expect(
          find.ancestor(
            of: find.byWidget(e.widget),
            matching: find.byType(IgnorePointer),
          ),
          findsWidgets,
        );
      }
    });
  }

  // The store template's deals slider (shop_deals) as the hosted API serves
  // it in Arabic.
  testWidgets('ar at 1.3: a slider of words grows with the text', (
    tester,
  ) async {
    final slider = jsonDecode(_dealsSlider) as Map<String, dynamic>;
    await draw(tester, {
      'id': 'b',
      'type': 'column',
      'children': [slider],
    });
    expect(tester.takeException(), isNull);
  });
}

const _dealsSlider =
    r'{"id": "g2", "type": "slider", "name": "Free delivery this weekend", "height": 150, "margin": {"top": 8, "end": 12, "bottom": 8, "start": 12}, "autoplay": true, "interval_ms": 4000, "indicator": "progress", "children": [{"id": "g3", "type": "column", "height": "fill", "padding": {"top": 16, "end": 18, "bottom": 16, "start": 18}, "gap": 4, "align": "center", "cross": "center", "color": "#FFFFFF", "gradient": {"from": "#0E0D24", "to": "#0E0D24", "angle": 135}, "radius": 18, "children": [{"id": "g4", "type": "icon", "color": "#FFFFFF", "icon": "local_shipping", "icon_size": 30}, {"id": "g5", "type": "text", "font": {"weight": 800, "size": 19}, "text_align": "center", "text": "توصيل مجاني في عطلة نهاية هذا الأسبوع"}, {"id": "g6", "type": "text", "opacity": 0.9, "font": {"size": 13}, "text_align": "center", "text": "على كل الطلبات، حتى باب بيتك."}]}, {"id": "g7", "type": "column", "height": "fill", "padding": {"top": 16, "end": 18, "bottom": 16, "start": 18}, "gap": 4, "align": "center", "cross": "center", "color": "#FFFFFF", "gradient": {"from": "#C2410C", "to": "#7C2D12", "angle": 135}, "radius": 18, "children": [{"id": "g8", "type": "icon", "color": "#FFFFFF", "icon": "auto_awesome", "icon_size": 30}, {"id": "g9", "type": "text", "font": {"weight": 800, "size": 19}, "text_align": "center", "text": "تصاميم جديدة كل جمعة"}, {"id": "g10", "type": "text", "opacity": 0.9, "font": {"size": 13}, "text_align": "center", "text": "كن أول من يراها في التطبيق."}]}, {"id": "g11", "type": "column", "height": "fill", "padding": {"top": 16, "end": 18, "bottom": 16, "start": 18}, "gap": 4, "align": "center", "cross": "center", "color": "#FFFFFF", "gradient": {"from": "#0369A1", "to": "#15803D", "angle": 135}, "radius": 18, "children": [{"id": "g12", "type": "icon", "color": "#FFFFFF", "icon": "payments", "icon_size": 30}, {"id": "g13", "type": "text", "font": {"weight": 800, "size": 19}, "text_align": "center", "text": "ادفع عند الاستلام"}, {"id": "g14", "type": "text", "opacity": 0.9, "font": {"size": 13}, "text_align": "center", "text": "نقدًا أو بالبطاقة عند وصول طلبك."}]}]}';
