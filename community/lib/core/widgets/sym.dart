import 'package:flutter/widgets.dart';

/// A Material Symbols Rounded icon as the design draws it (common.css `.ms`:
/// weight 450, outlined; `.ms.f`: filled, weight 500; optical size 24).
class Sym extends StatelessWidget {
  const Sym(
    this.icon, {
    super.key,
    this.size = 24,
    this.fill = false,
    this.color,
    this.semanticLabel,
  });

  final IconData icon;
  final double size;
  final bool fill;
  final Color? color;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) => Icon(
    icon,
    size: size,
    fill: fill ? 1 : 0,
    weight: fill ? 500 : 450,
    grade: 0,
    opticalSize: 24,
    color: color,
    semanticLabel: semanticLabel,
  );
}
