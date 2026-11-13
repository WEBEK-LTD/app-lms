import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/theme/palette.dart';
import '../../../../core/theme/symbol_names.dart';
import 'premium_shared.dart';

/// 129.19 A gradient's colours along its angle (CSS: 90 from the start
/// across), mirrored right to left.
LinearGradient premiumGradient(Color from, Color to, double angle) {
  final r = angle * math.pi / 180;
  final dx = math.sin(r);
  final dy = -math.cos(r);
  return LinearGradient(
    begin: AlignmentDirectional(-dx, -dy),
    end: AlignmentDirectional(dx, dy),
    colors: [from, to],
  );
}

/// 129.19 A premium badge: a filled pill, an outline, the brand's two
/// colours as a gradient, frosted glass, or gradient words without a chip
/// (a heading's, at the element's font). The gradient is the element's
/// own, else the app's two brand colours.
class PremiumBadge extends StatelessWidget {
  const PremiumBadge({super.key, required this.node, required this.dark});

  final StudioNode node;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final tones = PremiumTones.of(context, dark: dark);
    final style = node.premium?.badge ?? StudioBadgeStyle.pill;
    final g = node.gradient;
    final gradient = premiumGradient(
      parseHexColor(g?.from) ?? tones.brand,
      parseHexColor(g?.to) ?? tones.accent,
      g == null ? 90 : g.angle,
    );
    final own = parseHexColor(
      dark ? (node.darkColor ?? node.color) : node.color,
    );
    final tone = own ?? tones.brand;
    final text = node.text ?? '';
    final icon = node.icon;
    if (style == StudioBadgeStyle.text) {
      final size = node.font?.size ?? 28;
      return ShaderMask(
        key: ValueKey('premium-gradient-text-${node.id}'),
        blendMode: BlendMode.srcIn,
        shaderCallback: (bounds) => gradient.createShader(
          bounds,
          textDirection: Directionality.of(context),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(symbolByName(icon), size: size * 0.9, fill: 1),
              const SizedBox(width: 6),
            ],
            Flexible(
              child: Text(
                text,
                style: TextStyle(
                  fontSize: size,
                  height: 1.15,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      );
    }
    final size = node.font?.size ?? 12;
    final ink = switch (style) {
      StudioBadgeStyle.gradient => Colors.white,
      StudioBadgeStyle.glass => own ?? tones.ink,
      _ => tone,
    };
    Widget chip = Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: switch (style) {
          StudioBadgeStyle.pill => tone.withValues(alpha: 0.14),
          StudioBadgeStyle.glass => Colors.white.withValues(
            alpha: dark ? 0.12 : 0.55,
          ),
          _ => null,
        },
        gradient: style == StudioBadgeStyle.gradient ? gradient : null,
        borderRadius: BorderRadius.circular(999),
        border: switch (style) {
          StudioBadgeStyle.outline => Border.all(color: tone, width: 1.5),
          StudioBadgeStyle.glass => Border.all(
            color: Colors.white.withValues(alpha: 0.45),
          ),
          _ => null,
        },
        boxShadow: style == StudioBadgeStyle.gradient
            ? [
                BoxShadow(
                  color: (parseHexColor(g?.from) ?? tones.brand).withValues(
                    alpha: 0.3,
                  ),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ]
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(symbolByName(icon), size: size + 3, fill: 1, color: ink),
            const SizedBox(width: 5),
          ],
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: size,
                fontWeight: FontWeight.w800,
                color: ink,
              ),
            ),
          ),
        ],
      ),
    );
    if (style == StudioBadgeStyle.glass) {
      chip = ClipRRect(
        borderRadius: BorderRadius.circular(999),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: chip,
        ),
      );
    }
    return Align(
      alignment: AlignmentDirectional.centerStart,
      widthFactor: 1,
      child: chip,
    );
  }
}
