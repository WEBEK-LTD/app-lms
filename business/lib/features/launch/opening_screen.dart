import 'dart:math' as math;
import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/session.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../prime/prime_today.dart' show greetingFor;

/// 125 Whether the opening motion plays on a cold start (the tests turn it
/// off; `test/widget/phase125_opening_test.dart` turns it on).
final openingMotionProvider = Provider<bool>((ref) => true);

/// 125 The opening motion has finished: the router may leave the opening
/// screen.
class OpeningDone extends Notifier<bool> {
  @override
  bool build() => false;

  void finish() => state = true;
}

final openingDoneProvider = NotifierProvider<OpeningDone, bool>(
  OpeningDone.new,
);

/// The opening's length: 1.2 seconds (the LaunchMotion board).
const openingDuration = Duration(milliseconds: 1200);

/// The big "y" of the Yallapp mark (brand/), in its font units.
const _yPath =
    'M224.0 153.0Q190.0 153.0 153.5 146.5Q117.0 140.0 83.0 125.5Q49.0 111.0 22.0 89.0L63.0 -30.0Q95.0 6.0 137.5 20.5Q180.0 35.0 219.0 35.0Q276.0 35.0 311.0 11.0Q346.0 -13.0 362.5 -56.0Q379.0 -99.0 379.0 -156.0L384.0 -262.0H375.0Q370.0 -187.0 347.0 -140.5Q324.0 -94.0 287.5 -73.0Q251.0 -52.0 204.0 -52.0Q146.0 -52.0 108.5 -81.5Q71.0 -111.0 53.0 -168.0Q35.0 -225.0 35.0 -306.0V-522.0H161.0V-336.0Q161.0 -247.0 182.5 -205.0Q204.0 -163.0 252.0 -163.0Q278.0 -163.0 298.5 -176.0Q319.0 -189.0 333.5 -214.5Q348.0 -240.0 355.5 -279.0Q363.0 -318.0 363.0 -369.0V-522.0H489.0V-152.0Q489.0 -109.0 481.0 -65.0Q473.0 -21.0 454.5 18.0Q436.0 57.0 406.0 87.5Q376.0 118.0 331.0 135.5Q286.0 153.0 224.0 153.0Z';

/// The "y" in a 1024 box, as the boards' SVG places it
/// (`translate(47.104 763.904) scale(1.365333)`).
Path yMark() {
  const sx = 1.365333;
  const tx = 47.104;
  const ty = 763.904;
  final path = Path();
  final tokens = RegExp(r'[MQLHVZ]|-?\d*\.?\d+')
      .allMatches(_yPath)
      .map((m) => m.group(0)!)
      .toList();
  var i = 0;
  var x = 0.0;
  var y = 0.0;
  double next() => double.parse(tokens[i++]);
  double px(double v) => tx + sx * v;
  double py(double v) => ty + sx * v;
  var command = '';
  while (i < tokens.length) {
    final t = tokens[i];
    if (RegExp(r'^[MQLHVZ]$').hasMatch(t)) {
      command = t;
      i++;
      if (command == 'Z') {
        path.close();
        continue;
      }
    }
    switch (command) {
      case 'M':
        x = next();
        y = next();
        path.moveTo(px(x), py(y));
      case 'L':
        x = next();
        y = next();
        path.lineTo(px(x), py(y));
      case 'H':
        x = next();
        path.lineTo(px(x), py(y));
      case 'V':
        y = next();
        path.lineTo(px(x), py(y));
      case 'Q':
        final cx = next();
        final cy = next();
        x = next();
        y = next();
        path.quadraticBezierTo(px(cx), py(cy), px(x), py(y));
      default:
        i++;
    }
  }
  return path;
}

class _YPainter extends CustomPainter {
  _YPainter({required this.color, required this.outline});

  final Color color;

  /// Prime: a gold outline instead of the filled mark.
  final bool outline;
  static final _path = yMark();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 1024, size.height / 1024);
    canvas.drawPath(
      _path,
      Paint()
        ..color = color
        ..style = outline ? PaintingStyle.stroke : PaintingStyle.fill
        ..strokeWidth = 3 * 1.365333,
    );
  }

  @override
  bool shouldRepaint(_YPainter old) =>
      old.color != color || old.outline != outline;
}

/// 125 The opening (the Launch, LaunchPrime and LaunchMotion boards): the
/// phone's own launch screen hands over one lit Ember dot in the middle; it
/// grows and slides to the corner with rings opening around it; the big "y"
/// rises and meets its dot; "Business" slides up and the line fills while
/// Today loads; then Today opens. A Prime app opens with the gold outline,
/// a gold dot, PRIME and a greeting with the app's name. With the phone's
/// reduced motion it is the last frame, still.
class OpeningScreen extends ConsumerStatefulWidget {
  const OpeningScreen({super.key});

  @override
  ConsumerState<OpeningScreen> createState() => _OpeningScreenState();
}

class _OpeningScreenState extends ConsumerState<OpeningScreen>
    with TickerProviderStateMixin {
  late final _motion = AnimationController(
    vsync: this,
    duration: openingDuration,
  );

  /// The line's last part, once the session is in.
  late final _finish = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 160),
  );
  bool _started = false;
  bool _still = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    _still = MediaQuery.disableAnimationsOf(context);
    if (!ref.read(openingMotionProvider)) {
      _still = true;
    }
    if (_still) {
      _motion.value = 1;
      _finish.value = 1;
      WidgetsBinding.instance.addPostFrameCallback((_) => _done());
    } else {
      _motion.forward().then((_) => _maybeFinish());
    }
  }

  void _maybeFinish() {
    if (!mounted || _still) return;
    if (ref.read(sessionProvider) is SessionLoading) return;
    _finish.forward().then((_) => _done());
  }

  void _done() {
    if (mounted) ref.read(openingDoneProvider.notifier).finish();
  }

  @override
  void dispose() {
    _motion.dispose();
    _finish.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // The line finishes once the session is in.
    ref.listen(sessionProvider, (_, next) {
      if (next is! SessionLoading && _motion.isCompleted) _maybeFinish();
    });
    final dark = Theme.of(context).brightness == Brightness.dark;
    final app = ref.watch(currentAppProvider);
    final me = ref.watch(meProvider);
    final prime = app?.features.prime ?? false;
    final l10n = context.l10n;
    final greeting = prime && me != null && app != null
        ? '${greetingFor(context, me)}.\n${l10n.launchOpening(app.name)}'
        : null;
    return Scaffold(
      backgroundColor: dark ? Brand.midnight : Brand.ivory,
      body: Semantics(
        label: l10n.launchLoading,
        child: ExcludeSemantics(
          child: KeyedSubtree(
            key: ValueKey(_still ? 'opening-still' : 'opening-motion'),
            child: AnimatedBuilder(
              animation: Listenable.merge([_motion, _finish]),
              builder: (context, _) => TweenAnimationBuilder<double>(
                tween: Tween(end: prime ? 1 : 0),
                duration: _still
                    ? Duration.zero
                    : const Duration(milliseconds: 300),
                builder: (context, p, _) => _Frame(
                  t: _motion.value,
                  fill: lerpDouble(0.62, 1, _finish.value)!,
                  prime: p,
                  dark: dark,
                  greeting: greeting,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

double _span(double t, double from, double to, [Curve curve = Curves.linear]) =>
    curve.transform(((t - from) / (to - from)).clamp(0.0, 1.0));

/// One frame of the opening at [t] (0 to 1); [prime] from 0 (Classic) to 1.
class _Frame extends StatelessWidget {
  const _Frame({
    required this.t,
    required this.fill,
    required this.prime,
    required this.dark,
    required this.greeting,
  });

  final double t;
  final double fill;
  final double prime;
  final bool dark;
  final String? greeting;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final ink = dark ? Brand.ivory : Brand.midnight;
    final ink2 = dark ? const Color(0xFFB8B3C8) : Brand.ink2;
    const emberGlow = Brand.ember;
    final gold = dark ? Brand.goldLight : const Color(0xFFB8913A);
    final goldText = dark ? Brand.goldLight : Brand.gold;
    // Colors from Classic to Prime.
    final dotColor = Color.lerp(
      Brand.ember,
      dark ? Brand.goldLight : Brand.midnight,
      prime,
    )!;
    final haloBase = Color.lerp(emberGlow, gold, prime)!;
    final halos = dark
        ? [0.20, 0.32, 0.48]
        : [0.18 + 0.04 * prime, 0.28 + 0.06 * prime, 0.42 + 0.08 * prime];
    final glow = haloBase.withValues(
      alpha: (dark ? 0.30 - 0.04 * prime : 0.22) * _span(t, 0, 0.1),
    );
    final kicker = Color.lerp(
      dark ? const Color(0xFFFF8F66) : Brand.emberText,
      goldText,
      prime,
    )!;
    final lineColor = Color.lerp(ink, gold, prime)!;
    final track = dark
        ? Brand.ivory.withValues(alpha: 0.16)
        : Brand.midnight.withValues(alpha: 0.12);

    return LayoutBuilder(
      builder: (context, box) {
        final w = box.maxWidth;
        final h = box.maxHeight;
        final k = w / 375;
        final top = math.max(64 * k, MediaQuery.paddingOf(context).top + 24);
        // The dot: from the middle (the launch screen's 48 points) to the
        // corner (140, centred 64 from the right and 105 from the bottom).
        final move = _span(t, 0, 0.34, Curves.easeInOutCubic);
        final size = lerpDouble(48, 140 * k, move)!;
        final start = Offset(w / 2, h / 2);
        final end = Offset(w - 64 * k, h - 105 * k);
        final center = Offset.lerp(start, end, move)!;
        Widget ring(double diameter, double alpha, double from, double to) {
          final r = _span(t, from, to, Curves.easeOutCubic);
          final d = diameter * k * lerpDouble(0.55, 1, r)!;
          return Positioned(
            left: center.dx - d / 2,
            top: center.dy - d / 2,
            width: d,
            height: d,
            child: Opacity(
              opacity: r,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: haloBase.withValues(alpha: alpha)),
                ),
              ),
            ),
          );
        }

        final rise = _span(t, 0.42, 0.75, Curves.easeOutCubic);
        final markSize = 640 * k;
        final word = _span(t, 0.62, 0.86, Curves.easeOutCubic);
        final primeWord = _span(t, 0.7, 0.92, Curves.easeOutCubic);
        final under = _span(t, 0.74, 0.9, Curves.easeOutCubic);
        final tagline = _span(t, 0.8, 1);
        final line = _span(t, 0.8, 1);
        final value = line * fill;
        return Stack(
          clipBehavior: Clip.hardEdge,
          children: [
            Positioned(
              left: -210 * k,
              top: h + 110 * k - markSize + 40 * k * (1 - rise),
              width: markSize,
              height: markSize,
              child: Opacity(
                opacity: rise,
                child: CustomPaint(
                  painter: _YPainter(
                    color: prime > 0.5 ? gold : ink,
                    outline: prime > 0.5,
                  ),
                ),
              ),
            ),
            ring(460, halos[0], 0.45, 0.8),
            ring(360, halos[1], 0.18, 0.55),
            ring(260, halos[2], 0.1, 0.45),
            Positioned(
              left: center.dx - size / 2,
              top: center.dy - size / 2,
              width: size,
              height: size,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: dotColor,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(color: glow, spreadRadius: 14 * size / 140),
                    BoxShadow(
                      color: glow,
                      blurRadius: 90 * size / 140,
                      spreadRadius: 30 * size / 140,
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 28 * k,
              right: 28 * k,
              top: top,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Opacity(
                    opacity: _span(t, 0.55, 0.75),
                    child: Text(
                      'YALLAPP',
                      style: TextStyle(
                        fontFamily: latinFont,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 13 * 0.32,
                        color: kicker,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Opacity(
                    opacity: word,
                    child: Transform.translate(
                      offset: Offset(0, 24 * (1 - word)),
                      child: Text(
                        'Business',
                        textDirection: TextDirection.ltr,
                        style: TextStyle(
                          fontFamily: latinFont,
                          fontSize: 64 * math.min(1, k),
                          fontWeight: FontWeight.w800,
                          height: 0.95,
                          letterSpacing: -0.035 * 64,
                          color: ink,
                        ),
                      ),
                    ),
                  ),
                  if (prime > 0) ...[
                    const SizedBox(height: 10),
                    Opacity(
                      opacity: primeWord * prime,
                      child: Transform.translate(
                        offset: Offset(0, 18 * (1 - primeWord)),
                        child: Text(
                          'PRIME',
                          style: TextStyle(
                            fontFamily: latinFont,
                            fontSize: 30,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 30 * 0.42,
                            color: goldText,
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 22),
                  Container(
                    width: 48 * under,
                    height: 3,
                    color: Color.lerp(Brand.ember, gold, prime),
                  ),
                  const SizedBox(height: 18),
                  Opacity(
                    opacity: tagline,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 230),
                      child: Text(
                        greeting ?? l10n.launchTagline,
                        style: TextStyle(
                          fontSize: 17,
                          height: 1.35,
                          color: ink2,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  Opacity(
                    opacity: line,
                    child: SizedBox(
                      width: 180,
                      child: Row(
                        children: [
                          Expanded(
                            child: Container(
                              height: 2,
                              color: track,
                              alignment: AlignmentDirectional.centerStart,
                              child: FractionallySizedBox(
                                widthFactor: value.clamp(0.0, 1.0),
                                child: Container(height: 2, color: lineColor),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          SizedBox(
                            width: 28,
                            child: Text(
                              context.number((value * 100).round()),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 12 * 0.12,
                                color: Color.lerp(ink, goldText, prime),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (prime < 1)
              PositionedDirectional(
                end: 28 * k,
                top: top,
                child: Opacity(
                  opacity: _span(t, 0.55, 0.75) * (1 - prime),
                  child: Text(
                    'EN · AR · TR',
                    textDirection: TextDirection.ltr,
                    style: TextStyle(
                      fontFamily: latinFont,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 12 * 0.14,
                      color: ink2,
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
