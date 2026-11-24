import 'package:flutter/material.dart';

import '../l10n.dart';

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

/// Something paid, in the app: a lock and "Unlocks on the account that has
/// it". Never a price, a buy button or a payment link (paid things are
/// bought on the website only).
class LockedMark extends StatelessWidget {
  const LockedMark({super.key, required this.label, this.dark = false});

  final String label;
  final bool dark;

  @override
  Widget build(BuildContext context) => Container(
    key: const ValueKey('locked'),
    padding: const EdgeInsets.fromLTRB(8, 5, 10, 5),
    decoration: BoxDecoration(
      color: dark ? const Color(0x14FFFFFF) : const Color(0x0F141327),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Sym(
          Symbols.lock_rounded,
          size: 15,
          fill: true,
          color: dark ? Colors.white : Brand.ink,
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            color: dark ? Colors.white : Brand.ink,
          ),
        ),
      ],
    ),
  );
}

/// Whether the app runs on iOS (the platform the theme was built for, so
/// tests can ask for either).
bool isIos(BuildContext context) =>
    Theme.of(context).platform == TargetPlatform.iOS;

/// A locked item's words. On iOS only "Locked": nothing about unlocking it
/// or where it comes from (the App Store's rules, roadmap 231); elsewhere
/// "Unlocks on the account that has it". Never a price.
String lockedLabel(BuildContext context) =>
    isIos(context) ? context.l10n.commonLockedIos : context.l10n.commonLocked;
