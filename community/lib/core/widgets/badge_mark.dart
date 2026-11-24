import 'package:flutter/material.dart';

import 'package:material_symbols_icons/symbols.dart';

import '../api/models.dart';
import '../theme/tokens.dart';
import 'sym.dart';

/// The verified mark beside a name: only the member's highest badge, in its
/// colour (Gold, then Green, then Blue).
class BadgeMark extends StatelessWidget {
  const BadgeMark(this.kind, {super.key, this.size = 15});

  final BadgeKind? kind;
  final double size;

  static Color colorOf(BadgeKind kind) => switch (kind) {
    BadgeKind.gold => const Color(0xFFF2B544),
    BadgeKind.green => const Color(0xFF22C483),
    BadgeKind.blue => Brand.sky,
  };

  @override
  Widget build(BuildContext context) {
    final k = kind;
    if (k == null) return const SizedBox.shrink();
    return Sym(
      Symbols.verified_rounded,
      size: size,
      fill: true,
      color: colorOf(k),
      semanticLabel: k.name,
    );
  }
}
