import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/studio_screen_scope.dart';
import '../data/travel_providers.dart';

/// 126 The travel screens' look, as the approved designs have it: ink on a
/// warm page by day and deep ink by night, gold for what matters, sea for
/// flights, large titles and prices in the display font. The main colour is
/// the app's own (its ink) and the second colour its gold, so each company's
/// brand comes through; everything else follows light and dark.
@immutable
class TravelTokens {
  const TravelTokens({
    required this.dark,
    required this.page,
    required this.surface,
    required this.line,
    required this.text,
    required this.muted,
    required this.ink,
    required this.onInk,
    required this.gold,
    required this.goldSoft,
    required this.goldText,
    required this.sea,
    required this.seaSoft,
    required this.ok,
    required this.okSoft,
    required this.danger,
    required this.accent,
    required this.display,
  });

  factory TravelTokens.of(BuildContext context, String? display) {
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;
    final primary = theme.colorScheme.primary;
    final gold = theme.colorScheme.secondary == theme.colorScheme.primary
        ? const Color(0xFFC9A063)
        : theme.colorScheme.secondary;
    return TravelTokens(
      dark: dark,
      page: dark ? const Color(0xFF0E1424) : const Color(0xFFF7F3EC),
      surface: dark ? const Color(0xFF1B2338) : Colors.white,
      line: dark ? const Color(0xFF2A3350) : const Color(0xFFE6DFD2),
      text: dark ? const Color(0xFFF4EFE6) : const Color(0xFF0E1424),
      muted: dark ? const Color(0xFFB4B8C6) : const Color(0xFF5F6472),
      // By night the filled buttons are gold, as the dark designs have them.
      ink: dark ? gold : primary,
      onInk: dark
          ? const Color(0xFF0E1424)
          : (ThemeData.estimateBrightnessForColor(primary) == Brightness.dark
                ? Colors.white
                : const Color(0xFF0E1424)),
      gold: gold,
      goldSoft: dark ? gold.withValues(alpha: 0.18) : const Color(0xFFF3E8D4),
      goldText: dark ? gold : const Color(0xFF7F5B1C),
      sea: dark ? const Color(0xFF6FB9D2) : const Color(0xFF1F6F8B),
      seaSoft: dark
          ? const Color(0xFF1F6F8B).withValues(alpha: 0.28)
          : const Color(0xFFE1F0F4),
      ok: dark ? const Color(0xFF6FD3A0) : const Color(0xFF1B7A4B),
      okSoft: dark
          ? const Color(0xFF1B7A4B).withValues(alpha: 0.28)
          : const Color(0xFFE2F3EA),
      danger: dark ? const Color(0xFFFF9C80) : const Color(0xFFB2381A),
      accent: const Color(0xFFFF6B3D),
      display: display,
    );
  }

  final bool dark;
  final Color page;
  final Color surface;
  final Color line;
  final Color text;
  final Color muted;
  final Color ink;
  final Color onInk;
  final Color gold;
  final Color goldSoft;
  final Color goldText;
  final Color sea;
  final Color seaSoft;
  final Color ok;
  final Color okSoft;
  final Color danger;
  final Color accent;

  /// The display font's family, once it is on the phone.
  final String? display;

  TextStyle serif(
    double size, {
    FontWeight weight = FontWeight.w600,
    Color? color,
    FontStyle? style,
    double? height,
  }) => TextStyle(
    fontFamily: display,
    fontSize: size,
    fontWeight: weight,
    color: color ?? text,
    fontStyle: style,
    height: height ?? 1.15,
    letterSpacing: -0.2,
  );

  TextStyle ui(
    double size, {
    FontWeight weight = FontWeight.w600,
    Color? color,
    double? height,
  }) => TextStyle(
    fontSize: size,
    fontWeight: weight,
    color: color ?? text,
    height: height,
  );
}

/// The tokens for this screen.
TravelTokens travelTokens(BuildContext context, WidgetRef ref) =>
    TravelTokens.of(context, ref.watch(travelDisplayFontProvider));

/// A little label (`.pill`): gold, sea, ok, coral, ink, glass or plain.
enum PillTone { gold, sea, ok, coral, ink, glass, plain }

class TravelPill extends StatelessWidget {
  const TravelPill(
    this.text, {
    super.key,
    required this.t,
    this.tone = PillTone.plain,
    this.icon,
  });

  final String text;
  final TravelTokens t;
  final PillTone tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) {
      PillTone.gold => (t.goldSoft, t.goldText),
      PillTone.sea => (t.seaSoft, t.sea),
      PillTone.ok => (t.okSoft, t.ok),
      PillTone.coral => (t.accent.withValues(alpha: 0.14), t.danger),
      PillTone.ink => (t.ink, t.onInk),
      PillTone.glass => (Colors.white.withValues(alpha: 0.18), Colors.white),
      PillTone.plain => (t.dark ? t.line : const Color(0xFFEFE9DE), t.text),
    };
    final child = Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: fg),
            const SizedBox(width: 4),
          ],
          Flexible(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: t.ui(11.5, weight: FontWeight.w800, color: fg),
            ),
          ),
        ],
      ),
    );
    if (tone != PillTone.glass) return child;
    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: child,
      ),
    );
  }
}

/// A guests' score out of 10 (`.score`).
class ScoreBadge extends StatelessWidget {
  const ScoreBadge(
    this.score, {
    super.key,
    required this.t,
    this.large = false,
    this.light = false,
  });
  final double score;
  final TravelTokens t;
  final bool large;
  final bool light;

  @override
  Widget build(BuildContext context) => Container(
    constraints: BoxConstraints(minWidth: large ? 56 : 34),
    height: large ? 44 : 26,
    alignment: Alignment.center,
    padding: const EdgeInsets.symmetric(horizontal: 7),
    decoration: BoxDecoration(
      color: light ? Colors.white : t.ink,
      borderRadius: large
          ? const BorderRadiusDirectional.only(
              topStart: Radius.circular(14),
              topEnd: Radius.circular(14),
              bottomEnd: Radius.circular(14),
              bottomStart: Radius.circular(4),
            ).resolve(Directionality.of(context))
          : BorderRadius.circular(9),
    ),
    child: Text(
      score.toStringAsFixed(1),
      style: t.ui(
        large ? 20 : 13,
        weight: FontWeight.w800,
        color: light ? const Color(0xFF0E1424) : t.onInk,
      ),
    ),
  );
}

/// The word for a score, as the hotel lists say it.
String scoreWord(BuildContext context, double score) {
  final l10n = context.l10n;
  if (score >= 9) {
    return score >= 9.5 ? l10n.travelScoreExceptional : l10n.travelScoreSuperb;
  }
  if (score >= 8) return l10n.travelScoreVeryGood;
  if (score >= 7) return l10n.travelScoreGood;
  return l10n.travelScorePleasant;
}

class Stars extends StatelessWidget {
  const Stars(this.count, {super.key, required this.color, this.size = 13});
  final int count;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) => Semantics(
    label: context.l10n.travelStars(count),
    child: ExcludeSemantics(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < count; i++)
            Icon(Symbols.star_rounded, fill: 1, size: size, color: color),
        ],
      ),
    ),
  );
}

/// A round-cornered square button (`.icon-btn`), glass over photos.
class TravelIconButton extends StatelessWidget {
  const TravelIconButton({
    super.key,
    required this.icon,
    required this.label,
    required this.t,
    this.onTap,
    this.glass = false,
    this.filled = false,
    this.size = 44,
    this.selected = false,
  });
  final IconData icon;
  final String label;
  final TravelTokens t;
  final VoidCallback? onTap;
  final bool glass;
  final bool filled;
  final double size;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final fg = glass ? Colors.white : (filled ? t.onInk : t.text);
    final box = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: glass
            ? Colors.white.withValues(alpha: 0.2)
            : (filled ? t.ink : t.surface),
        borderRadius: BorderRadius.circular(14),
        border: glass || filled ? null : Border.all(color: t.line),
      ),
      child: Icon(icon, size: 22, color: fg, fill: selected ? 1 : 0),
    );
    return Semantics(
      button: true,
      label: label,
      selected: selected,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: glass
            ? ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                  child: box,
                ),
              )
            : box,
      ),
    );
  }
}

/// The screens' main button (`.btn`): ink, or gold.
class TravelButton extends StatelessWidget {
  const TravelButton({
    super.key,
    required this.label,
    required this.t,
    this.onPressed,
    this.gold = false,
    this.icon,
    this.busy = false,
    this.height = 54,
  });
  final String label;
  final TravelTokens t;
  final VoidCallback? onPressed;
  final bool gold;
  final IconData? icon;
  final bool busy;
  final double height;

  @override
  Widget build(BuildContext context) {
    final bg = gold ? t.gold : t.ink;
    final fg = gold ? const Color(0xFF0E1424) : t.onInk;
    return SizedBox(
      height: height,
      child: FilledButton(
        style: FilledButton.styleFrom(
          backgroundColor: bg,
          foregroundColor: fg,
          disabledBackgroundColor: bg.withValues(alpha: 0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: t.ui(15, weight: FontWeight.w800),
        ),
        onPressed: busy ? null : onPressed,
        child: busy
            ? SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2.4, color: fg),
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 20),
                    const SizedBox(width: 8),
                  ],
                  Flexible(
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

/// A white card with the line around it (`.card`).
class TravelCard extends StatelessWidget {
  const TravelCard({
    super.key,
    required this.t,
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.radius = 22,
    this.onTap,
    this.border,
    this.color,
    this.shadow = false,
  });
  final TravelTokens t;
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final VoidCallback? onTap;
  final Color? border;
  final Color? color;
  final bool shadow;

  @override
  Widget build(BuildContext context) {
    final box = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? t.surface,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: border ?? t.line,
          width: border == null ? 1 : 2,
        ),
        boxShadow: shadow
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: t.dark ? 0.3 : 0.08),
                  blurRadius: 24,
                  offset: const Offset(0, 10),
                ),
              ]
            : null,
      ),
      child: child,
    );
    if (onTap == null) return box;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(radius),
        onTap: onTap,
        child: box,
      ),
    );
  }
}

/// A search field (`.field`): an icon, a small label over the value.
class TravelField extends StatelessWidget {
  const TravelField({
    super.key,
    required this.t,
    required this.label,
    required this.value,
    this.icon,
    this.onTap,
    this.trailing,
    this.dark = false,
  });
  final TravelTokens t;
  final String label;
  final String value;
  final IconData? icon;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final fg = dark ? Colors.white : t.text;
    return Semantics(
      button: onTap != null,
      label: '$label: $value',
      child: ExcludeSemantics(
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Container(
            constraints: const BoxConstraints(minHeight: 58),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
            decoration: BoxDecoration(
              color: dark
                  ? const Color(0xFF0E1424)
                  : (t.dark
                        ? const Color(0xFF0E1424)
                        : const Color(0xFFF7F3EC)),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: dark ? const Color(0xFF2A3350) : t.line,
              ),
            ),
            child: Row(
              children: [
                if (icon != null) ...[
                  Icon(
                    icon,
                    size: 20,
                    color: dark ? const Color(0xFF9AA0B2) : t.muted,
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        label,
                        style: t.ui(
                          11.5,
                          weight: FontWeight.w700,
                          color: dark ? const Color(0xFF9AA0B2) : t.muted,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        value,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: t.ui(15, weight: FontWeight.w800, color: fg),
                      ),
                    ],
                  ),
                ),
                ?trailing,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The segmented choice (`.seg`).
class TravelSegments<T> extends StatelessWidget {
  const TravelSegments({
    super.key,
    required this.t,
    required this.values,
    required this.selected,
    required this.label,
    required this.onChanged,
    this.icons,
    this.sub,
    this.dark = false,
  });
  final TravelTokens t;
  final List<T> values;
  final T selected;
  final String Function(T value) label;
  final String Function(T value)? sub;
  final IconData Function(T value)? icons;
  final ValueChanged<T> onChanged;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final track = dark
        ? const Color(0xFF0E1424)
        : (t.dark ? const Color(0xFF0E1424) : const Color(0xFFEFE9DE));
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: track,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          for (final v in values)
            Expanded(
              child: Semantics(
                button: true,
                selected: v == selected,
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => onChanged(v),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    constraints: BoxConstraints(
                      minHeight: sub == null ? 40 : 48,
                    ),
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: v == selected
                          ? (dark || t.dark ? t.gold : t.surface)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: v == selected && !t.dark && !dark
                          ? [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.06),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ]
                          : null,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (icons != null) ...[
                              Icon(icons!(v), size: 16, color: _fg(v)),
                              const SizedBox(width: 5),
                            ],
                            Flexible(
                              child: Text(
                                label(v),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: t.ui(
                                  13,
                                  weight: FontWeight.w800,
                                  color: _fg(v),
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (sub != null)
                          Text(
                            sub!(v),
                            style: t.ui(
                              11,
                              weight: FontWeight.w700,
                              color: _fg(v),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Color _fg(T v) {
    if (v == selected) return dark || t.dark ? const Color(0xFF0E1424) : t.text;
    return dark ? const Color(0xFFC7CAD5) : t.muted;
  }
}

/// A filter chip (`.chip`).
class TravelChip extends StatelessWidget {
  const TravelChip({
    super.key,
    required this.t,
    required this.label,
    this.selected = false,
    this.onTap,
    this.icon,
  });
  final TravelTokens t;
  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    child: InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: Container(
        height: 38,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: selected ? t.ink : t.surface,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: selected ? t.ink : t.line),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 16, color: selected ? t.onInk : t.text),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: t.ui(
                13,
                weight: FontWeight.w700,
                color: selected ? t.onInk : t.text,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// A switch drawn as the designs have it.
class TravelToggle extends StatelessWidget {
  const TravelToggle({
    super.key,
    required this.t,
    required this.on,
    required this.label,
    this.onChanged,
  });
  final TravelTokens t;
  final bool on;
  final String label;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) => Semantics(
    toggled: on,
    label: label,
    child: GestureDetector(
      onTap: onChanged == null ? null : () => onChanged!(!on),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 44,
        height: 26,
        padding: const EdgeInsets.all(3),
        alignment: on
            ? AlignmentDirectional.centerEnd
            : AlignmentDirectional.centerStart,
        decoration: BoxDecoration(
          color: on ? t.ink : t.line,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: on ? t.onInk : Colors.white,
            shape: BoxShape.circle,
          ),
        ),
      ),
    ),
  );
}

/// A photo with the dark fade at its foot (`.photo` + `.scrim`).
class TravelPhoto extends StatelessWidget {
  const TravelPhoto({
    super.key,
    required this.url,
    this.height,
    this.radius = 0,
    this.scrim = true,
    this.label,
    this.seed = 0,
    this.children = const [],
  });
  final String? url;
  final double? height;
  final double radius;
  final bool scrim;
  final String? label;
  final int seed;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(radius),
    child: SizedBox(
      height: height,
      child: Stack(
        fit: StackFit.expand,
        children: [
          AppNetworkImage(url: url, seed: seed, semanticLabel: label),
          if (scrim)
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0x330E1424),
                    Color(0x000E1424),
                    Color(0xB30E1424),
                  ],
                  stops: [0, 0.4, 1],
                ),
              ),
            ),
          ...children,
        ],
      ),
    ),
  );
}

/// The top of a pushed screen: back, a title with a line under it, and what is on the end.
class TravelTopBar extends StatelessWidget {
  const TravelTopBar({
    super.key,
    required this.t,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onBack,
    this.light = false,
  });
  final TravelTokens t;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onBack;
  final bool light;

  @override
  Widget build(BuildContext context) {
    // 120.4 Under a Studio page's header, which has the title and the back
    // button: only the screen's own button stays.
    if (StudioScreenScope.hidesTitleOf(context)) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
        child: trailing == null
            ? const SizedBox(height: 4)
            : Align(alignment: AlignmentDirectional.centerEnd, child: trailing),
      );
    }
    final back =
        onBack ??
        (Navigator.of(context).canPop()
            ? () => Navigator.of(context).maybePop()
            : null);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
      child: Row(
        children: [
          if (back != null)
            TravelIconButton(
              icon: Directionality.of(context) == TextDirection.rtl
                  ? Symbols.chevron_right_rounded
                  : Symbols.chevron_left_rounded,
              label: context.l10n.travelBack,
              t: t,
              onTap: back,
              glass: light,
            )
          else
            const SizedBox(width: 44),
          Expanded(
            child: Column(
              children: [
                Text(
                  title,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: t.ui(
                    17,
                    weight: FontWeight.w800,
                    color: light ? Colors.white : null,
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle!,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: t.ui(
                      13,
                      weight: FontWeight.w600,
                      color: light ? const Color(0xFFB4B8C6) : t.muted,
                    ),
                  ),
              ],
            ),
          ),
          trailing ?? const SizedBox(width: 44),
        ],
      ),
    );
  }
}

/// The bar at the foot of a screen: a price and what it is, and the button.
class TravelPriceBar extends StatelessWidget {
  const TravelPriceBar({
    super.key,
    required this.t,
    required this.button,
    this.price,
    this.caption,
    this.leading,
  });
  final TravelTokens t;
  final String? price;
  final String? caption;
  final Widget button;
  final Widget? leading;

  @override
  Widget build(BuildContext context) => ClipRect(
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
      child: Container(
        padding: EdgeInsets.fromLTRB(
          20,
          14,
          20,
          14 + MediaQuery.paddingOf(context).bottom,
        ),
        decoration: BoxDecoration(
          color: t.surface.withValues(alpha: 0.96),
          border: Border(top: BorderSide(color: t.line)),
        ),
        child: Row(
          children: [
            if (leading != null) ...[leading!, const SizedBox(width: 12)],
            if (price != null || caption != null)
              Expanded(
                flex: 5,
                child: Padding(
                  padding: const EdgeInsetsDirectional.only(end: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (price != null)
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: AlignmentDirectional.centerStart,
                          child: Text(price!, style: t.serif(22)),
                        ),
                      if (caption != null)
                        Text(
                          caption!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: t.ui(
                            11.5,
                            weight: FontWeight.w600,
                            color: t.muted,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            Expanded(flex: 6, child: button),
          ],
        ),
      ),
    ),
  );
}

/// A small caption line in the design's `.eyebrow` style.
class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key, required this.color});
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Text(
    text.toUpperCase(),
    style: TextStyle(
      fontSize: 11.5,
      fontWeight: FontWeight.w800,
      letterSpacing: 1.1,
      color: color,
    ),
  );
}

/// A loading or failed state inside a travel screen.
Widget travelAsync<T>(
  AsyncValue<T> value,
  Widget Function(T data) data, {
  VoidCallback? onRetry,
}) => value.when(
  data: data,
  loading: () => const Center(
    child: Padding(
      padding: EdgeInsets.all(32),
      child: CircularProgressIndicator(),
    ),
  ),
  error: (error, _) => ErrorView(error: error, onRetry: onRetry),
);

/// "2h 05m".
String durationLabel(BuildContext context, int minutes) => context.l10n
    .travelDuration(minutes ~/ 60, (minutes % 60).toString().padLeft(2, '0'));

/// A colour from "#RRGGBB".
Color hexColor(String hex, Color fallback) {
  final v = int.tryParse(hex.replaceFirst('#', ''), radix: 16);
  return v == null ? fallback : Color(0xFF000000 | v);
}

/// The Material Symbols icon of an amenity, by its name.
IconData amenityIcon(String id) => switch (id) {
  'pool' => Symbols.pool_rounded,
  'spa' => Symbols.spa_rounded,
  'wifi' => Symbols.wifi_rounded,
  'breakfast' => Symbols.free_breakfast_rounded,
  'shuttle' => Symbols.airport_shuttle_rounded,
  'gym' => Symbols.fitness_center_rounded,
  'parking' => Symbols.local_parking_rounded,
  'beach' => Symbols.beach_access_rounded,
  'restaurant' => Symbols.restaurant_rounded,
  'bar' => Symbols.local_bar_rounded,
  'air_conditioning' => Symbols.ac_unit_rounded,
  'family' => Symbols.family_restroom_rounded,
  'pets' => Symbols.pets_rounded,
  'accessible' => Symbols.accessible_rounded,
  'kitchen' => Symbols.kitchen_rounded,
  'view' => Symbols.landscape_rounded,
  _ => Symbols.check_rounded,
};
