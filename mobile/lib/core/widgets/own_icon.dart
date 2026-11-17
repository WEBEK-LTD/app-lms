import 'package:flutter/material.dart';

import '../images/app_image.dart';
import '../theme/app_icons.dart';

/// 82.5 The owner's own icon ([url], a square picture) when there is one and
/// it loads; else the Material Symbols [icon].
class OwnIcon extends StatelessWidget {
  const OwnIcon(
    this.icon, {
    super.key,
    this.url,
    this.size = 22,
    this.color,
    this.filled = false,
  });

  final IconData icon;
  final String? url;
  final double size;
  final Color? color;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final glyph = AppIcon(icon, size: size, color: color, filled: filled);
    final own = url;
    if (own == null || own.isEmpty) return glyph;
    // Kept on the phone, and decoded at the icon's size (lib/core/images).
    final target = decodeTargetFor(
      const BoxConstraints(),
      width: size,
      height: size,
      fit: BoxFit.contain,
      devicePixelRatio: MediaQuery.maybeDevicePixelRatioOf(context) ?? 1.0,
    );
    return Image(
      image: networkPicture(own, target: target),
      width: size,
      height: size,
      fit: BoxFit.contain,
      excludeFromSemantics: true,
      gaplessPlayback: true,
      errorBuilder: (_, _, _) => glyph,
    );
  }
}
