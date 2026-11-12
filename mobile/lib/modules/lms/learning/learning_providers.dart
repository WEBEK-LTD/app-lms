import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/providers.dart';

/// 113.7 More of a real LMS: learning paths, the student's points and
/// badges, a course's leaderboard, the student's notes, a lesson's
/// discussion.

final learningPathsProvider = FutureProvider.autoDispose<List<LearningPath>>(
  (ref) => ref.watch(yallappApiProvider).listLearningPaths(),
);

final learningPathProvider = FutureProvider.autoDispose
    .family<LearningPath, int>(
      (ref, id) => ref.watch(yallappApiProvider).getLearningPath(id),
    );

final achievementsProvider = FutureProvider.autoDispose<Achievements>(
  (ref) => ref.watch(yallappApiProvider).getAchievements(),
);

/// 123 The time the student spent learning this week, and all of it.
final learningTimeProvider = FutureProvider.autoDispose<LearningTime>(
  (ref) => ref.watch(yallappApiProvider).getLearningTime(),
);

/// A course's leaderboard: the whole course's, or the student's cohort's.
final leaderboardProvider = FutureProvider.autoDispose
    .family<Leaderboard, ({int courseId, bool cohort})>(
      (ref, key) => ref
          .watch(yallappApiProvider)
          .getLeaderboard(key.courseId, cohort: key.cohort),
    );

final courseNotesProvider = FutureProvider.autoDispose.family<CourseNotes, int>(
  (ref, courseId) => ref.watch(yallappApiProvider).listCourseNotes(courseId),
);

final lessonNotesProvider = FutureProvider.autoDispose.family<LessonNotes, int>(
  (ref, lessonId) => ref.watch(yallappApiProvider).listLessonNotes(lessonId),
);

/// The first page of a lesson's discussion (pinned first).
final lessonDiscussionProvider = FutureProvider.autoDispose
    .family<List<CourseQuestion>, ({int courseId, int lessonId})>(
      (ref, key) async =>
          (await ref
                  .watch(yallappApiProvider)
                  .listQuestions(key.courseId, lessonId: key.lessonId))
              .items,
    );
