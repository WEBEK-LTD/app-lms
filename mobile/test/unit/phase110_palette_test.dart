import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/theme/palette.dart';

/// 110 The brand colour in dark mode: kept when it stands out on the dark
/// background and cards (3:1), else a lighter shade of it, never cream.
void main() {
  AppPalette dark(Color primary) =>
      AppPalette.build(primary: primary, brightness: Brightness.dark);

  test('a bright enough brand colour stays as it is', () {
    for (final color in [
      const Color(0xFFB5552A), // the restaurant's orange
      const Color(0xFFD2552B),
      const Color(0xFF14857A),
      const Color(0xFFE8795C),
    ]) {
      expect(contrastRatio(color, darkSurface), greaterThanOrEqualTo(3));
      expect(dark(color).primary, color);
    }
  });

  test('a dark brand colour becomes a lighter shade of itself', () {
    for (final color in [
      BrandColors.midnight,
      const Color(0xFF1E4D3F),
      const Color(0xFF123A5C),
      const Color(0xFF7A2E1C),
      const Color(0xFF2F6B3A),
    ]) {
      final shown = dark(color).primary;
      expect(shown, isNot(color));
      expect(shown, isNot(BrandColors.ivory));
      expect(contrastRatio(shown, darkSurface), greaterThanOrEqualTo(3));
      expect(contrastRatio(shown, darkBackground), greaterThanOrEqualTo(3));
      // The same hue, lighter.
      final a = HSLColor.fromColor(color);
      final b = HSLColor.fromColor(shown);
      expect((a.hue - b.hue).abs(), lessThan(2));
      expect(b.lightness, greaterThan(a.lightness));
      // Text on it still reads.
      expect(
        contrastRatio(dark(color).onPrimary, shown),
        greaterThanOrEqualTo(4.5),
      );
    }
  });

  test('light mode keeps the brand colour', () {
    final light = AppPalette.build(
      primary: BrandColors.midnight,
      brightness: Brightness.light,
    );
    expect(light.primary, BrandColors.midnight);
  });
}
