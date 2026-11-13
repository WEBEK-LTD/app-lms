import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/theme/symbol_names.dart';
import '../../../../core/widgets/common.dart';
import '../page_actions.dart';
import 'premium_shared.dart';

/// 129.17 Where each tile of a bento grid goes: its column and row, and how
/// many it spans, each placed in the first cells free for it (as CSS's
/// dense grid does on the canvas).
List<({int column, int row, int across, int down})> bentoPlaces(
  List<StudioTileSize> sizes,
  int columns,
) {
  final taken = <int>{};
  bool free(int c, int r, int a, int d) {
    for (var y = r; y < r + d; y++) {
      for (var x = c; x < c + a; x++) {
        if (x >= columns || taken.contains(y * columns + x)) return false;
      }
    }
    return true;
  }

  return [
    for (final size in sizes)
      () {
        final a = math.min(columns, switch (size) {
          StudioTileSize.wide || StudioTileSize.large => 2,
          // 129 Across every column.
          StudioTileSize.full => columns,
          _ => 1,
        });
        final d = switch (size) {
          StudioTileSize.tall || StudioTileSize.large => 2,
          _ => 1,
        };
        for (var cell = 0; ; cell++) {
          final c = cell % columns;
          final r = cell ~/ columns;
          if (free(c, r, a, d)) {
            for (var y = r; y < r + d; y++) {
              for (var x = c; x < c + a; x++) {
                taken.add(y * columns + x);
              }
            }
            return (column: c, row: r, across: a, down: d);
          }
        }
      }(),
  ];
}

/// 129.17 A bento grid: tiles of mixed sizes in `columns`, each on its
/// photo under a dark shade, its gradient, or a soft card; its icon,
/// title, text and link.
class PremiumBento extends ConsumerWidget {
  const PremiumBento({super.key, required this.node, required this.dark});

  final StudioNode node;
  final bool dark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tones = PremiumTones.of(context, dark: dark);
    final rowHeight = node.premium?.rowHeight ?? 112.0;
    final glass = node.premium?.glassCaptions ?? false;
    final columns = node.columns.clamp(1, 4);
    final gap = node.gap > 0 ? node.gap : 10.0;
    final places = bentoPlaces([for (final e in node.entries) e.size], columns);
    final rows = places.fold(0, (n, p) => math.max(n, p.row + p.down));
    final radius = BorderRadius.circular(node.radius > 0 ? node.radius : 22);
    return LayoutBuilder(
      builder: (context, box) {
        final cell = (box.maxWidth - gap * (columns - 1)) / columns;
        return SizedBox(
          height: rows * rowHeight + math.max(0, rows - 1) * gap,
          child: Stack(
            children: [
              for (final (i, e) in node.entries.indexed)
                PositionedDirectional(
                  key: ValueKey('premium-tile-${node.id}-$i'),
                  start: places[i].column * (cell + gap),
                  top: places[i].row * (rowHeight + gap),
                  width: places[i].across * cell + (places[i].across - 1) * gap,
                  height:
                      places[i].down * rowHeight + (places[i].down - 1) * gap,
                  child: _Tile(
                    entry: e,
                    tones: tones,
                    radius: radius,
                    glass: glass,
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _Tile extends ConsumerWidget {
  const _Tile({
    required this.entry,
    required this.tones,
    required this.radius,
    this.glass = false,
  });

  /// 129 The words on a frosted glass label.
  final bool glass;

  final StudioEntry entry;
  final PremiumTones tones;
  final BorderRadius radius;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final e = entry;
    final photo = e.imageUrl;
    final gradient = e.gradient;
    final filled = photo != null || gradient != null;
    final ink = filled ? Colors.white : tones.ink;
    final own = colorOr(e.color, tones.brand);
    final action = e.action;
    final large = e.size == StudioTileSize.large;
    Widget tile = Container(
      decoration: BoxDecoration(
        color: filled ? null : tones.card,
        gradient: gradient == null
            ? null
            : LinearGradient(
                begin: AlignmentDirectional.topStart,
                end: AlignmentDirectional.bottomEnd,
                colors: [
                  colorOr(gradient.from, tones.brand),
                  colorOr(gradient.to, tones.accent),
                ],
              ),
        borderRadius: radius,
        border: filled ? null : Border.all(color: tones.edge),
        boxShadow: tones.shadow,
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (photo != null) ...[
              AppNetworkImage(url: photo, seed: (e.title ?? '').hashCode),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: [0.3, 1],
                    colors: [Color(0x0D000000), Color(0xA6000000)],
                  ),
                ),
              ),
            ],
            if (e.icon != null)
              PositionedDirectional(
                top: 12,
                start: 12,
                child: Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: filled
                        ? Colors.white.withValues(alpha: 0.22)
                        : own.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: Icon(
                    symbolByName(e.icon),
                    size: 19,
                    fill: 1,
                    color: filled ? Colors.white : own,
                  ),
                ),
              ),
            // 129 Its chip at its top.
            if ((e.subtitle ?? '').isNotEmpty)
              PositionedDirectional(
                top: 12,
                end: 12,
                child: Container(
                  key: ValueKey('premium-tile-chip-${e.subtitle}'),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: colorOr(e.color, tones.accent),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    e.subtitle!,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0E0D24),
                    ),
                  ),
                ),
              ),
            // At the tile's foot, cut off rather than squeezed in a short row.
            PositionedDirectional(
              start: 0,
              end: 0,
              bottom: 0,
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (glass)
                      _glassCaption(e)
                    else ...[
                      Text(
                        e.title ?? '',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: large ? 20 : 15,
                          height: 1.2,
                          fontWeight: FontWeight.w800,
                          color: ink,
                        ),
                      ),
                      if ((e.text ?? '').isNotEmpty)
                        Text(
                          e.text!,
                          maxLines: large ? 3 : 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: filled
                                ? Colors.white.withValues(alpha: 0.88)
                                : tones.muted,
                          ),
                        ),
                      if ((e.label ?? '').isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              e.label!,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: filled ? Colors.white : tones.brand,
                              ),
                            ),
                            const SizedBox(width: 4),
                            // Pointing the other way right to left, of itself.
                            Icon(
                              Symbols.arrow_forward_rounded,
                              size: 15,
                              color: filled ? Colors.white : tones.brand,
                            ),
                          ],
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
    if (action != null && canOpenAction(ref, action)) {
      tile = Semantics(
        button: true,
        child: GestureDetector(
          onTap: () => runPageAction(context, ref, action),
          child: tile,
        ),
      );
    }
    return tile;
  }

  /// 129 The title and text on a frosted glass label at the tile's foot.
  Widget _glassCaption(StudioEntry e) => ClipRRect(
    borderRadius: BorderRadius.circular(16),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0x6B141220),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0x2EFFFFFF)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              e.title ?? '',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: e.size == StudioTileSize.large ? 20 : 15,
                height: 1.2,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            if ((e.text ?? '').isNotEmpty)
              Text(
                e.text!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, color: Color(0xE0FFFFFF)),
              ),
          ],
        ),
      ),
    ),
  );
}
