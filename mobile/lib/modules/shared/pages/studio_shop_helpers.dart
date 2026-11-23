import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import 'page_actions.dart';

/// 209 The shop types' helpers on a Studio page, each a reusable element:
///
/// * `size_finder`: the first column of the shop's size chart (the ages) as
///   chips; the one chosen shows the size that fits with its measures and
///   the element's button (its words, then the size). Hidden while the shop
///   has no chart (`StoreConfig.size_chart`).
/// * `swatches`: a row of colour swatches (a shade finder); the one tapped
///   is named under them with its line, then the button.
/// * `quiz`: its questions one at a time (each answer counting for the
///   result in its place), a step bar over them, then the result with the
///   most answers, its words and its button, and "Start again".
///
/// An app before 209 skips the three (an unknown element is left out).

/// The element's button: its words, the arrow after them, in [fill].
class _HelperButton extends StatelessWidget {
  const _HelperButton({
    required this.label,
    required this.fill,
    required this.onTap,
    super.key,
  });

  final String label;
  final Color fill;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final on = fill.computeLuminance() > 0.5 ? Colors.black : Colors.white;
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: FilledButton.icon(
        style: FilledButton.styleFrom(
          backgroundColor: fill,
          foregroundColor: on,
          minimumSize: const Size(0, 44),
          padding: const EdgeInsets.symmetric(horizontal: 18),
          shape: const StadiumBorder(),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        ),
        onPressed: onTap,
        icon: const AppIcon(AppIcons.arrowForward, size: 18),
        iconAlignment: IconAlignment.end,
        label: Text(label),
      ),
    );
  }
}

/// The surface cards sit on inside a helper: a step lighter or darker than
/// the page, as the theme is.
Color _surface(BuildContext context) {
  final p = context.palette;
  return p.surface;
}

class StudioSizeFinder extends ConsumerStatefulWidget {
  const StudioSizeFinder({
    super.key,
    required this.node,
    required this.title,
    this.color,
  });

  final StudioNode node;
  final String? title;
  final Color? color;

  /// Whether the shop has a chart to choose from.
  static bool shows(WidgetRef ref) =>
      (ref.watch(appConfigProvider).store?.sizeChart?.rows ?? const [])
          .isNotEmpty;

  @override
  ConsumerState<StudioSizeFinder> createState() => _StudioSizeFinderState();
}

class _StudioSizeFinderState extends ConsumerState<StudioSizeFinder> {
  int? _at;

  @override
  Widget build(BuildContext context) {
    final chart = ref.watch(appConfigProvider).store?.sizeChart;
    if (chart == null || chart.rows.isEmpty) return const SizedBox.shrink();
    final p = context.palette;
    final ink = widget.color ?? p.text;
    final at = (_at ?? (chart.rows.length / 2).floor()).clamp(
      0,
      chart.rows.length - 1,
    );
    final row = chart.rows[at];
    final size = row.isEmpty ? '' : row.first;
    final action = widget.node.action;
    final button = (widget.node.title ?? '').trim();
    return Column(
      key: const ValueKey('studio-size-finder'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if ((widget.title ?? '').trim().isNotEmpty)
          Semantics(
            header: true,
            child: Row(
              children: [
                AppIcon(AppIcons.sizeGuide, size: 20, color: ink),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    widget.title!.trim(),
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: ink,
                    ),
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final (i, r) in chart.rows.indexed)
                if (r.isNotEmpty)
                  Padding(
                    padding: const EdgeInsetsDirectional.only(end: 8),
                    child: ChoiceChip(
                      key: ValueKey('size-finder-${r.first}'),
                      label: Text(r.first),
                      selected: i == at,
                      showCheckmark: false,
                      onSelected: (_) => setState(() => _at = i),
                    ),
                  ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Semantics(
          liveRegion: true,
          label: context.l10n.sizeFinderFits(size),
          excludeSemantics: true,
          child: Row(
            children: [
              for (final (i, h) in chart.headers.indexed.skip(1))
                if (i < row.length)
                  Expanded(
                    child: Container(
                      margin: EdgeInsetsDirectional.only(
                        end: i == chart.headers.length - 1 ? 0 : 8,
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: _surface(context),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            h,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              color: p.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            row[i],
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: p.text,
                              fontFeatures: const [
                                FontFeature.tabularFigures(),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
            ],
          ),
        ),
        if (button.isNotEmpty && action != null) ...[
          const SizedBox(height: 14),
          _HelperButton(
            key: const ValueKey('size-finder-button'),
            label: '$button · $size',
            fill: widget.color ?? p.accent,
            onTap: canOpenAction(ref, action)
                ? () => runPageAction(context, ref, action)
                : null,
          ),
        ],
      ],
    );
  }
}

class StudioSwatches extends ConsumerStatefulWidget {
  const StudioSwatches({
    super.key,
    required this.node,
    required this.title,
    this.color,
  });

  final StudioNode node;
  final String? title;
  final Color? color;

  static bool shows(StudioNode node) => node.entries.isNotEmpty;

  @override
  ConsumerState<StudioSwatches> createState() => _StudioSwatchesState();
}

class _StudioSwatchesState extends ConsumerState<StudioSwatches> {
  int? _at;

  @override
  Widget build(BuildContext context) {
    final node = widget.node;
    final entries = node.entries;
    if (entries.isEmpty) return const SizedBox.shrink();
    final p = context.palette;
    final ink = widget.color ?? p.text;
    final first = entries.indexWhere((e) => e.highlight);
    final at = (_at ?? (first < 0 ? 0 : first)).clamp(0, entries.length - 1);
    final chosen = entries[at];
    final size = node.swatchSize;
    final radius = node.swatchSquare ? 10.0 : size;
    final action = node.action;
    final button = (node.title ?? '').trim();
    Color shade(StudioEntry e) => parseHexColor(e.color) ?? p.border;
    return Column(
      key: const ValueKey('studio-swatches'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if ((widget.title ?? '').trim().isNotEmpty) ...[
          Semantics(
            header: true,
            child: Text(
              widget.title!.trim(),
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: ink,
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final (i, e) in entries.indexed)
                Padding(
                  padding: const EdgeInsetsDirectional.only(end: 10),
                  child: Semantics(
                    button: true,
                    selected: i == at,
                    label: i == at
                        ? context.l10n.swatchChosen(e.title ?? '')
                        : e.title,
                    excludeSemantics: true,
                    child: InkWell(
                      key: ValueKey('swatch-$i'),
                      borderRadius: BorderRadius.circular(radius),
                      onTap: () => setState(() => _at = i),
                      child: Padding(
                        padding: const EdgeInsets.all(3),
                        child: Column(
                          children: [
                            Container(
                              width: size,
                              height: size,
                              decoration: BoxDecoration(
                                color: shade(e),
                                borderRadius: BorderRadius.circular(radius),
                                border: Border.all(
                                  color: i == at
                                      ? ink
                                      : Colors.black.withValues(alpha: 0.08),
                                  width: i == at ? 2.5 : 1,
                                  strokeAlign: BorderSide.strokeAlignOutside,
                                ),
                              ),
                            ),
                            const SizedBox(height: 5),
                            Text(
                              (e.subtitle ?? '').trim().isNotEmpty
                                  ? e.subtitle!.trim()
                                  : (e.title ?? ''),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: i == at
                                    ? FontWeight.w800
                                    : FontWeight.w500,
                                color: i == at ? ink : p.textSecondary,
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
        ),
        const SizedBox(height: 10),
        Container(
          key: const ValueKey('swatch-chosen'),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: _surface(context),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: shade(chosen),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      chosen.title ?? '',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                    if ((chosen.text ?? '').trim().isNotEmpty)
                      Text(
                        chosen.text!.trim(),
                        style: TextStyle(
                          fontSize: 12.5,
                          color: p.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (button.isNotEmpty && action != null) ...[
          const SizedBox(height: 14),
          _HelperButton(
            key: const ValueKey('swatches-button'),
            label: button,
            fill: widget.color ?? p.accent,
            onTap: canOpenAction(ref, action)
                ? () => runPageAction(context, ref, action)
                : null,
          ),
        ],
      ],
    );
  }
}

class StudioQuiz extends ConsumerStatefulWidget {
  const StudioQuiz({
    super.key,
    required this.node,
    required this.title,
    this.color,
  });

  final StudioNode node;
  final String? title;
  final Color? color;

  /// A question's answers, one per line.
  static List<String> answersOf(StudioEntry question) => [
    for (final line in (question.text ?? '').split('\n'))
      if (line.trim().isNotEmpty) line.trim(),
  ];

  /// Whether it has questions to ask and results to give.
  static bool shows(StudioNode node) =>
      node.entries.length >= 2 &&
      node.quizQuestions.any((q) => answersOf(q).length >= 2);

  /// The result [votes] (each the answer's place) land on: the one counted
  /// most, the first of them on a tie.
  static int resultOf(List<int> votes, int results) {
    if (results <= 0) return 0;
    final counts = List<int>.filled(results, 0);
    for (final v in votes) {
      counts[v % results]++;
    }
    var best = 0;
    for (var i = 1; i < results; i++) {
      if (counts[i] > counts[best]) best = i;
    }
    return best;
  }

  @override
  ConsumerState<StudioQuiz> createState() => _StudioQuizState();
}

class _StudioQuizState extends ConsumerState<StudioQuiz> {
  final List<int> _votes = [];

  @override
  Widget build(BuildContext context) {
    final node = widget.node;
    final questions = [
      for (final q in node.quizQuestions)
        if (StudioQuiz.answersOf(q).length >= 2) q,
    ];
    if (questions.isEmpty || node.entries.length < 2) {
      return const SizedBox.shrink();
    }
    final p = context.palette;
    final ink = widget.color ?? p.text;
    final fill = widget.color ?? p.accent;
    final step = _votes.length;
    final done = step >= questions.length;
    return Column(
      key: const ValueKey('studio-quiz'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if ((widget.title ?? '').trim().isNotEmpty) ...[
          Semantics(
            header: true,
            child: Text(
              widget.title!.trim(),
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: ink,
              ),
            ),
          ),
          const SizedBox(height: 10),
        ],
        Row(
          children: [
            for (var i = 0; i < questions.length; i++)
              Expanded(
                child: Container(
                  height: 4,
                  margin: EdgeInsetsDirectional.only(
                    end: i == questions.length - 1 ? 0 : 4,
                  ),
                  decoration: BoxDecoration(
                    color: i < step ? fill : p.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          child: done
              ? _result(context, questions.length)
              : _question(context, questions[step], step, questions.length),
        ),
      ],
    );
  }

  Widget _question(BuildContext context, StudioEntry q, int step, int total) {
    final p = context.palette;
    return Column(
      key: ValueKey('quiz-question-$step'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          context.l10n.quizStep(step + 1, total),
          style: TextStyle(fontSize: 12, color: p.textSecondary),
        ),
        const SizedBox(height: 4),
        Text(
          q.title ?? '',
          style: TextStyle(
            fontSize: 15.5,
            fontWeight: FontWeight.w700,
            color: p.text,
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final (i, a) in StudioQuiz.answersOf(q).indexed)
              ActionChip(
                key: ValueKey('quiz-answer-$step-$i'),
                label: Text(a),
                onPressed: () => setState(() => _votes.add(i)),
              ),
          ],
        ),
      ],
    );
  }

  Widget _result(BuildContext context, int total) {
    final p = context.palette;
    final node = widget.node;
    final result =
        node.entries[StudioQuiz.resultOf(_votes, node.entries.length)];
    final action = result.action ?? node.action;
    final label = (result.label ?? '').trim().isNotEmpty
        ? result.label!.trim()
        : (node.title ?? '').trim();
    final icon = (result.icon ?? '').isEmpty ? null : symbolByName(result.icon);
    return Column(
      key: const ValueKey('quiz-result'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          context.l10n.quizResultTitle,
          style: TextStyle(fontSize: 12, color: p.textSecondary),
        ),
        const SizedBox(height: 4),
        Semantics(
          liveRegion: true,
          child: Row(
            children: [
              if (icon != null) ...[
                AppIcon(icon, size: 24, color: widget.color ?? p.text),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: Text(
                  result.title ?? '',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
            ],
          ),
        ),
        if ((result.text ?? '').trim().isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(
            result.text!.trim(),
            style: TextStyle(
              fontSize: 13.5,
              height: 1.45,
              color: p.textSecondary,
            ),
          ),
        ],
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            if (label.isNotEmpty && action != null)
              _HelperButton(
                key: const ValueKey('quiz-result-button'),
                label: label,
                fill: widget.color ?? p.accent,
                onTap: canOpenAction(ref, action)
                    ? () => runPageAction(context, ref, action)
                    : null,
              ),
            TextButton.icon(
              key: const ValueKey('quiz-again'),
              onPressed: () => setState(_votes.clear),
              icon: const AppIcon(AppIcons.refresh, size: 18),
              label: Text(context.l10n.quizAgain),
            ),
          ],
        ),
      ],
    );
  }
}
