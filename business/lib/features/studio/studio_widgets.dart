import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api/models.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

/// 125 The pieces the Studio apps' screens share, as the 1.0.2 designs draw
/// them: 20-point cards with a hairline, small tags, count tiles, the
/// underlined filters, 44- and 52-point buttons, initials, and the grouped
/// "Needs you now" list.

/// A card: the surface with the theme's line, 20 points round.
class Box extends StatelessWidget {
  const Box({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = 20,
    this.color,
    this.border,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color? color;

  /// Null: the theme's line; [BorderSide.none] for a filled tile.
  final BorderSide? border;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius),
      side: border ?? BorderSide(color: c.line),
    );
    return Material(
      color: color ?? c.surface,
      shape: shape,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}

/// A small status tag (New, Needs a courier, Waiting for you).
class Tag extends StatelessWidget {
  const Tag(
    this.label, {
    super.key,
    this.tone = Tone.neutral,
    this.big = false,
  });

  final String label;
  final Tone tone;

  /// 13 points with more room (a detail screen's title).
  final bool big;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = toneColors(context, tone);
    return Container(
      padding: big
          ? const EdgeInsets.symmetric(horizontal: 10, vertical: 4)
          : const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: big ? 13 : 12,
          fontWeight: FontWeight.w600,
          color: fg,
          height: 1.3,
        ),
      ),
    );
  }
}

(Color, Color) toneColors(BuildContext context, Tone tone) {
  final c = context.yb;
  return switch (tone) {
    Tone.good => (c.successBg, c.success),
    Tone.warn => (c.warningBg, c.warning),
    Tone.bad => (c.dangerBg, c.danger),
    Tone.info => (c.infoBg, c.info),
    Tone.accent => (c.goldBg, c.gold),
    Tone.neutral => (c.muted, c.ink),
  };
}

/// A number and what it counts, in a row of three.
class CountTile extends StatelessWidget {
  const CountTile({
    super.key,
    required this.value,
    required this.label,
    this.tone = Tone.neutral,
  });

  final String value;
  final String label;

  /// neutral: a card; warn or good: filled.
  final Tone tone;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    final filled = tone != Tone.neutral;
    final (bg, fg) = filled ? toneColors(context, tone) : (c.surface, c.ink);
    return MergeSemantics(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(14),
          border: filled ? null : Border.all(color: c.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: fg,
                height: 1.25,
              ),
            ),
            Text(
              label,
              maxLines: 2,
              style: TextStyle(fontSize: 12, color: filled ? fg : c.ink2),
            ),
          ],
        ),
      ),
    );
  }
}

/// Three count tiles side by side (stacked with very large text).
class CountRow extends StatelessWidget {
  const CountRow({super.key, required this.tiles});

  final List<CountTile> tiles;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
    child: IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < tiles.length; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            Expanded(child: tiles[i]),
          ],
        ],
      ),
    ),
  );
}

/// A screen's big title with its actions (search, Restaurants, Couriers).
class StudioHeader extends StatelessWidget {
  const StudioHeader({
    super.key,
    required this.title,
    this.actions = const [],
    this.subtitle,
    this.bottom = 8,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final double bottom;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsetsDirectional.fromSTEB(20, 16, 8, bottom),
    child: Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                header: true,
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              if (subtitle != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    subtitle!,
                    style: TextStyle(fontSize: 14, color: context.yb.ink2),
                  ),
                ),
            ],
          ),
        ),
        ...actions,
      ],
    ),
  );
}

/// An accent text button with an icon (Restaurants, Couriers, Drivers).
class HeaderLink extends StatelessWidget {
  const HeaderLink({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => TextButton.icon(
    onPressed: onPressed,
    style: TextButton.styleFrom(
      foregroundColor: context.yb.accentText,
      minimumSize: const Size(48, 44),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
    ),
    icon: Icon(icon, size: 22),
    label: Text(label),
  );
}

/// The underlined filters: the chosen one in Ember, a count beside it.
class FilterTabs extends StatelessWidget {
  const FilterTabs({
    super.key,
    required this.labels,
    required this.selected,
    required this.onSelected,
    this.counts = const {},
    this.gap = 20,
  });

  final List<String> labels;
  final int selected;
  final ValueChanged<int> onSelected;

  /// A badge beside a filter (its index → the number).
  final Map<int, int> counts;
  final double gap;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return Container(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: c.line)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Row(
          children: [
            for (var i = 0; i < labels.length; i++) ...[
              if (i > 0) SizedBox(width: gap),
              Semantics(
                selected: i == selected,
                button: true,
                child: InkWell(
                  onTap: () => onSelected(i),
                  child: Container(
                    constraints: const BoxConstraints(minHeight: 46),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: i == selected ? c.accent : Colors.transparent,
                          width: 2,
                        ),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          labels[i],
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: i == selected ? c.ink : c.ink2,
                          ),
                        ),
                        if ((counts[i] ?? 0) > 0) ...[
                          const SizedBox(width: 6),
                          CountBadge(counts[i]!),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// An Ember circle with a number.
class CountBadge extends StatelessWidget {
  const CountBadge(this.count, {super.key, this.size = 20});

  final int count;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    constraints: BoxConstraints(minWidth: size),
    height: size,
    padding: const EdgeInsets.symmetric(horizontal: 6),
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: context.yb.accent,
      borderRadius: BorderRadius.circular(size / 2),
    ),
    child: Text(
      context.number(count),
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: Colors.white,
        height: 1.1,
      ),
    ),
  );
}

/// A segmented choice on a quiet fill (Orders | Complaints | Vendors).
class Segments extends StatelessWidget {
  const Segments({
    super.key,
    required this.labels,
    required this.selected,
    required this.onSelected,
    this.counts = const {},
    this.height = 40,
  });

  final List<String> labels;
  final int selected;
  final ValueChanged<int> onSelected;
  final Map<int, int> counts;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: c.muted,
        borderRadius: BorderRadius.circular(height <= 36 ? 14 : 16),
      ),
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++) ...[
            if (i > 0) const SizedBox(width: 4),
            Expanded(
              child: Semantics(
                selected: i == selected,
                button: true,
                child: Material(
                  color: i == selected ? c.surface : Colors.transparent,
                  borderRadius: BorderRadius.circular(height <= 36 ? 10 : 12),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(height <= 36 ? 10 : 12),
                    onTap: () => onSelected(i),
                    child: Container(
                      constraints: BoxConstraints(minHeight: height),
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(
                            child: Text(
                              labels[i],
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: i == selected ? c.ink : c.ink2,
                              ),
                            ),
                          ),
                          if ((counts[i] ?? 0) > 0) ...[
                            const SizedBox(width: 6),
                            CountBadge(counts[i]!),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// The card buttons: 44 points, outlined or filled with the text color.
class SmallButton extends StatelessWidget {
  const SmallButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.filled = false,
    this.icon,
    this.quiet = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool filled;
  final IconData? icon;

  /// Outlined with the hairline instead of the text color (Call driver).
  final bool quiet;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
    );
    const text = TextStyle(fontSize: 15, fontWeight: FontWeight.w600);
    const padding = EdgeInsets.symmetric(horizontal: 18);
    const size = Size(48, 44);
    final child = icon == null
        ? Text(label)
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 20),
              const SizedBox(width: 6),
              Flexible(child: Text(label)),
            ],
          );
    if (filled) {
      return FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          minimumSize: size,
          padding: padding,
          shape: shape,
          textStyle: text,
          backgroundColor: c.ink,
          foregroundColor: c.onInk,
        ),
        child: child,
      );
    }
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: size,
        padding: padding,
        shape: shape,
        textStyle: text,
        foregroundColor: c.ink,
        side: BorderSide(color: quiet ? c.line : c.ink),
      ),
      child: child,
    );
  }
}

/// The 52-point buttons at a screen's or a sheet's foot.
class BigButton extends StatelessWidget {
  const BigButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.filled = true,
    this.danger = false,
    this.icon,
    this.busy = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool filled;

  /// Outlined in red (Reject…, Decline).
  final bool danger;
  final IconData? icon;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
    );
    const text = TextStyle(fontSize: 16, fontWeight: FontWeight.w600);
    const size = Size(64, 52);
    final Widget child = busy
        ? const SizedBox.square(
            dimension: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          )
        : icon == null
        ? Text(label, textAlign: TextAlign.center)
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 22),
              const SizedBox(width: 8),
              Flexible(child: Text(label)),
            ],
          );
    if (filled && !danger) {
      return FilledButton(
        onPressed: busy ? null : onPressed,
        style: FilledButton.styleFrom(
          minimumSize: size,
          shape: shape,
          textStyle: text,
          backgroundColor: c.ink,
          foregroundColor: c.onInk,
        ),
        child: child,
      );
    }
    final color = danger ? c.danger : c.ink;
    return OutlinedButton(
      onPressed: busy ? null : onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: size,
        shape: shape,
        textStyle: text,
        foregroundColor: color,
        side: BorderSide(color: color),
      ),
      child: child,
    );
  }
}

/// A line with a small icon in front (trip_origin, location_on).
class IconLine extends StatelessWidget {
  const IconLine(this.icon, this.text, {super.key});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Icon(icon, size: 18, color: context.yb.ink2),
      const SizedBox(width: 6),
      Expanded(
        child: Text(
          text,
          style: TextStyle(fontSize: 13, color: context.yb.ink2),
        ),
      ),
    ],
  );
}

/// A person's initials in a quiet circle.
class Initials extends StatelessWidget {
  const Initials(this.text, {super.key, this.size = 40});

  final String text;
  final double size;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: context.yb.muted,
        shape: BoxShape.circle,
      ),
      child: Text(
        text,
        style: TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: size * 0.36,
          color: context.yb.ink,
        ),
      ),
    ),
  );
}

/// The initials of a name ("Mehmet Kaya" → "MK").
String initialsOf(String name) {
  final words = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
  return words.take(2).map((w) => w.characters.first.toUpperCase()).join();
}

/// A distance in the person's language, with one decimal.
String km(BuildContext context, double value) =>
    context.l10n.kmShort(NumberFormat('0.#', context.lang).format(value));

String kmAway(BuildContext context, double value) =>
    context.l10n.kmAway(NumberFormat('0.#', context.lang).format(value));

/// One row of the grouped "Needs you now" list.
class NeedRow {
  const NeedRow({
    required this.icon,
    required this.title,
    required this.count,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final int count;
  final VoidCallback? onTap;
}

/// "Needs you now" as one card, a row each (School, Prime Today).
class NeedsList extends StatelessWidget {
  const NeedsList({super.key, required this.rows, this.chevron = true});

  final List<NeedRow> rows;
  final bool chevron;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return Box(
      padding: EdgeInsets.zero,
      radius: 18,
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++)
            Semantics(
              button: rows[i].onTap != null,
              child: InkWell(
                onTap: rows[i].onTap,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 13,
                  ),
                  decoration: BoxDecoration(
                    border: i == rows.length - 1
                        ? null
                        : Border(bottom: BorderSide(color: c.line)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: c.muted,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(rows[i].icon, size: 22, color: c.ink),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          rows[i].title,
                          style: const TextStyle(fontSize: 15),
                        ),
                      ),
                      if (rows[i].count > 0)
                        ExcludeSemantics(
                          child: CountBadge(rows[i].count, size: 22),
                        ),
                      if (chevron) ...[
                        const SizedBox(width: 4),
                        DirectionalIcon(AppIcons.forward, color: c.ink2),
                      ],
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// A tile of the two-column grid (Insights, Smart alerts, buses, fees).
class InfoTile extends StatelessWidget {
  const InfoTile({
    super.key,
    required this.icon,
    required this.title,
    required this.text,
    this.iconColor,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String text;
  final Color? iconColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => MergeSemantics(
    child: Box(
      padding: const EdgeInsets.all(14),
      radius: 18,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor ?? context.yb.accentText),
          const SizedBox(height: 6),
          Text(
            title,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          Text(text, style: TextStyle(fontSize: 12, color: context.yb.ink2)),
        ],
      ),
    ),
  );
}

/// Two tiles a row (one with very large text).
class TileGrid extends StatelessWidget {
  const TileGrid({super.key, required this.tiles});

  final List<Widget> tiles;

  @override
  Widget build(BuildContext context) {
    final large = MediaQuery.textScalerOf(context).scale(10) > 13;
    return LayoutBuilder(
      builder: (context, constraints) {
        final perRow = large || constraints.maxWidth < 300 ? 1 : 2;
        final width = (constraints.maxWidth - (perRow - 1) * 10) / perRow;
        return Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [for (final t in tiles) SizedBox(width: width, child: t)],
        );
      },
    );
  }
}

/// The history of an item, oldest first.
class TimelineList extends StatelessWidget {
  const TimelineList({super.key, required this.entries});

  final List<TimelineEntry> entries;

  @override
  Widget build(BuildContext context) {
    final c = context.yb;
    return Box(
      radius: 18,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        children: [
          for (final e in entries)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: c.accent,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(e.label, style: const TextStyle(fontSize: 14)),
                        Text(
                          [
                            context.dateTime(e.at),
                            if (e.by != null) isolate(e.by!),
                          ].join(' · '),
                          style: TextStyle(fontSize: 12, color: c.ink2),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// The search field under a list's title.
class SearchBarField extends StatelessWidget {
  const SearchBarField({
    super.key,
    required this.hint,
    required this.onSubmitted,
    required this.onClose,
  });

  final String hint;
  final ValueChanged<String> onSubmitted;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
    child: TextField(
      autofocus: true,
      textInputAction: TextInputAction.search,
      onSubmitted: onSubmitted,
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: const Icon(AppIcons.search),
        suffixIcon: IconButton(
          tooltip: context.l10n.closeSearch,
          icon: const Icon(AppIcons.close),
          onPressed: onClose,
        ),
      ),
    ),
  );
}

/// Goes to a tab, or opens a full screen over this one.
void openLocation(BuildContext context, String location) {
  final first = Uri.parse(location).pathSegments.firstOrNull ?? '';
  if (tabRoots.contains('/$first')) {
    context.go(location);
  } else {
    context.push(location);
  }
}

/// Calls a number.
Future<void> callNumber(BuildContext context, WidgetRef ref, String? phone) =>
    openLink(
      context,
      ref,
      phone == null ? null : 'tel:${phone.replaceAll(' ', '')}',
    );
