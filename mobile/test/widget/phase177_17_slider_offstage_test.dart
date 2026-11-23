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

import '../support/market_fixtures.dart';
import '../support/test_app.dart' show testBuild;

/// 177.17 A slider of words that grows with the text size (177) keeps the
/// height it was drawn at while its page is under another, and grows once
/// it is back: resized there (the text size changed with Leqaa's Home under
/// Settings, 181's flings) it left its list's semantics without a place and
/// the frame threw.
void main() {
  testWidgets('177.17 a slider of words under another page: no throw, its '
      'height kept there, grown when it is back', (tester) async {
    tester.view
      ..physicalSize = const Size(360, 640) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final semantics = tester.ensureSemantics();
    // 177's deals slider (shop_deals, in Arabic), with room for its words
    // at the standard text size in the tests' font.
    final slider = {
      ...jsonDecode(_dealsSlider) as Map<String, dynamic>,
      'height': 220,
    };
    final page = StudioPage.tryParse({
      'body': {
        'id': 'b',
        'type': 'column',
        'children': [
          slider,
          for (var i = 0; i < 12; i++)
            {
              'id': 't$i',
              'type': 'text',
              'text': 'سطر $i تحت العروض',
              'padding': {'top': 12, 'bottom': 12},
            },
        ],
      },
    })!;
    final navigator = GlobalKey<NavigatorState>();
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
          navigatorKey: navigator,
          theme: buildAppTheme(
            primary: const Color(0xFF134A36),
            secondary: const Color(0xFFF2B33D),
            brightness: Brightness.light,
            template: AppTemplate.bold,
            fontFamily: 'Plus Jakarta Sans',
          ),
          locale: const Locale('ar'),
          supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          home: Scaffold(
            body: StudioPageView(page: page, pageSlug: 'home'),
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 400));
    final sliders = find.byWidgetPredicate(
      (w) => w.runtimeType.toString() == '_StudioSlider',
      skipOffstage: false,
    );
    double height() => tester.getSize(sliders).height;
    expect(tester.takeException(), isNull, reason: 'first frame');
    expect(sliders, findsOneWidget);
    expect(height(), moreOrLessEquals(220, epsilon: 0.5));

    // Another page over it, then a larger text size.
    navigator.currentState!.push(
      MaterialPageRoute<void>(
        builder: (_) => const Scaffold(body: Center(child: Text('Settings'))),
      ),
    );
    await tester.pumpAndSettle(const Duration(milliseconds: 100));
    tester.platformDispatcher.textScaleFactorTestValue = 1.3;
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(tester.takeException(), isNull);
    expect(height(), moreOrLessEquals(220, epsilon: 0.5));

    // Back on the screen: the slides grow with the text (177).
    navigator.currentState!.pop();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(tester.takeException(), isNull);
    expect(height(), moreOrLessEquals(220 * 1.3, epsilon: 0.5));
    semantics.dispose();
  });
}

const _dealsSlider =
    r'{"id": "g2", "type": "slider", "name": "Free delivery this weekend", "height": 150, "margin": {"top": 8, "end": 12, "bottom": 8, "start": 12}, "autoplay": true, "interval_ms": 4000, "indicator": "progress", "children": [{"id": "g3", "type": "column", "height": "fill", "padding": {"top": 16, "end": 18, "bottom": 16, "start": 18}, "gap": 4, "align": "center", "cross": "center", "color": "#FFFFFF", "gradient": {"from": "#0E0D24", "to": "#0E0D24", "angle": 135}, "radius": 18, "children": [{"id": "g4", "type": "icon", "color": "#FFFFFF", "icon": "local_shipping", "icon_size": 30}, {"id": "g5", "type": "text", "font": {"weight": 800, "size": 19}, "text_align": "center", "text": "توصيل مجاني في عطلة نهاية هذا الأسبوع"}, {"id": "g6", "type": "text", "opacity": 0.9, "font": {"size": 13}, "text_align": "center", "text": "على كل الطلبات، حتى باب بيتك."}]}, {"id": "g7", "type": "column", "height": "fill", "padding": {"top": 16, "end": 18, "bottom": 16, "start": 18}, "gap": 4, "align": "center", "cross": "center", "color": "#FFFFFF", "gradient": {"from": "#C2410C", "to": "#7C2D12", "angle": 135}, "radius": 18, "children": [{"id": "g8", "type": "icon", "color": "#FFFFFF", "icon": "auto_awesome", "icon_size": 30}, {"id": "g9", "type": "text", "font": {"weight": 800, "size": 19}, "text_align": "center", "text": "تصاميم جديدة كل جمعة"}, {"id": "g10", "type": "text", "opacity": 0.9, "font": {"size": 13}, "text_align": "center", "text": "كن أول من يراها في التطبيق."}]}, {"id": "g11", "type": "column", "height": "fill", "padding": {"top": 16, "end": 18, "bottom": 16, "start": 18}, "gap": 4, "align": "center", "cross": "center", "color": "#FFFFFF", "gradient": {"from": "#0369A1", "to": "#15803D", "angle": 135}, "radius": 18, "children": [{"id": "g12", "type": "icon", "color": "#FFFFFF", "icon": "payments", "icon_size": 30}, {"id": "g13", "type": "text", "font": {"weight": 800, "size": 19}, "text_align": "center", "text": "ادفع عند الاستلام"}, {"id": "g14", "type": "text", "opacity": 0.9, "font": {"size": 13}, "text_align": "center", "text": "نقدًا أو بالبطاقة عند وصول طلبك."}]}]}';
