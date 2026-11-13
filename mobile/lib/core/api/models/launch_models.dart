import 'json.dart';

/// 124.15 `Config.screens.launch`: the screen the app shows while it opens,
/// as its owner chose it in Yallapp Studio. Five looks: `signature` the logo
/// on a halo with a sliding bar, `cinema` a large photo with the name at its
/// foot, `aurora` drifting colours round a glass disc, `editorial` an arch
/// picture with the logo over its edge, `monogram` the mark in a turning
/// ring. Each part has the look's own default. The app keeps it on the
/// phone and shows it from its next start ([LaunchStore]).
enum LaunchStyle { signature, cinema, aurora, editorial, monogram }

enum LaunchBackgroundType { color, gradient, photo }

enum LaunchDirection { vertical, diagonal, radial }

enum LaunchLogo { icon, logo, picture }

enum LaunchLogoSize {
  s(0.75),
  m(0.88),
  l(1),
  xl(1.2);

  const LaunchLogoSize(this.scale);
  final double scale;
}

enum LaunchLogoShape { rounded, circle, asIs }

enum LaunchLoader { bar, ring, dots, steps, none }

enum LaunchTheme { system, light, dark }

T _pick<T extends Enum>(List<T> values, Object? name, T fallback) =>
    values.where((v) => _wire(v) == name).firstOrNull ?? fallback;

String _wire(Enum value) =>
    value == LaunchLogoShape.asIs ? 'as_is' : value.name;

String? _hex(Object? value) =>
    value is String && RegExp(r'^#[0-9A-Fa-f]{6}$').hasMatch(value)
    ? value.toUpperCase()
    : null;

String? _https(Object? value) =>
    value is String &&
        (value.startsWith('https://') || value.startsWith('http://localhost'))
    ? value
    : null;

Map<String, String> _texts(Object? value, int max) => {
  if (value is Map)
    for (final MapEntry(:key, value: text) in value.entries)
      if (key is String && text is String && text.trim().isNotEmpty)
        key: text.trim().upTo(max),
};

extension on String {
  String upTo(int max) {
    final runes = this.runes.toList();
    return runes.length <= max ? this : String.fromCharCodes(runes.take(max));
  }
}

/// Each look's own loading sign and background.
LaunchLoader launchDefaultLoader(LaunchStyle look) => switch (look) {
  LaunchStyle.signature || LaunchStyle.cinema => LaunchLoader.bar,
  LaunchStyle.aurora => LaunchLoader.dots,
  LaunchStyle.editorial => LaunchLoader.steps,
  LaunchStyle.monogram => LaunchLoader.ring,
};

LaunchBackgroundType launchDefaultBackground(LaunchStyle look) =>
    look == LaunchStyle.cinema || look == LaunchStyle.editorial
    ? LaunchBackgroundType.photo
    : LaunchBackgroundType.color;

/// How dark a photo is made under the words (0 to 80 %), as the designs have it.
int launchDefaultOverlay(LaunchStyle look, {required bool dark}) =>
    switch (look) {
      LaunchStyle.signature => dark ? 55 : 40,
      LaunchStyle.cinema => dark ? 25 : 0,
      LaunchStyle.aurora => dark ? 50 : 35,
      LaunchStyle.editorial => dark ? 28 : 0,
      LaunchStyle.monogram => dark ? 60 : 45,
    };

class LaunchBackground {
  const LaunchBackground({
    required this.type,
    this.color,
    this.from,
    this.to,
    this.direction = LaunchDirection.diagonal,
    this.imageUrl,
    this.overlay,
    this.textColor,
  });

  factory LaunchBackground.fromJson(Json json, LaunchStyle look) {
    final overlay = json['overlay'];
    return LaunchBackground(
      type: _pick(
        LaunchBackgroundType.values,
        json['type'],
        launchDefaultBackground(look),
      ),
      color: _hex(json['color']),
      from: _hex(json['from']),
      to: _hex(json['to']),
      direction: _pick(
        LaunchDirection.values,
        json['direction'],
        LaunchDirection.diagonal,
      ),
      imageUrl: _https(json['image_url']),
      overlay: overlay is num && overlay >= 0 && overlay <= 80
          ? overlay.round()
          : null,
      textColor: _hex(json['text_color']),
    );
  }

  final LaunchBackgroundType type;

  /// `#RRGGBB`; null, the look's own.
  final String? color;
  final String? from;
  final String? to;
  final LaunchDirection direction;
  final String? imageUrl;

  /// 0 to 80 (%); null, the look's own.
  final int? overlay;

  /// The words on it; null, light on dark and dark on light.
  final String? textColor;

  Json toJson() => {
    'type': type.name,
    'color': color,
    'from': from,
    'to': to,
    'direction': direction.name,
    'image_url': imageUrl,
    'overlay': overlay,
    'text_color': textColor,
  };
}

class LaunchLook {
  const LaunchLook({
    this.look = LaunchStyle.signature,
    this.background = const LaunchBackground(type: LaunchBackgroundType.color),
    this.backgroundDark,
    this.logo = LaunchLogo.logo,
    this.logoUrl,
    this.logoSize = LaunchLogoSize.l,
    this.logoShape = LaunchLogoShape.rounded,
    this.title = const {},
    this.subtitle = const {},
    this.loader = LaunchLoader.bar,
    this.theme = LaunchTheme.system,
    this.mainColor,
    this.secondColor,
  });

  /// Null when [value] isn't a launch screen.
  static LaunchLook? fromJson(Object? value) {
    if (value is! Map) return null;
    final json = value.cast<String, dynamic>();
    final look = _pick(LaunchStyle.values, json['look'], LaunchStyle.signature);
    final light = json['background'];
    final dark = json['background_dark'];
    final logo = _pick(LaunchLogo.values, json['logo'], LaunchLogo.logo);
    final logoUrl = _https(json['logo_url']);
    return LaunchLook(
      look: look,
      background: light is Map
          ? LaunchBackground.fromJson(light.cast<String, dynamic>(), look)
          : LaunchBackground(type: launchDefaultBackground(look)),
      backgroundDark: dark is Map
          ? LaunchBackground.fromJson(dark.cast<String, dynamic>(), look)
          : null,
      // A picture without its address shows the logo.
      logo: logo == LaunchLogo.picture && logoUrl == null
          ? LaunchLogo.logo
          : logo,
      logoUrl: logo == LaunchLogo.picture ? logoUrl : null,
      logoSize: _pick(
        LaunchLogoSize.values,
        json['logo_size'],
        LaunchLogoSize.l,
      ),
      logoShape: _pick(
        LaunchLogoShape.values,
        json['logo_shape'],
        LaunchLogoShape.rounded,
      ),
      title: _texts(json['title'], 40),
      subtitle: _texts(json['subtitle'], 80),
      loader: _pick(
        LaunchLoader.values,
        json['loader'],
        launchDefaultLoader(look),
      ),
      theme: _pick(LaunchTheme.values, json['theme'], LaunchTheme.system),
      mainColor: _hex(json['main_color']),
      secondColor: _hex(json['second_color']),
    );
  }

  final LaunchStyle look;
  final LaunchBackground background;

  /// Null: the look's own dark colours (a photo stays, darker).
  final LaunchBackground? backgroundDark;
  final LaunchLogo logo;
  final String? logoUrl;
  final LaunchLogoSize logoSize;
  final LaunchLogoShape logoShape;
  final Map<String, String> title;
  final Map<String, String> subtitle;
  final LaunchLoader loader;
  final LaunchTheme theme;
  final String? mainColor;
  final String? secondColor;

  /// The background shown in dark.
  LaunchBackground get darkBackground {
    if (backgroundDark case final own?) return own;
    if (background.type == LaunchBackgroundType.photo) {
      return LaunchBackground(
        type: LaunchBackgroundType.photo,
        imageUrl: background.imageUrl,
      );
    }
    return LaunchBackground(type: launchDefaultBackground(look));
  }

  Json toJson() => {
    'look': look.name,
    'background': background.toJson(),
    'background_dark': backgroundDark?.toJson(),
    'logo': logo.name,
    'logo_url': logoUrl,
    'logo_size': logoSize.name,
    'logo_shape': _wire(logoShape),
    'title': title,
    'subtitle': subtitle,
    'loader': loader.name,
    'theme': theme.name,
    'main_color': mainColor,
    'second_color': secondColor,
  };
}
