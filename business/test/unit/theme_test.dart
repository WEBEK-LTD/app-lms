import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/theme/theme.dart';

/// WCAG's contrast ratio of two colors.
double contrast(Color a, Color b) {
  double luminance(Color c) {
    double channel(double v) =>
        v <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4).toDouble();
    return 0.2126 * channel(c.r) +
        0.7152 * channel(c.g) +
        0.0722 * channel(c.b);
  }

  final x = luminance(a);
  final y = luminance(b);
  return (max(x, y) + 0.05) / (min(x, y) + 0.05);
}

void main() {
  /// 61 Every text pair the screens use, in both themes, at WCAG AA (4.5:1).
  for (final (name, c) in [
    ('light', YbColors.light),
    ('dark', YbColors.dark),
  ]) {
    test('$name: text keeps at least 4.5:1', () {
      final pairs = {
        'ink on background': (c.ink, c.background),
        'ink on surface': (c.ink, c.surface),
        'ink on muted': (c.ink, c.muted),
        'ink2 on background': (c.ink2, c.background),
        'ink2 on surface': (c.ink2, c.surface),
        'onInk on ink': (c.onInk, c.ink),
        'accent text on surface': (c.accentText, c.surface),
        'accent text on background': (c.accentText, c.background),
        'success': (c.success, c.successBg),
        'warning': (c.warning, c.warningBg),
        'danger': (c.danger, c.dangerBg),
        'danger on surface': (c.danger, c.surface),
        'onDanger on danger': (c.onDanger, c.danger),
        'info': (c.info, c.infoBg),
        'ink on warning background': (c.ink, c.warningBg),
        'ink on info background': (c.ink, c.infoBg),
      };
      for (final MapEntry(key: label, value: (fg, bg)) in pairs.entries) {
        expect(contrast(fg, bg), greaterThanOrEqualTo(4.5), reason: label);
      }
    });
  }

  test('the dark theme is Midnight with Ivory text, from the same palette', () {
    final dark = buildTheme(arabic: false, brightness: Brightness.dark);
    expect(dark.brightness, Brightness.dark);
    expect(dark.scaffoldBackgroundColor, Brand.midnight);
    expect(dark.textTheme.bodyMedium!.color, Brand.ivory);
    expect(dark.extension<YbColors>(), YbColors.dark);
    // Primary buttons are the text color with the page color on them.
    final button = dark.filledButtonTheme.style!;
    expect(button.backgroundColor!.resolve({}), Brand.ivory);
    expect(button.foregroundColor!.resolve({}), Brand.midnight);
    final light = buildTheme(arabic: true);
    expect(light.brightness, Brightness.light);
    expect(light.scaffoldBackgroundColor, Brand.ivory);
    expect(light.extension<YbColors>(), YbColors.light);
  });
}
