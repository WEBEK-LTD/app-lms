import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';

/// 130.52 What the course screens' looks are made of (`Config.screens.
/// courses`): the look's colours by day and by night, the rating as five
/// star icons, the progress as a bar, segments or a ring (filling once,
/// at once for people who turn movement off, read out as a share), and
/// frosted glass.

/// The project's course screens' look; null, the screens as before.
CourseScreensLook? courseScreensOf(WidgetRef ref) {
  final gate = ref.watch(appGateProvider);
  return gate is GateReady ? gate.config.screens?.courses : null;
}

/// The look's colours: its accent (the owner's, else the app's second
/// colour), the ink of its dark parts, and the hairlines of `index`.
class CourseLookColors {
  CourseLookColors._(this.look, this.accent, this.palette);

  factory CourseLookColors.of(BuildContext context, CourseScreensLook look) {
    final p = context.palette;
    var accent = look.accent ?? Theme.of(context).colorScheme.secondary;
    // By night a dark accent is lifted until it stands out on the page.
    if (p.isDark) {
      for (var i = 0; i < 6 && _contrast(accent, p.background) < 3; i++) {
        accent = Color.lerp(accent, Colors.white, 0.2)!;
      }
    }
    return CourseLookColors._(look, accent, p);
  }

  final CourseScreensLook look;
  final Color accent;
  final AppPalette palette;

  bool get dark => palette.isDark;

  /// The words and icons on the accent.
  Color get onAccent => accent.computeLuminance() > 0.42
      ? const Color(0xFF17120A)
      : Colors.white;

  /// The accent softly, behind its icons.
  Color get accentSoft => accent.withValues(alpha: dark ? 0.18 : 0.13);

  /// The dark of the cinema and On air looks' heroes and players.
  Color get ink => switch (look.look) {
    CourseLook.cinema => const Color(0xFF0B0F1E),
    CourseLook.onAir => const Color(0xFF14101C),
    _ => dark ? const Color(0xFF0B0D16) : const Color(0xFF111522),
  };

  /// The cards' surface.
  Color get card => palette.surface;

  /// The hairline of the Faculty index look, the cards' line in the others.
  Color get line => look.look == CourseLook.faculty
      ? palette.text.withValues(alpha: dark ? 0.22 : 0.16)
      : palette.border.withValues(alpha: dark ? 0.7 : 0.9);

  /// The look's live red (On air's badges).
  Color get live => dark ? const Color(0xFFFF6B6B) : const Color(0xFFE5484D);

  /// The soft shadow of the cards, none in Faculty index and by night.
  List<BoxShadow> get shadow => look.look == CourseLook.faculty || dark
      ? const []
      : [
          BoxShadow(
            color: const Color(0xFF0E0D24).withValues(alpha: 0.08),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ];

  /// The track under a progress, on the page.
  Color get track => palette.text.withValues(alpha: dark ? 0.14 : 0.09);
}

double _contrast(Color a, Color b) {
  final x = a.computeLuminance();
  final y = b.computeLuminance();
  return (math.max(x, y) + 0.05) / (math.min(x, y) + 0.05);
}

/// Whether movement is turned off on the phone.
bool stillMotion(BuildContext context) =>
    MediaQuery.maybeDisableAnimationsOf(context) ?? false;

/// The rating as five star icons (halves too), its number and its count;
/// read out as "4.8 out of 5 stars".
class CourseStars extends StatelessWidget {
  const CourseStars({
    super.key,
    required this.rating,
    this.count = 0,
    this.size = 14,
    required this.color,
    this.textColor,
    this.showNumber = true,
  });

  final double rating;
  final int count;
  final double size;
  final Color color;
  final Color? textColor;
  final bool showNumber;

  @override
  Widget build(BuildContext context) {
    final value = rating.clamp(0, 5).toDouble();
    final number = value.toStringAsFixed(1);
    return Semantics(
      label: context.l10n.courseLookStars(number),
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < 5; i++)
            Icon(
              value >= i + 0.75
                  ? Symbols.star_rounded
                  : value >= i + 0.25
                  ? Symbols.star_half_rounded
                  : Symbols.star_rounded,
              size: size,
              fill: value >= i + 0.25 ? 1 : 0,
              color: value >= i + 0.25 ? color : color.withValues(alpha: 0.4),
            ),
          if (showNumber) ...[
            SizedBox(width: size * 0.35),
            Flexible(
              child: Text(
                count > 0 ? '$number ($count)' : number,
                maxLines: 1,
                overflow: TextOverflow.fade,
                softWrap: false,
                style: TextStyle(
                fontSize: size * 0.9,
                fontWeight: FontWeight.w700,
                  color: textColor ?? context.palette.text,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// A share filling from nothing once, at once with movement off.
class _Filling extends StatelessWidget {
  const _Filling({required this.value, required this.builder});

  final double value;
  final Widget Function(double value) builder;

  @override
  Widget build(BuildContext context) {
    final target = value.clamp(0.0, 1.0);
    if (stillMotion(context)) return builder(target);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: target),
      duration: const Duration(milliseconds: 900),
      curve: Curves.easeOutCubic,
      builder: (_, v, _) => builder(v),
    );
  }
}

/// How far, as a rounded bar filling from the start side.
class CourseProgressBar extends StatelessWidget {
  const CourseProgressBar({
    super.key,
    required this.value,
    required this.color,
    required this.track,
    this.height = 6,
  });

  final double value;
  final Color color;
  final Color track;
  final double height;

  @override
  Widget build(BuildContext context) => Semantics(
    label: context.l10n.learningPercentOfCourse((value * 100).round()),
    excludeSemantics: true,
    child: _Filling(
      value: value,
      builder: (v) => Container(
        height: height,
        decoration: BoxDecoration(
          color: track,
          borderRadius: BorderRadius.circular(height),
        ),
        alignment: AlignmentDirectional.centerStart,
        child: FractionallySizedBox(
          widthFactor: v,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(height),
              gradient: LinearGradient(
                colors: [Color.lerp(color, Colors.white, 0.25)!, color],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/// How far, as a segment per lesson: those done in the accent, the
/// student's place half filled.
class CourseSegments extends StatelessWidget {
  const CourseSegments({
    super.key,
    required this.total,
    required this.done,
    required this.color,
    required this.track,
    this.current,
    this.height = 5,
  });

  final int total;
  final int done;

  /// The student's place among them (0-based), half filled.
  final int? current;
  final Color color;
  final Color track;
  final double height;

  @override
  Widget build(BuildContext context) {
    final n = total.clamp(1, 60);
    final gap = n > 24 ? 2.0 : 4.0;
    return Semantics(
      label: context.l10n.lessonsDone(done, total),
      excludeSemantics: true,
      child: SizedBox(
        height: height,
        child: Row(
          children: [
            for (var i = 0; i < n; i++) ...[
              if (i > 0) SizedBox(width: gap),
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: track,
                    borderRadius: BorderRadius.circular(height),
                  ),
                  alignment: AlignmentDirectional.centerStart,
                  child: FractionallySizedBox(
                    widthFactor: i < done
                        ? 1
                        : i == current
                        ? 0.5
                        : 0,
                    child: Container(
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(height),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// How far, as a ring with the share inside (or [child]), running the way
/// the language reads.
class CourseProgressRing extends StatelessWidget {
  const CourseProgressRing({
    super.key,
    required this.value,
    required this.color,
    required this.track,
    this.size = 44,
    this.stroke = 4,
    this.child,
    this.textColor,
  });

  final double value;
  final Color color;
  final Color track;
  final double size;
  final double stroke;
  final Widget? child;
  final Color? textColor;

  @override
  Widget build(BuildContext context) {
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final percent = (value.clamp(0, 1) * 100).round();
    return Semantics(
      label: context.l10n.learningPercentOfCourse(percent),
      excludeSemantics: true,
      child: SizedBox.square(
        dimension: size,
        child: _Filling(
          value: value,
          builder: (v) => CustomPaint(
            painter: _RingPainter(v, color, track, stroke, rtl),
            child: Center(
              child:
                  child ??
                  Text(
                    '$percent%',
                    style: TextStyle(
                      fontSize: size * 0.24,
                      fontWeight: FontWeight.w800,
                      color: textColor ?? context.palette.text,
                    ),
                  ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.value, this.color, this.track, this.stroke, this.rtl);

  final double value;
  final Color color;
  final Color track;
  final double stroke;
  final bool rtl;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = (Offset.zero & size).deflate(stroke / 2);
    final base = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..color = track;
    canvas.drawArc(rect, 0, math.pi * 2, false, base);
    if (value <= 0) return;
    final sweep = math.pi * 2 * value * (rtl ? -1 : 1);
    canvas.drawArc(
      rect,
      -math.pi / 2,
      sweep,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.value != value ||
      old.color != color ||
      old.track != track ||
      old.rtl != rtl;
}

/// Frosted glass over what is behind it: lighter by day, darker by night.
class CourseGlass extends StatelessWidget {
  const CourseGlass({
    super.key,
    required this.child,
    this.radius = 18,
    this.padding = EdgeInsets.zero,
    this.onDark = true,
    this.blur = 16,
  });

  final Widget child;
  final double radius;
  final EdgeInsetsGeometry padding;

  /// Over a photo (white glass) rather than over the page.
  final bool onDark;
  final double blur;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final tint = onDark
        ? Colors.white.withValues(alpha: 0.16)
        : p.surface.withValues(alpha: p.isDark ? 0.62 : 0.74);
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: tint,
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(
              color: Colors.white.withValues(alpha: onDark ? 0.24 : 0.4),
              width: 0.8,
            ),
          ),
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}

/// A round button of the hero, on glass over a photo or on the page.
class CourseRoundButton extends StatelessWidget {
  const CourseRoundButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
    this.onPhoto = true,
    this.filled = false,
    this.color,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final bool onPhoto;
  final bool filled;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final icon = AppIcon(
      this.icon,
      size: 21,
      filled: filled,
      color: color ?? (onPhoto ? Colors.white : p.text),
    );
    final button = SizedBox.square(
      dimension: 42,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: Center(child: icon),
        ),
      ),
    );
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: Tooltip(
        message: label,
        child: onPhoto
            ? CourseGlass(radius: 21, blur: 12, child: button)
            : DecoratedBox(
                decoration: BoxDecoration(
                  color: p.surface,
                  shape: BoxShape.circle,
                  border: Border.all(color: p.border),
                ),
                child: button,
              ),
      ),
    );
  }
}

/// A small chip over a photo or on the page: the subject, a badge.
class CourseTag extends StatelessWidget {
  const CourseTag(
    this.label, {
    super.key,
    required this.background,
    required this.color,
    this.icon,
  });

  final String label;
  final Color background;
  final Color color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: background,
      borderRadius: BorderRadius.circular(999),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 13, color: color, fill: 1),
          const SizedBox(width: 4),
        ],
        Flexible(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.2,
              color: color,
            ),
          ),
        ),
      ],
    ),
  );
}

/// The heading of a section of the course's page: `index` in small
/// capitals over a hairline, the others large.
class CourseSectionTitle extends StatelessWidget {
  const CourseSectionTitle(
    this.title, {
    super.key,
    required this.colors,
    this.trailing,
    this.number,
  });

  final String title;
  final CourseLookColors colors;
  final Widget? trailing;

  /// Faculty index numbers its sections.
  final int? number;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final index = colors.look.look == CourseLook.faculty;
    final heading = Semantics(
      header: true,
      child: Text(
        index && number != null
            ? '${number.toString().padLeft(2, '0')}  ${title.toUpperCase()}'
            : title,
        style: index
            ? TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.4,
                color: p.text,
              )
            : TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w800,
                height: 1.25,
                color: p.text,
              ),
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (index) ...[
          Divider(height: 1, thickness: 1, color: colors.line),
          const SizedBox(height: 12),
        ],
        Row(
          children: [
            Expanded(child: heading),
            ?trailing,
          ],
        ),
      ],
    );
  }
}
