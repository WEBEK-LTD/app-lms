import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../l10n.dart';
import '../theme/tokens.dart';
import 'sym.dart';

/// A section that comes in a later phase: never a dead tap, always this.
Future<void> showComingSoon(BuildContext context, String title) =>
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ComingSoonSheet(title: title),
    );

class ComingSoonSheet extends StatelessWidget {
  const ComingSoonSheet({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return SafeArea(
      child: Container(
        key: const ValueKey('coming-soon'),
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        padding: const EdgeInsets.fromLTRB(22, 24, 22, 18),
        decoration: BoxDecoration(
          color: p.dark ? Brand.navy2 : Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const _Spark(),
            const SizedBox(height: 14),
            Text(
              title,
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w800,
                letterSpacing: -.3,
                color: p.ink,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              context.l10n.commonComingSoon,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Brand.orange,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              context.l10n.commonComingSoonBody,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, height: 1.5, color: p.muted),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                style: FilledButton.styleFrom(
                  backgroundColor: p.dark ? Colors.white : Brand.navy,
                  foregroundColor: p.dark ? Brand.navy : Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  textStyle: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
                child: Text(context.l10n.commonOk),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Spark extends StatelessWidget {
  const _Spark();

  @override
  Widget build(BuildContext context) => Container(
    width: 56,
    height: 56,
    decoration: BoxDecoration(
      gradient: Brand.sunrise,
      borderRadius: BorderRadius.circular(12),
    ),
    child: const Sym(
      Symbols.rocket_launch_rounded,
      size: 28,
      fill: true,
      color: Colors.white,
    ),
  );
}

/// A whole page for a section that comes later (a route that exists so no
/// link is dead).
class ComingSoonPage extends StatelessWidget {
  const ComingSoonPage({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Scaffold(
      backgroundColor: p.screen,
      appBar: AppBar(
        backgroundColor: p.screen,
        surfaceTintColor: Colors.transparent,
        title: Text(
          title,
          style: TextStyle(fontWeight: FontWeight.w800, color: p.ink),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const _Spark(),
              const SizedBox(height: 16),
              Text(
                context.l10n.commonComingSoon,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: p.ink,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                context.l10n.commonComingSoonBody,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, height: 1.5, color: p.muted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
