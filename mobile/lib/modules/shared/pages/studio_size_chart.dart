import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/theme/palette.dart';

/// 208 The shop's size chart as a table: its titles, then a row per size
/// (the size in bold), lines between the rows; the unit in the title.
class SizeChartTable extends StatelessWidget {
  const SizeChartTable({super.key, required this.chart, this.color});

  final SizeChart chart;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final ink = color ?? p.text;
    Widget cell(String text, {bool bold = false, bool head = false}) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 2),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: 13,
          fontWeight: head || bold ? FontWeight.w700 : FontWeight.w500,
          color: head ? ink.withValues(alpha: 0.7) : ink,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
    );
    return Table(
      key: const ValueKey('size-chart-table'),
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      border: TableBorder(horizontalInside: BorderSide(color: p.border)),
      children: [
        TableRow(
          children: [for (final h in chart.headers) cell(h, head: true)],
        ),
        for (final row in chart.rows)
          TableRow(
            children: [for (final (i, c) in row.indexed) cell(c, bold: i == 0)],
          ),
      ],
    );
  }
}

/// 208 The `size_chart` element: the shop's size chart under its title
/// (the element's words, else "Size chart (cm)"); nothing when the shop has
/// none (`StoreConfig.size_chart`), and an app before it skips the element.
class StudioSizeChart extends ConsumerWidget {
  const StudioSizeChart({super.key, required this.title, this.color});

  final String? title;
  final Color? color;

  /// Whether the shop has a chart to show.
  static bool shows(WidgetRef ref) =>
      ref.watch(appConfigProvider).store?.sizeChart != null;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chart = ref.watch(appConfigProvider).store?.sizeChart;
    if (chart == null) return const SizedBox.shrink();
    final p = context.palette;
    final ink = color ?? p.text;
    final heading = (title ?? '').trim().isEmpty
        ? context.l10n.sizeChartIn(chart.unit)
        : '${title!.trim()} (${chart.unit})';
    return Column(
      key: const ValueKey('studio-size-chart'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Text(
            heading,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: ink,
            ),
          ),
        ),
        const SizedBox(height: 8),
        SizeChartTable(chart: chart, color: ink),
      ],
    );
  }
}

/// 208 The size guide over a product's page: the shop's chart in a sheet.
Future<void> showSizeGuide(BuildContext context, SizeChart chart) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (context) => SafeArea(
      child: SingleChildScrollView(
        key: const ValueKey('size-guide-sheet'),
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(
                context.l10n.sizeChartIn(chart.unit),
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: context.palette.text,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizeChartTable(chart: chart),
          ],
        ),
      ),
    ),
  );
}
