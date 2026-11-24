import 'package:flutter/material.dart';

import 'tokens.dart';

/// The app's type: Inter for Latin (the design's text), IBM Plex Sans Arabic
/// for Arabic letters, Readex Pro for the brand word and figures.
abstract final class Fonts {
  static const text = 'Inter';
  static const arabic = 'IBM Plex Sans Arabic';
  static const brand = 'Readex Pro';
  static const fallback = [arabic];
}

ThemeData communityTheme({required bool dark}) {
  final p = dark ? CommunityPalette.night : CommunityPalette.light;
  final scheme = ColorScheme.fromSeed(
    seedColor: Brand.orange,
    brightness: dark ? Brightness.dark : Brightness.light,
    primary: Brand.orange,
    surface: p.screen,
    onSurface: p.ink,
  );
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    brightness: dark ? Brightness.dark : Brightness.light,
    scaffoldBackgroundColor: p.screen,
    fontFamily: Fonts.text,
    fontFamilyFallback: Fonts.fallback,
    splashFactory: InkSparkle.splashFactory,
    extensions: [p],
  );
  return base.copyWith(
    textTheme: base.textTheme.apply(
      bodyColor: p.ink,
      displayColor: p.ink,
      fontFamily: Fonts.text,
      fontFamilyFallback: Fonts.fallback,
    ),
    dividerColor: p.line,
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: dark ? Brand.navy2 : Brand.navy,
      contentTextStyle: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.w500,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? const Color(0x12FFFFFF) : Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: p.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(
          color: dark ? const Color(0x1AFFFFFF) : Brand.line,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Brand.orange, width: 1.5),
      ),
      labelStyle: TextStyle(color: p.muted),
      hintStyle: TextStyle(color: p.muted),
    ),
  );
}
