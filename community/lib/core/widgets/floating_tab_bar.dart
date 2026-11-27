import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../l10n.dart';
import '../theme/tokens.dart';
import 'sym.dart';

/// The shell's tabs, in the design's order.
enum ShellTab { home, qa, learn, groups }

/// The floating tab bar (mobile.html `.tb`): a 72px glass bar 14px in from
/// the sides and 20px over the bottom; the open tab a pill with its name
/// (indigo by day, orange by night), the others an icon; the create button
/// raised in the middle on its ring of oranges.
class FloatingTabBar extends StatelessWidget {
  const FloatingTabBar({
    super.key,
    required this.current,
    required this.onTab,
    required this.onCreate,
    this.dots = const {},
  });

  final ShellTab? current;
  final ValueChanged<ShellTab> onTab;
  final VoidCallback onCreate;

  /// Tabs with something new (the design's orange dot).
  final Set<ShellTab> dots;

  static const height = 72.0;

  /// The space a page leaves at its foot so its last line clears the bar.
  static const clearance = height + 20 + 24;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    // A long label (Turkish, Arabic) may shrink the open tab, never
    // push the bar past the screen.
    Widget tab(ShellTab t, IconData icon, String label) {
      final item = _Tab(
        key: ValueKey('tab-${t.name}'),
        icon: icon,
        label: label,
        on: current == t,
        dot: dots.contains(t),
        onTap: () => onTab(t),
      );
      return current == t ? Flexible(child: item) : item;
    }

    // #527: a flat card with its 1px line, no blur or shadow.
    return Container(
      height: height,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: p.tabBar,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: p.tabRim),
      ),
      // The bar floats over the page, outside its Material: its own gives
      // the labels the app's type.
      child: Material(
        type: MaterialType.transparency,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            tab(ShellTab.home, Symbols.home_rounded, l.tabHome),
            tab(ShellTab.qa, Symbols.forum_rounded, l.tabQa),
            _Create(label: l.tabCreate, onTap: onCreate),
            tab(ShellTab.learn, Symbols.school_rounded, l.tabLearn),
            tab(ShellTab.groups, Symbols.groups_rounded, l.tabGroups),
          ],
        ),
      ),
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({
    super.key,
    required this.icon,
    required this.label,
    required this.on,
    required this.dot,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool on;
  final bool dot;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      selected: on,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          height: 48,
          constraints: const BoxConstraints(minWidth: 48),
          padding: on
              ? const EdgeInsetsDirectional.fromSTEB(12, 0, 16, 0)
              : EdgeInsets.zero,
          decoration: BoxDecoration(
            gradient: on ? p.tabOn : null,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Sym(
                    icon,
                    size: 25,
                    fill: on,
                    color: on ? p.tabOnIcon : p.tabIcon,
                  ),
                  if (on) ...[
                    const SizedBox(width: 7),
                    Flexible(
                      child: Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 13.5,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              if (dot && !on)
                PositionedDirectional(
                  top: 9,
                  end: 9,
                  child: Container(
                    key: const ValueKey('tab-dot'),
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: Brand.orange,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: p.dark ? const Color(0xFF18163A) : Colors.white,
                        width: 2,
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

/// The create button (`.cr`): 56px, 20px corners, the ring of oranges, a
/// 4px edge of the page's colour, raised 14px.
class _Create extends StatelessWidget {
  const _Create({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        key: const ValueKey('tab-create'),
        onTap: onTap,
        child: Transform.translate(
          offset: const Offset(0, -14),
          child: Container(
            width: 56,
            height: 56,
            // Solid orange, the page's colour around it; no glow.
            decoration: BoxDecoration(
              color: Brand.orange,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: p.screen, width: 4),
            ),
            alignment: Alignment.center,
            child: const Sym(
              Symbols.add_rounded,
              size: 30,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
