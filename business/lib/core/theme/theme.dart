import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// 59 Yallapp's palette (docs/BRAND.md). Screens take their colors from the
/// theme ([YbColors], `context.yb`) so they follow light and dark (61); the
/// constants are for what looks the same in both (the dark door scanner).
abstract final class Brand {
  static const midnight = Color(0xFF0E0D24);
  static const ivory = Color(0xFFF4EFE6);
  static const ember = Color(0xFFFF5A1F);
  static const emberText = Color(0xFFC2410C);
  static const white = Color(0xFFFFFFFF);

  // Supporting tones, derived from the palette for states and borders.
  static const ink2 = Color(0xFF55536B);
  static const line = Color(0xFFE4DDD0);
  static const sand = Color(0xFFEAE3D6);
  static const success = Color(0xFF1F7A4D);
  static const successBg = Color(0xFFE3F2E9);
  static const warning = Color(0xFF8A5300);
  static const warningBg = Color(0xFFFBEBD0);
  static const danger = Color(0xFFB42318);
  static const dangerBg = Color(0xFFFBE4E1);
  static const info = Color(0xFF34336B);
  static const infoBg = Color(0xFFE7E6F3);
  static const scanner = Color(0xFF07061A);

  // 125 Prime's gold.
  static const gold = Color(0xFF7A5C14);
  static const goldBg = Color(0xFFF3E6C4);
  static const goldLight = Color(0xFFE6C26E);
  static const goldDarkBg = Color(0xFF3A3018);
}

/// 125 The Prime looks of a Studio app (kept on this phone): Classic is
/// the app's own theme; each has a light and a dark side.
enum PrimeLook {
  classic,
  midnightGold,
  ember,
  sage;

  static PrimeLook parse(String? value) =>
      values.where((l) => l.name == value).firstOrNull ?? classic;
}

/// 61 The app's colors for the light and the dark theme, from Yallapp's
/// palette: Ivory pages with white cards and Midnight text in light;
/// Midnight pages with lifted Midnight cards and Ivory text in dark. Ember
/// stays for small accents; text pairs keep at least 4.5:1 (WCAG AA,
/// checked in test/unit/theme_test.dart).
@immutable
class YbColors extends ThemeExtension<YbColors> {
  const YbColors({
    required this.background,
    required this.surface,
    required this.ink,
    required this.onInk,
    required this.ink2,
    required this.line,
    required this.outline,
    required this.muted,
    required this.accent,
    required this.accentText,
    required this.success,
    required this.successBg,
    required this.warning,
    required this.warningBg,
    required this.danger,
    required this.dangerBg,
    required this.onDanger,
    required this.info,
    required this.infoBg,
    this.gold = Brand.gold,
    this.goldBg = Brand.goldBg,
    this.head = Brand.midnight,
    this.headSurface = const Color(0xFF1B1A38),
    this.onHead = Brand.ivory,
    this.onHead2 = const Color(0xFFB8B3C8),
    this.headUp = const Color(0xFF74D6A0),
    this.headDown = const Color(0xFFFF8B80),
    this.headBadge = Brand.goldLight,
  });

  /// Pages.
  final Color background;

  /// Cards, inputs, sheets.
  final Color surface;

  /// Text and primary buttons.
  final Color ink;

  /// Text on [ink] (a primary button, the owner's own message).
  final Color onInk;

  /// Secondary text.
  final Color ink2;
  final Color line;
  final Color outline;

  /// Quiet fills: chips, avatars, the selected tab.
  final Color muted;

  /// Ember: indicators and progress only, never body text.
  final Color accent;

  /// Links and accent text.
  final Color accentText;
  final Color success;
  final Color successBg;
  final Color warning;
  final Color warningBg;
  final Color danger;
  final Color dangerBg;
  final Color onDanger;
  final Color info;
  final Color infoBg;

  /// 125 Prime's gold text and its quiet fill.
  final Color gold;
  final Color goldBg;

  /// 125 The Prime header on Today: its fill, its tiles, its text, the
  /// comparison's up and down, and the Prime badge.
  final Color head;
  final Color headSurface;
  final Color onHead;
  final Color onHead2;
  final Color headUp;
  final Color headDown;
  final Color headBadge;

  static const light = YbColors(
    background: Brand.ivory,
    surface: Brand.white,
    ink: Brand.midnight,
    onInk: Brand.white,
    ink2: Brand.ink2,
    line: Brand.line,
    outline: Color(0xFFBDB5A6),
    muted: Brand.sand,
    accent: Brand.ember,
    accentText: Brand.emberText,
    success: Brand.success,
    successBg: Brand.successBg,
    warning: Brand.warning,
    warningBg: Brand.warningBg,
    danger: Brand.danger,
    dangerBg: Brand.dangerBg,
    onDanger: Brand.white,
    info: Brand.info,
    infoBg: Brand.infoBg,
  );

  static const dark = YbColors(
    background: Brand.midnight,
    surface: Color(0xFF1B1A38),
    ink: Brand.ivory,
    onInk: Brand.midnight,
    ink2: Color(0xFFB8B3C8),
    line: Color(0xFF33325A),
    outline: Color(0xFF6B6990),
    muted: Color(0xFF2A2950),
    accent: Brand.ember,
    accentText: Color(0xFFFF8F66),
    success: Color(0xFF74D6A0),
    successBg: Color(0xFF12392A),
    warning: Color(0xFFF4B860),
    warningBg: Color(0xFF3E2D0F),
    danger: Color(0xFFFF8B80),
    dangerBg: Color(0xFF4A1A1C),
    onDanger: Brand.midnight,
    info: Color(0xFFC3C1F5),
    infoBg: Color(0xFF2A2950),
    gold: Brand.goldLight,
    goldBg: Brand.goldDarkBg,
  );

  /// 125 Midnight gold: gold on Midnight.
  static const midnightGoldLight = YbColors(
    background: Color(0xFFF5F0E3),
    surface: Brand.white,
    ink: Brand.midnight,
    onInk: Brand.white,
    ink2: Brand.ink2,
    line: Color(0xFFE6DDC6),
    outline: Color(0xFFBDB29A),
    muted: Color(0xFFEEE5CF),
    accent: Color(0xFFB8913A),
    accentText: Brand.gold,
    success: Brand.success,
    successBg: Brand.successBg,
    warning: Brand.warning,
    warningBg: Brand.warningBg,
    danger: Brand.danger,
    dangerBg: Brand.dangerBg,
    onDanger: Brand.white,
    info: Brand.info,
    infoBg: Brand.infoBg,
  );

  static const midnightGoldDark = YbColors(
    background: Brand.midnight,
    surface: Color(0xFF1B1A38),
    ink: Brand.ivory,
    onInk: Brand.midnight,
    ink2: Color(0xFFB8B3C8),
    line: Color(0xFF33325A),
    outline: Color(0xFF6B6990),
    muted: Color(0xFF26254A),
    accent: Brand.goldLight,
    accentText: Brand.goldLight,
    success: Color(0xFF74D6A0),
    successBg: Color(0xFF12392A),
    warning: Color(0xFFF4B860),
    warningBg: Color(0xFF3E2D0F),
    danger: Color(0xFFFF8B80),
    dangerBg: Color(0xFF4A1A1C),
    onDanger: Brand.midnight,
    info: Color(0xFFC3C1F5),
    infoBg: Color(0xFF2A2950),
    gold: Brand.goldLight,
    goldBg: Brand.goldDarkBg,
    head: Color(0xFF1B1A38),
    headSurface: Color(0xFF26254A),
  );

  /// 125 Ember: warm pages under an Ember header.
  static const emberLight = YbColors(
    background: Color(0xFFFFF1EA),
    surface: Brand.white,
    ink: Brand.midnight,
    onInk: Brand.white,
    ink2: Color(0xFF5A4A4F),
    line: Color(0xFFF1D9CB),
    outline: Color(0xFFC9AFA1),
    muted: Color(0xFFFBE3D6),
    accent: Brand.ember,
    accentText: Brand.emberText,
    success: Brand.success,
    successBg: Brand.successBg,
    warning: Brand.warning,
    warningBg: Brand.warningBg,
    danger: Brand.danger,
    dangerBg: Brand.dangerBg,
    onDanger: Brand.white,
    info: Brand.info,
    infoBg: Brand.infoBg,
    head: Brand.emberText,
    headSurface: Color(0xFF9E3509),
    onHead: Color(0xFFFFF1EA),
    onHead2: Color(0xFFFBD9C8),
    headUp: Color(0xFFCFF5DF),
    headDown: Color(0xFFFFE1D6),
    headBadge: Brand.midnight,
  );

  static const emberDark = YbColors(
    background: Color(0xFF1A0F0B),
    surface: Color(0xFF2A1912),
    ink: Color(0xFFFFF1EA),
    onInk: Color(0xFF1A0F0B),
    ink2: Color(0xFFD6BEB2),
    line: Color(0xFF45291E),
    outline: Color(0xFF7A5546),
    muted: Color(0xFF3A2219),
    accent: Brand.ember,
    accentText: Color(0xFFFF8F66),
    success: Color(0xFF74D6A0),
    successBg: Color(0xFF12392A),
    warning: Color(0xFFF4B860),
    warningBg: Color(0xFF3E2D0F),
    danger: Color(0xFFFF8B80),
    dangerBg: Color(0xFF4A1A1C),
    onDanger: Color(0xFF1A0F0B),
    info: Color(0xFFC3C1F5),
    infoBg: Color(0xFF2A2950),
    gold: Brand.goldLight,
    goldBg: Brand.goldDarkBg,
    head: Color(0xFF8F300A),
    headSurface: Color(0xFF6E2507),
    onHead: Color(0xFFFFF1EA),
    onHead2: Color(0xFFFBD9C8),
    headUp: Color(0xFFCFF5DF),
    headDown: Color(0xFFFFE1D6),
    headBadge: Brand.goldLight,
  );

  /// 125 Sage: green and quiet, with an amber accent.
  static const sageLight = YbColors(
    background: Color(0xFFEEF2EC),
    surface: Brand.white,
    ink: Color(0xFF1F3B2D),
    onInk: Brand.white,
    ink2: Color(0xFF4B5C52),
    line: Color(0xFFD5DED1),
    outline: Color(0xFFA9B8AE),
    muted: Color(0xFFDFE7DB),
    accent: Color(0xFFB7791F),
    accentText: Color(0xFF8A5A12),
    success: Brand.success,
    successBg: Brand.successBg,
    warning: Brand.warning,
    warningBg: Brand.warningBg,
    danger: Brand.danger,
    dangerBg: Brand.dangerBg,
    onDanger: Brand.white,
    info: Brand.info,
    infoBg: Brand.infoBg,
    head: Color(0xFF1F3B2D),
    headSurface: Color(0xFF2A4A3A),
    onHead: Color(0xFFEEF2EC),
    onHead2: Color(0xFFBFD0C5),
    headUp: Color(0xFF9BE3B9),
    headDown: Color(0xFFFFB4AA),
    headBadge: Brand.goldLight,
  );

  static const sageDark = YbColors(
    background: Color(0xFF0F1A14),
    surface: Color(0xFF18271E),
    ink: Color(0xFFEEF2EC),
    onInk: Color(0xFF0F1A14),
    ink2: Color(0xFFB3C3B9),
    line: Color(0xFF2C4335),
    outline: Color(0xFF5E7867),
    muted: Color(0xFF22362A),
    accent: Color(0xFFE0A548),
    accentText: Color(0xFFE6B866),
    success: Color(0xFF74D6A0),
    successBg: Color(0xFF12392A),
    warning: Color(0xFFF4B860),
    warningBg: Color(0xFF3E2D0F),
    danger: Color(0xFFFF8B80),
    dangerBg: Color(0xFF4A1A1C),
    onDanger: Color(0xFF0F1A14),
    info: Color(0xFFC3C1F5),
    infoBg: Color(0xFF2A2950),
    gold: Brand.goldLight,
    goldBg: Brand.goldDarkBg,
    head: Color(0xFF18271E),
    headSurface: Color(0xFF22362A),
    onHead: Color(0xFFEEF2EC),
    onHead2: Color(0xFFBFD0C5),
    headUp: Color(0xFF9BE3B9),
    headDown: Color(0xFFFFB4AA),
  );

  /// 125 The colors of a look, light or dark.
  static YbColors of(PrimeLook look, Brightness brightness) {
    final dark = brightness == Brightness.dark;
    return switch (look) {
      PrimeLook.classic => dark ? YbColors.dark : YbColors.light,
      PrimeLook.midnightGold => dark ? midnightGoldDark : midnightGoldLight,
      PrimeLook.ember => dark ? emberDark : emberLight,
      PrimeLook.sage => dark ? sageDark : sageLight,
    };
  }

  @override
  YbColors copyWith() => this;

  @override
  YbColors lerp(YbColors? other, double t) => t < 0.5 ? this : (other ?? this);
}

extension YbTheme on BuildContext {
  /// The colors of the theme in use (light or dark).
  YbColors get yb => Theme.of(this).extension<YbColors>() ?? YbColors.light;
}

const latinFont = 'Bricolage Grotesque';
const arabicFont = 'IBM Plex Sans Arabic';

/// The theme, light or (61) dark. Arabic text falls back to IBM Plex Sans
/// Arabic with normal letter spacing and taller lines; Latin words stay in
/// Bricolage Grotesque.
ThemeData buildTheme({
  required bool arabic,
  Brightness brightness = Brightness.light,
  // 125 A Prime app's look (Classic: the app's own colors).
  PrimeLook look = PrimeLook.classic,
}) {
  final dark = brightness == Brightness.dark;
  final c = YbColors.of(look, brightness);
  const fallback = [arabicFont];
  double? tight(double value) => arabic ? 0 : value;

  TextStyle s(
    double size,
    FontWeight weight, {
    double? height,
    double? spacing,
    Color? color,
  }) => TextStyle(
    fontFamily: latinFont,
    fontFamilyFallback: fallback,
    fontSize: size,
    fontWeight: weight,
    height: arabic && height != null ? height + 0.15 : height,
    letterSpacing: spacing == null ? null : tight(spacing),
    color: color ?? c.ink,
  );

  final text = TextTheme(
    displaySmall: s(34, FontWeight.w700, height: 1.15, spacing: -0.8),
    headlineMedium: s(28, FontWeight.w700, height: 1.2, spacing: -0.6),
    headlineSmall: s(24, FontWeight.w700, height: 1.25, spacing: -0.4),
    titleLarge: s(21, FontWeight.w700, height: 1.3, spacing: -0.3),
    titleMedium: s(17, FontWeight.w700, height: 1.35),
    titleSmall: s(15, FontWeight.w600, height: 1.4),
    bodyLarge: s(16, FontWeight.w400, height: 1.5),
    bodyMedium: s(15, FontWeight.w400, height: 1.5),
    bodySmall: s(13, FontWeight.w400, height: 1.45, color: c.ink2),
    labelLarge: s(16, FontWeight.w600),
    labelMedium: s(14, FontWeight.w600),
    labelSmall: s(12, FontWeight.w500, color: c.ink2),
  );

  final scheme = ColorScheme(
    brightness: brightness,
    primary: c.ink,
    onPrimary: c.onInk,
    secondary: c.accent,
    onSecondary: c.ink,
    tertiary: c.accentText,
    onTertiary: c.onInk,
    error: c.danger,
    onError: c.onDanger,
    surface: c.surface,
    onSurface: c.ink,
    onSurfaceVariant: c.ink2,
    surfaceContainerLowest: c.background,
    surfaceContainerLow: c.background,
    surfaceContainer: c.surface,
    surfaceContainerHigh: c.surface,
    surfaceContainerHighest: c.muted,
    outline: c.outline,
    outlineVariant: c.line,
    secondaryContainer: c.muted,
    onSecondaryContainer: c.ink,
  );

  final rounded = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(14),
  );
  const minSize = Size(48, 48);

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    fontFamily: latinFont,
    fontFamilyFallback: fallback,
    textTheme: text,
    scaffoldBackgroundColor: c.background,
    canvasColor: c.background,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    visualDensity: VisualDensity.standard,
    appBarTheme: AppBarTheme(
      backgroundColor: c.background,
      foregroundColor: c.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: text.titleLarge,
      systemOverlayStyle:
          (dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark)
              .copyWith(statusBarColor: Colors.transparent),
    ),
    cardTheme: CardThemeData(
      color: c.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: c.line),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: c.ink,
        foregroundColor: c.onInk,
        minimumSize: const Size(64, 52),
        shape: rounded,
        textStyle: text.labelLarge,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: c.ink,
        minimumSize: const Size(64, 48),
        shape: rounded,
        side: BorderSide(color: c.ink),
        textStyle: text.labelLarge,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: c.accentText,
        minimumSize: minSize,
        textStyle: text.labelLarge,
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(minimumSize: minSize),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: c.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: c.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(
          color: dark ? c.outline : const Color(0xFFCFC7B8),
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: c.ink, width: 2),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: c.surface,
      selectedColor: c.ink,
      secondarySelectedColor: c.ink,
      labelStyle: text.labelMedium,
      secondaryLabelStyle: text.labelMedium?.copyWith(color: c.onInk),
      checkmarkColor: c.onInk,
      side: BorderSide(color: c.line),
      shape: const StadiumBorder(),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: c.surface,
      indicatorColor: c.muted,
      height: 72,
      labelTextStyle: WidgetStatePropertyAll(
        text.labelSmall?.copyWith(color: c.ink),
      ),
      iconTheme: WidgetStatePropertyAll(IconThemeData(color: c.ink)),
    ),
    tabBarTheme: TabBarThemeData(
      labelColor: c.ink,
      unselectedLabelColor: c.ink2,
      indicatorColor: c.accent,
      labelStyle: text.labelMedium,
      unselectedLabelStyle: text.labelMedium,
      dividerColor: c.line,
      tabAlignment: TabAlignment.start,
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: c.accent,
      linearTrackColor: c.muted,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected) ? c.onInk : null,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected) ? c.ink : null,
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: c.ink,
      contentTextStyle: text.bodyMedium?.copyWith(color: c.onInk),
      // Ember on Midnight; on the dark theme's Ivory snack bar, Ember (text).
      actionTextColor: dark ? Brand.emberText : c.accent,
      behavior: SnackBarBehavior.floating,
    ),
    dividerTheme: DividerThemeData(color: c.line, space: 1),
    listTileTheme: ListTileThemeData(minVerticalPadding: 12, iconColor: c.ink),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: c.background,
      showDragHandle: true,
    ),
    dialogTheme: DialogThemeData(backgroundColor: c.surface),
    extensions: [c],
  );
}
