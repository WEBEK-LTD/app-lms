import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api/models/models.dart';
import '../l10n/l10n.dart';
import '../theme/palette.dart';
import '../widgets/common.dart';
import 'launch_colors.dart';

/// 124.15 The launch screen: what the app shows while it opens, in the look
/// its owner chose in Yallapp Studio (Signature until there is one). Every
/// look works in light and dark, right to left, and stands still for people
/// who turn movement off.
class LaunchScreen extends StatelessWidget {
  const LaunchScreen({
    super.key,
    required this.look,
    required this.appName,
    this.shortName,
    required this.main,
    this.second,
    this.logoUrl,
    this.iconUrl,
  });

  final LaunchLook look;

  /// The title when the owner gave none, and its initials without a logo.
  final String appName;

  /// Its initials come from this name when given (the build's short name).
  final String? shortName;
  final Color main;

  /// Null: the app's accent.
  final Color? second;
  final String? logoUrl;
  final String? iconUrl;

  @override
  Widget build(BuildContext context) {
    final dark = switch (look.theme) {
      LaunchTheme.light => false,
      LaunchTheme.dark => true,
      LaunchTheme.system => Theme.of(context).brightness == Brightness.dark,
    };
    final c = LaunchColors.resolve(
      look,
      main: main,
      second: second ?? context.palette.accent,
      dark: dark,
    );
    final language = Localizations.localeOf(context).languageCode;
    final subtitle = textFor(look.subtitle, language);
    final data = _Launch(
      look: look,
      c: c,
      title: textFor(look.title, language) ?? appName,
      subtitle: subtitle == null || subtitle.isEmpty ? null : subtitle,
      welcome: context.l10n.launchWelcome,
      language: language,
      picture: switch (look.logo) {
        LaunchLogo.picture => look.logoUrl ?? logoUrl ?? iconUrl,
        LaunchLogo.icon => iconUrl ?? logoUrl,
        LaunchLogo.logo => logoUrl ?? iconUrl,
      },
      initials: _initials(shortName ?? appName),
      k: look.logoSize.scale,
    );
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: c.onDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      child: Scaffold(
        key: ValueKey('launch-${look.look.name}'),
        backgroundColor: c.surface,
        body: SizedBox.expand(
          child: switch (look.look) {
            LaunchStyle.signature => _Signature(data),
            LaunchStyle.cinema => _Cinema(data),
            LaunchStyle.aurora => _Aurora(data),
            LaunchStyle.editorial => _Editorial(data),
            LaunchStyle.monogram => _Monogram(data),
          },
        ),
      ),
    );
  }
}

String _initials(String name) {
  final words = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
  final letters = words.take(2).map(nameInitial).join();
  return letters.isEmpty ? 'A' : letters;
}

final _arabic = RegExp('[؀-ۿݐ-ݿࢠ-ࣿ]');

class _Launch {
  const _Launch({
    required this.look,
    required this.c,
    required this.title,
    required this.subtitle,
    required this.welcome,
    required this.language,
    required this.picture,
    required this.initials,
    required this.k,
  });

  final LaunchLook look;
  final LaunchColors c;
  final String title;
  final String? subtitle;
  final String welcome;
  final String language;
  final String? picture;
  final String initials;

  /// The logo's size.
  final double k;

  /// Letter spacing, never inside Arabic words (it would break their joins).
  double spacing(String text, double value) =>
      _arabic.hasMatch(text) ? 0 : value;

  /// In capitals, as the language writes them (Turkish dotted İ).
  String upper(String text) =>
      (language == 'tr' ? text.replaceAll('i', 'İ') : text).toUpperCase();

  /// The initials' size: a little smaller for two letters.
  double letters(double size) =>
      initials.characters.length > 1 ? size * 0.78 : size;
}

/// Repeats [builder]'s movement every [period]; still at [still] when the
/// phone asks for less movement.
class _Loop extends StatefulWidget {
  const _Loop({
    required this.period,
    required this.builder,
    this.reverse = false,
    this.still = 0,
  });

  final Duration period;
  final bool reverse;
  final double still;
  final Widget Function(BuildContext context, double t) builder;

  @override
  State<_Loop> createState() => _LoopState();
}

class _LoopState extends State<_Loop> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: widget.period,
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller
        ..stop()
        ..value = widget.still;
    } else if (!_controller.isAnimating) {
      _controller.repeat(reverse: widget.reverse);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _controller,
    builder: (context, _) => widget.builder(context, _controller.value),
  );
}

/// Up then back down within one period, eased each way (a CSS keyframe at 50%).
double _there(double t) =>
    Curves.easeInOut.transform(t < 0.5 ? t * 2 : 2 - t * 2);

/// [t] started [delay] (a share of the period) later.
double _late(double t, double delay) => (t - delay + 1) % 1;

/// What fills the screen, or a picture: a colour, a gradient, or the photo
/// (over the gradient until it is there) made darker.
class _Fill extends StatelessWidget {
  const _Fill(this.fill);

  final LaunchFill fill;

  @override
  Widget build(BuildContext context) => switch (fill) {
    LaunchColorFill(:final color) => ColoredBox(color: color),
    final LaunchGradientFill g => DecoratedBox(
      decoration: BoxDecoration(gradient: g.gradient),
    ),
    LaunchPhotoFill(:final url, :final overlay, :final fallback) => Stack(
      fit: StackFit.expand,
      children: [
        AppNetworkImage(url: url, placeholder: _Fill(fallback)),
        ColoredBox(color: Colors.black.withValues(alpha: overlay / 100)),
      ],
    ),
  };
}

/// The logo on its tile: the picture (filling the tile, or whole without
/// one when kept as it is) or the initials in the second colour.
class _Logo extends StatelessWidget {
  const _Logo(
    this.d, {
    required this.size,
    required this.radius,
    this.decoration,
    required this.letters,
    this.border,
  });

  final _Launch d;
  final double size;
  final double radius;
  final BoxDecoration? decoration;
  final double letters;

  /// Editorial's ring of the page colour round the tile.
  final Color? border;

  @override
  Widget build(BuildContext context) {
    final circle = d.look.logoShape == LaunchLogoShape.circle;
    final asIs = d.look.logoShape == LaunchLogoShape.asIs && d.picture != null;
    if (asIs) {
      return SizedBox(
        key: const ValueKey('launch-logo'),
        width: size,
        height: size,
        child: AppNetworkImage(
          url: d.picture,
          fit: BoxFit.contain,
          clearPlaceholder: true,
          placeholder: const SizedBox.shrink(),
        ),
      );
    }
    final shape = circle
        ? const CircleBorder()
        : RoundedRectangleBorder(borderRadius: BorderRadius.circular(radius));
    final base = decoration ?? const BoxDecoration();
    final tile = Container(
      key: const ValueKey('launch-logo'),
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: base.copyWith(
        borderRadius: circle ? null : BorderRadius.circular(radius),
        shape: circle ? BoxShape.circle : BoxShape.rectangle,
      ),
      alignment: Alignment.center,
      child: d.picture != null
          ? SizedBox.expand(
              child: AppNetworkImage(
                url: d.picture,
                placeholder: Center(child: _letters(context)),
              ),
            )
          : _letters(context),
    );
    if (border == null) return tile;
    return DecoratedBox(
      decoration: ShapeDecoration(
        shape: shape.copyWith(side: BorderSide(color: border!, width: 4)),
      ),
      child: Padding(padding: const EdgeInsets.all(4), child: tile),
    );
  }

  Widget _letters(BuildContext context) => Text(
    d.initials,
    maxLines: 1,
    style: TextStyle(
      fontSize: d.letters(letters),
      height: 1,
      fontWeight: FontWeight.w700,
      color: d.c.onTile,
      letterSpacing: d.spacing(d.initials, -2),
    ),
  );
}

/// The tile's look: the main colour, the dark card, or glass on a coloured background.
BoxDecoration _tile(LaunchColors c, {double shadowY = 18, double blur = 40}) {
  final border = Border.all(color: c.accent.withValues(alpha: 0.38));
  return switch (c.tile) {
    LaunchTile.brand => BoxDecoration(
      gradient: LinearGradient(
        begin: const Alignment(-0.36, -1),
        end: const Alignment(0.36, 1),
        stops: const [0, 0.55, 1],
        colors: [
          Color.lerp(c.main, Colors.white, 0.08)!,
          c.main,
          Color.lerp(c.main, Colors.black, 0.3)!,
        ],
      ),
      border: border,
      boxShadow: [
        BoxShadow(
          color: c.main.withValues(alpha: 0.35),
          blurRadius: blur,
          offset: Offset(0, shadowY),
        ),
      ],
    ),
    LaunchTile.card => BoxDecoration(
      gradient: LinearGradient(
        begin: const Alignment(-0.36, -1),
        end: const Alignment(0.36, 1),
        colors: [Color.lerp(c.card, Colors.white, 0.04)!, c.card],
      ),
      border: Border.all(color: c.accent.withValues(alpha: 0.42)),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.5),
          blurRadius: blur,
          offset: Offset(0, shadowY),
        ),
      ],
    ),
    LaunchTile.glass => BoxDecoration(
      color: Colors.white.withValues(alpha: 0.12),
      border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.25),
          blurRadius: blur,
          offset: Offset(0, shadowY),
        ),
      ],
    ),
  };
}

/// The loading sign the owner chose, in the second colour on its track,
/// named for screen readers.
class _Loader extends StatelessWidget {
  const _Loader(this.d, {this.width = 120, this.line = false});

  final _Launch d;
  final double width;

  /// Cinema's: a thin line filling, the width of the words.
  final bool line;

  @override
  Widget build(BuildContext context) {
    final c = d.c;
    final label = context.l10n.loading;
    final Widget sign = switch (d.look.loader) {
      LaunchLoader.none => const SizedBox.shrink(),
      LaunchLoader.bar when line => _Loop(
        period: const Duration(milliseconds: 2200),
        still: 0.35,
        builder: (context, t) => _Track(
          width: width,
          height: 2,
          color: c.track,
          child: FractionallySizedBox(
            alignment: AlignmentDirectional.centerStart,
            widthFactor: t < 0.7
                ? const Cubic(0.5, 0, 0.2, 1).transform(t / 0.7)
                : 1,
            child: ColoredBox(color: c.accent),
          ),
        ),
      ),
      LaunchLoader.bar => _Loop(
        period: const Duration(milliseconds: 1600),
        still: 0.4,
        builder: (context, t) {
          final e = const Cubic(0.6, 0, 0.3, 1).transform(t);
          final piece = width * 0.4;
          // From a piece's width before the start to past the end.
          final x = -piece + (piece * 3.5) * e;
          final rtl = Directionality.of(context) == TextDirection.rtl;
          return _Track(
            width: width,
            height: 3,
            color: c.track,
            child: Stack(
              children: [
                Positioned(
                  left: rtl ? width - piece - x : x,
                  top: 0,
                  bottom: 0,
                  width: piece,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: c.accent,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
      LaunchLoader.ring => _Loop(
        period: const Duration(milliseconds: 2400),
        still: 0.25,
        builder: (context, t) => CustomPaint(
          size: const Size.square(26),
          painter: _RingPainter(
            t: t,
            radius: 11,
            track: c.track,
            arc: c.accent,
            stroke: 2.5,
            trackStroke: 2.5,
          ),
        ),
      ),
      LaunchLoader.dots => _Loop(
        period: const Duration(milliseconds: 1200),
        still: 0.16,
        builder: (context, t) => Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < 3; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              Builder(
                builder: (context) {
                  final u = _late(t, i * 0.125);
                  final v = u < 0.4
                      ? Curves.easeInOut.transform(u / 0.4)
                      : u < 0.8
                      ? 1 - Curves.easeInOut.transform((u - 0.4) / 0.4)
                      : 0.0;
                  return Transform.translate(
                    offset: Offset(0, -4 * v),
                    child: Opacity(
                      opacity: 0.25 + 0.75 * v,
                      child: _Dot(
                        width: 7,
                        height: 7,
                        color: i == 2 ? c.accent : c.mark,
                        round: true,
                      ),
                    ),
                  );
                },
              ),
            ],
          ],
        ),
      ),
      LaunchLoader.steps => _Loop(
        period: const Duration(milliseconds: 1400),
        still: 0.25,
        builder: (context, t) => Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < 4; i++) ...[
              if (i > 0) const SizedBox(width: 6),
              Opacity(
                opacity: 0.25 + 0.75 * _there(_late(t, i / 7)),
                child: _Dot(
                  width: 22,
                  height: 4,
                  color: i == 3 ? c.accent : c.mark,
                ),
              ),
            ],
          ],
        ),
      ),
    };
    return Semantics(
      key: const ValueKey('launch-loader'),
      label: label,
      child: ExcludeSemantics(child: sign),
    );
  }
}

class _Track extends StatelessWidget {
  const _Track({
    required this.width,
    required this.height,
    required this.color,
    required this.child,
  });

  final double width;
  final double height;
  final Color color;
  final Widget child;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(3),
    child: SizedBox(
      width: width,
      height: height,
      child: ColoredBox(color: color, child: child),
    ),
  );
}

class _Dot extends StatelessWidget {
  const _Dot({
    required this.width,
    required this.height,
    required this.color,
    this.round = false,
  });

  final double width;
  final double height;
  final Color color;
  final bool round;

  @override
  Widget build(BuildContext context) => Container(
    width: width,
    height: height,
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(round ? width / 2 : 4),
    ),
  );
}

/// A ring with an arc going round it, growing and shrinking.
class _RingPainter extends CustomPainter {
  const _RingPainter({
    required this.t,
    required this.radius,
    required this.track,
    required this.arc,
    required this.stroke,
    required this.trackStroke,
    this.showArc = true,
  });

  final double t;
  final double radius;
  final Color track;
  final Color arc;
  final double stroke;
  final double trackStroke;
  final bool showArc;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = trackStroke
        ..color = track,
    );
    if (!showArc) return;
    // The arc: from a fifteenth of the ring to two thirds and back.
    final offset = 540 - 340 * _there(t);
    final sweep = (578 - offset) / 578 * 2 * math.pi;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      t * 2 * math.pi,
      sweep,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..color = arc,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.t != t || old.arc != arc || old.track != track;
}

/// The soft light of the second colour round the middle of the page.
class _Glow extends StatelessWidget {
  const _Glow(this.c, {required this.y, required this.radius});

  final LaunchColors c;
  final double y;
  final double radius;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      gradient: RadialGradient(
        center: Alignment(0, y),
        radius: radius,
        stops: const [0, 0.7],
        colors: [
          c.accent.withValues(alpha: 0.16),
          c.accent.withValues(alpha: 0),
        ],
      ),
    ),
  );
}

class _Words extends StatelessWidget {
  const _Words(
    this.d, {
    required this.size,
    required this.weight,
    required this.spacing,
  });

  final _Launch d;
  final double size;
  final FontWeight weight;
  final double spacing;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 28),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          d.title,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: size,
            fontWeight: weight,
            height: 1.15,
            color: d.c.text,
            letterSpacing: d.spacing(d.title, spacing),
          ),
        ),
        if (d.subtitle case final line?) ...[
          const SizedBox(height: 8),
          Text(
            line,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: d.c.muted, height: 1.4),
          ),
        ],
      ],
    ),
  );
}

/// 1 · Signature: the logo on its tile with two halo rings, the name and
/// the line under it, and a bar sliding at the foot.
class _Signature extends StatelessWidget {
  const _Signature(this.d);

  final _Launch d;

  @override
  Widget build(BuildContext context) {
    final c = d.c;
    final k = d.k;
    final circle = d.look.logoShape == LaunchLogoShape.circle;
    Widget halo(double scale, double opacity, double alpha) => Transform.scale(
      scale: scale,
      child: Opacity(
        opacity: opacity,
        child: Container(
          decoration: BoxDecoration(
            shape: circle ? BoxShape.circle : BoxShape.rectangle,
            borderRadius: circle ? null : BorderRadius.circular(40 * k),
            border: Border.all(
              color: c.accent.withValues(alpha: alpha),
              width: 1.5,
            ),
          ),
        ),
      ),
    );
    return Stack(
      fit: StackFit.expand,
      children: [
        _Fill(c.screen),
        if (c.screen is LaunchColorFill) _Glow(c, y: -0.12, radius: 0.54),
        Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox.square(
                dimension: 132 * k,
                child: Stack(
                  fit: StackFit.expand,
                  alignment: Alignment.center,
                  children: [
                    _Loop(
                      period: const Duration(milliseconds: 2400),
                      still: 0.2,
                      builder: (context, t) {
                        Widget ring(double u, double alpha) {
                          final e = Curves.easeOut.transform(u);
                          return halo(0.86 + 0.49 * e, 1 - e, alpha);
                        }

                        return Stack(
                          fit: StackFit.expand,
                          children: [ring(t, 0.55), ring(_late(t, 0.5), 0.4)],
                        );
                      },
                    ),
                    Center(
                      child: _Logo(
                        d,
                        size: 116 * k,
                        radius: 34 * k,
                        decoration: _tile(c),
                        letters: 60 * k,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 34),
              _Words(d, size: 26, weight: FontWeight.w700, spacing: -0.4),
            ],
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 92,
          child: Center(child: _Loader(d)),
        ),
      ],
    );
  }
}

/// 2 · Cinema: the photo large and slowly coming closer, fading into the
/// page, the logo, the name large and a line filling at its foot.
class _Cinema extends StatelessWidget {
  const _Cinema(this.d);

  final _Launch d;

  @override
  Widget build(BuildContext context) {
    final c = d.c;
    final k = d.k;
    final page = c.surface;
    final tile = switch (c.tile) {
      LaunchTile.brand => BoxDecoration(
        color: c.main,
        boxShadow: [
          BoxShadow(
            color: c.main.withValues(alpha: 0.3),
            blurRadius: 28,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      LaunchTile.card => BoxDecoration(
        color: c.card.withValues(alpha: 0.75),
        border: Border.all(color: c.accent.withValues(alpha: 0.45)),
      ),
      LaunchTile.glass => _tile(c, shadowY: 12, blur: 28),
    };
    return LayoutBuilder(
      builder: (context, box) {
        final height = box.maxHeight;
        return Stack(
          fit: StackFit.expand,
          children: [
            _Fill(c.screen),
            if (c.picture case final picture?) ...[
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: c.dark ? height : height * 0.664,
                child: ClipRect(
                  child: _Loop(
                    period: const Duration(seconds: 6),
                    reverse: true,
                    builder: (context, t) => Transform.scale(
                      scale: 1.02 + 0.1 * Curves.easeOut.transform(t),
                      child: _Fill(picture),
                    ),
                  ),
                ),
              ),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: c.dark
                        ? const [0, 0.3, 0.62, 0.82]
                        : const [0, 0.34, 0.58, 0.68],
                    colors: c.dark
                        ? [
                            page.withValues(alpha: 0.25),
                            page.withValues(alpha: 0.2),
                            page.withValues(alpha: 0.82),
                            page,
                          ]
                        : [
                            page.withValues(alpha: 0),
                            page.withValues(alpha: 0),
                            page.withValues(alpha: 0.85),
                            page,
                          ],
                  ),
                ),
              ),
            ],
            Positioned(
              left: 28,
              right: 28,
              bottom: 84,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Logo(
                    d,
                    size: 64 * k,
                    radius: 20 * k,
                    decoration: tile,
                    letters: 32 * k,
                  ),
                  const SizedBox(height: 14),
                  Text(
                    d.title,
                    style: TextStyle(
                      fontSize: 38,
                      height: 1.1,
                      fontWeight: FontWeight.w800,
                      color: c.text,
                      letterSpacing: d.spacing(d.title, -0.8),
                    ),
                  ),
                  if (d.subtitle case final line?) ...[
                    const SizedBox(height: 14),
                    Text(line, style: TextStyle(fontSize: 15, color: c.muted)),
                  ],
                  if (d.look.loader != LaunchLoader.none) ...[
                    const SizedBox(height: 24),
                    LayoutBuilder(
                      builder: (context, row) =>
                          _Loader(d, width: row.maxWidth, line: true),
                    ),
                  ] else
                    _Loader(d),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

/// A soft blot of colour drifting.
class _Blob extends StatelessWidget {
  const _Blob({
    required this.color,
    required this.opacity,
    required this.size,
    required this.blur,
  });

  final Color color;
  final double opacity;
  final double size;
  final double blur;

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: size + blur * 2,
    child: DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          stops: const [0, 0.42, 1],
          colors: [
            color.withValues(alpha: opacity),
            color.withValues(alpha: opacity * 0.55),
            color.withValues(alpha: 0),
          ],
        ),
      ),
    ),
  );
}

/// 3 · Aurora: the main and second colours drifting, blurred, round a
/// glass disc with rings pulsing out of it, and three dots bouncing.
class _Aurora extends StatelessWidget {
  const _Aurora(this.d);

  final _Launch d;

  @override
  Widget build(BuildContext context) {
    final c = d.c;
    final k = d.k;
    final dark = c.dark;
    final disc = 118 * k;
    final b1 = dark ? 380.0 : 340.0;
    final b2 = dark ? 380.0 : 360.0;
    final blur1 = dark ? 80.0 : 70.0;
    final blur2 = dark ? 90.0 : 80.0;
    final ringLine = c.onDark
        ? BrandColors.ivory.withValues(alpha: 0.3)
        : c.main.withValues(alpha: 0.35);
    return Stack(
      fit: StackFit.expand,
      clipBehavior: Clip.hardEdge,
      children: [
        _Fill(c.screen),
        _Loop(
          period: const Duration(seconds: 56),
          still: 0,
          builder: (context, t) {
            // 7 s and 8 s, from one clock of 56 s.
            final p1 = _there((t * 8) % 1);
            final p2 = _there((t * 7) % 1);
            return Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned(
                  top: (dark ? 60 : 90) - blur1,
                  left: (dark ? -100 : -80) - blur1,
                  child: Transform.translate(
                    offset: Offset(24 * p1, -30 * p1),
                    child: Transform.scale(
                      scale: 1 + 0.12 * p1,
                      child: _Blob(
                        color: dark
                            ? Color.lerp(c.main, Colors.white, 0.2)!
                            : c.main,
                        opacity: dark ? 0.55 : 0.22,
                        size: b1,
                        blur: blur1,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  bottom: (dark ? 60 : 70) - blur2,
                  right: (dark ? -100 : -90) - blur2,
                  child: Transform.translate(
                    offset: Offset(-30 * p2, 26 * p2),
                    child: Transform.scale(
                      scale: 1.05 - 0.1 * p2,
                      child: _Blob(
                        color: c.second,
                        opacity: dark ? 0.4 : 0.3,
                        size: b2,
                        blur: blur2,
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
        Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox.square(
                dimension: 150 * k,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Positioned.fill(
                      child: Padding(
                        padding: EdgeInsets.all(16 * k),
                        child: _Loop(
                          period: const Duration(milliseconds: 2600),
                          still: 0.3,
                          builder: (context, t) {
                            Widget ring(double u, Color color) {
                              final e = Curves.easeOut.transform(u);
                              return Transform.scale(
                                scale: 0.9 + 0.7 * e,
                                child: Opacity(
                                  opacity: 0.6 * (1 - e),
                                  child: DecoratedBox(
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: color,
                                        width: 1.5,
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }

                            return Stack(
                              fit: StackFit.expand,
                              children: [
                                ring(t, ringLine),
                                ring(
                                  _late(t, 0.5),
                                  c.accent.withValues(alpha: 0.45),
                                ),
                              ],
                            );
                          },
                        ),
                      ),
                    ),
                    Container(
                      width: disc,
                      height: disc,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(
                          alpha: c.onDark ? 0.08 : 0.7,
                        ),
                        border: Border.all(
                          color: Colors.white.withValues(
                            alpha: c.onDark ? 0.18 : 0.9,
                          ),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: c.onDark
                                ? Colors.black.withValues(alpha: 0.4)
                                : c.main.withValues(alpha: 0.18),
                            blurRadius: 44,
                            offset: const Offset(0, 20),
                          ),
                        ],
                      ),
                      alignment: Alignment.center,
                      child: d.picture != null
                          ? _Logo(
                              d,
                              size: disc * 0.62,
                              radius: disc * 0.18,
                              letters: 0,
                            )
                          : Text(
                              d.initials,
                              key: const ValueKey('launch-logo'),
                              style: TextStyle(
                                fontSize: d.letters(54 * k),
                                fontWeight: FontWeight.w700,
                                height: 1,
                                color: c.onDark ? c.accent : c.main,
                              ),
                            ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              _Words(d, size: 28, weight: FontWeight.w800, spacing: -0.5),
            ],
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 88,
          child: Center(child: _Loader(d)),
        ),
      ],
    );
  }
}

/// 4 · Editorial: the picture in an arch, the logo over its edge, a small
/// welcome over the name rising into place, and four steps lighting up.
class _Editorial extends StatelessWidget {
  const _Editorial(this.d);

  final _Launch d;

  @override
  Widget build(BuildContext context) {
    final c = d.c;
    final k = d.k;
    final tile = switch (c.tile) {
      LaunchTile.brand => BoxDecoration(
        color: c.main,
        boxShadow: [
          BoxShadow(
            color: c.main.withValues(alpha: 0.28),
            blurRadius: 30,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      LaunchTile.card => BoxDecoration(
        color: c.card,
        border: Border.all(color: c.accent.withValues(alpha: 0.45)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.5),
            blurRadius: 30,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      LaunchTile.glass => _tile(c, shadowY: 14, blur: 30),
    };
    final size = 76 * k;
    final still = MediaQuery.disableAnimationsOf(context);
    return LayoutBuilder(
      builder: (context, box) {
        final height = box.maxHeight;
        final arch = (height - 374).clamp(180.0, height * 0.6);
        final page = c.screen is LaunchColorFill
            ? (c.screen as LaunchColorFill).color
            : c.surface;
        return Stack(
          fit: StackFit.expand,
          children: [
            _Fill(c.screen),
            Positioned(
              top: 12,
              left: 12,
              right: 12,
              height: arch,
              child: ClipRRect(
                key: const ValueKey('launch-arch'),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(34),
                  bottom: Radius.circular(180),
                ),
                child: c.picture != null
                    ? _Fill(c.picture!)
                    : DecoratedBox(
                        decoration: BoxDecoration(
                          color: c.onDark
                              ? Colors.white.withValues(alpha: 0.14)
                              : c.main.withValues(alpha: 0.08),
                          border: Border.all(
                            color: c.onDark
                                ? Colors.white.withValues(alpha: 0.22)
                                : c.main.withValues(alpha: 0.12),
                          ),
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(34),
                            bottom: Radius.circular(180),
                          ),
                        ),
                      ),
              ),
            ),
            PositionedDirectional(
              top: 12 + arch - 30 - (size - 76) / 2,
              start: 36,
              child: _Logo(
                d,
                size: size - 8,
                radius: 24 * k - 4,
                decoration: tile,
                letters: 36 * k,
                border: page,
              ),
            ),
            PositionedDirectional(
              start: 36,
              end: 36,
              top: 12 + arch + 70,
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: still ? 1 : 0, end: 1),
                duration: still
                    ? Duration.zero
                    : const Duration(milliseconds: 900),
                curve: const Cubic(0.2, 0.7, 0.2, 1),
                builder: (context, v, child) => Transform.translate(
                  offset: Offset(0, 10 * (1 - v)),
                  child: Opacity(opacity: v, child: child),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      d.upper(d.welcome),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: c.accent,
                        letterSpacing: d.spacing(d.welcome, 2.4),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      d.title,
                      style: TextStyle(
                        fontSize: 40,
                        height: 1.05,
                        fontWeight: FontWeight.w800,
                        color: c.text,
                        letterSpacing: d.spacing(d.title, -1),
                      ),
                    ),
                    if (d.subtitle case final line?) ...[
                      const SizedBox(height: 10),
                      Text(
                        line,
                        style: TextStyle(fontSize: 15, color: c.muted),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            PositionedDirectional(start: 36, bottom: 64, child: _Loader(d)),
          ],
        );
      },
    );
  }
}

/// 5 · Monogram: the mark large in the second colour, breathing, in a ring
/// with a gold arc turning, and the name spaced out at the foot.
class _Monogram extends StatelessWidget {
  const _Monogram(this.d);

  final _Launch d;

  @override
  Widget build(BuildContext context) {
    final c = d.c;
    final k = d.k;
    final box = 200 * k;
    final ring = d.look.loader == LaunchLoader.ring;
    final track = c.onDark
        ? BrandColors.ivory.withValues(alpha: c.dark ? 0.1 : 0.14)
        : c.main.withValues(alpha: 0.14);
    final mark = d.picture != null
        ? _Logo(d, size: 104 * k, radius: 28 * k, letters: 0)
        : Text(
            d.initials,
            key: const ValueKey('launch-logo'),
            maxLines: 1,
            style: TextStyle(
              fontSize: 104 * k * (d.initials.characters.length > 1 ? 0.7 : 1),
              fontWeight: FontWeight.w800,
              height: 1,
              color: c.accent,
              letterSpacing: d.spacing(d.initials, -4),
            ),
          );
    return Stack(
      fit: StackFit.expand,
      children: [
        _Fill(c.screen),
        _Glow(c, y: -0.08, radius: 0.46),
        Center(
          child: SizedBox.square(
            dimension: box,
            child: _Loop(
              period: const Duration(milliseconds: 2400),
              still: 0.25,
              builder: (context, t) => Stack(
                alignment: Alignment.center,
                children: [
                  Positioned.fill(
                    child: ring
                        ? Semantics(
                            key: const ValueKey('launch-loader'),
                            label: context.l10n.loading,
                            child: CustomPaint(
                              painter: _RingPainter(
                                t: t,
                                radius: box * 0.46,
                                track: track,
                                arc: c.accent,
                                stroke: 2.5,
                                trackStroke: 2,
                              ),
                            ),
                          )
                        : CustomPaint(
                            painter: _RingPainter(
                              t: t,
                              radius: box * 0.46,
                              track: track,
                              arc: c.accent,
                              stroke: 2.5,
                              trackStroke: 2,
                              showArc: false,
                            ),
                          ),
                  ),
                  Transform.scale(scale: 1 + 0.04 * _there(t), child: mark),
                ],
              ),
            ),
          ),
        ),
        Positioned(
          left: 28,
          right: 28,
          bottom: 84,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!ring) ...[
                _Loader(d),
                if (d.look.loader != LaunchLoader.none)
                  const SizedBox(height: 16),
              ],
              Text(
                d.upper(d.title),
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: c.text,
                  letterSpacing: d.spacing(d.title, 5),
                ),
              ),
              if (d.subtitle case final line?) ...[
                const SizedBox(height: 8),
                Text(
                  line,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: c.muted),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
