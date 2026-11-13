import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../api/models/models.dart';
import '../config/build_config_data.dart';
import '../theme/palette.dart';
import '../l10n/l10n.dart';
import 'common.dart' show AppNetworkImage;
import 'own_icon.dart';

/// 128.10 Over the tabs' screens while the bar floats over them (the
/// shell's `extendBody`: a glass bar off the edges, the floating pill):
/// the screens go on under the bar, and MediaQuery's bottom padding is the
/// bar's measured height with the safe area, so a screen's end can make
/// room for it (a Studio page's list).
class TabBarOverBody extends InheritedWidget {
  const TabBarOverBody({super.key, required this.over, required super.child});

  final bool over;

  static bool of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<TabBarOverBody>()?.over ??
      false;

  @override
  bool updateShouldNotify(TabBarOverBody old) => old.over != over;
}

class NavDestination {
  const NavDestination(this.icon, this.label, {this.iconUrl});
  final IconData icon;
  final String label;

  /// 82.5 The owner's own icon, shown instead of [icon].
  final String? iconUrl;
}

/// The bottom navigation in each template's style:
/// Classic (icon over label), Bold (filled pill for the active tab, icons
/// only for the rest) and Minimal (small, quiet labels); 119 or the design
/// the owner chose for it (`TabBar.design`), in light and dark mode alike.
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
    this.avatarIndex,
    this.avatarUrl,
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

  /// 119 With `TabBar.avatar`: the account tab, shown with the person's
  /// photo ([avatarUrl]) instead of its icon when they have one.
  final int? avatarIndex;
  final String? avatarUrl;

  Color? _colour(String? hex) => parseHexColor(hex);

  /// 119 The design: the owner's, else the template's own.
  TabBarDesign get design =>
      style?.design ??
      switch (template) {
        AppTemplate.classic => TabBarDesign.classic,
        AppTemplate.bold => TabBarDesign.pill,
        AppTemplate.minimal => TabBarDesign.minimal,
      };

  /// 119 A colour made easy to see on a dark bar: a dark one is lightened.
  static Color? readableOnDark(Color? c) {
    if (c == null) return null;
    if (c.computeLuminance() >= 0.2) return c;
    return Color.lerp(c, const Color(0xFFFFFFFF), 0.5);
  }

  /// 119 Text and icons on a fill: dark on a light one, white on a dark one.
  static Color onFill(Color fill) => fill.computeLuminance() > 0.5
      ? const Color(0xFF14121F)
      : const Color(0xFFFFFFFF);

  Color? _active(bool dark) => dark
      ? (_colour(style?.darkActive) ?? readableOnDark(_colour(style?.active)))
      : _colour(style?.active);

  Color? _inactive(bool dark) => dark
      ? (_colour(style?.darkInactive) ??
            readableOnDark(_colour(style?.inactive)))
      : _colour(style?.inactive);

  /// 119 Designs whose open tab shows its name beside its icon, wider than
  /// the others.
  bool get _wide => const {
    TabBarDesign.pill,
    TabBarDesign.bubble,
    TabBarDesign.island,
    TabBarDesign.segment,
    TabBarDesign.float,
  }.contains(design);

  /// 109 The raised round button, or 119 with the notch, the middle tab.
  int? get _middle {
    if (design == TabBarDesign.notch) {
      final n = destinations.length;
      return n.isOdd && n >= 3 ? n ~/ 2 : null;
    }
    return centerIndex;
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final s = style;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final active = _active(dark) ?? p.primary;
    // 109 A floating bar keeps its space around it and all its corners
    // round; one across the bottom rounds its top corners only. 119 Some
    // designs float of themselves.
    var margin = s?.margin ?? 0;
    var radius = s?.radius ?? 0;
    switch (design) {
      case TabBarDesign.glass:
        if (margin == 0) margin = 12;
        if (radius == 0) radius = 26;
      case TabBarDesign.segment:
        if (margin == 0) margin = 14;
        if (radius == 0) radius = 18;
      case TabBarDesign.island:
        if (margin == 0) margin = 14;
        radius = 999;
      // 128 The floating pill: floats of itself, 22 round unless set.
      case TabBarDesign.float:
        if (margin == 0) margin = 12;
        if (radius == 0) radius = 22;
      // 129 The small dock: a capsule in the middle.
      case TabBarDesign.dock:
        if (margin == 0) margin = 12;
        radius = 999;
      default:
        break;
    }
    final floating = margin > 0;
    var background =
        _colour(dark ? (s?.darkBackground ?? s?.background) : s?.background) ??
        p.surface;
    final ownBackground = s?.background != null || s?.darkBackground != null;
    switch (design) {
      case TabBarDesign.glass:
        background = background.withValues(alpha: dark ? 0.55 : 0.6);
      case TabBarDesign.island when !ownBackground:
        background = dark ? const Color(0xFF262E2B) : const Color(0xFF121614);
      case TabBarDesign.segment when !ownBackground:
        background = dark ? const Color(0xFF1E2523) : const Color(0xFFE9EDEB);
      case TabBarDesign.folder when !ownBackground:
        background = dark
            ? Color.lerp(active, const Color(0xFF000000), 0.62)!
            : (_colour(s?.active) ?? p.primary);
      case TabBarDesign.glow when dark && !ownBackground:
        background = const Color(0xFF0E1211);
      default:
        break;
    }
    final (height, padding, border) = switch (design) {
      TabBarDesign.classic ||
      TabBarDesign.outline ||
      TabBarDesign.square ||
      TabBarDesign.colours ||
      TabBarDesign.glow ||
      TabBarDesign.drop => (
        76.0,
        const EdgeInsets.fromLTRB(8, 8, 8, 12),
        design == TabBarDesign.classic ? p.border : p.divider,
      ),
      TabBarDesign.pill || TabBarDesign.bubble => (
        80.0,
        const EdgeInsets.fromLTRB(14, 12, 14, 16),
        design == TabBarDesign.bubble ? p.divider : null,
      ),
      TabBarDesign.minimal || TabBarDesign.text => (
        72.0,
        const EdgeInsets.fromLTRB(8, 6, 8, 10),
        p.divider,
      ),
      TabBarDesign.dot => (
        72.0,
        const EdgeInsets.fromLTRB(8, 8, 8, 10),
        p.divider,
      ),
      TabBarDesign.line => (
        74.0,
        const EdgeInsets.fromLTRB(8, 0, 8, 12),
        p.divider,
      ),
      TabBarDesign.lift => (
        76.0,
        const EdgeInsets.fromLTRB(8, 8, 8, 12),
        p.divider,
      ),
      TabBarDesign.notch => (
        76.0,
        const EdgeInsets.fromLTRB(8, 12, 8, 10),
        null,
      ),
      TabBarDesign.glass => (
        68.0,
        const EdgeInsets.fromLTRB(10, 8, 10, 8),
        null,
      ),
      TabBarDesign.island => (
        62.0,
        const EdgeInsets.fromLTRB(10, 6, 10, 6),
        null,
      ),
      TabBarDesign.segment => (64.0, const EdgeInsets.all(5), null),
      TabBarDesign.float => (
        62.0,
        const EdgeInsets.fromLTRB(10, 11, 10, 11),
        null,
      ),
      TabBarDesign.dock => (62.0, const EdgeInsets.all(8), null),
      TabBarDesign.folder => (
        76.0,
        const EdgeInsets.fromLTRB(8, 14, 8, 10),
        null,
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
            final widen = _wide && box.maxWidth / destinations.length < 110;
            // 129 The dock: each tab a round button, as wide as they are.
            if (design == TabBarDesign.dock) {
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (var i = 0; i < destinations.length; i++) ...[
                    if (i > 0) const SizedBox(width: 6),
                    SizedBox(width: 46, child: _item(context, i)),
                  ],
                ],
              );
            }
            return Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < destinations.length; i++) ...[
                  if ((design == TabBarDesign.pill ||
                          design == TabBarDesign.bubble) &&
                      i > 0)
                    const SizedBox(width: 6),
                  Expanded(
                    flex: widen && i == currentIndex && i != _middle ? 2 : 1,
                    child: _item(context, i),
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
    final glass = design == TabBarDesign.glass;
    final notch = design == TabBarDesign.notch && _middle != null;
    final decoration = BoxDecoration(
      color: notch ? null : background,
      borderRadius: floating
          ? BorderRadius.circular(radius)
          : radius > 0
          ? BorderRadius.vertical(top: Radius.circular(radius))
          : null,
      border: glass
          ? Border.all(
              color: dark ? const Color(0x24FFFFFF) : const Color(0x80FFFFFF),
            )
          : border == null || floating || radius > 0
          ? null
          : Border(top: BorderSide(color: border)),
      boxShadow: (floating || radius > 0) && !notch
          ? [
              BoxShadow(
                // A shadow shows on a light page; a dark one gets a darker one.
                color: dark ? const Color(0x66000000) : const Color(0x1F0E0D24),
                blurRadius: design == TabBarDesign.island ? 22 : 18,
                offset: const Offset(0, 4),
              ),
            ]
          : null,
    );
    Widget bar = DecoratedBox(decoration: decoration, child: row);
    if (notch) {
      // 119 A curved cut in the bar's top for the round button.
      bar = CustomPaint(
        key: const ValueKey('nav-notch'),
        painter: _NotchPainter(
          colour: background,
          line: p.divider,
          shadow: dark,
        ),
        child: row,
      );
    }
    if (glass) {
      bar = ClipRRect(
        key: const ValueKey('nav-glass'),
        borderRadius: BorderRadius.circular(radius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: bar,
        ),
      );
    }
    if (design == TabBarDesign.dock) {
      bar = Center(
        key: const ValueKey('nav-dock'),
        heightFactor: 1,
        child: bar,
      );
    }
    if (design == TabBarDesign.island) {
      // 119 A capsule in the middle, as wide as it needs to be.
      bar = Center(
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: 64.0 * destinations.length + 90,
          ),
          child: bar,
        ),
      );
    }
    return Semantics(
      container: true,
      label: context.l10n.mainNavigation,
      explicitChildNodes: true,
      child: floating
          ? SafeArea(top: false, minimum: EdgeInsets.all(margin), child: bar)
          : notch
          ? CustomPaint(
              painter: _NotchPainter(
                colour: background,
                line: p.divider,
                shadow: dark,
                fill: true,
              ),
              child: SafeArea(top: false, child: row),
            )
          : DecoratedBox(
              decoration: decoration,
              child: SafeArea(top: false, child: row),
            ),
    );
  }

  /// 119 The colours of the `colours` design, one per tab in turn.
  static List<Color> _tabColours(Color primary, bool dark) => [
    for (final c in [
      primary,
      const Color(0xFFB26A00),
      const Color(0xFF2F4FB5),
      const Color(0xFF7A2E8E),
    ])
      dark ? readableOnDark(c)! : c,
  ];

  Widget _item(BuildContext context, int index) {
    final p = context.palette;
    final d = destinations[index];
    final selected = index == currentIndex;
    final count = badges[index] ?? 0;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final active = _active(dark);
    final inactive = _inactive(dark);
    final labels = style?.labels ?? TabLabels.always;
    final showLabel =
        labels == TabLabels.always || (labels == TabLabels.active && selected);
    final photo = index == avatarIndex && style?.avatar == true
        ? avatarUrl
        : null;
    Widget icon(double size, Color color, {bool filled = false}) {
      final Widget glyph;
      if (photo != null) {
        // 119 The person's own photo for the account tab.
        glyph = Container(
          key: ValueKey('nav-$index-avatar'),
          width: size + 2,
          height: size + 2,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: selected ? Border.all(color: color, width: 2) : null,
          ),
          padding: const EdgeInsets.all(1.5),
          child: ClipOval(
            child: AppNetworkImage(url: photo, width: size, height: size),
          ),
        );
      } else {
        glyph = OwnIcon(
          d.icon,
          url: d.iconUrl,
          size: size,
          color: color,
          filled: filled,
        );
      }
      if (count <= 0) return glyph;
      return Badge(
        label: Text(count > 99 ? '99+' : '$count'),
        backgroundColor: p.accent,
        textColor: p.onAccent,
        child: glyph,
      );
    }

    Widget name(Color color, {double size = 12, bool bold = false}) => Padding(
      // 110 Each tab's name on one line inside its own tab, with a little
      // room between neighbours ("MembershipAppointme…" ran together with
      // five tabs on a phone).
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: Text(
        d.label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        textAlign: TextAlign.center,
        textScaler: MediaQuery.textScalerOf(context).clamp(maxScaleFactor: 1.3),
        style: TextStyle(
          fontSize: size,
          fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
          color: color,
          fontFamily: fontFamily,
        ),
      ),
    );

    final mark = ValueKey('nav-$index-${design.name}');
    final tone = active ?? p.primary;
    final quiet = inactive ?? p.textSecondary;
    final Widget content;
    if (index == _middle) {
      // 109 The tab in the middle: a round button raised above the bar;
      // 119 with the notch, sitting in its cut.
      final notch = design == TabBarDesign.notch;
      content = Center(
        child: Transform.translate(
          offset: Offset(0, notch ? -26 : -14),
          child: Container(
            key: notch ? const ValueKey('nav-mid-notch') : null,
            width: notch ? 58 : 56,
            height: notch ? 58 : 56,
            decoration: BoxDecoration(
              color: tone,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: dark
                      ? const Color(0x80000000)
                      : const Color(0x330E0D24),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            alignment: Alignment.center,
            child: icon(
              26,
              active == null ? p.onPrimary : onFill(active),
              filled: true,
            ),
          ),
        ),
      );
    } else {
      switch (design) {
        case TabBarDesign.pill:
        case TabBarDesign.bubble:
        case TabBarDesign.island:
        case TabBarDesign.segment:
        case TabBarDesign.float:
          // The open tab with its name beside its icon: filled (pill, and
          // lit on the island), in a soft bubble, or a raised segment; the
          // others icons only.
          final Color fill;
          final Color onIt;
          final Color other;
          List<BoxShadow>? lift;
          switch (design) {
            case TabBarDesign.bubble:
              fill = tone.withValues(alpha: dark ? 0.24 : 0.14);
              onIt = tone;
              other = quiet;
            case TabBarDesign.island:
              fill = tone;
              onIt = onFill(tone);
              other = const Color(0xFF8F9A95);
            case TabBarDesign.segment:
              fill = dark ? const Color(0xFF2E3734) : p.surface;
              onIt = tone;
              other = quiet;
              lift = [
                BoxShadow(
                  color: dark
                      ? const Color(0x66000000)
                      : const Color(0x1F0E0D24),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ];
            default:
              fill = tone;
              onIt = active == null ? p.onPrimary : onFill(active);
              other = quiet;
          }
          content = selected
              ? DecoratedBox(
                  key: mark,
                  decoration: BoxDecoration(
                    color: fill,
                    borderRadius: BorderRadius.circular(
                      design == TabBarDesign.segment
                          ? 14
                          : design == TabBarDesign.float
                          ? 20
                          : 18,
                    ),
                    boxShadow: lift,
                  ),
                  // 38 Room between the label and the pill's edges.
                  child: Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: design == TabBarDesign.float ? 14 : 10,
                    ),
                    child: Center(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            icon(20, onIt),
                            if (labels != TabLabels.never) ...[
                              // A count's badge reaches past the icon.
                              SizedBox(width: count > 0 ? 12 : 6),
                              Text(
                                d.label,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: onIt,
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
              : Center(child: icon(24, other));
        // 129 The dock: icons only, the open tab a filled circle.
        case TabBarDesign.dock:
          content = Center(
            child: selected
                ? Container(
                    key: mark,
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: tone,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: icon(
                      22,
                      active == null ? p.onPrimary : onFill(active),
                      filled: true,
                    ),
                  )
                : icon(22, quiet),
          );
        case TabBarDesign.dot:
        case TabBarDesign.line:
          // 119 A dot under the open tab's icon, or a line over the open tab.
          final color = selected ? tone : quiet;
          final bar = Container(
            key: selected ? mark : null,
            width: design == TabBarDesign.dot ? 5 : 28,
            height: design == TabBarDesign.dot ? 5 : 3,
            decoration: BoxDecoration(
              color: selected ? color : Colors.transparent,
              borderRadius: BorderRadius.circular(3),
            ),
          );
          content = design == TabBarDesign.line
              ? Column(
                  children: [
                    bar,
                    const Spacer(),
                    icon(24, color, filled: selected),
                    if (showLabel) ...[
                      const SizedBox(height: 2),
                      name(color, size: 11.5, bold: selected),
                    ],
                    const Spacer(),
                  ],
                )
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    icon(24, color, filled: selected),
                    const SizedBox(height: 4),
                    bar,
                    if (showLabel) ...[
                      const SizedBox(height: 2),
                      name(color, size: 11.5, bold: selected),
                    ],
                  ],
                );
        case TabBarDesign.drop:
          // 119 A drop of the open tab's colour hangs from the bar's edge.
          final color = selected ? tone : quiet;
          content = Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              if (selected)
                Positioned(
                  top: -8,
                  child: Container(
                    key: mark,
                    width: 34,
                    height: 12,
                    decoration: BoxDecoration(
                      color: tone,
                      borderRadius: const BorderRadius.vertical(
                        bottom: Radius.circular(18),
                      ),
                    ),
                  ),
                ),
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  icon(24, color, filled: selected),
                  if (showLabel) ...[
                    const SizedBox(height: 3),
                    name(color, bold: selected),
                  ],
                ],
              ),
            ],
          );
        case TabBarDesign.lift:
          // 119 The open tab's icon rises into a circle above the bar.
          final color = selected ? tone : quiet;
          content = selected
              ? Stack(
                  clipBehavior: Clip.none,
                  alignment: Alignment.center,
                  children: [
                    Positioned(
                      top: -30,
                      child: Container(
                        key: mark,
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: tone,
                          shape: BoxShape.circle,
                          border: Border.all(color: p.background, width: 5),
                        ),
                        alignment: Alignment.center,
                        child: icon(22, onFill(tone), filled: true),
                      ),
                    ),
                    if (showLabel)
                      Positioned(bottom: 2, child: name(color, bold: true)),
                  ],
                )
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    icon(24, color),
                    if (showLabel) ...[const SizedBox(height: 3), name(color)],
                  ],
                );
        case TabBarDesign.text:
          // 119 Names only: the open one bold and underlined.
          final color = selected ? tone : quiet;
          content = Center(
            child: Container(
              key: selected ? mark : null,
              padding: const EdgeInsets.only(bottom: 4),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: selected ? color : Colors.transparent,
                    width: 2.5,
                  ),
                ),
              ),
              child: name(color, size: 14.5, bold: selected),
            ),
          );
        case TabBarDesign.folder:
          // 119 The bar in the owner's colour; the open tab rises out of
          // it like a folder's tab, in the page's colour.
          final onBar = onFill(
            dark
                ? Color.lerp(tone, const Color(0xFF000000), 0.62)!
                : (_colour(style?.active) ?? p.primary),
          );
          content = selected
              ? Transform.translate(
                  offset: const Offset(0, -12),
                  child: Container(
                    key: mark,
                    decoration: BoxDecoration(
                      color: p.background,
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(18),
                      ),
                    ),
                    padding: const EdgeInsets.only(top: 6),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        icon(24, tone, filled: true),
                        if (showLabel) name(tone, bold: true),
                      ],
                    ),
                  ),
                )
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    icon(24, onBar.withValues(alpha: 0.78)),
                    if (showLabel) name(onBar.withValues(alpha: 0.78)),
                  ],
                );
        case TabBarDesign.glow:
          // 119 The open tab glows in its colour.
          final color = selected ? tone : quiet;
          content = Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              DecoratedBox(
                key: selected ? mark : null,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: selected
                      ? [
                          BoxShadow(
                            color: tone.withValues(alpha: dark ? 0.65 : 0.35),
                            blurRadius: 16,
                          ),
                        ]
                      : null,
                ),
                child: icon(24, color, filled: selected),
              ),
              if (showLabel) ...[
                const SizedBox(height: 3),
                name(color, bold: selected),
              ],
              const SizedBox(height: 4),
              Container(
                width: 40,
                height: 3,
                decoration: BoxDecoration(
                  color: selected ? tone : Colors.transparent,
                  borderRadius: BorderRadius.circular(3),
                  boxShadow: selected
                      ? [BoxShadow(color: tone, blurRadius: 10)]
                      : null,
                ),
              ),
            ],
          );
        case TabBarDesign.colours:
          // 119 Each tab its own colour in a soft circle; the open one ringed.
          final own = _tabColours(tone, dark)[index % 4];
          content = Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                key: selected ? mark : null,
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: own.withValues(alpha: dark ? 0.22 : 0.14),
                  border: selected ? Border.all(color: own, width: 2) : null,
                ),
                alignment: Alignment.center,
                child: icon(20, own, filled: selected),
              ),
              if (showLabel) ...[
                const SizedBox(height: 2),
                name(selected ? own : quiet, size: 11.5, bold: selected),
              ],
            ],
          );
        case TabBarDesign.outline:
        case TabBarDesign.square:
        case TabBarDesign.glass:
        case TabBarDesign.notch:
        case TabBarDesign.classic:
        case TabBarDesign.minimal:
          final minimal = design == TabBarDesign.minimal;
          final color = selected
              ? (design == TabBarDesign.classic || minimal
                    ? (active ?? p.text)
                    : tone)
              : (inactive ?? (minimal ? p.textTertiary : p.textSecondary));
          final Widget glyph;
          switch (design) {
            case TabBarDesign.outline:
              // 119 The open tab's icon in a thin outlined pill.
              glyph = Container(
                key: selected ? mark : null,
                width: 56,
                height: 30,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(
                    color: selected ? color : Colors.transparent,
                    width: 1.5,
                  ),
                ),
                alignment: Alignment.center,
                child: icon(22, color, filled: selected),
              );
            case TabBarDesign.square:
              // 119 The open tab's icon on a filled rounded square.
              glyph = Container(
                key: selected ? mark : null,
                width: 42,
                height: 34,
                decoration: BoxDecoration(
                  color: selected ? tone : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: icon(
                  22,
                  selected ? onFill(tone) : color,
                  filled: selected,
                ),
              );
            case TabBarDesign.glass:
              // 119 The open tab on a brighter patch of the glass; 123 with
              // the owner's colour for it, on a pill of that colour (the
              // premium academy's ink).
              final fill = active;
              glyph = Container(
                key: selected ? mark : null,
                width: 54,
                height: 30,
                decoration: BoxDecoration(
                  color: !selected
                      ? Colors.transparent
                      : fill ??
                            (dark
                                ? const Color(0x29FFFFFF)
                                : const Color(0xD9FFFFFF)),
                  borderRadius: BorderRadius.circular(15),
                ),
                alignment: Alignment.center,
                child: icon(
                  22,
                  selected && fill != null ? onFill(fill) : color,
                  filled: selected,
                ),
              );
            case TabBarDesign.minimal:
              glyph = icon(22, color, filled: selected);
            default:
              glyph = AnimatedContainer(
                key: selected && design == TabBarDesign.notch ? mark : null,
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
              );
          }
          content = Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              glyph,
              if (showLabel) ...[
                SizedBox(height: minimal ? 4 : 0),
                name(color, size: minimal ? 11 : 12, bold: selected),
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

/// 119 The notch design's bar: its top edge dips around the middle so the
/// round button sits in the cut.
class _NotchPainter extends CustomPainter {
  const _NotchPainter({
    required this.colour,
    required this.line,
    required this.shadow,
    this.fill = false,
  });

  final Color colour;
  final Color line;
  final bool shadow;

  /// Paint down to the bottom of the screen (past the safe area) too.
  final bool fill;

  @override
  void paint(Canvas canvas, Size size) {
    final mid = size.width / 2;
    const half = 44.0;
    const depth = 30.0;
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(mid - half - 12, 0)
      ..cubicTo(mid - half, 0, mid - half + 2, depth, mid, depth)
      ..cubicTo(mid + half - 2, depth, mid + half, 0, mid + half + 12, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawShadow(
      path,
      shadow ? const Color(0xFF000000) : const Color(0x660E0D24),
      3,
      false,
    );
    canvas.drawPath(path, Paint()..color = colour);
  }

  @override
  bool shouldRepaint(_NotchPainter old) =>
      old.colour != colour || old.line != line || old.shadow != shadow;
}
