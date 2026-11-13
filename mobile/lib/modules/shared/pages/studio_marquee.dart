import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/widgets/common.dart';
import 'studio_motion.dart';

/// 129.3 A ticker on a Studio page (`marquee`; Studio's canvas:
/// components/studio/premium-motion.tsx): its words (a line each of its
/// text) and pictures one after another, its icon between them in the
/// app's second colour, running endlessly toward the start (or the end) at
/// the owner's speed, held while pressed. A still row on a phone that
/// reduces motion, and still while it is off the screen.
class StudioMarquee extends StatefulWidget {
  const StudioMarquee({super.key, required this.node, this.color});

  final StudioNode node;

  /// The element's own text colour; null, the page's.
  final Color? color;

  @override
  State<StudioMarquee> createState() => _StudioMarqueeState();
}

class _StudioMarqueeState extends State<StudioMarquee>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(_tick);
  final _copy = GlobalKey();
  Duration _last = Duration.zero;

  /// How far it has run, in points.
  double _run = 0;

  /// One copy's length, once laid out.
  double _length = 0;
  bool _held = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _ticker.stop();
    } else if (!_ticker.isActive) {
      _last = Duration.zero;
      _ticker.start();
    }
  }

  void _tick(Duration elapsed) {
    final step = (elapsed - _last).inMicroseconds / 1e6;
    _last = elapsed;
    if (_held || !studioOnScreen(context)) return;
    final box = _copy.currentContext?.findRenderObject();
    if (box is RenderBox && box.hasSize) _length = box.size.width;
    if (_length <= 0) return;
    setState(() => _run = (_run + widget.node.marqueeSpeed * step) % _length);
  }

  void _hold(bool held) {
    if (!widget.node.marqueePauses) return;
    setState(() => _held = held);
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final node = widget.node;
    final p = context.palette;
    final words = [
      for (final line in (node.text ?? '').split('\n'))
        if (line.trim().isNotEmpty) line.trim(),
    ];
    final items = <Widget>[
      for (final word in words) Text(word, maxLines: 1, softWrap: false),
      for (final (i, image) in node.images.indexed)
        AppNetworkImage(
          url: image.imageUrl,
          seed: node.id.hashCode + i,
          height: node.marqueeSize,
          width: node.marqueeSize,
          radius: node.marqueeSize / 4,
          semanticLabel: image.caption,
        ),
    ];
    final icon = node.icon;
    Widget copy({Key? key}) => Row(
      key: key,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final item in items) ...[
          item,
          SizedBox(width: node.gap / 2),
          if (icon != null) ...[
            AppIcon(
              symbolByName(icon),
              size: node.iconSize,
              color: p.accent,
              filled: true,
            ),
            SizedBox(width: node.gap / 2),
          ],
          if (icon == null) SizedBox(width: node.gap / 2),
        ],
      ],
    );
    final still = MediaQuery.disableAnimationsOf(context);
    final rtl = Directionality.of(context) == TextDirection.rtl;
    // Toward the start: leftwards in English, rightwards in Arabic.
    final toStart = node.marqueeToStart;
    final sign = (toStart ? -1 : 1) * (rtl ? -1 : 1);
    final shift = still || _length <= 0
        ? 0.0
        : toStart
        ? sign * _run
        : sign * (_run - _length);
    return Semantics(
      label: [...words, for (final i in node.images) ?i.caption].join(', '),
      hint: _held ? context.l10n.studioTickerPaused : null,
      container: true,
      child: ExcludeSemantics(
        child: Listener(
          onPointerDown: (_) => _hold(true),
          onPointerUp: (_) => _hold(false),
          onPointerCancel: (_) => _hold(false),
          // Laid out as wide as its copies, the window over them still.
          child: SingleChildScrollView(
            key: ValueKey('studio-marquee-${node.id}'),
            scrollDirection: Axis.horizontal,
            physics: const NeverScrollableScrollPhysics(),
            child: Transform.translate(
              key: ValueKey('studio-marquee-run-${node.id}'),
              offset: Offset(shift, 0),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  copy(key: _copy),
                  // Enough copies for the widest phone and the run.
                  if (!still) ...[copy(), copy(), copy()],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
