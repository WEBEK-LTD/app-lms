import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/widgets/common.dart';

import '../screenshots/support/shot.dart' show loadAppFonts;

/// 180.23 A section's title of one long word at a larger text size: a little
/// smaller, never broken inside the word ("Kampanyaları/mız").
void main() {
  setUpAll(loadAppFonts);

  Future<RenderParagraph> header(WidgetTester tester, String title) async {
    const ratio = 3.0;
    tester.view
      ..devicePixelRatio = ratio
      ..physicalSize = const Size(360, 800) * ratio;
    tester.platformDispatcher.textScaleFactorTestValue = 1.3;
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(
          primary: const Color(0xFF2E7D4F),
          secondary: const Color(0xFFF2A93B),
          brightness: Brightness.light,
          template: AppTemplate.bold,
          fontFamily: 'Manrope',
        ),
        locale: const Locale('tr'),
        supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        home: Scaffold(
          body: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SectionHeader(
              title: title,
              size: 22,
              weight: FontWeight.w800,
              onSeeAll: () {},
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return tester.renderObject<RenderParagraph>(
      find.descendant(of: find.text(title), matching: find.byType(RichText)),
    );
  }

  testWidgets('one long word: one line', (tester) async {
    final line = await header(tester, 'Kampanyalarımız');
    expect(line.size.height, lessThan(22 * 1.3 * 1.6));
  });

  testWidgets('a title with spaces still wraps', (tester) async {
    final lines = await header(
      tester,
      'Bu hafta öne çıkan kampanyalarımız ve haberlerimiz',
    );
    expect(lines.size.height, greaterThan(22 * 1.3 * 1.6));
  });
}
