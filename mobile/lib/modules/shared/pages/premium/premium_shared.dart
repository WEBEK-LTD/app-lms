import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../core/theme/palette.dart';

/// 129.11–129.20 What Studio's premium elements share in the app (their
/// canvas: platform/web/src/components/studio/premium/): their colours by
/// day and by night from the app's theme, and a reveal that runs once when
/// the element first shows on the screen (numbers counting up, bars
/// filling), still on phones set to reduce motion.
class PremiumTones {
  const PremiumTones({
    required this.card,
    required this.edge,
    required this.ink,
    required this.muted,
    required this.track,
    required this.gold,
    required this.brand,
    required this.accent,
    required this.dark,
  });

  factory PremiumTones.of(BuildContext context, {required bool dark}) {
    final p = context.palette;
    return PremiumTones(
      card: p.surface,
      edge: p.border,
      ink: p.text,
      muted: p.textSecondary,
      track: dark ? const Color(0x1FFFFFFF) : const Color(0x140E0D24),
      gold: p.star,
      brand: p.primary,
      accent: p.accent,
      dark: dark,
    );
  }

  final Color card;
  final Color edge;
  final Color ink;
  final Color muted;
  final Color track;
  final Color gold;
  final Color brand;
  final Color accent;
  final bool dark;

  /// A soft, wide shadow under the cards by day; none by night.
  List<BoxShadow> get shadow => dark
      ? const []
      : const [
          BoxShadow(
            color: Color(0x140E0D24),
            blurRadius: 28,
            offset: Offset(0, 10),
          ),
        ];
}

/// An entry's own colour, else [fallback].
Color colorOr(String? hex, Color fallback) => parseHexColor(hex) ?? fallback;

/// Runs [builder] with 0 until the element first shows on the screen, then
/// with a value going once to 1; at once 1 on phones that reduce motion.
class PremiumReveal extends StatefulWidget {
  const PremiumReveal({
    super.key,
    required this.builder,
    this.duration = const Duration(milliseconds: 1200),
  });

  final Widget Function(BuildContext context, double t) builder;
  final Duration duration;

  @override
  State<PremiumReveal> createState() => _PremiumRevealState();
}

class _PremiumRevealState extends State<PremiumReveal>
    with SingleTickerProviderStateMixin {
  late final AnimationController _run = AnimationController(
    vsync: this,
    duration: widget.duration,
  );
  ScrollPosition? _position;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _started = true;
      _run.value = 1;
      return;
    }
    if (_started) return;
    _position?.removeListener(_check);
    _position = Scrollable.maybeOf(context)?.position;
    _position?.addListener(_check);
    WidgetsBinding.instance.addPostFrameCallback((_) => _check());
  }

  /// Starts once some of it is inside the screen.
  void _check() {
    if (_started || !mounted) return;
    final box = context.findRenderObject();
    if (box is! RenderBox || !box.hasSize) return;
    final top = box.localToGlobal(Offset.zero).dy;
    final screen = MediaQuery.sizeOf(context).height;
    if (top < screen && top + box.size.height > 0) {
      _started = true;
      _position?.removeListener(_check);
      unawaited(_run.forward());
    }
  }

  @override
  void dispose() {
    _position?.removeListener(_check);
    _run.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _run,
    builder: (context, _) =>
        widget.builder(context, Curves.easeOutCubic.transform(_run.value)),
  );
}
