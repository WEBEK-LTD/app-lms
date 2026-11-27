import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/l10n.dart';
import '../../core/routing/feature_routes.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/sym.dart';
import '../posts/posts_state.dart';
import '../stories/stories.dart';

/// The tab bar's "+": ask a question, or (later phases) show an app or join
/// a challenge.
Future<void> showCreateSheet(BuildContext context) =>
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      // Six choices: taller than a sheet's default nine-sixteenths.
      isScrollControlled: true,
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
          borderRadius: BorderRadius.circular(12),
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
              key: const ValueKey('create-post'),
              icon: Symbols.edit_square_rounded,
              title: l.createPost,
              line: l.createPostLine,
              gradient: Brand.sunrise,
              onTap: () {
                close();
                parent.push(PostLinks.compose);
              },
            ),
            const SizedBox(height: 8),
            _Choice(
              key: const ValueKey('create-story'),
              icon: Symbols.amp_stories_rounded,
              title: l.createStory,
              line: l.createStoryLine,
              gradient: Brand.solid(Brand.violet),
              onTap: () {
                close();
                addStory(parent);
              },
            ),
            const SizedBox(height: 8),
            _Choice(
              key: const ValueKey('create-ask'),
              icon: Symbols.forum_rounded,
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
              icon: Symbols.apps_rounded,
              title: l.createShowcase,
              line: l.createShowcaseLine,
              gradient: Brand.solid(Brand.violet),
              onTap: () {
                close();
                parent.go(FeatureLinks.showcase);
              },
            ),
            const SizedBox(height: 8),
            _Choice(
              key: const ValueKey('create-challenge'),
              icon: Symbols.emoji_events_rounded,
              title: l.createChallenge,
              line: l.createChallengeLine,
              gradient: Brand.solid(const Color(0xFFE08A12)),
              onTap: () {
                close();
                parent.go(FeatureLinks.challenges);
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
  });

  final IconData icon;
  final String title;
  final String line;
  final Gradient gradient;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Material(
      color: p.dark ? const Color(0x0AFFFFFF) : Brand.paper,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
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
                  borderRadius: BorderRadius.circular(10),
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
