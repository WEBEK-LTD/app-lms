import 'package:flutter/material.dart';

import '../api/models/launch_models.dart';
import '../theme/palette.dart';

/// 124.15 What fills the launch screen, or Cinema's and Editorial's picture.
sealed class LaunchFill {
  const LaunchFill();
}

class LaunchColorFill extends LaunchFill {
  const LaunchColorFill(this.color);
  final Color color;
}

class LaunchGradientFill extends LaunchFill {
  const LaunchGradientFill(this.from, this.to, this.direction);
  final Color from;
  final Color to;
  final LaunchDirection direction;

  Gradient get gradient => switch (direction) {
    LaunchDirection.radial => RadialGradient(
      center: const Alignment(0, -0.2),
      radius: 0.95,
      colors: [from, to],
    ),
    LaunchDirection.vertical => LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [from, to],
    ),
    LaunchDirection.diagonal => LinearGradient(
      begin: const Alignment(-0.6, -1),
      end: const Alignment(0.6, 1),
      colors: [from, to],
    ),
  };
}

class LaunchPhotoFill extends LaunchFill {
  const LaunchPhotoFill(this.url, this.overlay, this.fallback);
  final String url;

  /// 0 to 80 (%).
  final int overlay;

  /// Shown until the photo is there, and when it can't be.
  final LaunchGradientFill fallback;
}

enum LaunchTile { brand, card, glass }

/// 124.15 The launch screen's colours in light or dark, as Studio's preview
/// works them out (platform/web/src/lib/studio/launch.ts): the background,
/// the words light on a dark one and dark on a light one (unless the owner
/// chose their colour), and the second colour lighter on a dark background.
@immutable
class LaunchColors {
  const LaunchColors._({
    required this.dark,
    required this.main,
    required this.second,
    required this.screen,
    required this.picture,
    required this.surface,
    required this.onDark,
    required this.text,
    required this.muted,
    required this.accent,
    required this.track,
    required this.tile,
    required this.onTile,
    required this.card,
  });

  factory LaunchColors.resolve(
    LaunchLook launch, {
    required Color main,
    required Color second,
    required bool dark,
  }) {
    final m = parseHexColor(launch.mainColor) ?? main;
    final s = parseHexColor(launch.secondColor) ?? second;
    final palette = AppPalette.build(
      primary: m,
      brightness: dark ? Brightness.dark : Brightness.light,
    );
    final page = palette.background;
    final bg = dark ? launch.darkBackground : launch.background;
    final own = launch.look == LaunchStyle.monogram && !dark ? m : page;
    LaunchGradientFill gradient([
      Color? from,
      Color? to,
      LaunchDirection direction = LaunchDirection.diagonal,
    ]) => LaunchGradientFill(from ?? m, to ?? s, direction);
    final LaunchFill fill = switch (bg.type) {
      LaunchBackgroundType.color => LaunchColorFill(
        parseHexColor(bg.color) ?? own,
      ),
      LaunchBackgroundType.gradient => gradient(
        parseHexColor(bg.from),
        parseHexColor(bg.to),
        bg.direction,
      ),
      LaunchBackgroundType.photo =>
        bg.imageUrl == null
            ? gradient()
            : LaunchPhotoFill(
                bg.imageUrl!,
                bg.overlay ?? launchDefaultOverlay(launch.look, dark: dark),
                gradient(),
              ),
    };
    final framed =
        (launch.look == LaunchStyle.cinema ||
            launch.look == LaunchStyle.editorial) &&
        bg.type == LaunchBackgroundType.photo;
    final surface = framed ? page : _readsAs(fill);
    final onDark =
        contrastRatio(BrandColors.ivory, surface) >=
        contrastRatio(BrandColors.midnight, surface);
    final own2 = parseHexColor(bg.textColor);
    final isPage =
        framed || (bg.type == LaunchBackgroundType.color && bg.color == null);
    final tile = !onDark
        ? LaunchTile.brand
        : dark && isPage
        ? LaunchTile.card
        : LaunchTile.glass;
    return LaunchColors._(
      dark: dark,
      main: m,
      second: s,
      screen: framed ? LaunchColorFill(page) : fill,
      picture: framed ? fill : null,
      surface: surface,
      onDark: onDark,
      text: own2 ?? (onDark ? BrandColors.ivory : BrandColors.midnight),
      muted: own2 != null
          ? own2.withValues(alpha: 0.72)
          : onDark
          ? (surface == darkBackground
                ? const Color(0xFFB9B5CA)
                : BrandColors.ivory.withValues(alpha: 0.72))
          : const Color(0xFF5E5B70),
      accent: onDark ? glow(s) : s,
      track: onDark
          ? BrandColors.ivory.withValues(alpha: 0.16)
          : s.withValues(alpha: 0.18),
      tile: tile,
      onTile: tile == LaunchTile.brand ? _onBrand(m, s) : glow(s),
      card: darkSurface,
    );
  }

  final bool dark;
  final Color main;
  final Color second;

  /// What fills the screen.
  final LaunchFill screen;

  /// Cinema's and Editorial's picture (the photo, or the gradient until
  /// there is one); the words are then on the page colour.
  final LaunchFill? picture;

  /// The colour the words sit on.
  final Color surface;
  final bool onDark;
  final Color text;
  final Color muted;
  final Color accent;
  final Color track;
  final LaunchTile tile;

  /// The initials on the tile: the second colour, lighter on a dark one.
  final Color onTile;
  final Color card;

  /// The dots' and steps' colour: the words' on a dark background, else the main colour.
  Color get mark => onDark ? text : main;
}

/// The one colour a fill reads as, for the words on it.
Color _readsAs(LaunchFill fill) => switch (fill) {
  LaunchColorFill(:final color) => color,
  LaunchGradientFill(:final from, :final to) => Color.lerp(from, to, 0.5)!,
  LaunchPhotoFill(:final overlay) => Color.lerp(
    const Color(0xFF808080),
    const Color(0xFF000000),
    overlay / 100,
  )!,
};

/// The second colour on a tile of the main colour: lighter when the tile
/// is dark, else as it is, else the words' colour.
Color _onBrand(Color main, Color second) {
  final light = glow(second);
  if (contrastRatio(light, main) >= 3) return light;
  if (contrastRatio(second, main) >= 3) return second;
  return main.computeLuminance() > 0.4
      ? BrandColors.midnight
      : BrandColors.ivory;
}

/// [color] made light enough to glow on a dark background, keeping its hue
/// (#B8893A → about #E2BE74).
Color glow(Color color) {
  final hsl = HSLColor.fromColor(color);
  return hsl
      .withLightness(hsl.lightness < 0.68 ? 0.68 : hsl.lightness)
      .withSaturation((hsl.saturation * 1.2).clamp(0, 1))
      .toColor();
}
