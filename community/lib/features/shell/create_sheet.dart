import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/l10n.dart';
import '../../core/routing/feature_routes.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/coming_soon.dart';
import '../../core/widgets/sym.dart';

/// The tab bar's "+": ask a question, or (later phases) show an app or join
/// a challenge.
Future<void> showCreateSheet(BuildContext context) =>
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      builder: (sheet) => _CreateSheet(parent: context),
    );

class _CreateSheet extends StatelessWidget {
  const _CreateSheet({required this.parent});

  final BuildContext parent;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    void close() => Navigator.of(context).pop();
    return SafeArea(
      child: Container(
        key: const ValueKey('create-sheet'),
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 16),
        decoration: BoxDecoration(
          color: p.dark ? Brand.navy2 : Colors.white,
          borderRadius: BorderRadius.circular(28),
          boxShadow: const [
            BoxShadow(
              color: Color(0x29141327),
              blurRadius: 44,
              offset: Offset(0, 20),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 0, 6, 12),
              child: Text(
                l.createTitle,
                style: TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -.3,
                  color: p.ink,
                ),
              ),
            ),
            _Choice(
              key: const ValueKey('create-ask'),
              icon: Symbols.forum,
              title: l.createAsk,
              line: l.createAskLine,
              gradient: Brand.sunrise,
              onTap: () {
                close();
                parent.push(FeatureLinks.ask);
              },
            ),
            const SizedBox(height: 8),
            _Choice(
              key: const ValueKey('create-showcase'),
              icon: Symbols.apps,
              title: l.createShowcase,
              line: l.createShowcaseLine,
              gradient: const LinearGradient(
                colors: [Brand.lilac, Color(0xFF4B3BE0)],
              ),
              soon: true,
              onTap: () {
                close();
                showComingSoon(parent, l.createShowcase);
              },
            ),
            const SizedBox(height: 8),
            _Choice(
              key: const ValueKey('create-challenge'),
              icon: Symbols.emoji_events,
              title: l.createChallenge,
              line: l.createChallengeLine,
              gradient: const LinearGradient(
                colors: [Color(0xFFF2B544), Color(0xFFE08A12)],
              ),
              soon: true,
              onTap: () {
                close();
                showComingSoon(parent, l.createChallenge);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Choice extends StatelessWidget {
  const _Choice({
    super.key,
    required this.icon,
    required this.title,
    required this.line,
    required this.gradient,
    required this.onTap,
    this.soon = false,
  });

  final IconData icon;
  final String title;
  final String line;
  final Gradient gradient;
  final VoidCallback onTap;
  final bool soon;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Material(
      color: p.dark ? const Color(0x0AFFFFFF) : Brand.paper,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: gradient,
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Sym(icon, size: 22, fill: true, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            title,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: p.ink,
                            ),
                          ),
                        ),
                        if (soon) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0x1FFF5A1F),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              context.l10n.commonComingSoon,
                              style: const TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: Brand.orange,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      line,
                      style: TextStyle(
                        fontSize: 12.5,
                        color: p.muted,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
