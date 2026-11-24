import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import 'sym.dart';

/// Frosted glass over a photo or a gradient (mobile.html `.glass`: white at
/// 16%, a 14px blur, a white edge at 24%).
class Glass extends StatelessWidget {
  const Glass({
    super.key,
    required this.child,
    this.radius = 13,
    this.padding,
    this.blur = 14,
    this.fill = const Color(0x29FFFFFF),
    this.edge = const Color(0x3DFFFFFF),
  });

  final Widget child;
  final double radius;
  final EdgeInsetsGeometry? padding;
  final double blur;
  final Color fill;
  final Color edge;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(radius),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: blur / 2, sigmaY: blur / 2),
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          color: fill,
          borderRadius: BorderRadius.circular(radius),
          border: Border.all(color: edge),
        ),
        child: child,
      ),
    ),
  );
}

/// The header's round-cornered glass button (`.ib`: 42px, 15px corners,
/// white at 80% over a 10px blur by day, white at 7% by night) with its
/// count (`.n`).
class IconBtn extends StatelessWidget {
  const IconBtn({
    super.key,
    required this.icon,
    required this.label,
    this.onTap,
    this.count = 0,
    this.fill = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final int count;
  final bool fill;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: count > 0 ? '$label, $count' : label,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: SizedBox(
          width: 42,
          height: 42,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(15),
                  boxShadow: [
                    BoxShadow(
                      color: p.iconButtonShadow,
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(15),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                    child: Container(
                      decoration: BoxDecoration(
                        color: p.iconButton,
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(color: p.iconButtonBorder),
                      ),
                      alignment: Alignment.center,
                      child: Sym(
                        icon,
                        size: 22,
                        fill: fill,
                        color: p.iconButtonInk,
                      ),
                    ),
                  ),
                ),
              ),
              if (count > 0)
                PositionedDirectional(
                  top: -4,
                  end: -4,
                  child: Container(
                    constraints: const BoxConstraints(minWidth: 18),
                    height: 18,
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: BoxDecoration(
                      color: Brand.orange,
                      borderRadius: BorderRadius.circular(9),
                      border: Border.all(color: p.screen, width: 2),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      count > 99 ? '99+' : '$count',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        height: 1,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
