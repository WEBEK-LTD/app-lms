import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import 'sym.dart';

/// A chip over a photo or a dark surface (#527's flat look: no blur, a
/// solid dark fill and a 1px line, readable on any photo).
class Glass extends StatelessWidget {
  const Glass({
    super.key,
    required this.child,
    this.radius = 10,
    this.padding,
    this.fill = const Color(0xD90E0D24),
    this.edge = const Color(0x29FFFFFF),
  });

  final Widget child;
  final double radius;
  final EdgeInsetsGeometry? padding;
  final Color fill;
  final Color edge;

  @override
  Widget build(BuildContext context) => Container(
    padding: padding,
    decoration: BoxDecoration(
      color: fill,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: edge),
    ),
    child: child,
  );
}

/// The header's square button (`.ib`: 42px, 10px corners, a flat card with
/// its 1px line) with its count (`.n`).
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
              // A flat card with its 1px line (#527).
              Container(
                decoration: BoxDecoration(
                  color: p.iconButton,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: p.iconButtonBorder),
                ),
                alignment: Alignment.center,
                child: Sym(icon, size: 22, fill: fill, color: p.iconButtonInk),
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
