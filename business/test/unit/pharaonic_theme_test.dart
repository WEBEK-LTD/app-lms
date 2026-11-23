import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/theme/pharaonic.dart';
import 'package:yallapp_business/core/theme/theme.dart';
import 'package:yallapp_business/features/today/new_order_card_pharaonic.dart';

import 'theme_test.dart' show contrast;

void main() {
  /// 215 The Pharaonic palettes: every text pair the screens use, light and
  /// dark, at WCAG AA (4.5:1), and the primary button's text on every stop
  /// of its gradient.
  for (final (name, c, o) in [
    ('light', PharaonicColors.light, YbOrnaments.lightSet),
    ('dark', PharaonicColors.dark, YbOrnaments.darkSet),
  ]) {
    test('pharaonic $name: text keeps at least 4.5:1', () {
      final pairs = {
        'ink on background': (c.ink, c.background),
        'ink on surface': (c.ink, c.surface),
        'ink on muted': (c.ink, c.muted),
        'ink2 on background': (c.ink2, c.background),
        'ink2 on surface': (c.ink2, c.surface),
        'ink2 on muted': (c.ink2, c.muted),
        'onInk on ink': (c.onInk, c.ink),
        'gold on background': (c.gold, c.background),
        'gold on surface': (c.gold, c.surface),
        'faience (accent text) on surface': (c.accentText, c.surface),
        'faience (accent text) on background': (c.accentText, c.background),
        'success': (c.success, c.successBg),
        'warning': (c.warning, c.warningBg),
        'danger': (c.danger, c.dangerBg),
        'danger on surface': (c.danger, c.surface),
        'onDanger on danger': (c.onDanger, c.danger),
        'info': (c.info, c.infoBg),
        'onHead on head': (c.onHead, c.head),
        'onHead2 on head': (c.onHead2, c.head),
      };
      for (final MapEntry(key: label, value: (fg, bg)) in pairs.entries) {
        expect(contrast(fg, bg), greaterThanOrEqualTo(4.5), reason: label);
      }
      // The shared New order card in this theme.
      final card = pharaonicNewOrderCard(c, o);
      for (final MapEntry(key: label, value: (fg, bg)) in {
        'card: number': (card.number, card.background),
        'card: ink': (card.ink, card.background),
        'card: ink2': (card.ink2, card.background),
        // The badge's tint is translucent: as drawn, over the card.
        'card: badge': (
          card.badgeInk,
          Color.alphaBlend(card.badgeBackground, card.background),
        ),
        'card: accept': (card.acceptInk, card.acceptBackground),
        'card: reject': (card.reject, card.background),
        'card: chip': (card.ink, card.chipBackground),
      }.entries) {
        expect(contrast(fg, bg), greaterThanOrEqualTo(4.5), reason: label);
      }
      for (final stop in o.buttonFill) {
        expect(
          contrast(o.buttonInk, stop),
          greaterThanOrEqualTo(4.5),
          reason: 'button text on $stop',
        );
      }
    });
  }

  test('the light palette stays AA on the darkest washed papyrus', () {
    // The papyrus tile's darkest pixel (201, 180, 135) under the theme's
    // wash, as the ground paints it.
    const darkest = Color(0xFFC9B487);
    final washed = Color.alphaBlend(YbOrnaments.lightSet.papyrusWash, darkest);
    const c = PharaonicColors.light;
    for (final (label, fg) in [
      ('ink', c.ink),
      ('ink2', c.ink2),
      ('gold', c.gold),
      ('faience', c.accentText),
      ('danger', c.danger),
      ('success', c.success),
    ]) {
      expect(contrast(fg, washed), greaterThanOrEqualTo(4.5), reason: label);
    }
  });

  test('the default theme has no ornaments and is the one it was', () {
    for (final b in Brightness.values) {
      final standard = buildTheme(arabic: false, brightness: b);
      expect(standard.extension<YbOrnaments>(), isNull);
      expect(
        standard.extension<YbColors>(),
        b == Brightness.dark ? YbColors.dark : YbColors.light,
      );
      final pharaonic = buildTheme(
        arabic: true,
        brightness: b,
        appTheme: AppTheme.pharaonic,
      );
      expect(pharaonic.extension<YbOrnaments>(), YbOrnaments.of(b));
      expect(pharaonic.extension<YbColors>(), PharaonicColors.of(b));
      // Headings in El Messiri; big numbers stay in the text font.
      expect(pharaonic.textTheme.titleMedium!.fontFamily, 'El Messiri');
      expect(pharaonic.textTheme.titleLarge!.fontFamily, arabicFont);
      expect(
        pharaonic.textTheme.bodyMedium!.fontFeatures,
        contains(const FontFeature.tabularFigures()),
      );
    }
  });

  test('AppTheme reads its stored name, else the default', () {
    expect(AppTheme.parse('pharaonic'), AppTheme.pharaonic);
    expect(AppTheme.parse(null), AppTheme.standard);
    expect(AppTheme.parse('nonsense'), AppTheme.standard);
  });
}
