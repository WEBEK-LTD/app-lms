import 'package:flutter/material.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/palette.dart';
import '../../../../core/widgets/premium_chrome.dart';

/// 130.21 The language (or another choice) in the project's premium look:
/// a rounded sheet with its title large, each choice on a row with its
/// mark on a tinted tile, the chosen one ticked in the main colour.
class PremiumChoiceSheet<T> extends StatelessWidget {
  const PremiumChoiceSheet({
    super.key,
    required this.look,
    required this.title,
    required this.values,
    required this.current,
    required this.label,
  });

  final SystemLook look;
  final String title;
  final List<T> values;
  final T current;
  final String Function(T) label;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    String markOf(T v) {
      final s = v is String && v.length <= 3 ? v : label(v);
      return s.characters.take(2).toString().toUpperCase();
    }

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        child: DecoratedBox(
          key: ValueKey('chrome-choice-${look.name}'),
          decoration: ChromeTones.card(
            p,
            look,
            radius: 28,
          ).copyWith(color: look == SystemLook.glass ? null : p.surface),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 10),
              Center(
                child: Container(
                  width: 40,
                  height: 5,
                  decoration: BoxDecoration(
                    color: p.divider,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 8),
                child: Semantics(
                  header: true,
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                      color: p.text,
                    ),
                  ),
                ),
              ),
              for (final (i, v) in values.indexed)
                InkWell(
                  onTap: () => Navigator.of(context).pop(v),
                  child: Semantics(
                    selected: v == current,
                    button: true,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: ChromeTones.tint(
                                p,
                                i,
                              ).withValues(alpha: p.isDark ? 0.22 : 0.13),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            alignment: Alignment.center,
                            child: ExcludeSemantics(
                              child: Text(
                                markOf(v),
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: ChromeTones.tint(p, i),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              label(v),
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: v == current
                                    ? FontWeight.w700
                                    : FontWeight.w500,
                                color: p.text,
                              ),
                            ),
                          ),
                          AnimatedContainer(
                            duration: MediaQuery.disableAnimationsOf(context)
                                ? Duration.zero
                                : const Duration(milliseconds: 180),
                            width: 26,
                            height: 26,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: v == current
                                  ? p.primary
                                  : Colors.transparent,
                              border: Border.all(
                                color: v == current ? p.primary : p.border,
                                width: 2,
                              ),
                            ),
                            alignment: Alignment.center,
                            child: v == current
                                ? AppIcon(
                                    AppIcons.check,
                                    size: 16,
                                    color: p.onPrimary,
                                  )
                                : null,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }
}
