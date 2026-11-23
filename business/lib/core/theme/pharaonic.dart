import 'package:flutter/material.dart';

import 'theme.dart';

/// 215 The app's themes, kept on this phone: the default look, or the
/// Pharaonic one beside it. Light and dark follow Settings › Appearance in
/// both.
enum AppTheme {
  standard,
  pharaonic;

  static AppTheme parse(String? value) =>
      values.where((t) => t.name == value).firstOrNull ?? standard;
}

/// 215 The Pharaonic theme's colors (design-refs/business-pharaonic):
/// night lapis with papyrus text in dark, papyrus with lapis-black text in
/// light; gold for headings and the chosen state, faience turquoise for "now"
/// and links, carnelian for danger. Every text pair keeps at least 4.5:1
/// (test/unit/pharaonic_theme_test.dart).
abstract final class PharaonicColors {
  static const dark = YbColors(
    background: Color(0xFF0A0F1E),
    surface: Color(0xFF121A31),
    ink: Color(0xFFF4EAD5),
    onInk: Color(0xFF0A0F1E),
    ink2: Color(0xFFB9AF98),
    line: Color(0xFF27314F),
    outline: Color(0xFF4A557A),
    muted: Color(0xFF18223F),
    accent: Color(0xFFE2BE6A),
    accentText: Color(0xFF56D4C3),
    success: Color(0xFF7FD9A6),
    successBg: Color(0xFF12392A),
    warning: Color(0xFFF4B860),
    warningBg: Color(0xFF3E2D0F),
    danger: Color(0xFFFF8E7A),
    dangerBg: Color(0xFF4A1A1C),
    onDanger: Color(0xFF0A0F1E),
    info: Color(0xFFC3C1F5),
    infoBg: Color(0xFF1E2748),
    gold: Color(0xFFE2BE6A),
    goldBg: Color(0xFF3A3018),
    head: Color(0xFF121A31),
    headSurface: Color(0xFF18223F),
    onHead: Color(0xFFF4EAD5),
    onHead2: Color(0xFFB9AF98),
    headBadge: Color(0xFFE2BE6A),
  );

  static const light = YbColors(
    background: Color(0xFFF3EBD9),
    surface: Color(0xFFFBF7EE),
    ink: Color(0xFF161B2E),
    onInk: Color(0xFFFBF7EE),
    ink2: Color(0xFF4D4535),
    line: Color(0xFFE0D3B6),
    outline: Color(0xFFA89A78),
    muted: Color(0xFFEFE4CC),
    accent: Color(0xFF8C6420),
    accentText: Color(0xFF075A52),
    success: Color(0xFF17583A),
    successBg: Color(0xFFDFEFE3),
    warning: Color(0xFF7A4A00),
    warningBg: Color(0xFFF6E6C8),
    danger: Color(0xFF8E2918),
    dangerBg: Color(0xFFF6E1DA),
    onDanger: Color(0xFFFFFFFF),
    info: Color(0xFF2A3F86),
    infoBg: Color(0xFFE3E6F3),
    gold: Color(0xFF674A0B),
    goldBg: Color(0xFFEFE0BC),
    head: Color(0xFF1C2A5C),
    headSurface: Color(0xFF24346E),
    onHead: Color(0xFFF7EBCB),
    onHead2: Color(0xFFD9CDB0),
    headBadge: Color(0xFFE6C26E),
  );

  static YbColors of(Brightness brightness) =>
      brightness == Brightness.dark ? dark : light;
}

/// 215 What only the Pharaonic theme has: its metallic gold, the hairlines,
/// faience, the ground's layers and its fonts. Absent from the default
/// theme, so `context.ornaments == null` there and nothing changes.
@immutable
class YbOrnaments extends ThemeExtension<YbOrnaments> {
  const YbOrnaments({
    required this.dark,
    required this.metal,
    required this.metalStops,
    required this.goldLine,
    required this.faience,
    required this.faienceBg,
    required this.tiles,
    required this.grout,
    required this.buttonFill,
    required this.buttonInk,
    required this.buttonEdge,
    required this.glow,
    required this.skyBand,
    required this.starOpacity,
    required this.pylon,
    required this.relief,
    required this.reliefOpacity,
    required this.columnOpacity,
    required this.papyrusWash,
    required this.vignette,
    required this.nav,
    required this.embossLight,
    required this.embossDark,
  });

  final bool dark;

  /// Burnished gold, top to bottom, with a specular band.
  final List<Color> metal;
  final List<double> metalStops;

  /// The gold hairline of frames and rules.
  final Color goldLine;
  final Color faience;
  final Color faienceBg;

  /// The faience tiles of the highlighted card's edge.
  final List<Color> tiles;
  final Color grout;

  /// The primary button: its fill, its text and its engraved edge.
  final List<Color> buttonFill;
  final Color buttonInk;
  final Color buttonEdge;

  /// The ground: the header's glow, the sky's band, the stars' whisper, the
  /// pylon, the inscription columns (light), the papyrus' wash, the edges.
  final Color glow;
  final Color skyBand;
  final double starOpacity;
  final Color pylon;
  final Color relief;
  final double reliefOpacity;
  final double columnOpacity;
  final Color papyrusWash;
  final Color vignette;

  /// The navigation bar and the bottom action bars.
  final Color nav;

  /// The 1px highlight and shadow that make an ornament look carved.
  final Color embossLight;
  final Color embossDark;

  static const displayFont = 'El Messiri';
  static const labelFont = 'Cinzel';

  LinearGradient get metalGradient => LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: metal,
    stops: metalStops,
  );

  /// A hairline that fades out at both ends.
  LinearGradient get hairline => LinearGradient(
    colors: [
      goldLine.withValues(alpha: 0),
      goldLine,
      goldLine.withValues(alpha: 0),
    ],
    stops: const [0, 0.5, 1],
  );

  static const darkSet = YbOrnaments(
    dark: true,
    metal: [
      Color(0xFFF7E7B4),
      Color(0xFFE6C474),
      Color(0xFFC2953F),
      Color(0xFF8E6623),
      Color(0xFFD8B566),
      Color(0xFFF3DE9E),
    ],
    metalStops: [0, 0.18, 0.42, 0.55, 0.74, 1],
    goldLine: Color(0x66E2BE6A),
    faience: Color(0xFF56D4C3),
    faienceBg: Color(0x2156D4C3),
    tiles: [Color(0xFF1E8A86), Color(0xFF56D4C3), Color(0xFF1C3A78)],
    grout: Color(0xFF0A0F1E),
    buttonFill: [
      Color(0xFFF7E7B4),
      Color(0xFFE9CB7C),
      Color(0xFFCFA651),
      Color(0xFFB8873A),
    ],
    buttonInk: Color(0xFF1A1406),
    buttonEdge: Color(0xE6785519),
    glow: Color(0xFF17244D),
    skyBand: Color(0x33344E9E),
    starOpacity: 0.075,
    pylon: Color(0xFF1B2B5E),
    relief: Color(0x00000000),
    reliefOpacity: 0,
    columnOpacity: 0.3,
    papyrusWash: Color(0x00000000),
    vignette: Color(0x8C02040C),
    nav: Color(0xFF0D1327),
    embossLight: Color(0x40FFECB4),
    embossDark: Color(0x8C000000),
  );

  static const lightSet = YbOrnaments(
    dark: false,
    metal: [
      Color(0xFFE9CF8A),
      Color(0xFFC89B45),
      Color(0xFF8C6420),
      Color(0xFFB98A3A),
      Color(0xFFDDBB6E),
    ],
    metalStops: [0, 0.3, 0.55, 0.78, 1],
    goldLine: Color(0x6B674A0B),
    faience: Color(0xFF075A52),
    faienceBg: Color(0xFFDCEEE8),
    tiles: [Color(0xFF1E8A80), Color(0xFF5CC2B4), Color(0xFF2A3F86)],
    grout: Color(0xFFFBF7EE),
    buttonFill: [Color(0xFF24346E), Color(0xFF1C2A5C)],
    buttonInk: Color(0xFFF7EBCB),
    buttonEdge: Color(0xFFA57B2C),
    glow: Color(0x33CDB076),
    skyBand: Color(0x00000000),
    starOpacity: 0,
    pylon: Color(0xFFD9C59A),
    relief: Color(0xFF8C4F2A),
    reliefOpacity: 0.09,
    columnOpacity: 0.3,
    papyrusWash: Color(0x8FF6EEDC),
    vignette: Color(0x33785824),
    nav: Color(0xFFFBF7EE),
    embossLight: Color(0xD9FFFCF0),
    embossDark: Color(0x40463208),
  );

  static YbOrnaments of(Brightness brightness) =>
      brightness == Brightness.dark ? darkSet : lightSet;

  @override
  YbOrnaments copyWith() => this;

  @override
  YbOrnaments lerp(YbOrnaments? other, double t) =>
      t < 0.5 ? this : (other ?? this);
}

extension YbOrnamentsTheme on BuildContext {
  /// 215 The Pharaonic theme's ornaments; null in the default theme.
  YbOrnaments? get ornaments => Theme.of(this).extension<YbOrnaments>();
}
