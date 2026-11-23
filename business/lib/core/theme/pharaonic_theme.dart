import 'package:flutter/material.dart';

import 'pharaonic.dart';
import 'pharaonic_widgets.dart';
import 'theme.dart';

/// 215 The Pharaonic theme, light or dark: the default theme's structure
/// in its own colors, with El Messiri for headings, IBM Plex Sans Arabic
/// (tabular figures) for everything else, every route on its painted
/// ground, the kheker frieze along each app bar, a metallic primary button
/// and a gold-edged active tab.
ThemeData buildPharaonicTheme({
  required bool arabic,
  Brightness brightness = Brightness.light,
}) {
  final c = PharaonicColors.of(brightness);
  final o = YbOrnaments.of(brightness);
  final base = themeFor(arabic: arabic, brightness: brightness, c: c);

  // Numbers line up and never jump: tabular figures throughout.
  const tabular = [FontFeature.tabularFigures(), FontFeature.liningFigures()];
  TextStyle? body(TextStyle? s) => s?.copyWith(
    fontFamily: arabicFont,
    fontFamilyFallback: const [arabicFont],
    fontFeatures: tabular,
    letterSpacing: 0,
  );
  TextStyle? display(TextStyle? s) => s?.copyWith(
    fontFamily: YbOrnaments.displayFont,
    fontFamilyFallback: const [arabicFont],
    fontFeatures: tabular,
    // Arabic is never letter-spaced (it would break the joins).
    letterSpacing: arabic ? 0 : 0.3,
  );
  final t = base.textTheme;
  final text = TextTheme(
    displaySmall: display(t.displaySmall),
    // The New order card's number is a headlineMedium: text font too.
    headlineMedium: body(t.headlineMedium),
    // Big numbers (Today's tiles, an order's number) use these: they stay
    // in the text font, crisp and tabular.
    headlineSmall: body(t.headlineSmall),
    titleLarge: body(t.titleLarge),
    titleMedium: display(t.titleMedium),
    titleSmall: body(t.titleSmall),
    bodyLarge: body(t.bodyLarge),
    bodyMedium: body(t.bodyMedium),
    bodySmall: body(t.bodySmall),
    labelLarge: body(t.labelLarge),
    labelMedium: body(t.labelMedium),
    labelSmall: body(t.labelSmall),
  );

  final platforms = const PageTransitionsTheme().builders;
  final rounded = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(14),
  );

  return base.copyWith(
    textTheme: text,
    // The ground is painted behind every route.
    scaffoldBackgroundColor: Colors.transparent,
    pageTransitionsTheme: PageTransitionsTheme(
      builders: {
        for (final e in platforms.entries)
          e.key: PharaonicPageTransitions(e.value),
      },
    ),
    appBarTheme: base.appBarTheme.copyWith(
      backgroundColor: Colors.transparent,
      toolbarHeight: kToolbarHeight + KhekerAppBarBorder.height,
      shape: KhekerAppBarBorder(o),
      titleTextStyle: display(t.titleLarge),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style:
          FilledButton.styleFrom(
            foregroundColor: o.buttonInk,
            disabledForegroundColor: c.ink2,
            minimumSize: const Size(64, 52),
            shape: rounded,
            textStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w700),
          ).copyWith(
            backgroundColor: const WidgetStatePropertyAll(Colors.transparent),
            backgroundBuilder: (context, states, child) => DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: states.contains(WidgetState.disabled)
                    ? null
                    : LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: o.buttonFill,
                      ),
                color: states.contains(WidgetState.disabled) ? c.muted : null,
                // The engraved edge.
                border: Border.all(color: o.buttonEdge),
                boxShadow: states.contains(WidgetState.disabled)
                    ? null
                    : [
                        BoxShadow(
                          color: o.dark
                              ? const Color(0x2EC99A3E)
                              : const Color(0x381C2A5C),
                          blurRadius: 18,
                          offset: const Offset(0, 6),
                        ),
                      ],
              ),
              child: child,
            ),
          ),
    ),
    cardTheme: base.cardTheme.copyWith(color: c.surface),
    navigationBarTheme: base.navigationBarTheme.copyWith(
      backgroundColor: o.nav,
      indicatorColor: c.muted,
      indicatorShape: MetalStadiumBorder(o),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => text.labelSmall?.copyWith(
          color: states.contains(WidgetState.selected) ? c.gold : c.ink2,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w700
              : FontWeight.w500,
        ),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          color: states.contains(WidgetState.selected) ? c.gold : c.ink2,
        ),
      ),
    ),
    listTileTheme: base.listTileTheme.copyWith(
      selectedColor: c.ink,
      selectedTileColor: o.faienceBg,
    ),
    extensions: [c, o],
  );
}
