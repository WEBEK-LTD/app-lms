import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/models/models.dart';
import '../config/build_config_data.dart';
import '../gate/app_gate.dart';
import '../providers.dart';
import '../storage/local_settings.dart';
import 'app_theme.dart';
import 'fonts/remote_fonts.dart';
import 'palette.dart';

/// The app's look: the build config's defaults with `Config.appearance`
/// from the client dashboard on top. Changes without a new build.
@immutable
class AppLook {
  const AppLook({
    required this.template,
    required this.font,
    this.fallback = fontFallback,
    required this.primary,
    this.secondary,
    this.corners,
    this.cards,
    this.defaultThemeMode = ThemeMode.system,
    this.userCanChangeMode = true,
  });

  /// [ready]: the free fonts on the phone now (`remoteFontsProvider`).
  factory AppLook.resolve(
    BuildConfigData build,
    AppConfig? config, {
    Set<String> ready = const {},
  }) {
    final appearance = config?.appearance;
    final template = appearance?.template ?? build.template;
    final remoteFont = appearance?.font;
    bool usable(String? family) =>
        family != null &&
        (bundledFonts.contains(family) ||
            fontFallback.contains(family) ||
            ready.contains(family));
    final chosen = appearance?.fontFamily;
    final arabic = appearance?.arabicFont;
    return AppLook(
      template: template,
      // 97.1 A free font once it's on the phone; until then the bundled one named with it.
      font: usable(chosen)
          ? chosen!
          : remoteFont != null && bundledFonts.contains(remoteFont)
          ? remoteFont
          : resolveFont(build.font, template),
      fallback: usable(arabic) ? [arabic!, ...fontFallback] : fontFallback,
      primary:
          parseHexColor(config?.branding.primaryColor) ??
          Color(build.primaryColor),
      secondary: parseHexColor(appearance?.secondaryColor),
      corners: appearance?.corners,
      cards: appearance?.cards,
      defaultThemeMode: switch (appearance?.themeMode) {
        AppearanceMode.light => ThemeMode.light,
        AppearanceMode.dark => ThemeMode.dark,
        AppearanceMode.system || null => ThemeMode.system,
      },
      userCanChangeMode: appearance?.userCanChangeMode ?? true,
    );
  }

  final AppTemplate template;
  final String font;

  /// Fonts for letters [font] doesn't draw: the Arabic text's font first.
  final List<String> fallback;
  final Color primary;

  /// Replaces Ember as the accent when set.
  final Color? secondary;

  /// `null` keeps each component's designed corners and card style.
  final CornerStyle? corners;
  final CardStyle? cards;

  /// The mode the app opens in until the student picks one.
  final ThemeMode defaultThemeMode;

  /// Whether Settings shows the light and dark switch.
  final bool userCanChangeMode;

  /// The student's choice when allowed and made, else the client's default.
  ThemeMode themeModeFor(LocalSettings settings) =>
      userCanChangeMode && settings.themeModeChosen
      ? settings.themeMode
      : defaultThemeMode;

  ThemeData theme(Brightness brightness) => buildAppTheme(
    primary: primary,
    secondary: secondary,
    brightness: brightness,
    template: template,
    fontFamily: font,
    corners: corners,
    cards: cards,
    fallback: fallback,
  );
}

final appLookProvider = Provider<AppLook>((ref) {
  final build = ref.watch(appEnvironmentProvider).build;
  final gate = ref.watch(appGateProvider);
  final config = gate is GateReady ? gate.config : null;
  // 97.1 The look's free fonts: downloaded (or read from the phone) once.
  final appearance = config?.appearance;
  if (appearance != null) {
    final fonts = ref.read(remoteFontsProvider.notifier);
    Future.microtask(() async {
      if (appearance.fontFamily case final family?) {
        await fonts.ensure(family, appearance.fontFiles);
      }
      if (appearance.arabicFont case final family?) {
        await fonts.ensure(family, appearance.arabicFontFiles);
      }
    });
  }
  return AppLook.resolve(build, config, ready: ref.watch(remoteFontsProvider));
});
