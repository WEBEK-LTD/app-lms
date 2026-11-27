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
  // #527's dark card and dark paper (Yallapp's own dark colours).
  static const navy2 = Color(0xFF161530);
  static const indigo = Color(0xFF1A1846);
  static const indigoDeep = Color(0xFF1E1C4E);
  static const cream = Color(0xFFF4EFE6);
  static const paper = Color(0xFFFBF8F3);
  static const screen = Color(0xFFF7F3EC);
  static const night = Color(0xFF0E0D24);
  static const ink = Color(0xFF141327);
  static const muted = Color(0xFF6E6B80);
  static const line = Color(0xFFECE6DC);
  static const green = Color(0xFF18A56B);
  static const mint = Color(0xFF5BE7AE);
  static const violet = Color(0xFF6B5BFF);
  static const lilac = Color(0xFF7C6BFF);
  static const sky = Color(0xFF7CC4FF);
  static const gold = Color(0xFFFFD27A);

  /// #527's flat look: one colour where the phase 1 design had a gradient
  /// (no glow, gradient, blur or coloured shadow anywhere). The names stay
  /// so every screen, area E's too, turns flat at once.
  static LinearGradient solid(Color c) => LinearGradient(colors: [c, c]);

  /// The primary button, the active tab by night, the current section.
  static final sunrise = solid(orange);

  /// The welcome screen's "Sign up with email".
  static final signUp = solid(orange);

  /// The create button.
  static final createRing = solid(orange);

  /// The member's own avatar ring and an unseen story's ring.
  static final meRing = solid(orange);
  static final storyRing = solid(orange);

  /// The active tab by day.
  static final tabOnDay = solid(navy);

  /// #527's surfaces (platform/web community.css), light and dark.
  static const darkPaper = Color(0xFF0E0D24);
  static const darkCard = Color(0xFF161530);
  static const darkLine = Color(0xFF2C2A49);
  static const darkSoft = Color(0xFF1C1B38);
  static const darkNavy = Color(0xFF24223F);
  static const darkInk = Color(0xFFF4EFE6);
  static const darkMuted = Color(0xFFA9A4BB);
  static const lightSoft = Color(0xFFF6F2EB);

  /// The six avatar colours (`.a1`–`.a6`), one colour each, chosen by a
  /// member's id.
  static const avatars = [
    [Color(0xFFFF5A1F), Color(0xFFFF5A1F)],
    [Color(0xFF6B5BFF), Color(0xFF6B5BFF)],
    [Color(0xFF18A56B), Color(0xFF18A56B)],
    [Color(0xFFE08A12), Color(0xFFE08A12)],
    [Color(0xFFE23F72), Color(0xFFE23F72)],
    [Color(0xFF1F6FD1), Color(0xFF1F6FD1)],
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

  // #527: flat surfaces with 1px lines; no shadow by day or night.
  static final light = CommunityPalette(
    dark: false,
    screen: Brand.paper,
    card: Colors.white,
    ink: Brand.ink,
    muted: Brand.muted,
    soft: const Color(0xFF3C3A50),
    line: Brand.line,
    iconButton: Colors.white,
    iconButtonBorder: Brand.line,
    iconButtonShadow: const Color(0x00000000),
    iconButtonInk: Brand.ink,
    tabBar: Colors.white,
    tabIcon: const Color(0xFF7B788E),
    tabOn: Brand.tabOnDay,
    tabOnIcon: Brand.orange,
    tabShadow: const Color(0x00000000),
    tabRim: Brand.line,
    cardShadow: const Color(0x00000000),
  );

  static final night = CommunityPalette(
    dark: true,
    screen: Brand.darkPaper,
    card: Brand.darkCard,
    ink: Brand.darkInk,
    muted: Brand.darkMuted,
    soft: const Color(0xFFEBE6F2),
    line: Brand.darkLine,
    iconButton: Brand.darkCard,
    iconButtonBorder: Brand.darkLine,
    iconButtonShadow: const Color(0x00000000),
    iconButtonInk: Brand.darkInk,
    tabBar: Brand.darkCard,
    tabIcon: Brand.darkMuted,
    tabOn: LinearGradient(colors: [Brand.darkNavy, Brand.darkNavy]),
    tabOnIcon: Brand.orange,
    tabShadow: const Color(0x00000000),
    tabRim: Brand.darkLine,
    cardShadow: const Color(0x00000000),
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
