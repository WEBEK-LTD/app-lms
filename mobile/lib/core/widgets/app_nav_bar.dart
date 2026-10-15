import 'package:flutter/material.dart';

import '../config/build_config_data.dart';
import '../theme/app_icons.dart';
import '../theme/palette.dart';
import '../l10n/l10n.dart';

class NavDestination {
  const NavDestination(this.icon, this.label);
  final IconData icon;
  final String label;
}

/// The bottom navigation in each template's style:
/// Classic (icon over label), Bold (filled pill for the active tab, icons
/// only for the rest) and Minimal (small, quiet labels).
class AppNavBar extends StatelessWidget {
  const AppNavBar({
    super.key,
    required this.template,
    required this.currentIndex,
    required this.onSelected,
    required this.destinations,
    this.badges = const {},
  });

  final AppTemplate template;
  final int currentIndex;
  final ValueChanged<int> onSelected;
  final List<NavDestination> destinations;

  /// Counts shown on tabs, by index (for example items in the cart).
  final Map<int, int> badges;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final (height, padding, border) = switch (template) {
      AppTemplate.classic => (
        76.0,
        const EdgeInsets.fromLTRB(8, 8, 8, 12),
        p.border,
      ),
      AppTemplate.bold => (
        80.0,
        const EdgeInsets.fromLTRB(14, 12, 14, 16),
        null,
      ),
      AppTemplate.minimal => (
        72.0,
        const EdgeInsets.fromLTRB(8, 6, 8, 10),
        p.divider,
      ),
    };
    return Semantics(
      container: true,
      label: context.l10n.mainNavigation,
      explicitChildNodes: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: p.surface,
          border: border == null
              ? null
              : Border(top: BorderSide(color: border)),
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: height,
            child: Padding(
              padding: padding,
              child: LayoutBuilder(
                builder: (context, box) {
                  // 38 Bold on a phone: when the tabs are narrow the active
                  // pill gets twice the room, so its label fits
                  // ("Membership"); a tablet's tabs are wide enough.
                  final widen =
                      template == AppTemplate.bold &&
                      box.maxWidth / destinations.length < 110;
                  return Row(
                    children: [
                      for (var i = 0; i < destinations.length; i++) ...[
                        if (template == AppTemplate.bold && i > 0)
                          const SizedBox(width: 6),
                        Expanded(
                          flex: widen && i == currentIndex ? 2 : 1,
                          child: _item(context, i),
                        ),
                      ],
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _item(BuildContext context, int index) {
    final p = context.palette;
    final d = destinations[index];
    final selected = index == currentIndex;
    final count = badges[index] ?? 0;
    Widget icon(double size, Color color, {bool filled = false}) {
      final glyph = AppIcon(d.icon, size: size, color: color, filled: filled);
      if (count <= 0) return glyph;
      return Badge(
        label: Text(count > 99 ? '99+' : '$count'),
        backgroundColor: p.accent,
        textColor: p.onAccent,
        child: glyph,
      );
    }

    final Widget content;
    switch (template) {
      case AppTemplate.bold:
        content = selected
            ? DecoratedBox(
                decoration: BoxDecoration(
                  color: p.primary,
                  borderRadius: BorderRadius.circular(18),
                ),
                // 38 Room between the label and the pill's edges.
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Center(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          icon(20, p.onPrimary),
                          // A count's badge reaches past the icon.
                          SizedBox(width: count > 0 ? 12 : 6),
                          Text(
                            d.label,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: p.onPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              )
            : Center(child: icon(24, p.textSecondary));
      case AppTemplate.classic:
      case AppTemplate.minimal:
        final minimal = template == AppTemplate.minimal;
        final color = selected
            ? p.text
            : (minimal ? p.textTertiary : p.textSecondary);
        content = Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (minimal)
              icon(22, color, filled: selected)
            else
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOut,
                width: 56,
                height: 28,
                decoration: BoxDecoration(
                  color: selected ? p.accentSoft : Colors.transparent,
                  borderRadius: BorderRadius.circular(14),
                ),
                alignment: Alignment.center,
                child: icon(24, color, filled: selected),
              ),
            SizedBox(height: minimal ? 4 : 0),
            Text(
              d.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: minimal ? 11 : 12,
                fontWeight: selected
                    ? (minimal ? FontWeight.w800 : FontWeight.w700)
                    : FontWeight.w400,
                color: color,
              ),
            ),
          ],
        );
    }
    return Semantics(
      button: true,
      selected: selected,
      label: count > 0 ? context.l10n.tabWithCount(d.label, count) : d.label,
      excludeSemantics: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => onSelected(index),
        child: content,
      ),
    );
  }
}
