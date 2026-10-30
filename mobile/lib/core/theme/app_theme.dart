import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show SystemUiOverlayStyle;

import '../api/models/config_models.dart' show CardStyle, CornerStyle;
import '../config/build_config_data.dart';
import 'palette.dart';

/// The template's default font, used when a build config has none.
String defaultFontFor(AppTemplate template) => switch (template) {
  AppTemplate.classic => 'Bricolage Grotesque',
  AppTemplate.bold => 'Outfit',
  AppTemplate.minimal => 'Manrope',
};

const bundledFonts = {
  'Bricolage Grotesque',
  'Plus Jakarta Sans',
  'Outfit',
  'Manrope',
  'DM Sans',
  'Lexend',
};

/// Monospace font for code (bundled, SIL OFL).
const codeFontFamily = 'JetBrains Mono';

/// Fonts for letters the template fonts don't have: Readex Pro draws Arabic
/// (the template fonts are Latin only), so it looks the same on every phone
/// instead of the system's Arabic font.
const fontFallback = ['Readex Pro'];

/// Status bar icons that read on [background], over a transparent bar.
SystemUiOverlayStyle overlayStyleOn(Color background) =>
    (background.computeLuminance() > 0.4
            ? SystemUiOverlayStyle.dark
            : SystemUiOverlayStyle.light)
        .copyWith(statusBarColor: const Color(0x00000000));

/// Picks the build config's font when it is bundled, else the template's.
String resolveFont(String? font, AppTemplate template) =>
    (font != null && bundledFonts.contains(font))
    ? font
    : defaultFontFor(template);

/// Corner radii per template (Bold is rounder), and the client's corner and
/// card style from `Config.appearance`.
class AppShapes extends ThemeExtension<AppShapes> {
  const AppShapes({
    required this.card,
    required this.button,
    required this.chip,
    this.corners,
    this.cards,
  });

  factory AppShapes.forTemplate(
    AppTemplate template, {
    CornerStyle? corners,
    CardStyle? cards,
  }) {
    final designed = switch (template) {
      AppTemplate.bold => const AppShapes(card: 22, button: 16, chip: 20),
      AppTemplate.minimal => const AppShapes(card: 14, button: 12, chip: 18),
      AppTemplate.classic => const AppShapes(card: 16, button: 14, chip: 19),
    };
    final shapes = AppShapes(
      card: designed.card,
      button: designed.button,
      chip: designed.chip,
      corners: corners,
      cards: cards,
    );
    return shapes.copyWith(
      card: shapes.r(designed.card),
      // Round buttons are pills (56 high).
      button: corners == CornerStyle.round ? 28 : shapes.r(designed.button),
      chip: shapes.r(designed.chip),
    );
  }

  final double card;
  final double button;
  final double chip;

  /// `null` keeps every component's designed radius.
  final CornerStyle? corners;

  /// `null` keeps every card's designed style.
  final CardStyle? cards;

  /// A radius from the designs, adjusted to the client's corner style.
  double r(double designed) => switch (corners) {
    CornerStyle.sharp => designed < 4 ? designed : 4,
    CornerStyle.round => (designed * 1.4).roundToDouble(),
    CornerStyle.soft || null => designed,
  };

  @override
  AppShapes copyWith({double? card, double? button, double? chip}) => AppShapes(
    card: card ?? this.card,
    button: button ?? this.button,
    chip: chip ?? this.chip,
    corners: corners,
    cards: cards,
  );

  @override
  AppShapes lerp(ThemeExtension<AppShapes>? other, double t) => this;
}

extension AppShapesContext on BuildContext {
  AppShapes get shapes => Theme.of(this).extension<AppShapes>()!;

  /// A card's outline: [radius] from the designs, and a border when the
  /// design has one ([outlined]) unless the client picked a card style.
  ShapeBorder cardShape(double radius, {bool outlined = false}) {
    final s = shapes;
    final style = s.cards ?? (outlined ? CardStyle.outlined : CardStyle.flat);
    return RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(s.r(radius)),
      side: style == CardStyle.outlined
          ? BorderSide(color: palette.border)
          : BorderSide.none,
    );
  }

  /// Shadow depth for cards: only the elevated style has one.
  double get cardElevation => shapes.cards == CardStyle.elevated ? 3 : 0;
}

ThemeData buildAppTheme({
  required Color primary,
  required Brightness brightness,
  required AppTemplate template,
  required String fontFamily,
  Color? secondary,
  CornerStyle? corners,
  CardStyle? cards,
  List<String> fallback = fontFallback,
}) {
  final p = AppPalette.build(
    primary: primary,
    secondary: secondary,
    brightness: brightness,
    template: template,
  );
  final shapes = AppShapes.forTemplate(
    template,
    corners: corners,
    cards: cards,
  );
  final scheme = ColorScheme(
    brightness: brightness,
    primary: p.primary,
    onPrimary: p.onPrimary,
    secondary: p.accent,
    onSecondary: p.accent.computeLuminance() > 0.45
        ? BrandColors.midnight
        : BrandColors.white,
    tertiary: p.link,
    onTertiary: BrandColors.white,
    error: p.danger,
    onError: p.isDark ? BrandColors.midnight : BrandColors.white,
    surface: p.surface,
    onSurface: p.text,
    onSurfaceVariant: p.textSecondary,
    surfaceContainerLowest: p.background,
    surfaceContainerLow: p.surfaceMuted,
    surfaceContainer: p.surface,
    surfaceContainerHigh: p.surface,
    surfaceContainerHighest: p.segment,
    outline: p.inputBorder,
    outlineVariant: p.border,
  );

  TextStyle s(double size, FontWeight weight, {double? height, Color? color}) =>
      TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fallback,
        fontSize: size,
        fontWeight: weight,
        height: height,
        color: color ?? p.text,
      );

  final text = TextTheme(
    displaySmall: s(30, FontWeight.w700, height: 1.25),
    headlineMedium: s(28, FontWeight.w700, height: 1.25),
    headlineSmall: s(24, FontWeight.w700, height: 1.25),
    titleLarge: s(22, FontWeight.w700, height: 1.3),
    titleMedium: s(18, FontWeight.w700, height: 1.3),
    titleSmall: s(15, FontWeight.w700, height: 1.4),
    // 38 Also what people type in a field (Material uses bodyLarge there):
    // the text color, so a value never looks like its hint.
    bodyLarge: s(16, FontWeight.w400, height: 1.6),
    bodyMedium: s(15, FontWeight.w400, height: 1.5),
    bodySmall: s(13, FontWeight.w400, height: 1.5, color: p.textSecondary),
    labelLarge: s(17, FontWeight.w600),
    labelMedium: s(14, FontWeight.w600),
    labelSmall: s(12, FontWeight.w400, color: p.textSecondary),
  );

  final buttonShape = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(shapes.button),
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    fontFamily: fontFamily,
    fontFamilyFallback: fallback,
    textTheme: text,
    scaffoldBackgroundColor: p.background,
    canvasColor: p.background,
    dividerColor: p.divider,
    splashFactory: InkRipple.splashFactory,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    visualDensity: VisualDensity.standard,
    extensions: [p, shapes],
    appBarTheme: AppBarTheme(
      backgroundColor: p.background,
      foregroundColor: p.text,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      systemOverlayStyle: overlayStyleOn(p.background),
      // Room for AppBarBackButton, lined up with the 20 point margin.
      leadingWidth: 70,
      titleSpacing: 4,
      titleTextStyle: text.titleLarge,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: p.primary,
        foregroundColor: p.onPrimary,
        disabledBackgroundColor: p.primary.withValues(alpha: 0.4),
        disabledForegroundColor: p.onPrimary.withValues(alpha: 0.8),
        minimumSize: const Size.fromHeight(56),
        shape: buttonShape,
        textStyle: text.labelLarge,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: p.text,
        backgroundColor: p.surface,
        minimumSize: const Size(48, 48),
        side: BorderSide(color: p.border),
        shape: buttonShape,
        textStyle: text.labelMedium,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: p.link,
        minimumSize: const Size(48, 44),
        textStyle: text.labelMedium,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: p.surface,
      hintStyle: TextStyle(color: p.textTertiary),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(shapes.r(14)),
        borderSide: BorderSide(color: p.inputBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(shapes.r(14)),
        borderSide: BorderSide(color: p.inputBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(shapes.r(14)),
        borderSide: BorderSide(color: p.text, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(shapes.r(14)),
        borderSide: BorderSide(color: p.danger),
      ),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? p.onPrimary
            : p.textTertiary,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (states) =>
            states.contains(WidgetState.selected) ? p.primary : p.segment,
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: p.isDark ? BrandColors.ivory : BrandColors.midnight,
      contentTextStyle: TextStyle(
        fontFamily: fontFamily,
        fontFamilyFallback: fallback,
        color: p.isDark ? BrandColors.midnight : BrandColors.white,
        fontSize: 15,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(shapes.r(12)),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: p.surface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(shapes.r(20)),
      ),
      actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      titleTextStyle: text.titleMedium,
      contentTextStyle: text.bodyMedium?.copyWith(color: p.textSecondary),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: p.surface,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
      dragHandleColor: p.inputBorder,
      dragHandleSize: const Size(36, 4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(shapes.r(20))),
      ),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(
      // 110 The brand colour in the dark too (lightened when too dark).
      color: p.primary,
      linearTrackColor: p.segment,
    ),
    radioTheme: RadioThemeData(fillColor: WidgetStatePropertyAll(p.text)),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected) ? p.primary : null,
      ),
      checkColor: WidgetStatePropertyAll(p.onPrimary),
    ),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
    ),
  );
}
