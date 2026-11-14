import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart' show MyCoursesStatus;
import '../../../core/auth/auth_controller.dart';
import '../../lms/data/lms_providers.dart';

/// 129.1 A bar of segments on a Studio page (`segments`; Studio's canvas:
/// components/studio/premium-motion.tsx): the segments done filled in the
/// element's colour (gold without one), the next one filled as far as it
/// has gone, the rest a quiet track, from the start side. With the
/// student's course as its source, the lessons of the course they are
/// taking and the ones done; nothing signed out or without one.
class StudioSegments extends ConsumerWidget {
  const StudioSegments({super.key, required this.node, this.color});

  final StudioNode node;

  /// The element's own colour; null, gold.
  final Color? color;

  /// The student's course in progress: its lessons and the ones done.
  static ({int count, int done})? course(WidgetRef ref) {
    if (ref.watch(authControllerProvider) is! SignedIn) return null;
    final state = ref.watch(myCoursesProvider(MyCoursesStatus.inProgress));
    for (final c in state.items) {
      if (c.progress.courseCompleted || c.progress.totalItems < 1) continue;
      return (count: c.progress.totalItems, done: c.progress.completedItems);
    }
    return null;
  }

  /// False when it follows the student's course and there is none.
  static bool shows(StudioNode node, WidgetRef ref) =>
      !node.segmentsFromCourse || course(ref) != null;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fromCourse = node.segmentsFromCourse ? course(ref) : null;
    final count = (fromCourse?.count ?? node.segmentCount).clamp(1, 40);
    final done = (fromCourse?.done ?? node.segmentsDone).clamp(0, count);
    final part = fromCourse == null ? node.segmentPart : 0.0;
    final fill = color ?? const Color(0xFFF5C451);
    // The track: the colour, faint, so it reads on a photo and on paper.
    final track = fill.withValues(alpha: 0.3);
    return Semantics(
      label: '$done / $count',
      child: ExcludeSemantics(
        child: Row(
          key: ValueKey('studio-segments-${node.id}'),
          children: [
            for (var i = 0; i < count; i++) ...[
              if (i > 0) SizedBox(width: node.gap == 0 ? 4 : node.gap),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: SizedBox(
                    height: node.segmentHeight,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        ColoredBox(color: track),
                        FractionallySizedBox(
                          alignment: AlignmentDirectional.centerStart,
                          widthFactor: i < done
                              ? 1
                              : i == done
                              ? part
                              : 0,
                          child: ColoredBox(color: fill),
                        ),
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
