import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';

/// 113.7 Rubrics: the criteria and levels an assignment is graded with, the
/// levels the teacher chose, and choosing them in the Teacher tab.

/// The rubric before grading: each criterion with its levels and points.
class RubricView extends StatelessWidget {
  const RubricView({super.key, required this.rubric});

  final List<RubricCriterion> rubric;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AppCard(
      key: const ValueKey('rubric'),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final (i, c) in rubric.indexed) ...[
            if (i > 0) Divider(height: 20, color: p.divider),
            Text(
              c.title,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
            const SizedBox(height: 4),
            for (final l in c.levels)
              Text(
                context.l10n.rubricLevelPoints(l.label, l.points),
                style: TextStyle(fontSize: 14, color: p.textBody),
              ),
          ],
        ],
      ),
    );
  }
}

/// Each criterion with the level the teacher chose and its points.
class RubricResultList extends StatelessWidget {
  const RubricResultList({super.key, required this.results});

  final List<RubricResult> results;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Column(
      key: const ValueKey('rubric-result'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final r in results)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: r.title,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        if (r.levelLabel != null)
                          TextSpan(text: ' · ${r.levelLabel}'),
                      ],
                    ),
                    style: TextStyle(fontSize: 14, color: p.textBody),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  context.l10n.rubricPoints(r.points, r.maxPoints),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// The teacher chooses a level for each criterion; the score is their points.
class RubricPicker extends StatelessWidget {
  const RubricPicker({
    super.key,
    required this.rubric,
    required this.chosen,
    required this.onChanged,
  });

  final List<RubricCriterion> rubric;

  /// The level's ID for each criterion's ID.
  final Map<int, int> chosen;
  final ValueChanged<Map<int, int>> onChanged;

  int get score => [
    for (final c in rubric)
      c.levels
              .where((l) => l.id == chosen[c.id])
              .map((l) => l.points)
              .firstOrNull ??
          0,
  ].fold(0, (a, b) => a + b);

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final max = rubric.fold(0, (sum, c) => sum + c.maxPoints);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          context.l10n.rubricChooseAll,
          style: TextStyle(fontSize: 13, color: p.textSecondary),
        ),
        for (final c in rubric) ...[
          const SizedBox(height: 10),
          Text(
            c.title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final l in c.levels)
                ChoiceChip(
                  key: ValueKey('rubric-${c.id}-${l.id}'),
                  label: Text(
                    context.l10n.rubricLevelPoints(l.label, l.points),
                  ),
                  selected: chosen[c.id] == l.id,
                  onSelected: (_) => onChanged({...chosen, c.id: l.id}),
                ),
            ],
          ),
        ],
        const SizedBox(height: 10),
        Text(
          context.l10n.rubricTotal(score, max),
          key: const ValueKey('rubric-total'),
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: p.text,
          ),
        ),
      ],
    );
  }
}
