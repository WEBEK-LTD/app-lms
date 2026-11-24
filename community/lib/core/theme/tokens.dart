import 'package:flutter/material.dart';

/// The approved design's colours (design/common.css and design/mobile.html
/// on wip-community-design), by name. Everything the app draws takes its
/// colours from here or from [CommunityPalette], never from a literal.
abstract final class Brand {
  static const orange = Color(0xFFFF5A1F);
  static const orange2 = Color(0xFFFF8A3D);
  static const amber = Color(0xFFFFB23D);
  static const ember = Color(0xFFE8410E);
  static const peach = Color(0xFFFFA06E);
  static const navy = Color(0xFF0E0D24);
  static const navy2 = Color(0xFF17163A);
  static const indigo = Color(0xFF1A1846);
  static const indigoDeep = Color(0xFF1E1C4E);
  static const cream = Color(0xFFF4EFE6);
  static const paper = Color(0xFFFBF8F3);
  static const screen = Color(0xFFF7F3EC);
  static const night = Color(0xFF0B0A1F);
  static const ink = Color(0xFF141327);
  static const muted = Color(0xFF6E6B80);
  static const line = Color(0xFFECE6DC);
  static const green = Color(0xFF18A56B);
  static const mint = Color(0xFF5BE7AE);
  static const violet = Color(0xFF6B5BFF);
  static const lilac = Color(0xFF7C6BFF);
  static const sky = Color(0xFF7CC4FF);
  static const gold = Color(0xFFFFD27A);

  /// The orange gradient of the primary button, the active tab by night and
  /// the menu's current section (135°: amber to orange).
  static const sunrise = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [amber, orange],
  );

  /// The welcome screen's "Sign up with email" (amber, then orange from 60%).
  static const signUp = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [amber, orange],
    stops: [0, .6],
  );

  /// The create button's ring of oranges.
  static const createRing = SweepGradient(
    startAngle: 210 * 3.14159265 / 180,
    endAngle: 210 * 3.14159265 / 180 + 2 * 3.14159265,
    colors: [amber, orange, ember, Color(0xFFFF7A3D), amber],
    transform: GradientRotation(-3.14159265 / 2),
  );

  /// The member's own avatar ring and a story's ring.
  static const meRing = SweepGradient(
    colors: [orange, amber, lilac, orange],
    transform: GradientRotation(-3.14159265 / 2),
  );
  static const storyRing = SweepGradient(
    colors: [orange, amber, lilac, orange],
    transform: GradientRotation(200 * 3.14159265 / 180 - 3.14159265 / 2),
  );

  /// The active tab by day: deep indigo to navy.
  static const tabOnDay = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [indigoDeep, navy],
  );

  /// The six avatar gradients (`.a1`–`.a6`), chosen by a member's id.
  static const avatars = [
    [Color(0xFFFF8A3D), Color(0xFFFF5A1F)],
    [Color(0xFF7C6BFF), Color(0xFF4B3BE0)],
    [Color(0xFF1FC08A), Color(0xFF0E8F63)],
    [Color(0xFFF2B544), Color(0xFFE08A12)],
    [Color(0xFFFF6E9A), Color(0xFFE23F72)],
    [Color(0xFF3FA9F5), Color(0xFF1F6FD1)],
  ];
}

/// The colours that change between light and dark (the design's Home by day,
/// its question by night).
@immutable
class CommunityPalette extends ThemeExtension<CommunityPalette> {
  const CommunityPalette({
    required this.dark,
    required this.screen,
    required this.card,
    required this.ink,
    required this.muted,
    required this.soft,
    required this.line,
    required this.iconButton,
    required this.iconButtonBorder,
    required this.iconButtonShadow,
    required this.iconButtonInk,
    required this.tabBar,
    required this.tabIcon,
    required this.tabOn,
    required this.tabOnIcon,
    required this.tabShadow,
    required this.tabRim,
    required this.cardShadow,
  });

  final bool dark;
  final Color screen;
  final Color card;
  final Color ink;
  final Color muted;

  /// Body text on a card by night (#DAD6EA), the ink by day.
  final Color soft;
  final Color line;

  /// The header's glass buttons.
  final Color iconButton;
  final Color iconButtonBorder;
  final Color iconButtonShadow;
  final Color iconButtonInk;

  /// The floating tab bar.
  final Color tabBar;
  final Color tabIcon;
  final Gradient tabOn;
  final Color tabOnIcon;
  final Color tabShadow;
  final Color tabRim;
  final Color cardShadow;

  static const light = CommunityPalette(
    dark: false,
    screen: Brand.screen,
    card: Colors.white,
    ink: Brand.ink,
    muted: Brand.muted,
    soft: Brand.ink,
    line: Brand.line,
    iconButton: Color(0xCCFFFFFF),
    iconButtonBorder: Color(0xF2FFFFFF),
    iconButtonShadow: Color(0x12141327),
    iconButtonInk: Brand.ink,
    tabBar: Color(0xD1FFFFFF),
    tabIcon: Color(0xFF8B88A0),
    tabOn: Brand.tabOnDay,
    tabOnIcon: Brand.peach,
    tabShadow: Color(0x29141327),
    tabRim: Color(0xE6FFFFFF),
    cardShadow: Color(0x14141327),
  );

  static const night = CommunityPalette(
    dark: true,
    screen: Brand.night,
    card: Color(0x0BFFFFFF),
    ink: Color(0xFFEDEAF5),
    muted: Color(0xFF9C98B5),
    soft: Color(0xFFDAD6EA),
    line: Color(0x12FFFFFF),
    iconButton: Color(0x12FFFFFF),
    iconButtonBorder: Color(0x1AFFFFFF),
    iconButtonShadow: Color(0x00000000),
    iconButtonInk: Colors.white,
    tabBar: Color(0xD118163A),
    tabIcon: Color(0xFF8F8BAE),
    tabOn: Brand.sunrise,
    tabOnIcon: Colors.white,
    tabShadow: Color(0x73000000),
    tabRim: Color(0x14FFFFFF),
    cardShadow: Color(0x00000000),
  );

  static CommunityPalette of(BuildContext context) =>
      Theme.of(context).extension<CommunityPalette>() ?? light;

  @override
  CommunityPalette copyWith() => this;

  @override
  CommunityPalette lerp(CommunityPalette? other, double t) =>
      t < .5 || other == null ? this : other;
}

extension CommunityPaletteContext on BuildContext {
  CommunityPalette get palette => CommunityPalette.of(this);
}
