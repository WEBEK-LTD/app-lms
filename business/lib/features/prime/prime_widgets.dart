import 'package:flutter/material.dart';

import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';

/// 125 The small gold "Prime" beside a Prime screen's title.
class PrimeChip extends StatelessWidget {
  const PrimeChip({super.key});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsetsDirectional.only(end: 16),
    child: Center(
      child: Container(
        height: 26,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: context.yb.goldBg,
          borderRadius: BorderRadius.circular(13),
        ),
        child: Text(
          context.l10n.primeBadge,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: context.yb.gold,
          ),
        ),
      ),
    ),
  );
}

/// The gold Prime badge on Today's dark header.
class PrimeBadge extends StatelessWidget {
  const PrimeBadge({super.key});

  @override
  Widget build(BuildContext context) => Container(
    height: 28,
    padding: const EdgeInsets.symmetric(horizontal: 10),
    decoration: BoxDecoration(
      color: context.yb.headBadge,
      borderRadius: BorderRadius.circular(14),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          AppIcons.prime,
          fill: 1,
          size: 16,
          color: context.yb.headBadge == Brand.midnight
              ? Brand.ivory
              : Brand.midnight,
        ),
        const SizedBox(width: 4),
        Text(
          context.l10n.primeBadge,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: context.yb.headBadge == Brand.midnight
                ? Brand.ivory
                : Brand.midnight,
          ),
        ),
      ],
    ),
  );
}

/// "▲ 12% vs last Friday", or null when there is nothing to compare.
String? changeText(BuildContext context, double? pct, String label) {
  if (pct == null) return null;
  final l10n = context.l10n;
  final value = l10n.percentValue(context.number(pct.abs().round()));
  if (pct.round() == 0) return l10n.changeSame(label);
  return pct > 0 ? l10n.changeUp(value, label) : l10n.changeDown(value, label);
}

/// A switch drawn as the designs draw it: 48 × 28, the text color when on.
class PrimeSwitch extends StatelessWidget {
  const PrimeSwitch({
    super.key,
    required this.value,
    required this.onChanged,
    this.label,
  });

  final bool value;
  final ValueChanged<bool>? onChanged;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return Semantics(
      toggled: value,
      label: label,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onChanged == null ? null : () => onChanged!(!value),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            width: 48,
            height: 28,
            padding: const EdgeInsets.symmetric(horizontal: 3),
            alignment: value
                ? AlignmentDirectional.centerEnd
                : AlignmentDirectional.centerStart,
            decoration: BoxDecoration(
              color: value ? c.ink : c.muted,
              borderRadius: BorderRadius.circular(14),
              border: value ? null : Border.all(color: c.line),
            ),
            child: Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: value ? c.onInk : c.ink2,
                shape: BoxShape.circle,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
