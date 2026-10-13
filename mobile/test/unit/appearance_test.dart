import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/core/theme/app_look.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/theme/palette.dart';

import '../support/fixtures.dart';
import '../support/test_app.dart';

AppLook lookFor(Map<String, dynamic>? appearance) => AppLook.resolve(
  testBuild,
  AppConfig.fromJson(configJson(appearance: appearance)),
);

void main() {
  group('Config.appearance', () {
    test('parses every field', () {
      final a = AppConfig.fromJson(configJson(appearance: appearanceJson()))
          .appearance!;
      expect(a.template, AppTemplate.bold);
      expect(a.themeMode, AppearanceMode.dark);
      expect(a.userCanChangeMode, isTrue);
      expect(a.secondaryColor, '#1F8A70');
      expect(a.font, 'Lexend');
      expect(a.corners, CornerStyle.round);
      expect(a.cards, CardStyle.outlined);
    });

    test('is optional, and unknown values are dropped', () {
      expect(AppConfig.fromJson(configJson()).appearance, isNull);
      final a = Appearance.fromJson({
        'template': 'glass',
        'theme_mode': 'sepia',
        'corners': 'blob',
        'cards': 'neon',
      });
      expect(a.template, isNull);
      expect(a.themeMode, isNull);
      expect(a.corners, isNull);
      expect(a.cards, isNull);
      expect(a.userCanChangeMode, isTrue);
    });
  });

  group('AppLook', () {
    test('without appearance keeps the build look', () {
      final look = lookFor(null);
      expect(look.template, AppTemplate.classic);
      expect(look.font, 'Bricolage Grotesque');
      expect(look.primary, const Color(0xFF0E0D24));
      expect(look.secondary, isNull);
      expect(look.corners, isNull);
      expect(look.cards, isNull);
      expect(look.defaultThemeMode, ThemeMode.system);
    });

    test('appearance overrides template, font and colors', () {
      final look = lookFor(appearanceJson());
      expect(look.template, AppTemplate.bold);
      expect(look.font, 'Lexend');
      expect(look.secondary, const Color(0xFF1F8A70));
      expect(look.corners, CornerStyle.round);
      expect(look.cards, CardStyle.outlined);
    });

    test('a font that is not bundled falls back to the build font', () {
      final look = lookFor(appearanceJson(font: 'Comic Sans'));
      expect(look.font, 'Bricolage Grotesque');
    });

    test('the student choice wins only when the client allows it', () {
      const unset = LocalSettings();
      const chosen = LocalSettings(
        themeMode: ThemeMode.light,
        themeModeChosen: true,
      );
      final open = lookFor(appearanceJson(themeMode: 'dark'));
      expect(open.themeModeFor(unset), ThemeMode.dark);
      expect(open.themeModeFor(chosen), ThemeMode.light);

      final locked = lookFor(
        appearanceJson(themeMode: 'dark', userCanChangeMode: false),
      );
      expect(locked.themeModeFor(chosen), ThemeMode.dark);
    });
  });

  group('Shapes', () {
    test('corner styles scale the designed radii', () {
      final soft = AppShapes.forTemplate(AppTemplate.classic);
      expect(soft.card, 16);
      expect(soft.r(22), 22);

      final sharp = AppShapes.forTemplate(
        AppTemplate.classic,
        corners: CornerStyle.sharp,
      );
      expect(sharp.card, 4);
      expect(sharp.r(2), 2);

      final round = AppShapes.forTemplate(
        AppTemplate.classic,
        corners: CornerStyle.round,
      );
      expect(round.button, 28);
      expect(round.r(20), 28);
    });
  });

  group('Palette', () {
    test('secondary color replaces Ember and stays readable', () {
      for (final brightness in Brightness.values) {
        final p = AppPalette.build(
          primary: const Color(0xFF0E0D24),
          secondary: const Color(0xFFFFD54F),
          brightness: brightness,
        );
        expect(p.accent, const Color(0xFFFFD54F));
        expect(
          contrastRatio(p.link, p.background),
          greaterThanOrEqualTo(4.5),
          reason: brightness.name,
        );
      }
    });

    test('without a secondary color the accent is Ember', () {
      final p = AppPalette.build(
        primary: const Color(0xFF0E0D24),
        brightness: Brightness.light,
      );
      expect(p.accent, BrandColors.ember);
      expect(p.link, BrandColors.emberText);
    });
  });
}
