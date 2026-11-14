import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/widgets/common.dart';

/// 129.6 Before and after on a Studio page (`before_after`; Studio's
/// canvas: components/studio/premium-motion.tsx): the photo after over the
/// photo before, shown from the divider to the end side, the divider a
/// white line with a round handle a finger drags (or a tap moves), each
/// photo's label in a pill at its top corner; the photo before on the
/// start side, the right in Arabic. Screen readers move the divider as a
/// slider.
class StudioBeforeAfter extends StatefulWidget {
  const StudioBeforeAfter({super.key, required this.node});

  final StudioNode node;

  @override
  State<StudioBeforeAfter> createState() => _StudioBeforeAfterState();
}

class _StudioBeforeAfterState extends State<StudioBeforeAfter> {
  /// Where the divider is, 0 to 1 from the start side.
  late double _at = widget.node.compareAt / 100;

  void _moveTo(double dx, double width, bool rtl) {
    final share = (dx / width).clamp(0.02, 0.98);
    setState(() => _at = rtl ? 1 - share : share);
  }

  @override
  Widget build(BuildContext context) {
    final node = widget.node;
    final before = node.images[0];
    final after = node.images[1];
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final l10n = context.l10n;
    final radius = BorderRadius.circular(node.radius);
    Widget pill(String? text) => (text ?? '').trim().isEmpty
        ? const SizedBox.shrink()
        : DecoratedBox(
            decoration: BoxDecoration(
              color: const Color(0x8C0E0D24),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              child: Text(
                text!.trim(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          );
    final view = LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final line = width * (rtl ? 1 - _at : _at);
        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onHorizontalDragUpdate: (d) =>
              _moveTo(d.localPosition.dx, width, rtl),
          onTapDown: (d) => _moveTo(d.localPosition.dx, width, rtl),
          child: Stack(
            fit: StackFit.expand,
            children: [
              AppNetworkImage(url: before.imageUrl, seed: node.id.hashCode),
              // The photo after, from the divider to the end side.
              ClipRect(
                clipper: _Side(line: line, rtl: rtl),
                child: AppNetworkImage(
                  url: after.imageUrl,
                  seed: node.id.hashCode + 1,
                ),
              ),
              PositionedDirectional(
                top: 12,
                start: 12,
                child: pill(before.caption),
              ),
              PositionedDirectional(
                top: 12,
                end: 12,
                child: pill(after.caption),
              ),
              Positioned(
                left: line - 1.5,
                top: 0,
                bottom: 0,
                width: 3,
                child: const DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(color: Color(0x59000000), blurRadius: 8),
                    ],
                  ),
                ),
              ),
              Positioned(
                left: line - 20,
                top: 0,
                bottom: 0,
                width: 40,
                child: Center(
                  child: Container(
                    key: ValueKey('studio-compare-handle-${node.id}'),
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Color(0x4D000000),
                          blurRadius: 14,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const AppIcon(
                      Symbols.arrow_range_rounded,
                      size: 22,
                      color: Color(0xFF0E0D24),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
    final percent = (_at * 100).round();
    return Semantics(
      slider: true,
      label: l10n.studioCompareLabel(
        before.caption ?? l10n.photoOf(1, 2),
        after.caption ?? l10n.photoOf(2, 2),
      ),
      hint: l10n.studioCompareHandle,
      value: '$percent%',
      increasedValue: '${(percent + 10).clamp(2, 98)}%',
      decreasedValue: '${(percent - 10).clamp(2, 98)}%',
      onIncrease: () => setState(() => _at = (_at + 0.1).clamp(0.02, 0.98)),
      onDecrease: () => setState(() => _at = (_at - 0.1).clamp(0.02, 0.98)),
      child: ExcludeSemantics(
        child: ClipRRect(
          key: ValueKey('studio-before-after-${node.id}'),
          borderRadius: radius,
          child: node.height?.fixed != null
              ? SizedBox(height: node.height!.fixed, child: view)
              : AspectRatio(aspectRatio: node.aspectRatio ?? 1.33, child: view),
        ),
      ),
    );
  }
}

/// The end side of the photo from the divider ([line], from the left).
class _Side extends CustomClipper<Rect> {
  const _Side({required this.line, required this.rtl});

  final double line;
  final bool rtl;

  @override
  Rect getClip(Size size) => rtl
      ? Rect.fromLTRB(0, 0, line, size.height)
      : Rect.fromLTRB(line, 0, size.width, size.height);

  @override
  bool shouldReclip(_Side old) => old.line != line || old.rtl != rtl;
}
