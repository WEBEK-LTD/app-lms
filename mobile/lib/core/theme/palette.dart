import 'package:flutter/material.dart';

import '../config/build_config_data.dart';

/// Yallapp's default colors (docs/BRAND.md). Client apps replace [midnight]
/// as the primary with their own color from the build or runtime config.
abstract final class BrandColors {
  static const midnight = Color(0xFF0E0D24);
  static const ivory = Color(0xFFF4EFE6);
  static const ember = Color(0xFFFF5A1F);
  static const emberText = Color(0xFFC2410C);
  static const white = Color(0xFFFFFFFF);
}

/// The app's color tokens, taken from the approved designs.
@immutable
class AppPalette extends ThemeExtension<AppPalette> {
  const AppPalette({
    required this.brightness,
    required this.primary,
    required this.onPrimary,
    required this.primarySoft,
    required this.onPrimarySoft,
    required this.onPrimaryMuted,
    required this.primaryTrack,
    required this.background,
    required this.surface,
    required this.surfaceMuted,
    required this.segment,
    required this.border,
    required this.divider,
    required this.inputBorder,
    required this.text,
    required this.textBody,
    required this.textSecondary,
    required this.textTertiary,
    required this.accent,
    required this.accentSoft,
    required this.link,
    required this.success,
    required this.successSoft,
    required this.danger,
    required this.star,
    required this.timerSoft,
    required this.onTimerSoft,
    required this.inlineCode,
    required this.placeholders,
  });

  /// Builds the light or dark palette around a client's primary color.
  factory AppPalette.build({
    required Color primary,
    required Brightness brightness,
    AppTemplate template = AppTemplate.classic,
    Color? secondary,
  }) {
    final palette = AppPalette._base(
      primary: primary,
      brightness: brightness,
      template: template,
    );
    return secondary == null ? palette : palette._withAccent(secondary);
  }

  factory AppPalette._base({
    required Color primary,
    required Brightness brightness,
    required AppTemplate template,
  }) {
    final dark = brightness == Brightness.dark;
    final primaryIsDark = primary.computeLuminance() < 0.2;
    // On dark backgrounds a dark brand color disappears: use Ivory instead.
    final buttonColor = dark && primaryIsDark ? BrandColors.ivory : primary;
    final onButton = buttonColor.computeLuminance() > 0.45
        ? BrandColors.midnight
        : BrandColors.white;
    final soft = dark
        ? Color.alphaBlend(
            primary.withValues(alpha: 0.35),
            const Color(0xFF17162E),
          )
        : (primaryIsDark
              ? const Color(0xFF24223F)
              : Color.alphaBlend(
                  Colors.black.withValues(alpha: 0.18),
                  primary,
                ));
    if (dark) {
      return AppPalette(
        brightness: brightness,
        primary: buttonColor,
        onPrimary: onButton,
        primarySoft: soft,
        onPrimarySoft: BrandColors.white,
        onPrimaryMuted: const Color(0xFFC9C6DC),
        primaryTrack: const Color(0xFF34314F),
        background: const Color(0xFF0B0A1C),
        surface: const Color(0xFF17162E),
        surfaceMuted: const Color(0xFF1D1C36),
        segment: const Color(0xFF24223F),
        border: const Color(0xFF2C2A47),
        divider: const Color(0xFF24223F),
        inputBorder: const Color(0xFF3A3756),
        text: BrandColors.ivory,
        textBody: const Color(0xFFE6E1D8),
        textSecondary: const Color(0xFFB9B5CA),
        textTertiary: const Color(0xFF8C889A),
        accent: BrandColors.ember,
        accentSoft: const Color(0xFF3A2218),
        link: const Color(0xFFFF8A5B),
        success: const Color(0xFF5CCB94),
        successSoft: const Color(0xFF173326),
        danger: const Color(0xFFF2B8B5),
        star: const Color(0xFFE6A23C),
        timerSoft: const Color(0xFF3A2A18),
        onTimerSoft: const Color(0xFFF5C58A),
        inlineCode: const Color(0xFF24223F),
        placeholders: const [
          Color(0xFF3A3020),
          Color(0xFF1E3A2E),
          Color(0xFF2A2840),
          Color(0xFF3A2434),
        ],
      );
    }
    final minimal = template == AppTemplate.minimal;
    return AppPalette(
      brightness: brightness,
      primary: primary,
      onPrimary: onButton,
      primarySoft: soft,
      onPrimarySoft: BrandColors.white,
      onPrimaryMuted: const Color(0xFFC9C6DC),
      primaryTrack: const Color(0xFF34314F),
      background: minimal ? BrandColors.white : BrandColors.ivory,
      surface: BrandColors.white,
      surfaceMuted: minimal ? BrandColors.ivory : const Color(0xFFFAF7F1),
      segment: const Color(0xFFE9E2D5),
      border: const Color(0xFFE4DDD0),
      divider: const Color(0xFFEDE7DC),
      inputBorder: const Color(0xFFD9D1C3),
      text: BrandColors.midnight,
      textBody: const Color(0xFF24223A),
      textSecondary: const Color(0xFF5E5B70),
      textTertiary: const Color(0xFF6F6B80),
      accent: BrandColors.ember,
      accentSoft: const Color(0xFFFFEDE4),
      link: BrandColors.emberText,
      success: const Color(0xFF1C7C4A),
      successSoft: const Color(0xFFE3F2EA),
      danger: const Color(0xFFB3261E),
      star: const Color(0xFFC77A12),
      timerSoft: const Color(0xFFFBEDE0),
      onTimerSoft: const Color(0xFF9A4F0B),
      inlineCode: const Color(0xFFEFE9DE),
      placeholders: const [
        Color(0xFFF2E3C9),
        Color(0xFFD7EBE2),
        Color(0xFFE6E3EF),
        Color(0xFFEEDDE8),
      ],
    );
  }

  /// Uses the client's secondary color instead of Ember for accents, with
  /// accent text darkened or lightened until it reads on the background.
  AppPalette _withAccent(Color secondary) {
    final soft = Color.alphaBlend(
      secondary.withValues(alpha: isDark ? 0.22 : 0.14),
      surface,
    );
    return AppPalette(
      brightness: brightness,
      primary: primary,
      onPrimary: onPrimary,
      primarySoft: primarySoft,
      onPrimarySoft: onPrimarySoft,
      onPrimaryMuted: onPrimaryMuted,
      primaryTrack: primaryTrack,
      background: background,
      surface: surface,
      surfaceMuted: surfaceMuted,
      segment: segment,
      border: border,
      divider: divider,
      inputBorder: inputBorder,
      text: text,
      textBody: textBody,
      textSecondary: textSecondary,
      textTertiary: textTertiary,
      accent: secondary,
      accentSoft: soft,
      link: readableOn(secondary, background),
      success: success,
      successSoft: successSoft,
      danger: danger,
      star: star,
      timerSoft: timerSoft,
      onTimerSoft: onTimerSoft,
      inlineCode: inlineCode,
      placeholders: placeholders,
    );
  }

  final Brightness brightness;

  /// Primary buttons, the continue card, active tabs.
  final Color primary;
  final Color onPrimary;

  /// Raised areas on a primary background (thumbnails, icon buttons).
  final Color primarySoft;
  final Color onPrimarySoft;
  final Color onPrimaryMuted;
  final Color primaryTrack;

  final Color background;
  final Color surface;
  final Color surfaceMuted;
  final Color segment;
  final Color border;
  final Color divider;
  final Color inputBorder;

  final Color text;
  final Color textBody;
  final Color textSecondary;
  final Color textTertiary;

  /// Ember: small accents only (progress fills, active indicators).
  final Color accent;
  final Color accentSoft;

  /// Ember (text): links and accent text.
  final Color link;
  final Color success;
  final Color successSoft;
  final Color danger;
  final Color star;
  final Color timerSoft;
  final Color onTimerSoft;
  final Color inlineCode;

  /// Soft tints for course images that have no picture.
  final List<Color> placeholders;

  bool get isDark => brightness == Brightness.dark;

  Color placeholderFor(int seed) =>
      placeholders[seed.abs() % placeholders.length];

  @override
  AppPalette copyWith() => this;

  @override
  AppPalette lerp(ThemeExtension<AppPalette>? other, double t) {
    if (other is! AppPalette) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return AppPalette(
      brightness: t < 0.5 ? brightness : other.brightness,
      primary: l(primary, other.primary),
      onPrimary: l(onPrimary, other.onPrimary),
      primarySoft: l(primarySoft, other.primarySoft),
      onPrimarySoft: l(onPrimarySoft, other.onPrimarySoft),
      onPrimaryMuted: l(onPrimaryMuted, other.onPrimaryMuted),
      primaryTrack: l(primaryTrack, other.primaryTrack),
      background: l(background, other.background),
      surface: l(surface, other.surface),
      surfaceMuted: l(surfaceMuted, other.surfaceMuted),
      segment: l(segment, other.segment),
      border: l(border, other.border),
      divider: l(divider, other.divider),
      inputBorder: l(inputBorder, other.inputBorder),
      text: l(text, other.text),
      textBody: l(textBody, other.textBody),
      textSecondary: l(textSecondary, other.textSecondary),
      textTertiary: l(textTertiary, other.textTertiary),
      accent: l(accent, other.accent),
      accentSoft: l(accentSoft, other.accentSoft),
      link: l(link, other.link),
      success: l(success, other.success),
      successSoft: l(successSoft, other.successSoft),
      danger: l(danger, other.danger),
      star: l(star, other.star),
      timerSoft: l(timerSoft, other.timerSoft),
      onTimerSoft: l(onTimerSoft, other.onTimerSoft),
      inlineCode: l(inlineCode, other.inlineCode),
      placeholders: t < 0.5 ? placeholders : other.placeholders,
    );
  }
}

/// WCAG contrast ratio between two colors (1 to 21).
double contrastRatio(Color a, Color b) {
  final la = a.computeLuminance();
  final lb = b.computeLuminance();
  final hi = la > lb ? la : lb;
  final lo = la > lb ? lb : la;
  return (hi + 0.05) / (lo + 0.05);
}

/// [color], moved towards black or white until it has at least 4.5:1
/// contrast on [background], for text.
Color readableOn(Color color, Color background) {
  final target = background.computeLuminance() > 0.5
      ? const Color(0xFF000000)
      : const Color(0xFFFFFFFF);
  var result = color;
  for (
    var t = 0.1;
    contrastRatio(result, background) < 4.5 && t <= 1;
    t += 0.1
  ) {
    result = Color.lerp(color, target, t)!;
  }
  return result;
}

/// Parses "#RRGGBB" into an opaque color.
Color? parseHexColor(String? value) {
  if (value == null) return null;
  final match = RegExp(r'^#?([0-9A-Fa-f]{6})$').firstMatch(value.trim());
  if (match == null) return null;
  return Color(0xFF000000 | int.parse(match.group(1)!, radix: 16));
}

extension AppPaletteContext on BuildContext {
  AppPalette get palette => Theme.of(this).extension<AppPalette>()!;
}
