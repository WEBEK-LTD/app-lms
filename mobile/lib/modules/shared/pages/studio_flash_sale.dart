import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/sale_widgets.dart';
import 'page_actions.dart';

/// 131 Studio's flash sale element: the sale the servers filled in
/// (`flash`) and its products (`items`, each with its `sale`), as a
/// `banner` (one wide card, a coloured gradient), a `carousel` of cards or
/// a `grid` of two columns: was and now prices, the share off, a live
/// countdown to the sale's end and a stock bar. Hidden once the sale is
/// over (its end passed, or nothing left), the moment it happens.
class StudioFlashSale extends StatefulWidget {
  const StudioFlashSale({
    super.key,
    required this.node,
    required this.title,
    this.color,
    this.now,
  });

  final StudioNode node;

  /// The element's own title; missing, the sale's, else "Flash sale".
  final String? title;
  final Color? color;

  /// For tests: the clock.
  final DateTime Function()? now;

  /// Whether there is anything to show at [at].
  static bool shows(StudioNode node, DateTime at) {
    final flash = node.commerce?.flash;
    if (flash != null && flash.overAt(at)) return false;
    return node.items.any((i) => i.sale?.liveAt(at) ?? false);
  }

  @override
  State<StudioFlashSale> createState() => _StudioFlashSaleState();
}

class _StudioFlashSaleState extends State<StudioFlashSale> {
  bool _over = false;

  DateTime _now() => widget.now?.call() ?? DateTime.now();

  @override
  Widget build(BuildContext context) {
    if (_over || !StudioFlashSale.shows(widget.node, _now())) {
      return const SizedBox.shrink();
    }
    final p = context.palette;
    final options =
        widget.node.commerce?.flashSale ?? const StudioFlashOptions();
    final flash = widget.node.commerce?.flash;
    final accent = parseHexColor(options.accent) ?? widget.color ?? p.accent;
    final at = _now();
    final items = [
      for (final i in widget.node.items)
        if (i.sale?.liveAt(at) ?? false) i,
    ].take(options.limit).toList();
    final ends =
        flash?.endsAt ??
        items
            .map((i) => i.sale?.endsAt)
            .whereType<DateTime>()
            .fold<DateTime?>(
              null,
              (a, b) => a == null || b.isBefore(a) ? b : a,
            );
    final banner = options.look == FlashLook.banner;
    final title = (widget.title?.trim().isNotEmpty ?? false)
        ? widget.title!.trim()
        : (flash?.title ?? context.l10n.flashSaleTitle);
    final remaining = flash?.remaining;
    final total = flash?.total;
    final header = Wrap(
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.center,
      runSpacing: 6,
      spacing: 8,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcon(
              AppIcons.flashSale,
              size: 22,
              color: banner ? Colors.white : accent,
              filled: true,
            ),
            const SizedBox(width: 6),
            Semantics(
              header: true,
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: banner ? Colors.white : p.text,
                ),
              ),
            ),
          ],
        ),
        if (options.countdown && ends != null)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                context.l10n.flashEndsIn,
                style: TextStyle(
                  fontSize: 12,
                  color: banner ? Colors.white : p.textSecondary,
                ),
              ),
              const SizedBox(width: 6),
              SaleCountdown(
                key: ValueKey('flash-countdown-${widget.node.id}'),
                endsAt: ends,
                color: accent,
                onDark: banner,
                now: widget.now,
                onEnded: () => setState(() => _over = true),
              ),
            ],
          ),
      ],
    );
    final stock = options.stockBar && remaining != null && total != null
        ? SaleStockBar(
            remaining: remaining,
            total: total,
            color: accent,
            onDark: banner,
          )
        : null;
    Widget card(PageItem item, {double? width}) =>
        _FlashCard(item: item, accent: accent, width: width);
    // 131 One product on sale: one card the width of the sale, its photo on
    // one side and its name, prices and share off on the other.
    final body = items.length == 1
        ? _FlashCard(item: items.single, accent: accent, wide: true)
        : switch (options.look) {
            FlashLook.grid => LayoutBuilder(
              builder: (context, box) {
                final w = (box.maxWidth - 10) / 2;
                return Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [for (final i in items) card(i, width: w)],
                );
              },
            ),
            FlashLook.carousel || FlashLook.banner => SizedBox(
              height: 236,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: items.length,
                separatorBuilder: (_, _) => const SizedBox(width: 10),
                itemBuilder: (_, i) =>
                    card(items[i], width: banner ? 140 : 168),
              ),
            ),
          };
    final column = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        header,
        if (stock != null) ...[const SizedBox(height: 10), stock],
        const SizedBox(height: 12),
        body,
      ],
    );
    if (!banner) return column;
    final radius = widget.node.radius > 0 ? widget.node.radius : 22.0;
    return DecoratedBox(
      key: ValueKey('flash-banner-${widget.node.id}'),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        gradient: LinearGradient(
          begin: AlignmentDirectional.topStart,
          end: AlignmentDirectional.bottomEnd,
          colors: [accent, Color.lerp(accent, Colors.black, 0.38)!],
        ),
      ),
      child: Padding(padding: const EdgeInsets.all(14), child: column),
    );
  }
}

class _FlashCard extends ConsumerWidget {
  const _FlashCard({
    required this.item,
    required this.accent,
    this.width,
    this.wide = false,
  });

  final PageItem item;
  final Color accent;
  final double? width;

  /// 131 The sale's only product: the photo beside its name and prices.
  final bool wide;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final sale = item.sale!;
    final action = openableAction(ref, item.tapAction);
    final Widget content = wide
        ? Row(
            key: const ValueKey('flash-single'),
            children: [
              SizedBox(
                width: 116,
                height: 136,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: AppNetworkImage(
                    url: item.imageUrl,
                    seed: item.id.hashCode,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SaleChip(percentOff: sale.percentOff, color: accent),
                    const SizedBox(height: 8),
                    Text(
                      item.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 6),
                    SalePrice(sale: sale, size: 18, color: accent),
                  ],
                ),
              ),
            ],
          )
        : Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              AspectRatio(
                aspectRatio: 1,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      AppNetworkImage(
                        url: item.imageUrl,
                        seed: item.id.hashCode,
                      ),
                      PositionedDirectional(
                        top: 6,
                        start: 6,
                        child: SaleChip(
                          percentOff: sale.percentOff,
                          color: accent,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                item.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 2),
              SalePrice(sale: sale, size: 14, color: accent),
            ],
          );
    return SizedBox(
      width: width,
      child: Material(
        color: p.surface,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: action == null
              ? null
              : () => runPageAction(context, ref, action),
          child: Padding(padding: EdgeInsets.all(wide ? 8 : 6), child: content),
        ),
      ),
    );
  }
}
