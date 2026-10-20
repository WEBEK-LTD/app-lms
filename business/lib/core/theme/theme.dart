import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// 59 Yallapp's palette (docs/BRAND.md).
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
}

const latinFont = 'Bricolage Grotesque';
const arabicFont = 'IBM Plex Sans Arabic';

/// The light theme. Arabic text falls back to IBM Plex Sans Arabic with
/// normal letter spacing and taller lines; Latin words stay in Bricolage
/// Grotesque. (A dark theme isn't built yet: the app follows Ivory.)
ThemeData buildTheme({required bool arabic}) {
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
    color: color ?? Brand.midnight,
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
    bodySmall: s(13, FontWeight.w400, height: 1.45, color: Brand.ink2),
    labelLarge: s(16, FontWeight.w600),
    labelMedium: s(14, FontWeight.w600),
    labelSmall: s(12, FontWeight.w500, color: Brand.ink2),
  );

  const scheme = ColorScheme(
    brightness: Brightness.light,
    primary: Brand.midnight,
    onPrimary: Brand.white,
    secondary: Brand.ember,
    onSecondary: Brand.midnight,
    tertiary: Brand.emberText,
    onTertiary: Brand.white,
    error: Brand.danger,
    onError: Brand.white,
    surface: Brand.white,
    onSurface: Brand.midnight,
    onSurfaceVariant: Brand.ink2,
    surfaceContainerLowest: Brand.ivory,
    surfaceContainerLow: Brand.ivory,
    surfaceContainer: Brand.white,
    surfaceContainerHigh: Brand.white,
    surfaceContainerHighest: Brand.sand,
    outline: Color(0xFFBDB5A6),
    outlineVariant: Brand.line,
    secondaryContainer: Brand.sand,
    onSecondaryContainer: Brand.midnight,
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
    scaffoldBackgroundColor: Brand.ivory,
    canvasColor: Brand.ivory,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    visualDensity: VisualDensity.standard,
    appBarTheme: AppBarTheme(
      backgroundColor: Brand.ivory,
      foregroundColor: Brand.midnight,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: text.titleLarge,
      systemOverlayStyle: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
    ),
    cardTheme: CardThemeData(
      color: Brand.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: Brand.line),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Brand.midnight,
        foregroundColor: Brand.white,
        minimumSize: const Size(64, 52),
        shape: rounded,
        textStyle: text.labelLarge,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: Brand.midnight,
        minimumSize: const Size(64, 48),
        shape: rounded,
        side: const BorderSide(color: Brand.midnight),
        textStyle: text.labelLarge,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: Brand.emberText,
        minimumSize: minSize,
        textStyle: text.labelLarge,
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(minimumSize: minSize),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Brand.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFCFC7B8)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.midnight, width: 2),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: Brand.white,
      selectedColor: Brand.midnight,
      secondarySelectedColor: Brand.midnight,
      labelStyle: text.labelMedium,
      secondaryLabelStyle: text.labelMedium?.copyWith(color: Brand.white),
      checkmarkColor: Brand.white,
      side: const BorderSide(color: Brand.line),
      shape: const StadiumBorder(),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Brand.white,
      indicatorColor: Brand.sand,
      height: 72,
      labelTextStyle: WidgetStatePropertyAll(
        text.labelSmall?.copyWith(color: Brand.midnight),
      ),
      iconTheme: const WidgetStatePropertyAll(
        IconThemeData(color: Brand.midnight),
      ),
    ),
    tabBarTheme: TabBarThemeData(
      labelColor: Brand.midnight,
      unselectedLabelColor: Brand.ink2,
      indicatorColor: Brand.ember,
      labelStyle: text.labelMedium,
      unselectedLabelStyle: text.labelMedium,
      dividerColor: Brand.line,
      tabAlignment: TabAlignment.start,
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: Brand.ember,
      linearTrackColor: Brand.sand,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected) ? Brand.white : null,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (states) =>
            states.contains(WidgetState.selected) ? Brand.midnight : null,
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: Brand.midnight,
      contentTextStyle: text.bodyMedium?.copyWith(color: Brand.white),
      actionTextColor: Brand.ember,
      behavior: SnackBarBehavior.floating,
    ),
    dividerTheme: const DividerThemeData(color: Brand.line, space: 1),
    listTileTheme: const ListTileThemeData(
      minVerticalPadding: 12,
      iconColor: Brand.midnight,
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: Brand.ivory,
      showDragHandle: true,
    ),
    dialogTheme: const DialogThemeData(backgroundColor: Brand.white),
  );
}
