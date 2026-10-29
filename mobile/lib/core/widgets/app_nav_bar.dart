import 'package:flutter/material.dart';

import '../api/models/models.dart';
import '../config/build_config_data.dart';
import '../theme/palette.dart';
import '../l10n/l10n.dart';
import 'own_icon.dart';

class NavDestination {
  const NavDestination(this.icon, this.label, {this.iconUrl});
  final IconData icon;
  final String label;

  /// 82.5 The owner's own icon, shown instead of [icon].
  final String? iconUrl;
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
    this.style,
    this.fontFamily,
    this.centerIndex,
  });

  final AppTemplate template;
  final int currentIndex;
  final ValueChanged<int> onSelected;
  final List<NavDestination> destinations;

  /// Counts shown on tabs, by index (for example items in the cart).
  final Map<int, int> badges;

  /// 109 How the owner set the bar to look; null, the template's usual bar.
  final TabBarStyle? style;

  /// 109 The names' font, when the app can show it; null, the app's.
  final String? fontFamily;

  /// 109 The tab drawn as a round button raised in the middle of the bar.
  final int? centerIndex;

  Color? _colour(String? hex) => parseHexColor(hex);

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final s = style;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final background =
        _colour(dark ? (s?.darkBackground ?? s?.background) : s?.background) ??
        p.surface;
    // 109 A floating bar keeps its space around it and all its corners
    // round; one across the bottom rounds its top corners only.
    final margin = s?.margin ?? 0;
    final radius = s?.radius ?? 0;
    final floating = margin > 0;
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
    final row = SizedBox(
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
                    flex: widen && i == currentIndex && i != centerIndex
                        ? 2
                        : 1,
                    child: _item(context, i),
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
    final decoration = BoxDecoration(
      color: background,
      borderRadius: floating
          ? BorderRadius.circular(radius)
          : radius > 0
          ? BorderRadius.vertical(top: Radius.circular(radius))
          : null,
      border: border == null || floating || radius > 0
          ? null
          : Border(top: BorderSide(color: border)),
      boxShadow: floating || radius > 0
          ? const [
              BoxShadow(
                color: Color(0x1F0E0D24),
                blurRadius: 18,
                offset: Offset(0, 4),
              ),
            ]
          : null,
    );
    return Semantics(
      container: true,
      label: context.l10n.mainNavigation,
      explicitChildNodes: true,
      child: floating
          ? SafeArea(
              top: false,
              minimum: EdgeInsets.all(margin),
              child: DecoratedBox(decoration: decoration, child: row),
            )
          : DecoratedBox(
              decoration: decoration,
              child: SafeArea(top: false, child: row),
            ),
    );
  }

  Widget _item(BuildContext context, int index) {
    final p = context.palette;
    final d = destinations[index];
    final selected = index == currentIndex;
    final count = badges[index] ?? 0;
    final active = _colour(style?.active);
    final inactive = _colour(style?.inactive);
    final labels = style?.labels ?? TabLabels.always;
    final showLabel =
        labels == TabLabels.always || (labels == TabLabels.active && selected);
    Widget icon(double size, Color color, {bool filled = false}) {
      final glyph = OwnIcon(
        d.icon,
        url: d.iconUrl,
        size: size,
        color: color,
        filled: filled,
      );
      if (count <= 0) return glyph;
      return Badge(
        label: Text(count > 99 ? '99+' : '$count'),
        backgroundColor: p.accent,
        textColor: p.onAccent,
        child: glyph,
      );
    }

    final Widget content;
    if (index == centerIndex) {
      // 109 The tab in the middle: a round button raised above the bar.
      content = Center(
        child: Transform.translate(
          offset: const Offset(0, -14),
          child: Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: active ?? p.primary,
              shape: BoxShape.circle,
              boxShadow: const [
                BoxShadow(
                  color: Color(0x330E0D24),
                  blurRadius: 12,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            alignment: Alignment.center,
            child: icon(26, p.onPrimary, filled: true),
          ),
        ),
      );
    } else {
      switch (template) {
        case AppTemplate.bold:
          content = selected
              ? DecoratedBox(
                  decoration: BoxDecoration(
                    color: active ?? p.primary,
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
                            if (labels != TabLabels.never) ...[
                              // A count's badge reaches past the icon.
                              SizedBox(width: count > 0 ? 12 : 6),
                              Text(
                                d.label,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: p.onPrimary,
                                  fontFamily: fontFamily,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                )
              : Center(child: icon(24, inactive ?? p.textSecondary));
        case AppTemplate.classic:
        case AppTemplate.minimal:
          final minimal = template == AppTemplate.minimal;
          final color = selected
              ? (active ?? p.text)
              : (inactive ?? (minimal ? p.textTertiary : p.textSecondary));
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
              if (showLabel) ...[
                SizedBox(height: minimal ? 4 : 0),
                // 110 Each tab's name on one line inside its own tab, with a
                // little room between neighbours ("MembershipAppointme…"
                // ran together with five tabs on a phone).
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Text(
                    d.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    textScaler: MediaQuery.textScalerOf(context)
                        .clamp(maxScaleFactor: 1.3),
                    style: TextStyle(
                      fontSize: minimal ? 11 : 12,
                      fontWeight: selected
                          ? (minimal ? FontWeight.w800 : FontWeight.w700)
                          : FontWeight.w400,
                      color: color,
                      fontFamily: fontFamily,
                    ),
                  ),
                ),
              ],
            ],
          );
      }
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
