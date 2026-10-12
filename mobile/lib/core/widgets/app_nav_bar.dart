import 'package:flutter/material.dart';

import '../config/build_config_data.dart';
import '../theme/app_icons.dart';
import '../theme/palette.dart';

class NavDestination {
  const NavDestination(this.icon, this.label);
  final IconData icon;
  final String label;
}

const mainDestinations = [
  NavDestination(AppIcons.home, 'Home'),
  NavDestination(AppIcons.courses, 'Courses'),
  NavDestination(AppIcons.myCourses, 'My Courses'),
  NavDestination(AppIcons.account, 'Account'),
];

/// The bottom navigation in each template's style:
/// Classic (icon over label), Bold (filled pill for the active tab, icons
/// only for the rest) and Minimal (small, quiet labels).
class AppNavBar extends StatelessWidget {
  const AppNavBar({
    super.key,
    required this.template,
    required this.currentIndex,
    required this.onSelected,
    this.destinations = mainDestinations,
  });

  final AppTemplate template;
  final int currentIndex;
  final ValueChanged<int> onSelected;
  final List<NavDestination> destinations;

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
      label: 'Main navigation',
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
              child: Row(
                children: [
                  for (var i = 0; i < destinations.length; i++) ...[
                    if (template == AppTemplate.bold && i > 0)
                      const SizedBox(width: 6),
                    Expanded(child: _item(context, i)),
                  ],
                ],
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
    final Widget content;
    switch (template) {
      case AppTemplate.bold:
        content = selected
            ? DecoratedBox(
                decoration: BoxDecoration(
                  color: p.primary,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Center(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AppIcon(d.icon, size: 20, color: p.onPrimary),
                        const SizedBox(width: 6),
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
              )
            : Center(child: AppIcon(d.icon, size: 24, color: p.textSecondary));
      case AppTemplate.classic:
      case AppTemplate.minimal:
        final minimal = template == AppTemplate.minimal;
        final color = selected
            ? p.text
            : (minimal ? p.textTertiary : p.textSecondary);
        content = Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AppIcon(
              d.icon,
              size: minimal ? 22 : 24,
              color: color,
              filled: selected,
            ),
            const SizedBox(height: 4),
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
      label: d.label,
      excludeSemantics: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => onSelected(index),
        child: content,
      ),
    );
  }
}
